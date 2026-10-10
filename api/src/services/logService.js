const { runCommand } = require('../utils/command');

function generateDevSystemLogs(unit = null, lines = 100) {
  const now = new Date();
  const formatTime = (d) => d.toISOString().replace('T', ' ').substring(0, 19);
  const host = 'madesh-server';

  const sampleTemplates = [
    { process: 'madesh-api[12480]', level: 'info', msg: 'HTTP GET /api/v1/telemetry 200 OK 4.2ms' },
    { process: 'madesh-api[12480]', level: 'info', msg: 'FCM push channel initialized and listening' },
    { process: 'cloudflared[912]', level: 'info', msg: 'Connection established to Cloudflare Edge in MAA (Chennai)' },
    { process: 'cloudflared[912]', level: 'info', msg: 'Tunnel madesh-tunnel registered with 4 routes' },
    { process: 'docker[1420]', level: 'info', msg: 'Container nextcloud-app health status: healthy' },
    { process: 'docker[1420]', level: 'info', msg: 'Container nginx-proxy route table synchronized' },
    { process: 'tailscaled[780]', level: 'info', msg: 'WireGuard tunnel connected to tailnet [100.111.61.0/24]' },
    { process: 'tailscaled[780]', level: 'info', msg: 'DERP region 4 (BLR) latency: 18ms (direct path preferred)' },
    { process: 'sshd-session[51240]', level: 'info', msg: 'Accepted publickey for madesh from 100.111.61.111 port 52310 ssh2: ED25519' },
    { process: 'systemd-logind[820]', level: 'info', msg: 'New session 42 of user madesh' },
    { process: 'sudo[51300]', level: 'warn', msg: 'madesh : TTY=pts/1 ; PWD=/home/madesh ; USER=root ; COMMAND=/usr/bin/journalctl -f' },
    { process: 'smartmontools[650]', level: 'info', msg: 'Device: /dev/nvme0n1, PASSED, Temperature: 39 Celsius' },
    { process: 'smartmontools[650]', level: 'info', msg: 'Device: /dev/sda, PASSED, SMART Overall-Health: PASSED' },
    { process: 'madesh-api[12480]', level: 'info', msg: 'Thermal guard check: CPU 41.2°C, NVMe 39°C. Status: NOMINAL' },
    { process: 'systemd-journald[410]', level: 'info', msg: 'Runtime Journal (/run/log/journal/) is 8.0M, max 4.0G, 3.9G free.' }
  ];

  const count = Math.min(lines, 40);
  const result = [];
  for (let i = 0; i < count; i++) {
    const t = new Date(now.getTime() - (count - i) * 60000);
    const item = sampleTemplates[i % sampleTemplates.length];
    const line = `${formatTime(t)} ${host} ${item.process}: ${item.msg}`;
    result.push({
      id: i,
      timestamp: formatTime(t),
      host,
      process: item.process,
      message: item.msg,
      level: item.level,
      raw: line
    });
  }
  return result;
}

function generateDevDockerLogs(container, lines = 100) {
  const now = new Date();
  const formatTime = (d) => d.toISOString();
  const logs = [];
  const count = Math.min(lines, 30);

  for (let i = 0; i < count; i++) {
    const t = new Date(now.getTime() - (count - i) * 30000);
    const msg = `[${container}] standard output stream active, worker thread ${i % 4 + 1} processed job #${1000 + i}`;
    logs.push({
      id: i,
      timestamp: formatTime(t),
      level: 'info',
      message: msg,
      raw: `${formatTime(t)} ${msg}`
    });
  }
  return logs;
}

function generateDevAuditLogs(lines = 100) {
  const now = new Date();
  const formatTime = (d) => d.toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const rawEvents = [
    { type: 'ssh_login_success', user: 'madesh', ip: '100.111.61.111', msg: 'sshd-session[51240]: Accepted publickey for madesh from 100.111.61.111 port 52310 ssh2' },
    { type: 'session_open', user: 'madesh', msg: 'systemd-logind[820]: New session 42 of user madesh (uid=1000)' },
    { type: 'sudo_command', user: 'madesh', command: '/usr/bin/systemctl status docker', msg: 'sudo: madesh : TTY=pts/1 ; PWD=/home/madesh ; USER=root ; COMMAND=/usr/bin/systemctl status docker' },
    { type: 'sudo_command', user: 'madesh', command: '/usr/bin/journalctl -u madesh-api', msg: 'sudo: madesh : TTY=pts/1 ; PWD=/home/madesh ; USER=root ; COMMAND=/usr/bin/journalctl -u madesh-api' },
    { type: 'ssh_login_failed', user: 'root', ip: '192.168.1.15', msg: 'sshd-session[48900]: Failed password for invalid user root from 192.168.1.15 port 41200 ssh2' },
    { type: 'session_close', user: 'madesh', msg: 'systemd-logind[820]: Session 41 logged out. Waiting for processes to terminate.' }
  ];

  const count = Math.min(lines, 20);
  const result = [];
  for (let i = 0; i < count; i++) {
    const t = new Date(now.getTime() - (count - i) * 120000);
    const item = rawEvents[i % rawEvents.length];
    const ts = formatTime(t);
    const raw = `${ts} madesh-server ${item.msg}`;
    result.push({
      id: i,
      type: item.type,
      raw,
      user: item.user,
      ip: item.ip,
      command: item.command,
      timestamp: ts
    });
  }
  return result;
}

