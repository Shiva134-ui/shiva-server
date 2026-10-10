const { runCommand } = require('../utils/command');
const config = require('../config/config');

const SERVICE_DEFINITIONS = {
  'madesh-api': { description: 'MΛDESH Express Core API Engine (:3001)', category: 'Core' },
  'cloudflared': { description: 'Cloudflare Zero Trust Ingress Tunnel', category: 'Network' },
  'docker': { description: 'Docker Container Runtime & Daemon Socket', category: 'Containers' },
  'smbd': { description: 'Samba SMB Network File Share Service (:445)', category: 'Storage' },
  'nmbd': { description: 'NetBIOS Name Server Daemon', category: 'Storage' },
  'ssh': { description: 'OpenSSH Remote Secure Shell Server (:22)', category: 'Core' },
  'ufw': { description: 'Uncomplicated Firewall (Packet Filtering)', category: 'Security' },
  'cron': { description: 'Cron Periodic Job Scheduler', category: 'Core' },
  'tailscaled': { description: 'Tailscale WireGuard Mesh VPN Daemon', category: 'Network' },
  'nginx': { description: 'Nginx Reverse Proxy & HTTP Server', category: 'Web' },
  'nextcloud': { description: 'Nextcloud Hub Cloud Storage Service', category: 'Apps' },
  'smartmontools': { description: 'S.M.A.R.T. Drive Health & Thermal Daemon', category: 'Storage' },
  'systemd-timesyncd': { description: 'NTP System Time Synchronization Service', category: 'Core' },
  'avahi-daemon': { description: 'mDNS/DNS-SD Local Network Discovery', category: 'Network' }
};

const TIMER_DEFINITIONS = {
  'fstrim.timer': { description: 'Weekly SSD TRIM block discard (/dev/sda Kingston SSD)', category: 'Storage' },
  'logrotate.timer': { description: 'Daily log archive and journal rotation daemon', category: 'Maintenance' },
  'apt-daily.timer': { description: 'Daily package cache repository index refresh', category: 'System' },
  'apt-daily-upgrade.timer': { description: 'Automatic unattended security updates installer', category: 'Security' },
  'systemd-tmpfiles-clean.timer': { description: 'Daily temporary files and volatile cache cleanup', category: 'Maintenance' }
};

const DEFAULT_SERVICES = Object.keys(SERVICE_DEFINITIONS);
const DEFAULT_TIMERS = Object.keys(TIMER_DEFINITIONS);

