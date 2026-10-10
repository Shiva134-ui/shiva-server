import { apiClient } from './api';

export interface AppPortalItem {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  primaryUrl: string;
  directUrl?: string;
  port?: number;
  color: string;
  online?: boolean;
}

export const CANONICAL_DEFAULT_APPS: AppPortalItem[] = [
  {
    id: 'dashboard',
    name: 'MΛDESH Dashboard',
    category: 'Management',
    description: 'Primary web server management and telemetry console.',
    icon: 'LayoutDashboard',
    primaryUrl: 'https://cloud.madesh.in',
    directUrl: 'https://cloud.madesh.in',
    port: 5173,
    color: 'blue',
    online: true
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
    color: 'sky',
    online: true
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
    color: 'emerald',
    online: true
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
    color: 'cyan',
    online: true
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
    color: 'amber',
    online: true
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
    color: 'purple',
    online: true
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
    color: 'rose',
    online: true
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
    color: 'emerald',
    online: true
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
    color: 'amber',
    online: true
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
    color: 'amber',
    online: true
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
    color: 'cyan',
    online: true
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
    color: 'blue',
    online: true
  }
];

export function normalizeAppUrl(url: string, port?: number, id?: string): string {
  if (!url || typeof url !== 'string') return url;
  if (url.includes('100.79.42.30') || url.includes('127.0.0.1')) {
    const portMap: Record<number, string> = {
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

    const idMap: Record<string, string> = {
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

export const appPortalService = {
  getApps: async (): Promise<{ apps: AppPortalItem[] }> => {
    try {
      const res = await apiClient.get<{ apps: AppPortalItem[] }>('/apps/portal');
      if (res && Array.isArray(res.apps) && res.apps.length > 0) {
        // Smart merge: Ensure all 12 canonical services are present!
        // If the server config has only legacy/partial apps, merge the missing canonical services
        const serverMap = new Map<string, AppPortalItem>();
        res.apps.forEach(app => serverMap.set(app.id, app));

        const merged: AppPortalItem[] = CANONICAL_DEFAULT_APPS.map(def => {
          const s = serverMap.get(def.id);
          if (s) {
            return {
              ...def,
              ...s,
              primaryUrl: normalizeAppUrl(s.primaryUrl, s.port, s.id),
              directUrl: normalizeAppUrl(s.directUrl || s.primaryUrl, s.port, s.id)
            };
          }
          return def;
        });

        // Also append any custom user-added apps from the server
        res.apps.forEach(app => {
          if (!CANONICAL_DEFAULT_APPS.some(d => d.id === app.id)) {
            merged.push({
              ...app,
              primaryUrl: normalizeAppUrl(app.primaryUrl, app.port, app.id),
              directUrl: normalizeAppUrl(app.directUrl || app.primaryUrl, app.port, app.id)
            });
          }
        });

        try {
          localStorage.setItem('madesh_app_portal_cache', JSON.stringify(merged));
        } catch (_) {}

        return { apps: merged };
      }
      return { apps: CANONICAL_DEFAULT_APPS };
    } catch {
      try {
        const cached = localStorage.getItem('madesh_app_portal_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return { apps: parsed };
        }
      } catch (_) {}
      return { apps: CANONICAL_DEFAULT_APPS };
    }
  },

  saveApp: async (app: Partial<AppPortalItem>): Promise<{ success: boolean; apps: AppPortalItem[] }> => {
    const res = await apiClient.post<{ success: boolean; apps: AppPortalItem[] }>('/apps/portal', app);
    const updated = (res.apps || []).map(a => ({
      ...a,
      primaryUrl: normalizeAppUrl(a.primaryUrl, a.port, a.id),
      directUrl: normalizeAppUrl(a.directUrl || a.primaryUrl, a.port, a.id)
    }));
    try {
      localStorage.setItem('madesh_app_portal_cache', JSON.stringify(updated));
    } catch (_) {}
    return {
      success: res.success,
      apps: updated
    };
  },

  deleteApp: async (id: string): Promise<{ success: boolean; apps: AppPortalItem[] }> => {
    const res = await apiClient.delete<{ success: boolean; apps: AppPortalItem[] }>(`/apps/portal/${id}`);
    const updated = (res.apps || []).map(a => ({
      ...a,
      primaryUrl: normalizeAppUrl(a.primaryUrl, a.port, a.id),
      directUrl: normalizeAppUrl(a.directUrl || a.primaryUrl, a.port, a.id)
    }));
    try {
      localStorage.setItem('madesh_app_portal_cache', JSON.stringify(updated));
    } catch (_) {}
    return {
      success: res.success,
      apps: updated
    };
  },

  resetDefaults: async (): Promise<{ success: boolean; apps: AppPortalItem[] }> => {
    try {
      localStorage.setItem('madesh_app_portal_cache', JSON.stringify(CANONICAL_DEFAULT_APPS));
    } catch (_) {}

    try {
      const res = await apiClient.post<{ success: boolean; apps: AppPortalItem[] }>('/apps/portal/reset', {});
      const serverApps = res && Array.isArray(res.apps) && res.apps.length > 0 ? res.apps : CANONICAL_DEFAULT_APPS;
      
      const serverMap = new Map<string, AppPortalItem>();
      serverApps.forEach(app => serverMap.set(app.id, app));

      const merged: AppPortalItem[] = CANONICAL_DEFAULT_APPS.map(def => {
        const s = serverMap.get(def.id);
        return s ? {
          ...def,
          ...s,
          primaryUrl: normalizeAppUrl(s.primaryUrl, s.port, s.id),
          directUrl: normalizeAppUrl(s.directUrl || s.primaryUrl, s.port, s.id)
        } : def;
      });

      try {
        localStorage.setItem('madesh_app_portal_cache', JSON.stringify(merged));
      } catch (_) {}

      return {
        success: true,
        apps: merged
      };
    } catch {
      return { success: true, apps: CANONICAL_DEFAULT_APPS };
    }
  }
};
