import { apiClient } from './api';

export interface SystemUser {
  username: string;
  uid: number;
  gid: number;
  comment: string;
  home: string;
  shell: string;
  isSystem: boolean;
}

export interface ActiveSession {
  user: string;
  line: string;
  loginTime: string;
  comment: string;
}

export interface UsersResponse {
  users: SystemUser[];
  totalUsers: number;
  humanUsers: SystemUser[];
  activeSessions: ActiveSession[];
  timestamp: string;
}

export interface UpgradablePackage {
  package: string;
  repository?: string;
  newVersion?: string;
  architecture?: string;
  currentVersion?: string;
  raw?: string;
}

export interface UpdatesResponse {
  rebootRequired: boolean;
  rebootPackages: string[];
  totalUpgradable: number;
  packages: UpgradablePackage[];
  lastChecked: string;
}

export interface ServerSettingsResponse {
  hostname: string;
  platform: string;
  distro: string | null;
  kernel: string;
  arch: string;
  timezone: string | null;
  nodeVersion: string;
  apiVersion: string;
  port: number | string;
  firewallStatus: string;
  systemUptimeSeconds: number;
  timestamp: string;
}

export const adminService = {
  getUsers: (): Promise<UsersResponse> => apiClient.get('/admin/users'),
  terminateSession: (line: string): Promise<{ success: boolean; line: string }> =>
    apiClient.post('/admin/sessions/terminate', { line }),
  getUpdates: (): Promise<UpdatesResponse> => apiClient.get('/admin/updates'),
  refreshUpdates: (): Promise<UpdatesResponse> => apiClient.post('/admin/updates/refresh', {}),
  upgradePackages: (pkg?: string): Promise<{ success: boolean; output: string }> => apiClient.post('/admin/updates/upgrade', { package: pkg }),
  getSettings: (): Promise<ServerSettingsResponse> => apiClient.get('/admin/settings'),
  getDashboardUsers: (): Promise<any> => apiClient.get('/auth/users'),
  approveDashboardUser: (email: string): Promise<any> => apiClient.post('/auth/users/approve', { email }),
  rejectDashboardUser: (email: string): Promise<any> => apiClient.post('/auth/users/reject', { email }),
};
