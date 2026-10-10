import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { systemService } from '../services/system';
import { dockerService } from '../services/docker';
import { telemetryService } from '../services/telemetry';
import { servicesService } from '../services/services';
import type { SystemInfo, CpuInfo, RamInfo, StorageInfo, SystemProcess, HardwareInfo, ElectricityStats } from '../types/system';
import { powerService } from '../services/powerService';
import type { DockerStats } from '../types/docker';
import type { NetworkStats } from '../types/network';
import type { AppService } from '../types/services';
import { asArray, asNumber, normalizeStorage, normalizeHardware } from '../utils/safeFormat';

export interface ResourceState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  lastUpdated: string | null;
  status: 'ONLINE' | 'OFFLINE' | 'UNAVAILABLE' | 'UNAUTHORIZED' | 'CONNECTING';
}

const initResource = <T,>(): ResourceState<T> => ({
  data: null,
  loading: true,
  error: null,
  lastUpdated: null,
  status: 'CONNECTING',
});

interface ServerContextType {
  health: ResourceState<any>;
  info: ResourceState<SystemInfo>;
  cpu: ResourceState<CpuInfo>;
  memory: ResourceState<RamInfo>;
  storage: ResourceState<StorageInfo[]>;
  network: ResourceState<NetworkStats>;
  processes: ResourceState<SystemProcess[]>;
  docker: ResourceState<DockerStats>;
  services: ResourceState<AppService[]>;
  hardware: ResourceState<HardwareInfo>;
  telemetry: ResourceState<any>;
  telemetryHistory: any[];
  electricity: ResourceState<ElectricityStats>;
  refreshAll: () => Promise<void>;
}

const ServerContext = createContext<ServerContextType | null>(null);

