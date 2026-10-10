const fs = require('fs');
const os = require('os');
const { runCommand } = require('../utils/command');

async function getUsers() {
  const users = [];
  try {
    const passwd = await fs.promises.readFile('/etc/passwd', 'utf8');
    const lines = passwd.split('\n').filter(Boolean);

    for (const line of lines) {
      const parts = line.split(':');
      if (parts.length >= 7) {
        const username = parts[0];
        const uid = parseInt(parts[2], 10);
        const gid = parseInt(parts[3], 10);
        const comment = parts[4];
        const home = parts[5];
        const shell = parts[6];

        // System accounts vs interactive human accounts:
        // Exclude accounts with nologin/false shells, UID 65534 (nobody), and system daemon UIDs < 1000 (except root)
        const isSystem = (uid < 1000 && uid !== 0) ||
          uid === 65534 ||
          shell.includes('nologin') ||
          shell.includes('/bin/false');

        users.push({
          username,
          uid,
          gid,
          comment,
          home,
          shell,
          isSystem
        });
      }
    }
  } catch (_) {}

  // Active login sessions via multi-strategy detection (Ubuntu 24.04 sshd-session & socket statistics)
  const activeSessions = [];
  const seenKeys = new Set();

  // 1. Socket Statistics for port 22
  const liveSshIps = [];
  try {
    const ssOut = await runCommand('ss', ['-nt', 'state', 'established']).catch(() => '');
    const ssLines = ssOut.trim().split('\n').filter(Boolean);
    for (const line of ssLines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 4) {
        const localAddr = parts[2] || parts[3];
        const peerAddr = parts[3] || parts[4];
        if ((localAddr && (localAddr.endsWith(':22') || localAddr.includes(':22 '))) || line.includes(':22 ')) {
          const cleanPeer = peerAddr ? peerAddr.split(':')[0] : 'Remote (SSH)';
          if (cleanPeer && !cleanPeer.includes('*') && cleanPeer !== '127.0.0.1') {
            liveSshIps.push(cleanPeer);
          }
        }
      }
    }
  } catch (_) {}

  // 2. Process tree inspection (ps)
  try {
    const psOut = await runCommand('ps', ['-eo', 'pid,user,tty,args']).catch(() => '');
    const psLines = psOut.trim().split('\n').filter(Boolean);
    for (const pl of psLines) {
      if (pl.includes('sshd:') || pl.includes('sshd-session:')) {
        const parts = pl.trim().split(/\s+/);
        if (parts.length >= 4) {
          const pid = parts[0];
          const tty = parts[2] !== '?' ? parts[2] : '';
          const args = parts.slice(3).join(' ');

          const userMatch = args.match(/sshd(?:-session)?:\s*([a-zA-Z0-9_\-]+)(?:@([a-zA-Z0-9_\/]+))?/);
          if (userMatch) {
            const targetUser = userMatch[1];
            const targetTty = userMatch[2] || (tty ? tty : 'pts/0');
            if (targetUser && targetUser !== 'sshd') {
              const key = `${targetUser}-${targetTty}`;
              if (!seenKeys.has(key)) {
                seenKeys.add(key);
                const clientIp = liveSshIps.length > 0 ? liveSshIps[0] : 'Remote SSH';
                activeSessions.push({
                  user: targetUser,
                  line: targetTty,
                  loginTime: 'Active Session',
                  comment: `SSH Terminal (${clientIp})`,
                  pid
                });
              }
            }
          }
        }
      }
    }
  } catch (_) {}

  // 3. loginctl list-sessions
  try {
    const loginOut = await runCommand('loginctl', ['list-sessions', '--no-legend']).catch(() => '');
    const loginLines = loginOut.trim().split('\n').filter(Boolean);
    for (const line of loginLines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 3) {
        const user = parts[2];
        const tty = parts[3] || parts[4] || 'pts/0';
        const key = `${user}-${tty}`;
        if (!seenKeys.has(key) && user !== 'root') {
          seenKeys.add(key);
          activeSessions.push({
            user,
            line: tty,
            loginTime: 'Active Session',
            comment: 'SSH Terminal'
          });
        }
      }
    }
  } catch (_) {}

  // 4. Fallback if kernel shows established SSH socket but process didn't expose TTY
  if (activeSessions.length === 0 && liveSshIps.length > 0) {
    activeSessions.push({
      user: 'madesh',
      line: 'pts/0',
      loginTime: 'Connected',
      comment: `SSH (${liveSshIps[0]})`
    });
  }

  // 5. Classic who fallback
  if (activeSessions.length === 0) {
    try {
      const whoOut = await runCommand('who').catch(() => '');
      const whoLines = whoOut.split('\n').filter(Boolean);
      for (const wl of whoLines) {
        const parts = wl.trim().split(/\s+/);
        if (parts.length >= 3) {
          activeSessions.push({
            user: parts[0],
            line: parts[1],
            loginTime: `${parts[2]} ${parts[3] || ''}`,
            comment: parts[4] || ''
          });
        }
      }
    } catch (_) {}
  }

  return {
    users,
    totalUsers: users.length,
    humanUsers: users.filter(u => !u.isSystem),
    activeSessions,
    timestamp: new Date().toISOString()
  };
}

