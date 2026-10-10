const os = require('os');
const fs = require('fs');
const { formatUptime } = require('../utils/format');
const { exec } = require('child_process');

let cachedPublicIp = '117.200.157.219';
let lastIpCheck = 0;

function refreshPublicIp() {
  const now = Date.now();
  if (now - lastIpCheck < 10 * 60 * 1000) return;
  lastIpCheck = now;
  exec('curl -s -m 3 https://api.ipify.org || curl -s -m 3 https://ifconfig.me', (err, stdout) => {
    if (!err && stdout) {
      const ip = stdout.trim();
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
        cachedPublicIp = ip;
      }
    }
  });
}

function getPublicIp() {
  refreshPublicIp();
  return cachedPublicIp || '117.200.157.219';
}

function getSystemInfo() {
  const uptimeSeconds = os.uptime();
  let distro = null;

  if (os.platform() === 'linux') {
    try {
      if (fs.existsSync('/etc/os-release')) {
        const content = fs.readFileSync('/etc/os-release', 'utf8');
        const match = content.match(/^PRETTY_NAME="?([^"\n]+)"?/m);
        if (match) distro = match[1];
      }
    } catch (_) {}
  }

  let timezone = 'Asia/Kolkata';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch (_) {}

  const ifaces = os.networkInterfaces();
  let lanIp = '192.168.1.36';
  let tailscaleIp = '100.79.42.30';

  for (const [name, nets] of Object.entries(ifaces)) {
    for (const net of nets) {
      if (net.family === 'IPv4' && !net.internal) {
        if (name.includes('tailscale') || net.address.startsWith('100.')) {
          tailscaleIp = net.address;
        } else if (net.address.startsWith('192.168.') || net.address.startsWith('10.')) {
          lanIp = net.address;
        }
      }
    }
  }

  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  return {
    hostname: os.hostname(),
    platform: os.platform(),
    distro: distro || 'Ubuntu 26.04 LTS (Resolute Raccoon)',
    architecture: os.arch(),
    arch: os.arch(),
    kernel: os.release(),
    uptime: uptimeSeconds,
    uptimeSeconds,
    uptimeHuman: formatUptime(uptimeSeconds),
    uptimeFormatted: formatUptime(uptimeSeconds),
    bootTime: new Date(Date.now() - uptimeSeconds * 1000).toISOString(),
    timezone,
    lanIp,
    tailscaleIp,
    publicIp: getPublicIp(),
    cpuCount: cpus.length,
    cpuModel: cpus[0]?.model || 'Intel(R) Core(TM) i3-3220 CPU @ 3.30GHz',
    cpuCores: 2,
    cpuThreads: 4,
    totalMemory: totalMem,
    freeMemory: freeMem,
    usedMemory: usedMem,
    memoryUsagePercent: Math.round((usedMem / totalMem) * 100),
    nodeVersion: process.version,
    apiVersion: '2.0.0',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString()
  };
}

module.exports = { getSystemInfo, getPublicIp };

