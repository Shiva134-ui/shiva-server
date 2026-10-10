import { apiClient } from './api';

export interface SmartAttribute {
  id: number;
  name: string;
  value: number;
  worst: number;
  thresh: number;
  raw?: number;
}

export interface SmartDeviceReport {
  device: string;
  model: string;
  serial: string;
  size: string;
  passed: boolean;
  temperature: number | null;
  powerOnHours: number | null;
  powerCycles: number | null;
  reallocatedSectors: number;
  pendingSectors: number;
  wearLevelPercent: number | null;
  healthGrade: string;
  attributes: SmartAttribute[];
}

export interface SmartDeepResponse {
  timestamp: string;
  devices: SmartDeviceReport[];
}

export const smartHealthService = {
  getDeepHealth: (): Promise<SmartDeepResponse> =>
    apiClient.get('/storage/smart-deep')
};
