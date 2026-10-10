const { getSystemInfo } = require('./systemService');
const { getCpuInfo } = require('./cpuService');
const { getMemoryInfo } = require('./memoryService');
const { getStorageInfo } = require('./storageService');
const { getNetworkInfo } = require('./networkService');
const { getDockerInfo } = require('./dockerService');

async function getTelemetry() {
  const [system, cpu, memory, storage, network, docker] = await Promise.all([
    getSystemInfo(),
    getCpuInfo('telemetry'),
    getMemoryInfo(),
    getStorageInfo(),
    getNetworkInfo(),
    getDockerInfo()
  ]);

  return {
    system,
    cpu,
    memory,
    storage,
    network,
    docker,
    timestamp: new Date().toISOString()
  };
}

module.exports = { getTelemetry };
