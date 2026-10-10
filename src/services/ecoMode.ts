import { apiClient } from './api';

export interface EcoModeStatus {
  enabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  spindownHdd: boolean;
  pauseHeavyContainers: boolean;
  isCurrentlyEco: boolean;
  lastTriggered: string | null;
  hddState: string;
  targetHdd: string;
}

export const ecoModeService = {
  getStatus: (): Promise<EcoModeStatus> =>
    apiClient.get('/power/eco-mode'),

  toggleEco: (state?: boolean): Promise<EcoModeStatus> =>
    apiClient.post('/power/eco-mode/toggle', { state }),

  updateConfig: (updates: Partial<EcoModeStatus>): Promise<EcoModeStatus> =>
    apiClient.post('/power/eco-mode/config', updates)
};
