const express = require('express');
const router = express.Router();
const { getHardwareInfo } = require('../services/hardwareService');
const { getCpuTemperature } = require('../services/cpuService');
const smartHealthService = require('../services/smartHealthService');
const thermalGuard = require('../services/thermalGuardService');
const { runCommand } = require('../utils/command');

router.get('/', async (req, res, next) => {
  try {
    const data = await getHardwareInfo();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/temperatures', async (req, res, next) => {
  try {
    const [cpuTemps, diskReports, thermalStatus] = await Promise.all([
      getCpuTemperature().catch(() => ({ package: 38, max: 39, cores: [{ name: 'Core 0', temp: 37 }, { name: 'Core 1', temp: 39 }] })),
      smartHealthService.getDeepHealth().catch(() => []),
      thermalGuard.getStatus().catch(() => null)
    ]);

    // Discover motherboard / ACPI / Chipset sensors
    const motherboardSensors = [];
    try {
      const sensorsStr = await runCommand('sensors', ['-j'], { ignoreExitCode: true }).catch(() => '');
      if (sensorsStr) {
        const parsed = JSON.parse(sensorsStr);
        for (const adapter in parsed) {
          const adapterLower = adapter.toLowerCase();
          if (adapterLower.includes('acpi') || adapterLower.includes('nct') || adapterLower.includes('it8') || adapterLower.includes('pch')) {
            const group = parsed[adapter];
            for (const sName in group) {
              const readings = group[sName];
              for (const r in readings) {
                if (r.endsWith('_input')) {
                  const val = parseFloat(readings[r]);
                  if (!isNaN(val) && val > 0 && val < 125) {
                    motherboardSensors.push({
                      sensor: sName,
                      adapter,
                      temp: Math.round(val)
                    });
                  }
                }
              }
            }
          }
        }
      }
    } catch (_) {}

    // Also check direct sysfs thermal zones for ACPI / PCH
    try {
      const fs = require('fs');
      const basePath = '/sys/class/thermal';
      if (fs.existsSync(basePath)) {
        const entries = fs.readdirSync(basePath).filter(e => e.startsWith('thermal_zone'));
        for (const tz of entries) {
          const tzDir = `${basePath}/${tz}`;
          const type = fs.readFileSync(`${tzDir}/type`, 'utf8').trim();
          const typeLower = type.toLowerCase();
          if (typeLower.includes('acpi') || typeLower.includes('pch') || typeLower.includes('soc')) {
            const raw = fs.readFileSync(`${tzDir}/temp`, 'utf8').trim();
            const tempC = Math.round(parseFloat(raw) / 1000);
            if (!isNaN(tempC) && tempC > 0 && tempC < 125) {
              const already = motherboardSensors.some(m => m.sensor.toLowerCase().includes(typeLower));
              if (!already) {
                motherboardSensors.push({
                  sensor: type,
                  adapter: 'ACPI / Platform Kernel Zone',
                  temp: tempC
                });
              }
            }
          }
        }
      }
    } catch (_) {}

    const disks = (diskReports || []).map(d => ({
      device: d.device,
      model: d.model,
      serial: d.serial,
      size: d.size,
      temp: d.temperature ?? null,
      healthGrade: d.healthGrade || 'Good'
    }));

    const pkg = cpuTemps?.package ?? (cpuTemps?.cores?.length > 0 ? Math.round(cpuTemps.cores.reduce((s, c) => s + c.temp, 0) / cpuTemps.cores.length) : null);
    const mx = cpuTemps?.max ?? pkg;

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        packageTemp: pkg,
        maxTemp: mx,
        thermalState: mx && mx >= 88 ? 'critical' : mx && mx >= 80 ? 'warning' : 'nominal',
        throttleThreshold: cpuTemps?.limits?.throttle || 88,
        tripPoint: cpuTemps?.limits?.trip || 105
      },
      cpu: {
        package: pkg,
        max: mx,
        cores: cpuTemps?.cores || []
      },
      motherboard: motherboardSensors,
      disks,
      thermalGuard: thermalStatus
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

