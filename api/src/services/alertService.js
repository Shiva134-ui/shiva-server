const { getCpuInfo } = require('./cpuService');
const { getMemoryInfo } = require('./memoryService');
const { getStorageInfo } = require('./storageService');
const { getServices } = require('./serviceManager');
const crypto = require('crypto');

async function getAlerts() {
  const alerts = [];
  
  let cpu = null;
  let memory = null;
  let storage = null;
  let services = null;

  try { cpu = await getCpuInfo(); } catch (_) {}
  try { memory = getMemoryInfo(); } catch (_) {}
  try { storage = await getStorageInfo(); } catch (_) {}
  try { services = await getServices(); } catch (_) {}

  if (cpu && cpu.usagePercent > 90) {
    alerts.push({
      id: crypto.randomUUID(),
      severity: 'critical',
      type: 'cpu',
      message: `High CPU Usage: ${cpu.usagePercent}%`,
      timestamp: new Date().toISOString()
    });
  } else if (cpu && cpu.usagePercent > 80) {
    alerts.push({
      id: crypto.randomUUID(),
      severity: 'warning',
      type: 'cpu',
      message: `Elevated CPU Usage: ${cpu.usagePercent}%`,
      timestamp: new Date().toISOString()
    });
  }

  if (memory && (memory.usagePercent > 90 || memory.usedPercent > 90)) {
    const memUsage = memory.usagePercent || Math.round(memory.usedPercent);
    alerts.push({
      id: crypto.randomUUID(),
      severity: 'critical',
      type: 'memory',
      message: `High Memory Usage: ${memUsage}%`,
      timestamp: new Date().toISOString()
    });
  }

  if (storage && Array.isArray(storage.partitions)) {
    storage.partitions.forEach(p => {
      const percent = p.usagePercent;
      if (percent != null && percent > 90) {
        alerts.push({
          id: crypto.randomUUID(),
          severity: 'critical',
          type: 'storage',
          message: `Partition ${p.mount || p.name} is almost full (${percent}%)`,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  if (services) {
    services.forEach(svc => {
      if (svc.state === 'failed' || (svc.state === 'inactive' && svc.name === 'madesh-api')) {
        alerts.push({
          id: crypto.randomUUID(),
          severity: 'critical',
          type: 'service',
          message: `Service ${svc.name} is down (${svc.state})`,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  return { alerts, timestamp: new Date().toISOString() };
}

module.exports = { getAlerts };
