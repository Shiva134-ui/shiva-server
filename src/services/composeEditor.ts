import { apiClient } from './api';

export interface ComposeFileItem {
  name: string;
  relPath: string;
  fullPath: string;
  sizeBytes: number;
}

export const composeEditorService = {
  listFiles: (): Promise<{ files: ComposeFileItem[] }> =>
    apiClient.get('/docker/compose-files/files'),

  readFile: (relPath: string): Promise<{ relPath: string; fullPath: string; content: string }> =>
    apiClient.get(`/docker/compose-files/read?path=${encodeURIComponent(relPath)}`),

  saveFile: (relPath: string, content: string): Promise<{ success: boolean; backupCreated: string; validation: string }> =>
    apiClient.post('/docker/compose-files/save', { path: relPath, content })
};
