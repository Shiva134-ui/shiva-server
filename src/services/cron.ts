import { apiClient } from './api';

export interface CronJob {
  id: string;
  lineIndex?: number;
  schedule: string;
  command: string;
  enabled: boolean;
  comment?: string;
  humanSchedule: string;
}

export interface CronResponse {
  jobs: CronJob[];
  timers: string[];
  rawCrontab: string;
}

export const cronService = {
  getJobs: (): Promise<CronResponse> =>
    apiClient.get('/system/cron'),

  addJob: (job: Partial<CronJob>): Promise<{ success: boolean; jobs: CronJob[] }> =>
    apiClient.post('/system/cron', job),

  updateJob: (id: string, updates: Partial<CronJob>): Promise<{ success: boolean; jobs: CronJob[] }> =>
    apiClient.put(`/system/cron/${id}`, updates),

  deleteJob: (id: string): Promise<{ success: boolean; jobs: CronJob[] }> =>
    apiClient.delete(`/system/cron/${id}`)
};
