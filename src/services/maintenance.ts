import { apiClient } from './api';

export interface MaintenanceTarget {
  id: string;
  name: string;
  description: string;
  estimatedSpace: string;
  safe: boolean;
}

export interface MaintenanceAnalysis {
  rootTotal: string;
  rootFree: string;
  rootUsedPercent: string;
  targets: MaintenanceTarget[];
}

export interface CleanResult {
  success: boolean;
  freedBytes: number;
  freedMB: string;
  results: Record<string, { success: boolean; message?: string; error?: string }>;
}

export const maintenanceService = {
  analyze: (): Promise<MaintenanceAnalysis> =>
    apiClient.get('/system/maintenance/analyze'),

  clean: (targets: string[]): Promise<CleanResult> =>
    apiClient.post('/system/maintenance/clean', { targets })
};
