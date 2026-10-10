import { apiClient } from './api';

export interface SslCertInfo {
  domain: string;
  name: string;
  status: 'valid' | 'expiring_soon' | 'expired' | 'unreachable' | 'timeout' | 'error' | 'unknown';
  validFrom?: string;
  validTo?: string;
  daysRemaining?: number | null;
  issuer?: string;
  subject?: string;
  error?: string;
}

export interface SslMonitorResponse {
  timestamp: string;
  certificates: SslCertInfo[];
}

export const sslMonitorService = {
  checkAll: (): Promise<SslMonitorResponse> =>
    apiClient.get('/security/ssl-monitor')
};
