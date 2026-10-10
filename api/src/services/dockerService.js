const { runCommand } = require('../utils/command');

const cache = {
  info: null,
  containers: [],
  stats: [],
  images: [],
  volumes: [],
  networks: [],
  lastUpdated: 0
};

let isPolling = false;

async function refreshContainers() {
  try {
    const stdout = await runCommand('docker', ['ps', '-a', '--format', '{{json .}}']);
    const list = stdout.trim().split('\n').filter(Boolean).map(line => {
      try {
        const c = JSON.parse(line);
        return {
          id: c.ID,
          name: c.Names,
          image: c.Image,
          status: c.Status,
          state: c.State,
          created: c.CreatedAt,
          ports: c.Ports
        };
      } catch (_) { return null; }
    }).filter(Boolean);
    if (list.length > 0) cache.containers = list;
  } catch (err) {
    console.warn('[DOCKER] refreshContainers error:', err.message);
  }
}

async function refreshStats() {
  try {
    const stdout = await runCommand('docker', ['stats', '--no-stream', '--format', '{{json .}}']);
    const lines = stdout.trim().split('\n').filter(Boolean);
    const stats = lines.map(line => {
      try {
        const s = JSON.parse(line);
        const cpuPercent = parseFloat(String(s.CPUPerc || '0').replace('%', '')) || 0;
        const memoryPercent = parseFloat(String(s.MemPerc || '0').replace('%', '')) || 0;
        const netParts = String(s.NetIO || '').split(' / ');
        return {
          name: s.Name,
          cpuPercent,
          memoryPercent,
          netRx: netParts[0] || '0B',
          netTx: netParts[1] || '0B'
        };
      } catch (_) { return null; }
    }).filter(Boolean);
    if (stats.length > 0) cache.stats = stats;
  } catch (err) {
    console.warn('[DOCKER] refreshStats error:', err.message);
  }
}

async function refreshInfo() {
  try {
    const infoStr = await runCommand('docker', ['info', '--format', '{{json .}}']);
    const info = JSON.parse(infoStr);
    cache.info = {
      version: info.ServerVersion,
      containers: info.Containers,
      running: info.ContainersRunning,
      stopped: info.ContainersStopped,
      images: info.Images,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.warn('[DOCKER] refreshInfo error:', err.message);
  }
}

async function refreshAll() {
  if (isPolling) return;
  isPolling = true;
  try {
    await Promise.allSettled([
      refreshContainers(),
      refreshInfo(),
      refreshStats()
    ]);
    cache.lastUpdated = Date.now();
  } finally {
    isPolling = false;
  }
}

// Background poller every 20 seconds
setInterval(refreshAll, 20000);
// Trigger initial warm-up immediately in background
setTimeout(refreshAll, 1000);

async function getDockerInfo() {
  if (!cache.info) {
    await refreshInfo();
  }
  return cache.info;
}

async function getContainers() {
  if (cache.containers.length === 0) {
    await refreshContainers();
  }
  return cache.containers;
}

async function getStats() {
  if (cache.stats.length === 0) {
    await refreshStats();
  }
  return cache.stats;
}

async function getImages() {
  if (cache.images.length > 0 && Date.now() - cache.lastUpdated < 60000) {
    return cache.images;
  }
  try {
    const stdout = await runCommand('docker', ['image', 'ls', '-a', '--format', '{{json .}}']);
    cache.images = stdout.trim().split('\n').filter(Boolean).map(line => {
      try {
        const image = JSON.parse(line);
        return {
          repository: image.Repository,
          tag: image.Tag,
          id: image.ID,
          created: image.CreatedAt,
          size: image.Size,
          digest: image.Digest || null
        };
      } catch (_) { return null; }
    }).filter(Boolean);
    return cache.images;
  } catch (err) {
    return cache.images;
  }
}

async function getVolumes() {
  if (cache.volumes.length > 0 && Date.now() - cache.lastUpdated < 60000) {
    return cache.volumes;
  }
  try {
    const stdout = await runCommand('docker', ['volume', 'ls', '--format', '{{json .}}']);
    cache.volumes = stdout.trim().split('\n').filter(Boolean).map(line => {
      try {
        const volume = JSON.parse(line);
        return {
          name: volume.Name,
          driver: volume.Driver,
          mountpoint: volume.Mountpoint,
          scope: volume.Scope,
          labels: volume.Labels || ''
        };
      } catch (_) { return null; }
    }).filter(Boolean);
    return cache.volumes;
  } catch (err) {
    return cache.volumes;
  }
}

async function getNetworks() {
  if (cache.networks.length > 0 && Date.now() - cache.lastUpdated < 60000) {
    return cache.networks;
  }
  try {
    const stdout = await runCommand('docker', ['network', 'ls', '--format', '{{json .}}']);
    cache.networks = stdout.trim().split('\n').filter(Boolean).map(line => {
      try {
        const network = JSON.parse(line);
        return {
          id: network.ID,
          name: network.Name,
          driver: network.Driver,
          scope: network.Scope
        };
      } catch (_) { return null; }
    }).filter(Boolean);
    return cache.networks;
  } catch (err) {
    return cache.networks;
  }
}

async function controlContainer(containerName, action) {
  const allowedActions = ['start', 'stop', 'restart', 'pause', 'unpause'];
  if (!allowedActions.includes(action)) {
    throw new Error('Invalid action. Must be start, stop, restart, pause, or unpause.');
  }

  const safeName = containerName.replace(/[^a-zA-Z0-9_\-\.]/g, '');
  if (!safeName) throw new Error('Invalid container name');

  // Validate container exists first
  try {
    await runCommand('docker', ['inspect', safeName]);
  } catch (err) {
    const notFoundError = new Error('Container not found');
    notFoundError.status = 404;
    throw notFoundError;
  }

  await runCommand('docker', [action, safeName]);
  setTimeout(refreshAll, 500);
  return { success: true, container: safeName, action, timestamp: new Date().toISOString() };
}

module.exports = { getDockerInfo, getContainers, getStats, getImages, getVolumes, getNetworks, controlContainer };