async function getSystemLogs(lines = 100, unit = null) {
  const safeLines = Math.min(Math.max(parseInt(lines, 10) || 100, 1), 500);
  const args = ['journalctl', '-n', String(safeLines), '--no-pager'];

  if (unit && typeof unit === 'string' && /^[a-zA-Z0-9_\-\.@]+$/.test(unit)) {
    args.push('-u', unit);
  }

  try {
    const stdout = await runCommand('sudo', args);
    const rawLines = stdout.split('\n').filter(Boolean);
    const parsed = rawLines.map((line, idx) => {
      // Format: "Oct 04 12:26:16 madesh-server dbus-daemon[48200]: message"
      // Or: "2026-10-07T22:30:15+05:30 madesh-server process[pid]: message"
      const match = line.match(/^([A-Z][a-z]{2}\s+\d+\s+[\d:]+|\d{4}-\d{2}-\d{2}T[\d:]+(?:\+\d{2}:\d{2}|Z)?)\s+(\S+)\s+([^:]+):\s+(.*)$/);
      let level = 'info';
      if (/error|failed|fatal|err|critical|panic|alert/i.test(line)) level = 'error';
      else if (/warn|warning/i.test(line)) level = 'warn';
      else if (/debug/i.test(line)) level = 'debug';

      if (match) {
        return {
          id: idx,
          timestamp: match[1],
          host: match[2],
          process: match[3],
          message: match[4],
          level,
          raw: line
        };
      }
      return {
        id: idx,
        timestamp: '',
        host: '',
        process: '',
        message: line,
        level,
        raw: line
      };
    });

    return {
      unit: unit || 'all',
      count: parsed.length,
      logs: parsed,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    if (process.platform === 'win32' || process.env.NODE_ENV === 'development') {
      const sample = generateDevSystemLogs(unit, safeLines);
      return {
        unit: unit || 'all',
        count: sample.length,
        logs: sample,
        timestamp: new Date().toISOString()
      };
    }
    return {
      unit: unit || 'all',
      count: 0,
      logs: [],
      error: err.message,
      timestamp: new Date().toISOString()
    };
  }
}

async function getDockerLogs(container, tail = 100) {
  if (!container || typeof container !== 'string' || !/^[a-zA-Z0-9_\-\.]+$/.test(container)) {
    throw new Error('Valid container name or ID required');
  }

  const safeTail = Math.min(Math.max(parseInt(tail, 10) || 100, 1), 1000);

  try {
    const stdout = await runCommand('docker', ['logs', '--tail', String(safeTail), '--timestamps', container]).catch(err => {
      if (err.stdout || err.stderr) {
        return (err.stdout || '') + '\n' + (err.stderr || '');
      }
      throw err;
    });

    const lines = stdout.split('\n').filter(Boolean).map((line, idx) => {
      const parts = line.split(' ');
      const timestamp = parts[0];
      const message = parts.slice(1).join(' ');
      let level = 'info';
      if (/error|failed|fatal|err|crit/i.test(line)) level = 'error';
      else if (/warn|warning/i.test(line)) level = 'warn';

      return {
        id: idx,
        timestamp,
        level,
        message: message || line,
        raw: line
      };
    });

    return {
      container,
      count: lines.length,
      logs: lines,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    if (process.platform === 'win32' || process.env.NODE_ENV === 'development') {
      const devLogs = generateDevDockerLogs(container, safeTail);
      return {
        container,
        count: devLogs.length,
        logs: devLogs,
        timestamp: new Date().toISOString()
      };
    }
    return {
      container,
      count: 0,
      logs: [],
      error: err.message,
      timestamp: new Date().toISOString()
    };
  }
}

async function getAuditLogs(lines = 100) {
  const safeLines = Math.min(Math.max(parseInt(lines, 10) || 100, 1), 500);

  try {
    const stdout = await runCommand('sudo', ['journalctl', '-u', 'ssh', '-u', 'sshd', '-u', 'ssh.socket', '-u', 'systemd-logind', '-u', 'sudo', '-n', String(safeLines), '--no-pager']);
    const rawLines = stdout.split('\n').filter(Boolean);
    const events = rawLines.map((line, idx) => {
      let type = 'system';
      if (/sshd.*(accepted|session opened)/i.test(line) || /Accepted (publickey|password)/i.test(line)) type = 'ssh_login_success';
      else if (/sshd.*(failed|invalid user)/i.test(line) || /Failed password|authentication failure/i.test(line)) type = 'ssh_login_failed';
      else if (/sudo.*COMMAND/i.test(line)) type = 'sudo_command';
      else if (/session opened/i.test(line)) type = 'session_open';
      else if (/session closed/i.test(line)) type = 'session_close';

      const userMatch = line.match(/(?:for|user|by)\s+([a-zA-Z0-9_-]+)/i);
      const ipMatch = line.match(/(?:from|rhost=)\s*([\d\.]+|[a-f0-9:]+)/i);
      const cmdMatch = line.match(/COMMAND=(.+)$/);

      return {
        id: idx,
        type,
        raw: line,
        user: userMatch ? userMatch[1] : undefined,
        ip: ipMatch ? ipMatch[1] : undefined,
        command: cmdMatch ? cmdMatch[1] : undefined,
        timestamp: line.substring(0, 15)
      };
    });

    return {
      count: events.length,
      events,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    if (process.platform === 'win32' || process.env.NODE_ENV === 'development') {
      const devAudit = generateDevAuditLogs(safeLines);
      return {
        count: devAudit.length,
        events: devAudit,
        timestamp: new Date().toISOString()
      };
    }
    return {
      count: 0,
      events: [],
      error: err.message,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = { getSystemLogs, getDockerLogs, getAuditLogs };
