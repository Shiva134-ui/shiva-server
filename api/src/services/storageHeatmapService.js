const { runCommand } = require('../utils/command');

class StorageHeatmapService {
  async getHeatmap() {
    const targets = [
      { name: 'Root System (SSD)', path: '/', isDisk: true, diskType: 'SSD', role: 'System Root' },
      { name: 'Seagate Barracuda (Primary HDD • 7200 RPM)', path: '/storage/seagate', isDisk: true, diskType: 'HDD', rpm: 7200, role: 'Primary HDD' },
      { name: 'WD Blue Storage (Secondary HDD • 5400 RPM)', path: '/storage/wd', isDisk: true, diskType: 'HDD', rpm: 5400, role: 'Secondary HDD' },
      { name: 'Docker Overlay & Volumes', path: '/var/lib/docker' },
      { name: 'Server Projects & Compose', path: '/opt/madesh-server' },
      { name: 'System Logs', path: '/var/log' },
      { name: 'User Home Directory', path: '/home/madesh' },
      { name: 'Opus AI Workspaces & Data (Seagate)', path: '/storage/seagate/opus/data' },
      { name: 'Keep Notes DB & Media (Seagate)', path: '/storage/seagate/keep' },
      { name: 'Nextcloud Data (WD Blue)', path: '/storage/wd/nextcloud' },
      { name: 'Immich Photos Library (WD Blue)', path: '/storage/wd/immich' },
      { name: 'System Backups (WD Blue)', path: '/storage/wd/backups' }
    ];

    const results = [];

    for (const item of targets) {
      try {
        if (item.isDisk) {
          const dfOut = await runCommand('df', ['-B1', item.path]).catch(() => '');
          const lines = dfOut.trim().split('\n');
          if (lines.length > 1) {
            const parts = lines[1].trim().split(/\s+/);
            const totalBytes = parseInt(parts[1], 10) || 0;
            const usedBytes = parseInt(parts[2], 10) || 0;
            const availBytes = parseInt(parts[3], 10) || 0;
            results.push({
              name: item.name,
              path: item.path,
              isDisk: true,
              diskType: item.diskType,
              rpm: item.rpm,
              role: item.role,
              totalBytes,
              usedBytes,
              availBytes,
              humanTotal: this.formatBytes(totalBytes),
              humanUsed: this.formatBytes(usedBytes),
              humanAvail: this.formatBytes(availBytes),
              usedPercent: totalBytes > 0 ? ((usedBytes / totalBytes) * 100).toFixed(1) : '0'
            });
          } else if (process.platform === 'win32') {
            // Local dev fallback representing true disk architecture
            let total = 1000 * 1024 * 1024 * 1024;
            let used = 14.6 * 1024 * 1024 * 1024;
            if (item.path === '/') {
              total = 120 * 1024 * 1024 * 1024;
              used = 55.5 * 1024 * 1024 * 1024;
            } else if (item.path === '/storage/seagate') {
              total = 1000 * 1024 * 1024 * 1024;
              used = 14.6 * 1024 * 1024 * 1024;
            } else if (item.path === '/storage/wd') {
              total = 1000 * 1024 * 1024 * 1024;
              used = 22.3 * 1024 * 1024 * 1024;
            }
            const avail = total - used;
            results.push({
              name: item.name,
              path: item.path,
              isDisk: true,
              diskType: item.diskType,
              rpm: item.rpm,
              role: item.role,
              totalBytes: total,
              usedBytes: used,
              availBytes: avail,
              humanTotal: this.formatBytes(total),
              humanUsed: this.formatBytes(used),
              humanAvail: this.formatBytes(avail),
              usedPercent: ((used / total) * 100).toFixed(1)
            });
          }
        } else {
          // Folder inspection
          const duOut = await runCommand('sudo', ['du', '-s', '-B1', item.path], { timeout: 8000 }).catch(() => '');
          if (duOut) {
            const bytes = parseInt(duOut.trim().split(/\s+/)[0], 10) || 0;
            results.push({
              name: item.name,
              path: item.path,
              isDisk: false,
              usedBytes: bytes,
              humanUsed: this.formatBytes(bytes)
            });
          }
        }
      } catch (_) {}
    }

    return {
      timestamp: new Date().toISOString(),
      items: results
    };
  }

  formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
  }
}

module.exports = new StorageHeatmapService();
