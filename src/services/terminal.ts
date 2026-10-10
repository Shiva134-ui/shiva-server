import { apiClient } from './api';

export interface TerminalPreset {
  id: string;
  label: string;
  command: string;
  description: string;
}

export interface TerminalResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export const terminalService = {
  getPresets: (): Promise<{ presets: TerminalPreset[] }> =>
    apiClient.get('/system/terminal/presets'),

  execute: (command: string): Promise<TerminalResult> =>
    apiClient.post('/system/terminal/exec', { command })
};
