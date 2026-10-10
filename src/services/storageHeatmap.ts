import { apiClient } from './api';

export interface StorageHeatmapItem {
  name: string;
  path: string;
  isDisk?: boolean;
  diskType?: 'SSD' | 'HDD';
  rpm?: number;
  role?: string;
  totalBytes?: number;
  usedBytes: number;
  availBytes?: number;
  humanTotal?: string;
  humanUsed: string;
  humanAvail?: string;
  usedPercent?: string;
}

export interface StorageHeatmapResponse {
  timestamp: string;
  items: StorageHeatmapItem[];
}

export const storageHeatmapService = {
  getHeatmap: (): Promise<StorageHeatmapResponse> =>
    apiClient.get('/storage/heatmap')
};
