import { apiClient } from './api';

export interface CraftyStatus {
  craftyWebOnline: boolean;
  mcPortOnline: boolean;
  craftyUrl: string;
  serverPort: number;
  containerState: string;
  cpuPercent: string;
  memoryUsage: string;
  lastChecked: string;
}

export const craftyWidgetService = {
  getStatus: (): Promise<CraftyStatus> =>
    apiClient.get('/apps/crafty'),

  controlContainer: (action: 'start' | 'stop' | 'restart'): Promise<CraftyStatus> =>
    apiClient.post('/apps/crafty/action', { action })
};
