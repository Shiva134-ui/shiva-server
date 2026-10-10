import { apiClient } from './api';
import { terminalService } from './terminal';
import type { DockerContainer } from '../types/docker';

export interface DockerResourceStat {
  name: string;
  cpuPercent: number;
  memoryPercent: number;
  netRx: string;
  netTx: string;
}

export interface DockerImage {
  repository: string;
  tag: string;
  id: string;
  created: string;
  size: string;
  digest?: string | null;
}

export interface DockerVolume {
  name: string;
  driver: string;
  mountpoint: string;
  scope: string;
  labels: string;
}

export interface DockerNetwork {
  id: string;
  name: string;
  driver: string;
  scope: string;
}

export const dockerService = {
  getDocker: (options?: RequestInit): Promise<any> => apiClient.get('/docker', options),
  getContainers: (options?: RequestInit): Promise<DockerContainer[]> => apiClient.get('/docker/containers', options),
  getStats: (options?: RequestInit): Promise<DockerResourceStat[]> => apiClient.get('/docker/stats', options),
  getImages: (options?: RequestInit): Promise<DockerImage[]> => apiClient.get('/docker/images', options),
  getVolumes: (options?: RequestInit): Promise<DockerVolume[]> => apiClient.get('/docker/volumes', options),
  getNetworks: (options?: RequestInit): Promise<DockerNetwork[]> => apiClient.get('/docker/networks', options),
  controlContainer: async (name: string, action: 'start' | 'stop' | 'restart', options?: RequestInit) => {
    try {
      return await apiClient.post(`/docker/${encodeURIComponent(name)}/${action}`, {}, options);
    } catch (err: any) {
      const res = await terminalService.execute(`docker ${action} ${name}`).catch(() => null);
      if (res && res.exitCode === 0) {
        return { success: true, container: name, action };
      }
      throw err;
    }
  },
};

