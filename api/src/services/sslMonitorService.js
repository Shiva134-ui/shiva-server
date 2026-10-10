const tls = require('tls');

class SslMonitorService {
  constructor() {
    this.domains = [
      { domain: 'cloud.madesh.in', port: 443, name: 'Web Dashboard' },
      { domain: 'nextcloud.madesh.in', port: 443, name: 'Nextcloud Hub' },
      { domain: 'api.madesh.in', port: 443, name: 'Server Management API' },
      { domain: 'wake.madesh.in', port: 443, name: 'ESP32 Wake Gateway' }
    ];
  }

  async checkAll() {
    const results = await Promise.all(this.domains.map(d => this.checkCert(d)));
    return {
      timestamp: new Date().toISOString(),
      certificates: results
    };
  }

  checkCert({ domain, port, name }) {
    return new Promise((resolve) => {
      const socket = tls.connect(port, domain, { servername: domain, timeout: 5000 }, () => {
        try {
          const cert = socket.getPeerCertificate();
          socket.destroy();

          if (!cert || !cert.valid_to) {
            return resolve({
              domain,
              name,
              status: 'unknown',
              validTo: null,
              daysRemaining: null,
              issuer: 'Unknown',
              error: 'No certificate received'
            });
          }

          const validTo = new Date(cert.valid_to);
          const validFrom = new Date(cert.valid_from);
          const now = new Date();
          const msRemaining = validTo.getTime() - now.getTime();
          const daysRemaining = Math.floor(msRemaining / (1000 * 60 * 60 * 24));

          let status = 'valid';
          if (daysRemaining < 0) status = 'expired';
          else if (daysRemaining <= 15) status = 'expiring_soon';

          resolve({
            domain,
            name,
            status,
            validFrom: validFrom.toISOString(),
            validTo: validTo.toISOString(),
            daysRemaining,
            issuer: cert.issuer?.O || cert.issuer?.CN || "Let's Encrypt / Cloudflare",
            subject: cert.subject?.CN || domain
          });
        } catch (err) {
          resolve({ domain, name, status: 'error', error: err.message });
        }
      });

      socket.on('error', (err) => {
        socket.destroy();
        resolve({
          domain,
          name,
          status: 'unreachable',
          error: err.message
        });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({
          domain,
          name,
          status: 'timeout',
          error: 'Connection timed out'
        });
      });
    });
  }
}

module.exports = new SslMonitorService();