export function ServerProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, token } = useAuth();
  const [health, setHealth] = useState<ResourceState<any>>(initResource());
  const [info, setInfo] = useState<ResourceState<SystemInfo>>(initResource());
  const [cpu, setCpu] = useState<ResourceState<CpuInfo>>(initResource());
  const [memory, setMemory] = useState<ResourceState<RamInfo>>(initResource());
  const [storage, setStorage] = useState<ResourceState<StorageInfo[]>>(initResource());
  const [network, setNetwork] = useState<ResourceState<NetworkStats>>(initResource());
  const [processes, setProcesses] = useState<ResourceState<SystemProcess[]>>(initResource());
  const [docker, setDocker] = useState<ResourceState<DockerStats>>(initResource());
  const [services, setServices] = useState<ResourceState<AppService[]>>(initResource());
  const [hardware, setHardware] = useState<ResourceState<HardwareInfo>>(initResource());
  const [telemetry, setTelemetry] = useState<ResourceState<any>>(initResource());
  const [telemetryHistory, setTelemetryHistory] = useState<any[]>([]);
  const [electricity, setElectricity] = useState<ResourceState<ElectricityStats>>(initResource());

  const abortControllers = useRef<Record<string, AbortController>>({});
  const inFlight = useRef<Record<string, boolean>>({});

  // Used to track previous network stats for throughput calculation
  const networkPrevRef = useRef<{ timestamp: number; rx: number; tx: number } | null>(null);

  const fetchResource = async <T,>(
    key: string,
    fetchFn: (options?: RequestInit) => Promise<T>,
    setState: React.Dispatch<React.SetStateAction<ResourceState<T>>>
  ) => {
    if (inFlight.current[key]) return;
    inFlight.current[key] = true;

    const controller = new AbortController();
    abortControllers.current[key] = controller;

    try {
      let data = await fetchFn({ signal: controller.signal }) as any;
      
      // [TEMP LOGGING REQUESTED BY USER]
      if (['cpu', 'storage', 'network', 'telemetry'].includes(key)) {
        console.log(`[RAW RESPONSE] /${key}:`, data);
      }
      
      if (key === 'info' && data) {
        data = {
          ...data,
          architecture: data.arch,
          uptime: data.uptimeSeconds,
          uptimeFormatted: data.uptimeHuman
        };
      }

      if (key === 'hardware' && data) {
        data = normalizeHardware(data);
      }

      // Pass CPU exactly as provided by API schema
      if (key === 'cpu' && data) {
        // CPU provided: model, cores, logicalCores, usagePercent, loadAverage
      }
      
      if (key === 'memory' && data) {
        data = {
          ...data,
          usagePercent: data.usedPercent,
          used: data.usedBytes,
          total: data.totalBytes
        };
      }
      
      if (key === 'storage' && data) {
        data = normalizeStorage(data);
      }

      // Calculate Network Throughput
      if (key === 'network' && data) {
        const now = Date.now();
        const ifaces = asArray(data.interfaces);
        const rx = ifaces.reduce((a: number, i: any) => a + (asNumber(i.rx, 0) ?? 0), 0);
        const tx = ifaces.reduce((a: number, i: any) => a + (asNumber(i.tx, 0) ?? 0), 0);
        
        let rxMbS: number | null = null;
        let txMbS: number | null = null;
        
        if (networkPrevRef.current) {
          const { timestamp, rx: prevRx, tx: prevTx } = networkPrevRef.current;
          const timeDiff = (now - timestamp) / 1000;
          if (timeDiff > 0) {
            rxMbS = Math.max(0, (rx - prevRx) / 1e6 / timeDiff);
            txMbS = Math.max(0, (tx - prevTx) / 1e6 / timeDiff);
          }
        }
        
        networkPrevRef.current = { timestamp: now, rx, tx };
        
        data = {
          ...data,
          totalRx: rx,
          totalTx: tx,
          rx_bytes: rx,
          tx_bytes: tx,
          active_interfaces: ifaces.filter((i: any) => (asNumber(i.rx, 0) ?? 0) > 0 || (asNumber(i.tx, 0) ?? 0) > 0).length,
          activeInterface: data.defaultRoute ? (data.defaultRoute.split(' ')[4] || 'unknown') : (ifaces[0]?.name || 'unknown'),
          connectionState: data.defaultRoute ? 'Connected' : 'Disconnected',
          throughputRxMbS: rxMbS,
          throughputTxMbS: txMbS
        };
      }
      
      if (key === 'telemetry' && data) {
         const point = {
           ...data,
           cpuUsage: data.cpu?.data?.usagePercent ?? data.cpu?.usagePercent ?? 0,
           memoryUsage: data.memory?.data?.usagePercent ?? data.memory?.usagePercent ?? 0
         };
         setTelemetryHistory(prev => {
            const newHistory = [...prev, point];
            // keep last 60 points (e.g. 10 minutes at 10s intervals)
            if (newHistory.length > 60) return newHistory.slice(newHistory.length - 60);
            return newHistory;
         });
      }

      setState(() => ({
        data,
        loading: false,
        error: null,
        lastUpdated: new Date().toISOString(),
        status: 'ONLINE'
      }));
    } catch (err: any) {
      if (err.name === 'AbortError') return;

      let status: ResourceState<T>['status'] = 'OFFLINE';
      if (err.status === 401 || err.status === 403) status = 'UNAUTHORIZED';
      else if (err.status === 404 || err.status === 501) status = 'UNAVAILABLE';

      setState(prev => ({
        ...prev,
        loading: false,
        error: err,
        status,
        data: prev.data
      }));
    } finally {
      inFlight.current[key] = false;
    }
  };

  const refreshAll = async () => {
    const endpoints = [
      { key: 'health', fn: systemService.getHealth, set: setHealth },
      { key: 'info', fn: systemService.getInfo, set: setInfo },
      { key: 'cpu', fn: systemService.getCpu, set: setCpu },
      { key: 'memory', fn: systemService.getMemory, set: setMemory },
      { key: 'storage', fn: systemService.getStorage, set: setStorage },
      { key: 'network', fn: systemService.getNetwork, set: setNetwork },
      { key: 'processes', fn: systemService.getProcesses, set: setProcesses },
      { key: 'docker', fn: dockerService.getDocker, set: setDocker },
      { key: 'services', fn: servicesService.getServices, set: setServices },
      { key: 'hardware', fn: systemService.getHardware, set: setHardware },
      { key: 'telemetry', fn: telemetryService.getTelemetry, set: setTelemetry },
      { key: 'electricity', fn: powerService.getElectricityStats, set: setElectricity }
    ];

    for (let i = 0; i < endpoints.length; i++) {
      const ep = endpoints[i];
      fetchResource<any>(ep.key, ep.fn as any, ep.set as any);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;
    const timeouts: Record<string, number> = {};

    const schedulePoll = (
      key: string,
      fetchFn: () => Promise<any>,
      setState: React.Dispatch<React.SetStateAction<any>>,
      interval: number,
      delay = 0
    ) => {
      if (!isMounted) return;
      const run = async () => {
        if (!isMounted) return;
        await fetchResource(key, fetchFn, setState);
        if (isMounted) timeouts[key] = window.setTimeout(run, interval);
      };
      timeouts[key] = window.setTimeout(run, delay);
    };

    // Staggered polling to prevent reverse proxy 502 burst limits
    schedulePoll('health', systemService.getHealth, setHealth, 20000, 0);
    schedulePoll('cpu', systemService.getCpu, setCpu, 5000, 500);
    schedulePoll('memory', systemService.getMemory, setMemory, 5000, 1000);
    schedulePoll('telemetry', telemetryService.getTelemetry, setTelemetry, 10000, 1500);
    schedulePoll('info', systemService.getInfo, setInfo, 10000, 2000);
    schedulePoll('network', systemService.getNetwork, setNetwork, 10000, 2500);
    schedulePoll('processes', systemService.getProcesses, setProcesses, 10000, 3000);
    schedulePoll('docker', dockerService.getDocker, setDocker, 10000, 3500);
    schedulePoll('storage', systemService.getStorage, setStorage, 30000, 4000);
    schedulePoll('services', servicesService.getServices, setServices, 30000, 4500);
    schedulePoll('hardware', systemService.getHardware, setHardware, 30000, 5000);
    schedulePoll('electricity', powerService.getElectricityStats, setElectricity, 10000, 5500);

    return () => {
      isMounted = false;
      Object.values(timeouts).forEach(clearTimeout);
      Object.values(abortControllers.current).forEach(c => c.abort());
    };
  }, [isAuthenticated, token]);

  return (
    <ServerContext.Provider value={{
      health, info, cpu, memory, storage, network, processes, docker, services, hardware, telemetry, telemetryHistory, electricity, refreshAll
    }}>
      {children}
    </ServerContext.Provider>
  );
}

export function useServerState() {
  const context = useContext(ServerContext);
  if (!context) {
    throw new Error('useServerState must be used within a ServerProvider');
  }
  return context;
}
