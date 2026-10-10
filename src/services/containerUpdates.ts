import { apiClient } from './api';

export interface DockerImageItem {
  id: string;
  repository: string;
  tag: string;
  createdSince: string;
  size: string;
}

export interface ContainerUpdatesResponse {
  timestamp: string;
  images: DockerImageItem[];
}

export const containerUpdateService = {
  getImages: (): Promise<ContainerUpdatesResponse> =>
    apiClient.get('/docker/updates'),

  pullImage: (image: string): Promise<{ success: boolean; image: string; output: string }> =>
    apiClient.post('/docker/updates/pull', { image })
};
