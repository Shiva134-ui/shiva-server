import { useServerState } from '../contexts/ServerContext';
import { Cpu, Server, HardDrive, Network, Zap } from 'lucide-react';
import LoadingScreen from '../components/ui/LoadingScreen';
import Badge from '../components/ui/Badge';
import StatCard from '../components/dashboard/StatCard';
import QuickActions from '../components/dashboard/QuickActions';
import HistoricalCharts from '../components/dashboard/HistoricalCharts';
import ServicesHealth from '../components/dashboard/ServicesHealth';
import StorageWidget from '../components/dashboard/StorageWidget';
import ThermalGuardCard from '../components/hardware/ThermalGuardCard';
import { asArray, asNumber, normalizeStorage, formatNumber, safeTime } from '../utils/safeFormat';

export default function Dashboard() {
  const { info, cpu, memory, storage, network, services, health, electricity, hardware } = useServerState();

  if (info.loading && !info.data) return <LoadingScreen />;
  
  const sysInfo = info.data || { hostname: 'MΛDESH Server (Disconnected)', platform: '--', kernel: '--', lanIp: '--', uptimeFormatted: '--' };
  const storageArray = normalizeStorage(storage.data);
  const allPartitions = storageArray.flatMap((disk: any) => asArray(disk.partitions));
  const rootDisk = allPartitions.find((p: any) => p.mount === '/') || storageArray.find((d: any) => d.type === 'SSD') || storageArray[0];
  const servicesArray = asArray(services.data);

  const formatThroughput = (mbps: number | null | undefined) => {
    const num = asNumber(mbps);
    if (num === undefined) return '--';
    const bps = num * 1e6;
    if (bps < 1000) return `${Math.round(bps)} B/s`;
    if (bps < 1e6) return `${(bps / 1000).toFixed(1)} KB/s`;
    if (bps < 1e9) return `${(bps / 1e6).toFixed(1)} MB/s`;
    return `${(bps / 1e9).toFixed(2)} GB/s`;
  };

  const memUsed = asNumber(memory.data?.used);
  const memTotal = asNumber(memory.data?.total);
  const memSubValue = (memory.status === 'ONLINE' && memUsed !== undefined && memTotal !== undefined && memTotal > 0)
    ? `${(memUsed / 1e9).toFixed(1)}GB / ${(memTotal / 1e9).toFixed(1)}GB`
    : memory.status === 'UNAVAILABLE' ? 'Unavailable' : '--';

  const rootFree = asNumber(rootDisk?.free ?? rootDisk?.freeBytes) ?? 0;
  const rootTotal = asNumber(rootDisk?.total ?? rootDisk?.totalBytes ?? rootDisk?.capacity) ?? 0;
  const rootUsed = asNumber(rootDisk?.used ?? rootDisk?.usedBytes) ?? 0;
  const rootPercent = asNumber(rootDisk?.usagePercent) ?? (rootTotal > 0 ? Math.round((rootUsed / rootTotal) * 100) : 0);

  const storageSubValue = (storage.status === 'ONLINE' && rootTotal > 0) ? (
    <span className="flex flex-col text-xs leading-tight">
      <span>{(rootFree / 1e9).toFixed(1)} GB Free</span>
      <span className="text-white/40 text-[11px]">System Disk</span>
    </span>
  ) : storage.status === 'UNAVAILABLE' ? 'Unavailable' : '--';

  const cpuFreq = asNumber(cpu.data?.frequency);
  // Prioritize true CPU core / package temperature over ambient motherboard sensor
  const rawSensors = asArray((hardware.data as any)?.sensors);
  const coreTemps = rawSensors
    .filter((s: any) => s.chip?.includes('coretemp') || s.name?.toLowerCase().includes('core') || s.name?.toLowerCase().includes('package'))
    .map((s: any) => asNumber(s.value))
    .filter((v): v is number => v !== undefined && v > 0);
  const maxCoreTemp = coreTemps.length > 0 ? Math.max(...coreTemps) : undefined;
  const cpuTemp = maxCoreTemp ?? asNumber(cpu.data?.temperature);

  const cpuSubValue = (cpu.status === 'ONLINE' && cpu.data)
    ? `${cpuFreq !== undefined && cpuFreq > 0 ? cpuFreq.toFixed(2) : '--'} GHz — ${cpuTemp !== undefined ? cpuTemp.toFixed(1) : '--'} °C`
    : cpu.status === 'UNAVAILABLE' ? 'Unavailable' : '--';

  const netRx = asNumber((network.data as any)?.throughputRxMbS);
  const netTx = asNumber((network.data as any)?.throughputTxMbS);
  const netSubValue = (network.status === 'ONLINE' && network.data && netRx !== undefined)
    ? `↓ ${formatThroughput(netRx)} • ↑ ${formatThroughput(netTx)}`
    : network.status === 'UNAVAILABLE' ? 'Unavailable' : '--';

  const netPercent = (network.status === 'ONLINE' && netRx !== undefined)
    ? Math.min(100, Math.max(netRx, netTx ?? 0) * 10)
    : 0;

  return (
    <div className="space-y-6 pb-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-normal font-serif text-[#ECECEC] mb-1">{sysInfo.hostname}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#8C8C8C]">
            <span className="flex items-center gap-1.5">
              <Badge variant={health.status === 'ONLINE' ? 'success' : 'error'}>
                {health.status}
              </Badge>
            </span>
            {(sysInfo.platform !== '--' || sysInfo.kernel !== '--') && (
              <span>{sysInfo.platform} • {sysInfo.kernel}</span>
            )}
            <span className="hidden md:inline">• IP: {(network.status === 'ONLINE' && network.data) ? (asArray((network.data as any).addresses)?.find((a: any) => a.family === 'IPv4' && !a.internal)?.address || (network.data as any).lanIp || sysInfo.lanIp || '--') : (sysInfo.lanIp || '--')}</span>
            {sysInfo.uptimeFormatted && sysInfo.uptimeFormatted !== '--' && (
              <span>• Uptime: <span className="text-[#ECECEC] font-mono">{sysInfo.uptimeFormatted}</span></span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Badge variant={info.status === 'ONLINE' ? 'success' : info.status === 'UNAUTHORIZED' ? 'warning' : 'error'}>
            {info.status === 'ONLINE' ? 'LIVE DATA' : info.status === 'UNAUTHORIZED' ? 'AUTH REQUIRED (FALLBACK)' : 'OFFLINE'}
          </Badge>
          <span className="text-[#8C8C8C] font-mono">Updated: {safeTime(info.lastUpdated)}</span>
        </div>
      </div>

      <QuickActions />

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="CPU USAGE"
          icon={<Cpu className="w-16 h-16" />}
          value={cpu.status === 'ONLINE' && cpu.data && cpu.data.usagePercent !== undefined ? `${cpu.data.usagePercent}%` : '--'}
          subValue={cpuSubValue}
          percent={cpu.status === 'ONLINE' && cpu.data?.usagePercent ? cpu.data.usagePercent : 0}
          color="#3b82f6"
          linkTo="/system-hardware"
        />
        <StatCard
          title="MEMORY"
          icon={<Server className="w-16 h-16" />}
          value={memory.status === 'ONLINE' && memory.data && (memory.data.usagePercent !== undefined || (memory.data as any).usedPercent !== undefined) ? `${memory.data.usagePercent ?? (memory.data as any).usedPercent}%` : '--'}
          subValue={memSubValue}
          percent={memory.status === 'ONLINE' && (memory.data?.usagePercent ?? (memory.data as any)?.usedPercent) ? (memory.data?.usagePercent ?? (memory.data as any)?.usedPercent) : 0}
          color="#22c55e"
          linkTo="/system-hardware"
        />
        <StatCard
          title="STORAGE"
          icon={<HardDrive className="w-16 h-16" />}
          value={storage.status === 'ONLINE' && rootPercent != null ? `${rootPercent}%` : '--'}
          subValue={storageSubValue}
          percent={storage.status === 'ONLINE' ? rootPercent : 0}
          color={rootPercent > 85 ? '#ef4444' : rootPercent > 70 ? '#eab308' : '#3b82f6'}
          linkTo="/storage-disks"
        />
        <StatCard
          title="NETWORK"
          icon={<Network className="w-16 h-16" />}
          value={network.status === 'ONLINE' && network.data ? ((network.data as any).activeInterface || 'Active') : '--'}
          subValue={netSubValue}
          percent={netPercent}
          color="#a855f7"
          linkTo="/network-interfaces"
        />
      </div>

      {/* Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col */}
        <div className="lg:col-span-2 space-y-6">
          <HistoricalCharts />
          <ServicesHealth services={servicesArray} />
        </div>

        {/* Right Col */}
        <div className="space-y-6">
          {/* Active Thermal Guard & Auto-Throttling */}
          <ThermalGuardCard />

          {/* Live Electricity Card */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-medium text-[#8C8C8C] uppercase tracking-[0.04em] flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-[#FBBF24]" /> Current Power
              </h3>
              <span className="text-xs text-[#ECECEC] hover:underline cursor-pointer" onClick={() => window.location.href = '/power-management'}>
                View Stats
              </span>
            </div>
            
            {electricity.status === 'UNAVAILABLE' || !electricity.data ? (
               <div className="text-center p-4">
                 <span className="text-[#8C8C8C] text-sm">Electricity data unavailable</span>
               </div>
            ) : (
               <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-2xl font-bold font-mono text-[#ECECEC]">
                        {electricity.data.liveWatts !== null && electricity.data.liveWatts !== undefined ? electricity.data.liveWatts : '--'} <span className="text-xs text-[#8C8C8C] font-normal">W</span>
                      </div>
                      <div className="text-[10px] font-medium text-[#8C8C8C] uppercase tracking-wider mt-1">Live Draw</div>
                    </div>
                    {electricity.data.isEstimated ? (
                      <span className="text-[10px] uppercase font-mono text-[#FBBF24] bg-[#FBBF24]/10 px-2 py-0.5 rounded border border-[#FBBF24]/20">Estimated</span>
                    ) : electricity.data.liveWatts === null || electricity.data.liveWatts === undefined ? (
                      <span className="text-[10px] uppercase font-mono text-[#F87171] bg-[#F87171]/10 px-2 py-0.5 rounded border border-[#F87171]/20">Unavailable</span>
                    ) : (
                      <span className="text-[10px] uppercase font-mono text-[#4ADE80] bg-[#4ADE80]/10 px-2 py-0.5 rounded border border-[#4ADE80]/20">Actual</span>
                    )}
                  </div>
                  
                  {/* Today Usage & Bill */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#2A2A2A]">
                    <div className="rounded-xl bg-[#141414] p-3 border border-[#2A2A2A]">
                      <div className="text-[10px] font-medium text-[#8C8C8C] uppercase tracking-wider mb-1">Today Usage</div>
                      <div className="text-base font-bold font-mono text-[#ECECEC]">
                        {formatNumber(electricity.data.today?.kWh, 2)} <span className="text-xs text-[#8C8C8C] font-normal">kWh</span>
                      </div>
                    </div>
                    <div className="rounded-xl bg-[#141414] p-3 border border-[#2A2A2A]">
                      <div className="text-[10px] font-medium text-[#8C8C8C] uppercase tracking-wider mb-1">Today Bill</div>
                      <div className="text-base font-bold font-mono text-[#4ADE80]">
                        ₹{formatNumber(electricity.data.today?.cost, 2)}
                      </div>
                    </div>
                  </div>

                  {/* This Month Stats */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <div className="text-sm font-bold font-mono text-[#ECECEC]">
                        {formatNumber(electricity.data.thisMonth?.kWh, 1)} <span className="text-xs text-[#8C8C8C] font-normal">kWh</span>
                      </div>
                      <div className="text-[10px] font-medium text-[#8C8C8C] uppercase tracking-wider">This Month</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold font-mono text-[#ECECEC]">
                        ₹{formatNumber(electricity.data.thisMonth?.cost, 0)}
                        {electricity.data.isEstimated && <span className="text-[10px] text-[#8C8C8C] font-normal ml-1">est</span>}
                      </div>
                      <div className="text-[10px] font-medium text-[#8C8C8C] uppercase tracking-wider">Month Cost</div>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-[#2A2A2A] flex justify-between items-center text-xs">
                    <span className="text-[#8C8C8C]">Lifetime</span>
                    <span className="font-mono text-[#ECECEC]">{formatNumber(electricity.data.lifetime?.kWh, 1)} kWh</span>
                  </div>
               </div>
            )}
          </div>

          <StorageWidget storage={storageArray} />
        </div>
      </div>
    </div>
  );
}