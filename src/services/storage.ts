import { apiClient } from './api';

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  isSymlink: boolean;
  size: number;
  mtime: string | null;
  mode: string | null;
}

export interface FileListingResponse {
  currentPath: string;
  parentPath: string | null;
  isDirectory: boolean;
  totalEntries?: number;
  entries?: FileEntry[];
  timestamp: string;
}

export interface BackupItem {
  name: string;
  path: string;
  directory: string;
  sizeBytes: number;
  mtime: string;
  type: string;
}

export interface BackupResponse {
  backups: BackupItem[];
  totalCount: number;
  totalSizeBytes: number;
  monitoredDirectories: string[];
  activeTimers: string[];
  timestamp: string;
}

export interface BackupScheduleConfig {
  enabled: boolean;
  scheduleDay: number;
  scheduleTime: string;
  retentionCount?: number;
  lastBackupDate?: string | null;
  lastBackupStatus?: string;
  lastBackupFile?: string | null;
}

export const storageService = {
  getFiles: (path?: string): Promise<FileListingResponse> =>
    apiClient.get(`/storage/files${path ? `?path=${encodeURIComponent(path)}` : ''}`),
  createDirectory: (path: string): Promise<{ success: boolean; path: string }> =>
    apiClient.post('/storage/mkdir', { path }),
  deleteFile: (path: string): Promise<{ success: boolean; path: string }> =>
    apiClient.delete(`/storage/files?path=${encodeURIComponent(path)}`),
  getBackups: (): Promise<BackupResponse> => apiClient.get('/storage/backups'),
  createBackup: (): Promise<{ success: boolean; archive: string; timestamp: string }> =>
    apiClient.post('/storage/backups/create', {}),
  deleteBackup: (name: string): Promise<{ success: boolean; deleted: string }> =>
    apiClient.delete(`/storage/backups/${encodeURIComponent(name)}`),
  getBackupSchedule: (): Promise<BackupScheduleConfig> => apiClient.get('/storage/backup-schedule'),
  updateBackupSchedule: (config: Partial<BackupScheduleConfig>): Promise<BackupScheduleConfig> =>
    apiClient.post('/storage/backup-schedule', config),
};
