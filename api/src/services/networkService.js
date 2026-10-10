const os = require('os');
const { runCommand } = require('../utils/command');
const { getPublicIp } = require('./systemService');

async function getNetworkInfo() {
  const interfaces = os.networkInterfaces();
  const parsedInterfaces = [];
  const addresses = [];

  let lanIp = '192.168.1.36';
  let tailscaleIp = '100.79.42.30';
  let activeInterface = 'enp2s0';

  for (const [name, nets] of Object.entries(interfaces)) {
    let rx = 0;
    let tx = 0;

    // Try to get RX/TX from sysfs on Linux
    if (os.platform() === 'linux') {
      try {
        const rxStr = await runCommand('cat', [`/sys/class/net/${name}/statistics/rx_bytes`]);
        const txStr = await runCommand('cat', [`/sys/class/net/${name}/statistics/tx_bytes`]);
        rx = parseInt(rxStr, 10);
        tx = parseInt(txStr, 10);
      } catch (err) {
        // Ignore errors if sysfs not available
      }
    }

    parsedInterfaces.push({
      name,
      rx,
      tx
    });

    for (const net of nets) {
      addresses.push({
        interface: name,
        family: net.family,
        address: net.address,
        mac: net.mac,
        internal: net.internal
      });

      if (net.family === 'IPv4' && !net.internal) {
        if (name.includes('tailscale') || net.address.startsWith('100.')) {
          tailscaleIp = net.address;
        } else if (net.address.startsWith('192.168.') || net.address.startsWith('10.')) {
          lanIp = net.address;
          activeInterface = name;
        }
      }
    }
  }

  let defaultRoute = null;
  if (os.platform() === 'linux') {
    try {
      const routeStr = await runCommand('ip', ['route', 'show', 'default']);
      defaultRoute = routeStr.trim();
    } catch (err) {
      // ignore
    }
  }

  const publicIp = getPublicIp();

  return {
    interfaces: parsedInterfaces,
    addresses,
    defaultRoute,
    lanIp,
    tailscaleIp,
    publicIp,
    activeInterface,
    wan: {
      publicIp,
      isp: 'Broadband / Fiber Internet',
      gateway: '192.168.1.1',
      status: 'Connected'
    },
    timestamp: new Date().toISOString()
  };
}

module.exports = { getNetworkInfo };

