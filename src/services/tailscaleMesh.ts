import { apiClient } from './api';

export interface TailscaleNode {
  id: string;
  hostname: string;
  dnsName: string;
  ip: string;
  allIps: string[];
  os: string;
  online: boolean;
  active?: boolean;
  relay?: string;
  rxBytes?: number;
  txBytes?: number;
  lastSeen?: string | null;
  isSelf: boolean;
}

export interface TailscaleMeshResponse {
  tailnetName: string;
  magicDNS: boolean;
  self: TailscaleNode;
  peers: TailscaleNode[];
  totalNodes: number;
  onlineCount: number;
  error?: string;
}

export const tailscaleMeshService = {
  getMeshStatus: (): Promise<TailscaleMeshResponse> =>
    apiClient.get('/network/tailscale-mesh')
};
