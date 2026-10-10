import { apiClient } from './api';

export interface FirewallRule {
  id: string;
  to: string;
  action: string;
  from: string;
  raw: string;
}

export interface FirewallResponse {
  status: string;
  logging: string;
  defaults: {
    incoming: string;
    outgoing: string;
    routed: string;
  };
  rulesCount: number;
  rules: FirewallRule[];
  timestamp: string;
}

export interface NetworkDiagnosticsResponse {
  dns: Record<string, { resolved: boolean; addresses?: string[]; error?: string; latencyMs: number }>;
  ping: Record<string, { target: string; reachable: boolean; packetLossPercent?: number; avgLatencyMs?: number; error?: string }>;
  gateway: { ip: string; reachable: boolean; avgLatencyMs?: number | null } | null;
  tailscale: {
    online: boolean;
    backendState?: string;
    self?: { hostname?: string; tailscaleIps?: string[]; online?: boolean };
    peerCount?: number;
  } | null;
  timestamp: string;
}

export const networkService = {
  getFirewall: (): Promise<FirewallResponse> => apiClient.get('/network/firewall'),
  toggleFirewall: (enable: boolean): Promise<FirewallResponse> =>
    apiClient.post('/network/firewall/toggle', { enable }),
  addFirewallRule: (rule: { port?: string | number; proto?: string; action?: string; from?: string }): Promise<FirewallResponse> =>
    apiClient.post('/network/firewall/rules', rule),
  deleteFirewallRule: (id: string): Promise<FirewallResponse> =>
    apiClient.delete(`/network/firewall/rules/${encodeURIComponent(id)}`),
  getDiagnostics: (): Promise<NetworkDiagnosticsResponse> => apiClient.get('/network/diagnostics'),
};
