import { apiClient } from './api';
import type { SystemAlert } from '../types/alerts';

export const alertsService = {
  getAlerts: async (): Promise<SystemAlert[]> => {
    const response = await apiClient.get<{ alerts: Array<{ id: string; severity: string; type: string; message: string; timestamp: string }> }>('/alerts');
    return (Array.isArray(response?.alerts) ? response.alerts : []).map(alert => ({
      id: alert.id,
      type: alert.severity === 'critical' ? 'critical' : alert.severity === 'warning' ? 'warning' : 'info',
      title: alert.type ? `${alert.type[0].toUpperCase()}${alert.type.slice(1)} alert` : 'Server alert',
      message: alert.message,
      timestamp: alert.timestamp,
      read: false
    }));
  },
};
