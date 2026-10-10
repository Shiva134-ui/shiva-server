const { runCommand } = require('../utils/command');
const dns = require('dns').promises;

async function runNetworkDiagnostics() {
  const results = {
    dns: {},
    ping: {},
    gateway: null,
    tailscale: null,
    timestamp: new Date().toISOString()
  };

  // 1. DNS Resolution checks
  const domains = ['api.madesh.in', 'google.com', 'cloudflare.com'];
  for (const domain of domains) {
    const start = Date.now();
    try {
      const addresses = await dns.resolve4(domain);
      results.dns[domain] = {
        resolved: true,
        addresses,
        latencyMs: Date.now() - start
      };
    } catch (err) {
      results.dns[domain] = {
        resolved: false,
        error: err.message,
        latencyMs: Date.now() - start
      };
    }
  }

  // 2. Ping external hosts (Cloudflare 1.1.1.1, Google 8.8.8.8)
  const targets = [
    { name: 'cloudflare_dns', ip: '1.1.1.1' },
    { name: 'google_dns', ip: '8.8.8.8' }
  ];

  for (const target of targets) {
    try {
      const out = await runCommand('ping', ['-c', '2', '-W', '2', target.ip]);
      const lossMatch = out.match(/(\d+)%\s+packet loss/i);
      const rttMatch = out.match(/rtt min\/avg\/max\/mdev = [\d.]+\/([\d.]+)\//i);
      results.ping[target.name] = {
        target: target.ip,
        reachable: true,
        packetLossPercent: lossMatch ? parseInt(lossMatch[1], 10) : 0,
        avgLatencyMs: rttMatch ? parseFloat(rttMatch[1]) : null
      };
    } catch (err) {
      results.ping[target.name] = {
        target: target.ip,
        reachable: false,
        error: err.message
      };
    }
  }

  // 3. Default Gateway Check
  try {
    const routeOut = await runCommand('ip', ['route', 'show', 'default']).catch(() => '');
    const gwMatch = routeOut.match(/default via ([\d.]+)/);
    if (gwMatch) {
      const gwIp = gwMatch[1];
      const pingOut = await runCommand('ping', ['-c', '2', '-W', '1', gwIp]).catch(() => '');
      const rttMatch = pingOut.match(/rtt min\/avg\/max\/mdev = [\d.]+\/([\d.]+)\//i);
      results.gateway = {
        ip: gwIp,
        reachable: pingOut.includes('bytes from'),
        avgLatencyMs: rttMatch ? parseFloat(rttMatch[1]) : null
      };
    }
  } catch (_) {}

  // 4. Tailscale status check
  try {
    const tsOut = await runCommand('tailscale', ['status', '--json']).catch(() => '');
    if (tsOut) {
      const tsData = JSON.parse(tsOut);
      results.tailscale = {
        online: tsData.BackendState === 'Running',
        backendState: tsData.BackendState,
        self: {
          hostname: tsData.Self?.HostName,
          tailscaleIps: tsData.Self?.TailscaleIPs,
          online: tsData.Self?.Online
        },
        peerCount: Object.keys(tsData.Peer || {}).length
      };
    }
  } catch (_) {}

  return results;
}

module.exports = { runNetworkDiagnostics };