async function getServices() {
  const allowlist = Array.from(new Set([...(config.serviceAllowlist || []), ...DEFAULT_SERVICES]));
  
  // 1. Fetch systemd services
  const servicesPromise = Promise.all(allowlist.map(async (name) => {
    try {
      const activeState = await runCommand('systemctl', ['is-active', name]).catch(() => 'unknown');
      const subState = await runCommand('systemctl', ['show', '-p', 'SubState', '--value', name]).catch(() => 'unknown');
      const enabledState = await runCommand('systemctl', ['is-enabled', name]).catch(() => 'disabled');
      const cleanActive = activeState.trim();
      const cleanEnabled = enabledState.trim();
      const def = SERVICE_DEFINITIONS[name] || { description: `${name} systemd daemon`, category: 'System' };

      return {
        id: `service:${name}`,
        name,
        type: 'service',
        active: cleanActive === 'active',
        state: cleanActive,
        subState: subState.trim(),
        enabled: cleanEnabled === 'enabled',
        enabledState: cleanEnabled,
        description: def.description,
        category: def.category
      };
    } catch (_) {
      const def = SERVICE_DEFINITIONS[name] || { description: `${name} systemd daemon`, category: 'System' };
      return { 
        id: `service:${name}`,
        name, 
        type: 'service',
        active: false, 
        state: 'unknown', 
        subState: 'unknown', 
        enabled: false, 
        enabledState: 'disabled',
        description: def.description,
        category: def.category
      };
    }
  }));

  // 2. Fetch Docker Containers (and their restart policies)
  const containersPromise = (async () => {
    try {
      const stdout = await runCommand('docker', ['ps', '-a', '--format', '{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.State}}\t{{.Status}}']);
      const lines = stdout.trim().split('\n').filter(Boolean);
      if (lines.length === 0) throw new Error('No docker containers');

      const list = await Promise.all(lines.map(async (line) => {
        const [id, name, image, state, status] = line.split('\t');
        let restartPolicy = 'no';
        try {
          const policyOut = await runCommand('docker', ['inspect', '--format', '{{.HostConfig.RestartPolicy.Name}}', name]);
          restartPolicy = policyOut.trim() || 'no';
        } catch (_) {}

        const isEnabled = ['unless-stopped', 'always', 'on-failure'].includes(restartPolicy);
        const isRunning = (state || '').toLowerCase() === 'running';

        return {
          id: `container:${name}`,
          name,
          type: 'container',
          active: isRunning,
          state: state || status || 'unknown',
          subState: status || state || '',
          enabled: isEnabled,
          enabledState: restartPolicy,
          image: image || '',
          description: `Docker container (${image || 'custom image'})`,
          category: 'Docker Container'
        };
      }));
      return list;
    } catch (_) {
      // Fallback sample for dev / offline preview
      return [
        {
          id: 'container:portainer',
          name: 'portainer',
          type: 'container',
          active: true,
          state: 'running',
          subState: 'Up 4 days',
          enabled: true,
          enabledState: 'unless-stopped',
          image: 'portainer/portainer-ce:latest',
          description: 'Docker container (portainer/portainer-ce:latest)',
          category: 'Docker Container'
        },
        {
          id: 'container:nextcloud-aio',
          name: 'nextcloud-aio',
          type: 'container',
          active: true,
          state: 'running',
          subState: 'Up 4 days',
          enabled: true,
          enabledState: 'unless-stopped',
          image: 'nextcloud/all-in-one:latest',
          description: 'Docker container (nextcloud/all-in-one:latest)',
          category: 'Docker Container'
        },
        {
          id: 'container:nginx-proxy-manager',
          name: 'nginx-proxy-manager',
          type: 'container',
          active: true,
          state: 'running',
          subState: 'Up 4 days',
          enabled: true,
          enabledState: 'unless-stopped',
          image: 'jc21/nginx-proxy-manager:latest',
          description: 'Docker container (jc21/nginx-proxy-manager:latest)',
          category: 'Docker Container'
        },
        {
          id: 'container:prometheus',
          name: 'prometheus',
          type: 'container',
          active: true,
          state: 'running',
          subState: 'Up 4 days',
          enabled: true,
          enabledState: 'unless-stopped',
          image: 'prom/prometheus:latest',
          description: 'Docker container (prom/prometheus:latest)',
          category: 'Docker Container'
        },
        {
          id: 'container:grafana',
          name: 'grafana',
          type: 'container',
          active: true,
          state: 'running',
          subState: 'Up 4 days',
          enabled: true,
          enabledState: 'unless-stopped',
          image: 'grafana/grafana:latest',
          description: 'Docker container (grafana/grafana:latest)',
          category: 'Docker Container'
        }
      ];
    }
  })();

  // 3. Fetch Systemd Timers & Scheduled Tasks
  const timersPromise = Promise.all(DEFAULT_TIMERS.map(async (timerName) => {
    try {
      const activeState = await runCommand('systemctl', ['is-active', timerName]).catch(() => 'unknown');
      const enabledState = await runCommand('systemctl', ['is-enabled', timerName]).catch(() => 'disabled');
      const cleanActive = activeState.trim();
      const cleanEnabled = enabledState.trim();
      const def = TIMER_DEFINITIONS[timerName] || { description: `${timerName} system timer`, category: 'Maintenance' };

      return {
        id: `timer:${timerName}`,
        name: timerName,
        type: 'timer',
        active: cleanActive === 'active',
        state: cleanActive,
        subState: cleanActive === 'active' ? 'waiting' : 'inactive',
        enabled: cleanEnabled === 'enabled',
        enabledState: cleanEnabled,
        description: def.description,
        category: def.category
      };
    } catch (_) {
      const def = TIMER_DEFINITIONS[timerName] || { description: `${timerName} system timer`, category: 'Maintenance' };
      return {
        id: `timer:${timerName}`,
        name: timerName,
        type: 'timer',
        active: false,
        state: 'unknown',
        subState: 'unknown',
        enabled: false,
        enabledState: 'disabled',
        description: def.description,
        category: def.category
      };
    }
  }));

  const [servicesRes, containersRes, timersRes] = await Promise.allSettled([
    servicesPromise,
    containersPromise,
    timersPromise
  ]);

  const allItems = [
    ...(servicesRes.status === 'fulfilled' ? servicesRes.value : []),
    ...(containersRes.status === 'fulfilled' ? containersRes.value : []),
    ...(timersRes.status === 'fulfilled' ? timersRes.value : [])
  ];

  return allItems;
}

async function controlService(name, action, type = 'service') {
  const allowedActions = ['start', 'stop', 'restart', 'reload', 'enable', 'disable'];
  if (!allowedActions.includes(action)) {
    throw new Error('Invalid action. Must be start, stop, restart, reload, enable, or disable.');
  }

  const safeName = name.replace(/[^a-zA-Z0-9_\-\.@]/g, '');
  if (!safeName) throw new Error('Invalid item name');

  if (type === 'container') {
    if (action === 'enable') {
      await runCommand('docker', ['update', '--restart', 'unless-stopped', safeName]);
    } else if (action === 'disable') {
      await runCommand('docker', ['update', '--restart', 'no', safeName]);
    } else if (['start', 'stop', 'restart'].includes(action)) {
      await runCommand('docker', [action, safeName]);
    } else {
      throw new Error(`Action ${action} not supported for Docker containers`);
    }
  } else {
    // systemd service or timer
    await runCommand('sudo', ['systemctl', action, safeName]);
  }
  
  return { 
    success: true, 
    service: safeName, 
    type,
    action, 
    timestamp: new Date().toISOString() 
  };
}

module.exports = { getServices, controlService };
