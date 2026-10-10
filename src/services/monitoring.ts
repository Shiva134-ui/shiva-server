import { apiClient } from './api';

export interface MetricSnapshot {
  metric: 'cpu' | 'memory' | 'storage';
  value: number;
  unit: 'percent';
  timestamp: string;
}

export const monitoringService = {
  getMetric: (metric: MetricSnapshot['metric']): Promise<MetricSnapshot> =>
    apiClient.get(`/monitoring/chart?metric=${metric}`),
};
