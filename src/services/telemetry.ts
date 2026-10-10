import { apiClient } from './api';

export const telemetryService = {
  getTelemetry: (options?: RequestInit) => apiClient.get<any>('/telemetry', options),
};

