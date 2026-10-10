export interface NetworkInterface {
  name: string;
  mac: string;
  ipv4: string;
  state: 'up' | 'down';
  rx: number;
  tx: number;
}

export interface NetworkStats {
  activeInterface: string;
  connectionState: 'Connected' | 'Degraded' | 'Disconnected';
  totalRx: number;
  totalTx: number;
  interfaces: NetworkInterface[];
  addresses?: Array<{
    interface: string;
    family: 'IPv4' | 'IPv6' | string;
    address: string;
    mac: string;
    internal: boolean;
  }>;
  defaultRoute?: string | null;
}
