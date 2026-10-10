const net = require('net');
const { runCommand } = require('../utils/command');

class CraftyWidgetService {
  async getStatus() {
    const isCraftyWebOnline = await this.pingPort('127.0.0.1', 8443);
    const isMcServerOnline = await this.pingPort('127.0.0.1', 25565);

    let containerState = 'stopped';
    let cpuPercent = '0%';
    let memoryUsage = '0 MB';

    try {
      const psOut = await runCommand('docker', ['ps', '--filter', 'name=crafty', '--format', '{{.Status}}']).catch(() => '');
      if (psOut.trim()) {
        containerState = 'running';
        const statsOut = await runCommand('docker', ['stats', '--no-stream', '--format', '{{.CPUPerc}}\t{{.MemUsage}}', 'crafty_container']).catch(() => '');
        if (statsOut.trim()) {
          const parts = statsOut.trim().split('\t');
          cpuPercent = parts[0] || '0%';
          memoryUsage = parts[1] || '0 MB';
        }
      }
    } catch (_) {}

    return {
      craftyWebOnline: isCraftyWebOnline,
      mcPortOnline: isMcServerOnline,
      craftyUrl: 'https://crafty.madesh.in',
      serverPort: 25565,
      containerState,
      cpuPercent,
      memoryUsage,
      lastChecked: new Date().toISOString()
    };
  }

  async controlContainer(action) {
    if (!['start', 'stop', 'restart'].includes(action)) {
      throw new Error('Invalid container action');
    }

    // Try finding the container name containing crafty
    const psAll = await runCommand('docker', ['ps', '-a', '--filter', 'name=crafty', '--format', '{{.Names}}']).catch(() => '');
    const containerName = psAll.trim().split('\n')[0] || 'crafty_container';

    await runCommand('docker', [action, containerName]);
    return this.getStatus();
  }

  pingPort(host, port, timeout = 1000) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeout);
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      socket.connect(port, host);
    });
  }
}

module.exports = new CraftyWidgetService();
