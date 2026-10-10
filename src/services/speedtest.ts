import { apiClient } from './api';

export interface SpeedtestResult {
  id: string;
  timestamp: string;
  pingMs: number;
  jitterMs: number;
  gatewayPingMs: number;
  downloadMbps: number;
  uploadMbps: number;
  server: string;
  status: 'success' | 'error';
}

export interface SpeedtestStatus {
  running: boolean;
  lastTest: SpeedtestResult | null;
  history: SpeedtestResult[];
}

export const speedtestService = {
  getStatus: (): Promise<SpeedtestStatus> =>
    apiClient.get('/network/speedtest'),

  runTest: (): Promise<SpeedtestResult> =>
    apiClient.post('/network/speedtest/run', {})
};
