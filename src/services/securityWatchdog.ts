import { apiClient } from './api';

export interface ActiveSession {
  id: string;
  user: string;
  terminal: string;
  loginTime: string;
  ip: string;
}

export interface SshLogItem {
  id: string;
  type: 'accepted' | 'failed' | 'info';
  raw: string;
}

export interface SecurityWatchdogResponse {
  timestamp: string;
  activeSessions: ActiveSession[];
  recentLogs: SshLogItem[];
  firewallState: string;
  totalActiveSessions: number;
  failedAttemptsCount: number;
}

export const securityWatchdogService = {
  getStatus: (): Promise<SecurityWatchdogResponse> =>
    apiClient.get('/security/watchdog')
};
