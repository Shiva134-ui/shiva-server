import { apiClient } from './api';

export interface ThermalGuardStatus {
  enabled: boolean;
  currentTemp: number;
  maxTemp: number;
  coreTemps: number[];
  warningThreshold: number;
  criticalThreshold: number;
  autoThrottleEnabled: boolean;
  throttleTargets: string[];
  pausedContainers: string[];
  lastThrottleTimestamp: string | null;
  state: 'normal' | 'warning' | 'critical';
  history: { time: string; temp: number }[];
}

export const thermalGuardService = {
  getStatus: (): Promise<ThermalGuardStatus> =>
    apiClient.get('/system/thermal-guard'),

  updateConfig: (updates: Partial<ThermalGuardStatus>): Promise<ThermalGuardStatus> =>
    apiClient.post('/system/thermal-guard/config', updates),

  resumeContainers: (): Promise<{ success: boolean; resumed: string[] }> =>
    apiClient.post('/system/thermal-guard/resume', {})
};