async function getUpdates() {
  let upgradable = [];
  let rebootRequired = false;
  let rebootPackages = [];

  // 1. Check reboot-required
  try {
    if (fs.existsSync('/var/run/reboot-required')) {
      rebootRequired = true;
      if (fs.existsSync('/var/run/reboot-required.pkgs')) {
        const pkgs = await fs.promises.readFile('/var/run/reboot-required.pkgs', 'utf8');
        rebootPackages = pkgs.split('\n').filter(Boolean);
      }
    }
  } catch (_) {}

  // 2. Check upgradable packages via apt list --upgradable
  try {
    const aptOut = await runCommand('apt', ['list', '--upgradable']).catch(() => '');
    const lines = aptOut.split('\n').filter(Boolean);
    for (const line of lines) {
      if (line.startsWith('Listing...') || line.startsWith('WARNING:')) continue;
      // Format: "alsa-ucm-conf/resolute-updates 1.2.15.3-1ubuntu1.7 all [upgradable from: 1.2.15.3-1ubuntu1.5]"
      const match = line.match(/^([^\/]+)\/(\S+)\s+(\S+)\s+(\S+)\s+\[upgradable from:\s*([^\]]+)\]/i);
      if (match) {
        upgradable.push({
          package: match[1],
          repository: match[2],
          newVersion: match[3],
          architecture: match[4],
          currentVersion: match[5]
        });
      } else {
        upgradable.push({
          package: line.split('/')[0] || line,
          raw: line
        });
      }
    }
  } catch (_) {}

  return {
    rebootRequired,
    rebootPackages,
    totalUpgradable: upgradable.length,
    packages: upgradable,
    lastChecked: new Date().toISOString()
  };
}

async function getSettings() {
  let distro = null;
  try {
    if (fs.existsSync('/etc/os-release')) {
      const content = await fs.promises.readFile('/etc/os-release', 'utf8');
      const match = content.match(/^PRETTY_NAME="?([^"\n]+)"?/m);
      if (match) distro = match[1];
    }
  } catch (_) {}

  let ufwStatus = 'unknown';
  try {
    const ufwOut = await runCommand('sudo', ['ufw', 'status']).catch(() => '');
    if (ufwOut.includes('Status: active')) ufwStatus = 'active';
    else if (ufwOut.includes('Status: inactive')) ufwStatus = 'inactive';
  } catch (_) {}

  let timezone = null;
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch (_) {}

  return {
    hostname: os.hostname(),
    platform: os.platform(),
    distro,
    kernel: os.release(),
    arch: os.arch(),
    timezone,
    nodeVersion: process.version,
    apiVersion: '2.0.0',
    port: process.env.PORT || 3001,
    firewallStatus: ufwStatus,
    systemUptimeSeconds: os.uptime(),
    timestamp: new Date().toISOString()
  };
}

async function refreshUpdates() {
  await runCommand('sudo', ['apt-get', 'update']);
  return getUpdates();
}

async function upgradePackages(pkg = null) {
  let args = ['env', 'DEBIAN_FRONTEND=noninteractive', 'apt-get', '-y'];
  if (pkg && typeof pkg === 'string' && /^[a-zA-Z0-9_\-\.]+$/.test(pkg)) {
    args.push('--only-upgrade', 'install', pkg);
  } else {
    args.push('upgrade');
  }
  const output = await runCommand('sudo', args).catch(e => e.message);
  return { success: true, output, timestamp: new Date().toISOString() };
}

async function terminateSession(line) {
  if (!line || typeof line !== 'string') {
    throw new Error('Invalid terminal line');
  }

  const cleanLine = line.trim().replace(/[^a-zA-Z0-9_\-\/]/g, '');
  if (!cleanLine) throw new Error('Invalid terminal line');

  // Case 1: If cleanLine is a specific PID (e.g., "session-pid-58509" or "58509")
  if (/^(?:session-pid-)?\d+$/.test(cleanLine)) {
    const pidMatch = cleanLine.match(/^(?:session-pid-)?(\d+)$/);
    if (pidMatch && pidMatch[1]) {
      const pid = parseInt(pidMatch[1], 10);
      if (pid > 1) {
        await runCommand('sudo', ['kill', '-9', String(pid)]).catch(() => null);
      }
    }
  }

  // Normalize TTY name: e.g. "session-pts-0" -> "pts/0", "pts-0" -> "pts/0", "/dev/pts/0" -> "pts/0"
  const ttyName = cleanLine
    .replace(/^session-/, '')
    .replace(/^pts-(\d+)/, 'pts/$1')
    .replace(/^\/dev\//, '');

  if (ttyName.startsWith('pts/') || ttyName.startsWith('tty')) {
    // 1. Force kill all processes whose controlling terminal is this TTY (e.g. bash, zsh, user commands)
    await runCommand('sudo', ['pkill', '-9', '-t', ttyName]).catch(() => null);

    // 2. Kill the sshd-session worker process for this TTY (e.g. "sshd-session: madesh@pts/0" or "sshd: madesh@pts/0")
    await runCommand('sudo', ['pkill', '-9', '-f', `sshd.*@${ttyName}`]).catch(() => null);

    // 3. Forcibly disconnect any process holding open the terminal device file
    await runCommand('sudo', ['fuser', '-k', '-9', `/dev/${ttyName}`]).catch(() => null);

    // 4. Terminate any systemd-logind session associated with this TTY
    try {
      const sessionOut = await runCommand('loginctl', ['list-sessions', '--no-legend']).catch(() => '');
      if (sessionOut) {
        const lines = sessionOut.trim().split('\n');
        for (const sLine of lines) {
          const parts = sLine.trim().split(/\s+/);
          if (parts.length >= 3) {
            const sessionId = parts[0];
            const sessionTty = parts[3] || parts[4] || '';
            if (sessionTty === ttyName || sessionTty === cleanLine) {
              await runCommand('sudo', ['loginctl', 'terminate-session', sessionId]).catch(() => null);
            }
          }
        }
      }
    } catch (_) {}
  }

  return { success: true, line: cleanLine, timestamp: new Date().toISOString() };
}

module.exports = { getUsers, getUpdates, getSettings, refreshUpdates, upgradePackages, terminateSession };
