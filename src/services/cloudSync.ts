import { apiClient } from './api';

export interface SyncProfile {
  id: string;
  name: string;
  source: string;
  destination: string;
  schedule: string;
  enabled: boolean;
  lastRun: string | null;
  lastStatus: string;
  lastLog: string;
}

export interface CloudSyncConfig {
  profiles: SyncProfile[];
  activeJobs: string[];
}

export const cloudSyncService = {
  getConfig: (): Promise<CloudSyncConfig> =>
    apiClient.get('/storage/sync'),

  triggerSync: (profileId: string): Promise<{ success: boolean; log: string }> =>
    apiClient.post('/storage/sync/trigger', { profileId }),

  saveProfile: (profile: Partial<SyncProfile>): Promise<CloudSyncConfig> =>
    apiClient.post('/storage/sync/profile', profile)
};
