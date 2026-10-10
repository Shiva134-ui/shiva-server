const { exec } = require('child_process');

const PRESETS = [
  { id: 'sensors', label: 'CPU Temperatures', command: 'sensors', description: 'Real-time core temperatures and thermal trip limit' },
  { id: 'docker-stats', label: 'Container Stats', command: 'docker stats --no-stream', description: 'Live CPU % and memory draw of active containers' },
  { id: 'df-h', label: 'Disk Partitions', command: 'df -h', description: 'Mounted drive capacities, used and free space' },
  { id: 'free-m', label: 'Memory Usage', command: 'free -m', description: 'Physical RAM and swap space in megabytes' },
  { id: 'uptime', label: 'Uptime & Load', command: 'uptime', description: 'System load averages and continuous runtime' },
  { id: 'ip-a', label: 'Network IPs', command: 'ip -brief address', description: 'Ethernet, Wi-Fi, and Tailscale IP allocations' },
  { id: 'systemctl', label: 'Active Daemons', command: 'systemctl list-units --type=service --state=running --no-pager', description: 'Running systemd background services' },
  { id: 'docker-ps', label: 'Container List', command: 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"', description: 'State and forwarded ports of containers' }
];

class TerminalService {
  getPresets() {
    return PRESETS;
  }

  execute(cmd) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      if (!cmd || typeof cmd !== 'string') {
        return resolve({ stdout: '', stderr: 'Invalid command string.', exitCode: 1, durationMs: 0 });
      }

      // Execute command with 15 second timeout
      exec(cmd, { timeout: 15000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
        const durationMs = Date.now() - startTime;
        resolve({
          stdout: stdout || '',
          stderr: (stderr || '') + (error && error.killed ? '\n[Process killed: timed out after 15 seconds]' : ''),
          exitCode: error ? (error.code || 1) : 0,
          durationMs
        });
      });
    });
  }
}

module.exports = new TerminalService();
