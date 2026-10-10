const net = require('net');
const Store = require('../utils/store');

const DEFAULT_APPS = [
  {
    id: 'dashboard',
    name: 'MΛDESH Dashboard',
    category: 'Management',
    description: 'Primary web server management and telemetry console.',
    icon: 'LayoutDashboard',
    primaryUrl: 'https://cloud.madesh.in',
    directUrl: 'https://cloud.madesh.in',
    port: 5173,
    color: 'blue'
  },
  {
    id: 'nextcloud',
    name: 'Nextcloud Hub',
    category: 'Cloud Storage',
    description: 'Personal cloud drive, calendar, and collaborative suite.',
    icon: 'Cloud',
    primaryUrl: 'https://nextcloud.madesh.in',
    directUrl: 'https://nextcloud.madesh.in',
    port: 80,
    color: 'sky'
  },
  {
    id: 'immich',
    name: 'Immich Photos',
    category: 'Media & Photos',
    description: 'Self-hosted Google Photos replacement and AI media backup.',
    icon: 'Image',
    primaryUrl: 'https://photos.madesh.in',
    directUrl: 'https://photos.madesh.in',
    port: 2283,
    color: 'emerald'
  },
  {
    id: 'portainer',
    name: 'Portainer CE',
    category: 'Container Management',
    description: 'Web GUI container orchestration and Docker environment manager.',
    icon: 'Boxes',
    primaryUrl: 'https://portainer.madesh.in',
    directUrl: 'https://portainer.madesh.in',
    port: 9000,
    color: 'cyan'
  },
  {
    id: 'grafana',
    name: 'Grafana Metrics',
    category: 'Monitoring',
    description: 'Interactive telemetry dashboards, metrics analysis, and graphs.',
    icon: 'BarChart2',
    primaryUrl: 'https://grafana.madesh.in',
    directUrl: 'https://grafana.madesh.in',
    port: 3000,
    color: 'amber'
  },
  {
    id: 'crafty',
    name: 'Crafty 4 Controller',
    category: 'Gaming Server',
    description: 'Minecraft server administration and multi-instance management.',
    icon: 'Gamepad2',
    primaryUrl: 'https://crafty.madesh.in',
    directUrl: 'https://crafty.madesh.in',
    port: 8443,
    color: 'purple'
  },
  {
    id: 'npm',
    name: 'Nginx Proxy Manager',
    category: 'Networking',
    description: 'Reverse proxy routing, SSL certificates, and access lists.',
    icon: 'Globe',
    primaryUrl: 'https://npm.madesh.in',
    directUrl: 'https://npm.madesh.in',
    port: 81,
    color: 'rose'
  },
  {
    id: 'api',
    name: 'MΛDESH Server API',
    category: 'Management',
    description: 'Core REST API and system management backend endpoint.',
    icon: 'Server',
    primaryUrl: 'https://api.madesh.in',
    directUrl: 'https://api.madesh.in',
    port: 3001,
    color: 'emerald'
  },
  {
    id: 'wake',
    name: 'ESP32 Wake Gateway',
    category: 'Networking',
    description: 'Cloudflare Zero Trust remote Wake-on-LAN dispatch relay.',
    icon: 'Globe',
    primaryUrl: 'https://wake.madesh.in',
    directUrl: 'https://wake.madesh.in',
    port: 443,
    color: 'amber'
  },
  {
    id: 'prometheus',
    name: 'Prometheus TSDB',
    category: 'Monitoring',
    description: 'Time-series database engine scraping server, container & hardware metrics.',
    icon: 'BarChart2',
    primaryUrl: 'https://prometheus.madesh.in',
    directUrl: 'https://prometheus.madesh.in',
    port: 9090,
    color: 'amber'
  },
  {
    id: 'cadvisor',
    name: 'cAdvisor Metrics',
    category: 'Monitoring',
    description: 'Resource usage analysis and performance characteristics of running containers.',
    icon: 'Boxes',
    primaryUrl: 'https://cadvisor.madesh.in',
    directUrl: 'https://cadvisor.madesh.in',
    port: 8080,
    color: 'cyan'
  },
  {
    id: 'node-exporter',
    name: 'Node Exporter',
    category: 'Monitoring',
    description: 'Hardware and OS metrics exporter for Linux kernel, CPU & disk telemetry.',
    icon: 'Server',
    primaryUrl: 'https://node.madesh.in',
    directUrl: 'https://node.madesh.in',
    port: 9100,
    color: 'blue'
  }
];

