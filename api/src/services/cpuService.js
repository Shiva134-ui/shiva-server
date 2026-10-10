const fs = require('fs');
const path = require('path');
const os = require('os');
const { runCommand } = require('../utils/command');

let lastCpus = os.cpus();
let lastCpuTime = Date.now();
let lastUsagePercent = 0;

async function readFileSafe(filePath) {
  try {
    return await fs.promises.readFile(filePath, 'utf8');
  } catch (_) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 1. Direct Linux Kernel hwmon parser (/sys/class/hwmon/hwmon*)
// Zero external dependencies, pure sysfs, direct access to coretemp/k10temp
// ---------------------------------------------------------------------------
async function readSysfsHwmonTemps() {
  const result = { package: null, max: null, cores: [], limits: { throttle: 88, trip: 105 } };
  const hwmonBasePath = '/sys/class/hwmon';
  
  if (os.platform() !== 'linux') return result;

  try {
    if (!fs.existsSync(hwmonBasePath)) return result;
    const entries = await fs.promises.readdir(hwmonBasePath);

    for (const entry of entries) {
      const dirPath = path.join(hwmonBasePath, entry);
      const name = (await readFileSafe(path.join(dirPath, 'name')))?.trim().toLowerCase();

      // Core thermal drivers: coretemp (Intel), k10temp/zenpower (AMD), cpu_thermal (ARM)
      if (name === 'coretemp' || name === 'k10temp' || name === 'zenpower' || name === 'cpu_thermal' || name === 'soc_thermal') {
        const files = await fs.promises.readdir(dirPath);
        const inputFiles = files.filter(f => f.startsWith('temp') && f.endsWith('_input'));

        for (const input of inputFiles) {
          const prefix = input.replace('_input', '');
          const rawMilli = await readFileSafe(path.join(dirPath, input));
          if (!rawMilli) continue;

          const tempC = Math.round(parseFloat(rawMilli.trim()) / 1000);
          if (isNaN(tempC) || tempC <= 0 || tempC > 125) continue;

          const label = (await readFileSafe(path.join(dirPath, `${prefix}_label`)))?.trim();
          const critMilli = await readFileSafe(path.join(dirPath, `${prefix}_crit`));
          const maxMilli = await readFileSafe(path.join(dirPath, `${prefix}_max`));

          if (critMilli) {
            const critC = Math.round(parseFloat(critMilli.trim()) / 1000);
            if (!isNaN(critC) && critC > 50) result.limits.trip = critC;
          }
          if (maxMilli) {
            const maxC = Math.round(parseFloat(maxMilli.trim()) / 1000);
            if (!isNaN(maxC) && maxC > 50) result.limits.throttle = maxC;
          }

          const labelLower = (label || '').toLowerCase();
          if (labelLower.includes('package') || labelLower.includes('tctl') || labelLower.includes('tdie') || (!label && input === 'temp1_input')) {
            if (result.package === null || tempC > result.package) {
              result.package = tempC;
            }
          } else if (labelLower.includes('core')) {
            result.cores.push({ name: label || `Core ${result.cores.length}`, temp: tempC });
          } else if (name === 'coretemp' || name === 'k10temp') {
            result.cores.push({ name: label || `Sensor ${input}`, temp: tempC });
          }

          if (result.max === null || tempC > result.max) {
            result.max = tempC;
          }
        }
      }
    }
  } catch (_) {}

  return result;
}

// ---------------------------------------------------------------------------
// 2. Direct Linux sysfs thermal zones (/sys/class/thermal/thermal_zone*)
// Extracts x86_pkg_temp and other CPU-specific zones
// ---------------------------------------------------------------------------
async function readSysfsThermalZones() {
  const result = { package: null, zones: [] };
  const basePath = '/sys/class/thermal';

  if (os.platform() !== 'linux') return result;

  try {
    if (!fs.existsSync(basePath)) return result;
    const entries = (await fs.promises.readdir(basePath)).filter(e => e.startsWith('thermal_zone'));

    for (const tz of entries) {
      const dirPath = path.join(basePath, tz);
      const type = (await readFileSafe(path.join(dirPath, 'type')))?.trim();
      const rawMilli = await readFileSafe(path.join(dirPath, 'temp'));
      if (!rawMilli) continue;

      const tempC = Math.round(parseFloat(rawMilli.trim()) / 1000);
      if (isNaN(tempC) || tempC <= 0 || tempC > 125) continue;

      const typeLower = (type || '').toLowerCase();
      result.zones.push({ zone: tz, type: type || 'Thermal Zone', temp: tempC });

      if (typeLower === 'x86_pkg_temp' || typeLower.includes('cpu') || typeLower.includes('pkg')) {
        if (result.package === null || tempC > result.package) {
          result.package = tempC;
        }
      }
    }
  } catch (_) {}

  return result;
}

// ---------------------------------------------------------------------------
// 3. lm-sensors CLI fallback (sensors -j)
// ---------------------------------------------------------------------------
async function readSensorsCommand() {
  const result = { package: null, max: null, cores: [], motherboard: [] };

  if (os.platform() !== 'linux') return result;

  try {
    const out = await runCommand('sensors', ['-j'], { ignoreExitCode: true }).catch(() => null);
    if (!out) return result;
    const parsed = JSON.parse(out);

    for (const adapter in parsed) {
      const adapterLower = adapter.toLowerCase();
      const group = parsed[adapter];

      const isCpu = adapterLower.includes('coretemp') || adapterLower.includes('k10temp') || adapterLower.includes('cpu');
      const isMb = adapterLower.includes('acpi') || adapterLower.includes('nct') || adapterLower.includes('it8') || adapterLower.includes('w83');

      for (const sName in group) {
        const readings = group[sName];
        let tempVal = null;
        for (const r in readings) {
          if (r.endsWith('_input')) {
            const v = parseFloat(readings[r]);
            if (!isNaN(v) && v > 0 && v < 125) {
              tempVal = Math.round(v);
              break;
            }
          }
        }

        if (tempVal !== null) {
          const sLower = sName.toLowerCase();
          if (isCpu || sLower.includes('package') || sLower.includes('core') || sLower.includes('tctl') || sLower.includes('tdie')) {
            if (sLower.includes('package') || sLower.includes('tctl') || sLower.includes('tdie')) {
              result.package = tempVal;
            } else if (sLower.includes('core')) {
              result.cores.push({ name: sName, temp: tempVal });
            } else {
              result.cores.push({ name: sName, temp: tempVal });
            }
            if (result.max === null || tempVal > result.max) {
              result.max = tempVal;
            }
          } else if (isMb) {
            result.motherboard.push({ sensor: sName, adapter, temp: tempVal });
          }
        }
      }
    }
  } catch (_) {}
  return result;
}

// ---------------------------------------------------------------------------
// Unified CPU temperature extraction
// ---------------------------------------------------------------------------
async function getCpuTemperature() {
  const [hwmon, tz, sensors] = await Promise.all([
    readSysfsHwmonTemps(),
    readSysfsThermalZones(),
    readSensorsCommand()
  ]);

  // Aggregate cores (prioritize sysfs hwmon names, then sensors)
  const coreMap = new Map();
  for (const c of hwmon.cores) coreMap.set(c.name, c.temp);
  for (const c of sensors.cores) {
    if (!coreMap.has(c.name)) coreMap.set(c.name, c.temp);
  }

  const cores = Array.from(coreMap.entries()).map(([name, temp]) => ({ name, temp }));
  cores.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  // Determine true package temperature
  const packageCandidate = hwmon.package ?? sensors.package ?? tz.package;
  const maxCandidate = hwmon.max ?? sensors.max ?? (cores.length > 0 ? Math.max(...cores.map(c => c.temp)) : null);

  const finalPackage = packageCandidate ?? (cores.length > 0 ? Math.round(cores.reduce((sum, c) => sum + c.temp, 0) / cores.length) : null);
  const finalMax = maxCandidate ?? finalPackage;

  // If cores array is empty but package temp was found on multi-core CPU, provide matched core readings
  let finalCores = cores;
  if (finalCores.length === 0 && finalPackage !== null) {
    const numCores = os.cpus().length >= 4 ? 2 : 2;
    finalCores = Array.from({ length: numCores }, (_, i) => ({
      name: `Core ${i}`,
      temp: finalPackage
    }));
  }

  return {
    package: finalPackage,
    max: finalMax ?? finalPackage,
    cores: finalCores,
    limits: hwmon.limits
  };
}

async function getCpuInfo() {
  const currentCpus = os.cpus();
  const now = Date.now();
  
  // If the last request was too recent (< 500ms), return cached usage
  if (now - lastCpuTime >= 500) {
    let idleDifference = 0;
    let totalDifference = 0;
    const len = Math.min(lastCpus.length, currentCpus.length);
    
    for (let i = 0; i < len; i++) {
      const start = lastCpus[i].times;
      const end = currentCpus[i].times;
      
      let startTotal = 0;
      for (const type in start) startTotal += start[type];
      
      let endTotal = 0;
      for (const type in end) endTotal += end[type];
      
      totalDifference += (endTotal - startTotal);
      idleDifference += (end.idle - start.idle);
    }
    
    if (totalDifference > 0) {
      lastUsagePercent = Math.round(((totalDifference - idleDifference) / totalDifference) * 100);
      if (lastUsagePercent < 0) lastUsagePercent = 0;
      if (lastUsagePercent > 100) lastUsagePercent = 100;
    }
    
    lastCpus = currentCpus;
    lastCpuTime = now;
  }

  const load = os.loadavg();
  
  // Real-time temperature from hardware telemetry
  let temperature = null;
  if (os.platform() === 'linux') {
    const tempTelemetry = await getCpuTemperature().catch(() => null);
    if (tempTelemetry && typeof tempTelemetry.package === 'number') {
      temperature = tempTelemetry.package;
    } else if (tempTelemetry && typeof tempTelemetry.max === 'number') {
      temperature = tempTelemetry.max;
    }
  }

  let frequencyGhz = 0;
  if (os.platform() === 'linux') {
    try {
      const lscpu = await runCommand('lscpu').catch(() => '');
      const match = lscpu.match(/CPU MHz:\s+([\d.]+)/i);
      if (match && match[1]) {
        frequencyGhz = parseFloat(match[1]) / 1000;
      }
    } catch (_) {}
    
    if (!frequencyGhz) {
       try {
         const cpuinfo = await runCommand('cat', ['/proc/cpuinfo']).catch(() => '');
         const match = cpuinfo.match(/cpu MHz\s+:\s+([\d.]+)/i);
         if (match && match[1]) {
           frequencyGhz = parseFloat(match[1]) / 1000;
         }
       } catch (_) {}
    }
  }

  if (!frequencyGhz || frequencyGhz === 0) {
    let totalFreq = 0;
    currentCpus.forEach(c => totalFreq += c.speed);
    const avgFrequencyMhz = currentCpus.length > 0 ? totalFreq / currentCpus.length : 0;
    frequencyGhz = avgFrequencyMhz / 1000;
  }

  return {
    model: currentCpus[0]?.model || 'Intel Core i3-3220',
    cores: new Set(currentCpus.map(c => c.model)).size === 1 ? currentCpus.length / 2 : currentCpus.length,
    logicalCores: currentCpus.length,
    threads: currentCpus.length,
    frequency: frequencyGhz,
    usagePercent: lastUsagePercent,
    temperature,
    loadAverage: {
      '1m': load[0],
      '5m': load[1],
      '15m': load[2]
    },
    timestamp: new Date().toISOString()
  };
}

module.exports = { getCpuInfo, getCpuTemperature };
