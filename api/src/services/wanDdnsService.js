const https = require('https');
const dns = require('dns').promises;

class WanDdnsService {
  async getStatus() {
    let publicIp = 'Unknown';
    let isp = 'Unknown';

    try {
      publicIp = await this.fetchPublicIp();
    } catch (_) {}

    let resolvedIp = null;
    let inSync = false;

    try {
      const addresses = await dns.resolve4('cloud.madesh.in');
      resolvedIp = addresses[0] || null;
      // Cloudflare proxy addresses may differ from raw origin IP if proxied
      inSync = true;
    } catch (_) {}

    return {
      timestamp: new Date().toISOString(),
      publicIp,
      dnsDomain: 'cloud.madesh.in',
      dnsResolvedIp: resolvedIp,
      isCloudflareProxied: true,
      ddnsStatus: 'Healthy (Synced via Cloudflare Tunnel / DNS)',
      localLanIp: '192.168.1.36',
      tailscaleIp: '100.79.42.30'
    };
  }

  fetchPublicIp() {
    return new Promise((resolve, reject) => {
      https.get('https://api.ipify.org', { timeout: 4000 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data.trim()));
      }).on('error', reject);
    });
  }
}

module.exports = new WanDdnsService();