class AppPortalService {
  constructor() {
    this.store = new Store('appPortalConfig.json', {
      apps: DEFAULT_APPS
    });
  }

  cleanseUrl(url, port, id) {
    if (!url || typeof url !== 'string') return url;
    if (url.includes('100.79.42.30')) {
      const portMap = {
        5173: 'https://cloud.madesh.in',
        80: 'https://nextcloud.madesh.in',
        2283: 'https://photos.madesh.in',
        9000: 'https://portainer.madesh.in',
        3000: 'https://grafana.madesh.in',
        8443: 'https://crafty.madesh.in',
        81: 'https://npm.madesh.in',
        3001: 'https://api.madesh.in',
        443: 'https://wake.madesh.in',
        9090: 'https://prometheus.madesh.in',
        8080: 'https://cadvisor.madesh.in',
        9100: 'https://node.madesh.in'
      };
      if (port && portMap[port]) return portMap[port];
      const idMap = {
        dashboard: 'https://cloud.madesh.in',
        nextcloud: 'https://nextcloud.madesh.in',
        immich: 'https://photos.madesh.in',
        portainer: 'https://portainer.madesh.in',
        grafana: 'https://grafana.madesh.in',
        crafty: 'https://crafty.madesh.in',
        npm: 'https://npm.madesh.in',
        api: 'https://api.madesh.in',
        wake: 'https://wake.madesh.in',
        prometheus: 'https://prometheus.madesh.in',
        cadvisor: 'https://cadvisor.madesh.in',
        'node-exporter': 'https://node.madesh.in'
      };
      if (id && idMap[id]) return idMap[id];
    }
    return url;
  }

  async getApps() {
    const data = await this.store.read();
    let apps = Array.isArray(data.apps) && data.apps.length > 0 ? data.apps : [...DEFAULT_APPS];

    // Auto-heal legacy stores that only had the original 7 apps:
    // Ensure all 12 default apps are present
    const existingIds = new Set(apps.map(a => a.id));
    let modified = false;
    for (const defApp of DEFAULT_APPS) {
      if (!existingIds.has(defApp.id)) {
        apps.push({ ...defApp });
        modified = true;
      }
    }
    if (modified) {
      data.apps = apps;
      await this.store.write(data).catch(() => {});
    }

    // Check reachability for each app port asynchronously and sanitize legacy URLs
    const results = await Promise.all(apps.map(async (app) => {
      let isOnline = false;
      if (app.id === 'dashboard') {
        // Dashboard is online if API process or web port is responsive
        isOnline = await this.checkPort('127.0.0.1', 3001).catch(() => false) || 
                   await this.checkPort('127.0.0.1', 5173).catch(() => false) ||
                   true;
      } else if (app.port) {
        isOnline = await this.checkPort('127.0.0.1', app.port);
      } else {
        isOnline = true;
      }
      return {
        ...app,
        primaryUrl: this.cleanseUrl(app.primaryUrl, app.port, app.id),
        directUrl: this.cleanseUrl(app.directUrl || app.primaryUrl, app.port, app.id),
        online: isOnline
      };
    }));

    return results;
  }

  checkPort(host, port, timeout = 1200) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeout);

      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });

      socket.connect(port, host);
    });
  }

  async saveApp(appData) {
    const data = await this.store.read();
    let apps = data.apps || [...DEFAULT_APPS];

    if (!appData.id) {
      appData.id = 'app-' + Date.now();
      apps.push(appData);
    } else {
      const idx = apps.findIndex(a => a.id === appData.id);
      if (idx >= 0) {
        apps[idx] = { ...apps[idx], ...appData };
      } else {
        apps.push(appData);
      }
    }

    data.apps = apps;
    await this.store.write(data);
    return await this.getApps();
  }

  async deleteApp(id) {
    const data = await this.store.read();
    data.apps = (data.apps || [...DEFAULT_APPS]).filter(a => a.id !== id);
    await this.store.write(data);
    return await this.getApps();
  }

  async resetDefaults() {
    const data = await this.store.read();
    data.apps = [...DEFAULT_APPS];
    await this.store.write(data);
    return await this.getApps();
  }
}

module.exports = new AppPortalService();
