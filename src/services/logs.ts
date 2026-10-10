import { apiClient } from './api';

export interface SystemLogEntry {
  id: number;
  timestamp: string;
  host: string;
  process: string;
  message: string;
  level?: 'error' | 'warn' | 'info' | 'debug';
  raw: string;
}

export interface SystemLogsResponse {
  unit: string;
  count: number;
  logs: SystemLogEntry[];
  timestamp: string;
  error?: string;
}

export interface DockerLogEntry {
  id: number;
  timestamp: string;
  level?: 'error' | 'warn' | 'info';
  message: string;
  raw: string;
}

export interface DockerLogsResponse {
  container: string;
  count: number;
  logs: DockerLogEntry[];
  timestamp: string;
  error?: string;
}

export interface AuditLogEntry {
  id: number;
  type: string;
  raw: string;
  timestamp: string;
  user?: string;
  ip?: string;
  command?: string;
}

export interface AuditLogsResponse {
  count: number;
  events: AuditLogEntry[];
  timestamp: string;
  error?: string;
}

export const logsService = {
  getSystemLogs: (lines = 100, unit?: string): Promise<SystemLogsResponse> =>
    apiClient.get(`/logs/system?lines=${lines}${unit ? `&unit=${encodeURIComponent(unit)}` : ''}`),
  getDockerLogs: (container: string, tail = 100): Promise<DockerLogsResponse> =>
    apiClient.get(`/logs/docker?container=${encodeURIComponent(container)}&tail=${tail}`),
  getAuditLogs: (lines = 100): Promise<AuditLogsResponse> =>
    apiClient.get(`/logs/audit?lines=${lines}`),
};
