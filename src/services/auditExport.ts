import { apiClient, API_BASE } from './api';

export interface AuditSnapshot {
  snapshotId: string;
  generatedAt: string;
  host: any;
  blockDevices: any[];
  dfReport: string;
  network: {
    ipAddresses: string;
    ufwStatus: string;
  };
  containers: any[];
  powerConfig: any;
  userCrontab: string;
}

export const auditExportService = {
  getAudit: (): Promise<AuditSnapshot> =>
    apiClient.get('/system/audit-export?format=json'),

  downloadAudit: async (format: 'markdown' | 'json' = 'json') => {
    try {
      if (format === 'markdown') {
        const res = await fetch(`${API_BASE}/system/audit-export?format=markdown`);
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `system-recovery-snapshot-${Date.now()}.md`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const res = await fetch(`${API_BASE}/system/audit-export?format=json`);
        const json = await res.json();
        const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `system-recovery-snapshot-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Download failed', err);
      throw err;
    }
  }
};
