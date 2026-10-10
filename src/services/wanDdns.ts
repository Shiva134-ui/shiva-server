import { apiClient } from './api';

export interface WanDdnsStatus {
  timestamp: string;
  publicIp: string;
  dnsDomain: string;
  dnsResolvedIp: string | null;
  isCloudflareProxied: boolean;
  ddnsStatus: string;
  localLanIp: string;
  tailscaleIp: string;
}

export const wanDdnsService = {
  getStatus: (): Promise<WanDdnsStatus> =>
    apiClient.get('/network/wan-ddns')
};
