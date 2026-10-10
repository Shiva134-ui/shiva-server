import { apiClient } from './api';
import { terminalService } from './terminal';
import type { AppService, AutoStartType } from '../types/services';

export const servicesService = {
  getServices: (options?: RequestInit): Promise<AppService[]> => apiClient.get('/services', options),
  controlService: async (
    name: string, 
    action: 'start' | 'stop' | 'restart' | 'reload' | 'enable' | 'disable',
    type: AutoStartType = 'service'
  ): Promise<{ success: boolean; service: string; action: string }> => {
    // 1. For Docker containers, auto-start is governed by the container's restart policy
    if (type === 'container' && (action === 'enable' || action === 'disable')) {
      const policy = action === 'enable' ? 'unless-stopped' : 'no';
      try {
        const res = await terminalService.execute(`docker update --restart ${policy} ${name}`);
        if (res && res.exitCode === 0) {
          return { success: true, service: name, action };
        }
      } catch (_) {}
    }

    // 2. Try the primary API route
    try {
      return await apiClient.post(`/services/${encodeURIComponent(name)}/${action}?type=${type}`, { type });
    } catch (err: any) {
      // 3. Fallback execution via terminal for legacy server backends
      if (type === 'container' && (action === 'enable' || action === 'disable')) {
        const policy = action === 'enable' ? 'unless-stopped' : 'no';
        const res = await terminalService.execute(`docker update --restart ${policy} ${name}`);
        if (res && res.exitCode === 0) {
          return { success: true, service: name, action };
        }
        if (res && res.exitCode !== 0 && res.stderr) {
          throw new Error(res.stderr.trim());
        }
      } else if (type === 'service' || type === 'timer') {
        const res = await terminalService.execute(`sudo systemctl ${action} ${name}`);
        if (res && res.exitCode === 0) {
          return { success: true, service: name, action };
        }
      }
      throw err;
    }
  },
};


