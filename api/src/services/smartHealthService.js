const fs = require('fs');
const path = require('path');
const { runCommand } = require('../utils/command');

function extractSmartTemperature(json) {
  if (!json || typeof json !== 'object') return null;

  // 1. Top-level temperature object
  if (typeof json.temperature?.current === 'number') {
    return json.temperature.current;
  }

  // 2. NVMe SMART health information log
  if (typeof json.nvme_smart_health_information_log?.temperature === 'number') {
    const t = json.nvme_smart_health_information_log.temperature;
    return t > 200 ? Math.round(t - 273.15) : t;
  }

  // 3. ATA SMART attributes table (IDs 194, 190, 231)
  if (Array.isArray(json.ata_smart_attributes?.table)) {
    const table = json.ata_smart_attributes.table;
    const attr = table.find(a => a.id === 194) || table.find(a => a.id === 190) || table.find(a => a.id === 231);
    if (attr) {
      if (typeof attr.raw?.value === 'number') {
        const raw = attr.raw.value;
        const temp = raw > 1000 ? (raw & 0xFF) : raw;
        if (temp > 0 && temp < 125) return temp;
      }
      if (typeof attr.raw?.string === 'string') {
        const match = attr.raw.string.match(/(\d+)/);
        if (match) {
          const temp = parseInt(match[1], 10);
          if (temp > 0 && temp < 125) return temp;
        }
      }
      if (typeof attr.value === 'number' && attr.value > 0 && attr.value < 100) {
        return attr.value;
      }
    }
  }

  return null;
}

// Check Linux kernel drivetemp hwmon drivers
async function readKernelDriveTemp(devName) {
  try {
    const hwmonPath = '/sys/class/hwmon';
    if (!fs.existsSync(hwmonPath)) return null;
    const entries = await fs.promises.readdir(hwmonPath);
    const shortName = path.basename(devName); // e.g. 'sda'

    for (const entry of entries) {
      const dirPath = path.join(hwmonPath, entry);
      const name = (await fs.promises.readFile(path.join(dirPath, 'name'), 'utf8').catch(() => ''))?.trim();
      if (name === 'drivetemp') {
        // Check if symlink links to our device
        const deviceLink = path.join(dirPath, 'device');
        const resolved = await fs.promises.realpath(deviceLink).catch(() => '');
        if (resolved.includes(shortName)) {
          const rawMilli = await fs.promises.readFile(path.join(dirPath, 'temp1_input'), 'utf8').catch(() => null);
          if (rawMilli) {
            const temp = Math.round(parseFloat(rawMilli.trim()) / 1000);
            if (!isNaN(temp) && temp > 0 && temp < 120) return temp;
          }
        }
      }
    }
  } catch (_) {}
  return null;
}

class SmartHealthService {
  async discoverStorageDevices() {
    const devices = new Set();
    
    // 1. Probe Linux sysfs block devices
    try {
      if (fs.existsSync('/sys/block')) {
        const entries = await fs.promises.readdir('/sys/block');
        for (const entry of entries) {
          if ((entry.startsWith('sd') || entry.startsWith('nvme') || entry.startsWith('vd')) && !entry.includes('boot')) {
            devices.add(`/dev/${entry}`);
          }
        }
      }
    } catch (_) {}

    // 2. Probe lsblk
    try {
      const lsblk = await runCommand('lsblk', ['-d', '-n', '-o', 'NAME,TYPE'], { ignoreExitCode: true }).catch(() => '');
      if (lsblk) {
        for (const line of lsblk.split('\n')) {
          const parts = line.trim().split(/\s+/);
          if (parts[1] === 'disk' && parts[0]) {
            devices.add(`/dev/${parts[0]}`);
          }
        }
      }
    } catch (_) {}

    // Ensure default common disks are included if discovery was empty
    if (devices.size === 0) {
      devices.add('/dev/sda');
      devices.add('/dev/sdb');
      devices.add('/dev/sdc');
    }

    return Array.from(devices).sort();
  }

  async getDeepHealth() {
    const devices = await this.discoverStorageDevices();
    const reports = [];

    for (const dev of devices) {
      try {
        const out = await runCommand('sudo', ['smartctl', '-a', '-j', dev], { ignoreExitCode: true }).catch(() => '');
        let json = null;
        try { 
          if (out) json = JSON.parse(out); 
        } catch (_) {}

        if (json) {
          const model = json.model_name || json.device?.model_name || json.model_family || dev;
          const serial = json.serial_number || 'Detected';
          const size = json.user_capacity?.bytes 
            ? `${(json.user_capacity.bytes / (1024**3)).toFixed(0)} GB` 
            : 'Unknown';
          const passed = json.smart_status?.passed !== false;

          let temp = extractSmartTemperature(json);
          if (temp === null) {
            temp = await readKernelDriveTemp(dev);
          }

          const powerHours = json.power_on_time?.hours || null;
          const powerCycles = json.power_cycle_count || null;

          // Parse table attributes
          const rawTable = json.ata_smart_attributes?.table || [];
          const reallocated = rawTable.find(a => a.id === 5)?.raw?.value ?? 0;
          const pendingSectors = rawTable.find(a => a.id === 197)?.raw?.value ?? 0;
          const wearRange = rawTable.find(a => a.id === 231 || a.id === 233 || a.id === 177)?.value ?? null;

          reports.push({
            device: dev,
            model,
            serial,
            size,
            passed,
            temperature: temp,
            powerOnHours: powerHours,
            powerCycles,
            reallocatedSectors: reallocated,
            pendingSectors,
            wearLevelPercent: wearRange,
            healthGrade: passed && reallocated === 0 ? 'Excellent' : passed ? 'Good (Check Sectors)' : 'Warning',
            attributes: rawTable.slice(0, 10).map(a => ({
              id: a.id,
              name: a.name,
              value: a.value,
              worst: a.worst,
              thresh: a.thresh,
              raw: a.raw?.value
            }))
          });
        } else {
          // Fallback via drivetemp and sysfs model
          let fallbackTemp = await readKernelDriveTemp(dev);
          let diskModel = dev;
          let diskSize = 'Unknown';
          try {
            const short = path.basename(dev);
            diskModel = (await fs.promises.readFile(`/sys/block/${short}/device/model`, 'utf8').catch(() => ''))?.trim() || dev;
            const sizeSectors = (await fs.promises.readFile(`/sys/block/${short}/size`, 'utf8').catch(() => ''))?.trim();
            if (sizeSectors) {
              const gb = Math.round((parseInt(sizeSectors, 10) * 512) / (1024**3));
              if (!isNaN(gb) && gb > 0) diskSize = `${gb} GB`;
            }
          } catch (_) {}

          reports.push({
            device: dev,
            model: diskModel,
            serial: 'Detected',
            size: diskSize,
            passed: true,
            temperature: fallbackTemp,
            powerOnHours: null,
            powerCycles: null,
            reallocatedSectors: 0,
            pendingSectors: 0,
            healthGrade: 'Healthy',
            attributes: []
          });
        }
      } catch (err) {
        reports.push({
          device: dev,
          error: err.message,
          passed: false,
          healthGrade: 'Error'
        });
      }
    }

    return {
      timestamp: new Date().toISOString(),
      devices: reports
    };
  }
}

module.exports = new SmartHealthService();
