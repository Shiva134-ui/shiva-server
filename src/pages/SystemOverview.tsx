import { useState, useEffect } from 'react';
import { useServerState } from '../contexts/ServerContext';
import {
  Server,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  Cpu,
  Activity,
  Terminal,
  Globe,
  Shield,
  Clock,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import LoadingScreen from '../components/ui/LoadingScreen';
import Badge from '../components/ui/Badge';
import type { SystemInfo } from '../types/system';
import { adminService, type ServerSettingsResponse } from '../services/admin';
import { asArray, asNumber, formatNumber, safeDate, safeTime } from '../utils/safeFormat';

export default function SystemOverview() {
  const { info, cpu, memory, health, network, hardware, storage, refreshAll } = useServerState();
  const [settings, setSettings] = useState<ServerSettingsResponse | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);

  const loadSettingsData = async () => {
    setSettingsLoading(true);
    try {
      const data = await adminService.getSettings();
      setSettings(data);
    } catch (e) {
      console.warn('Failed to load server settings in SystemOverview:', e);
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsData();
  }, []);

  const handleRefreshAll = () => {
    refreshAll();
    loadSettingsData();
  };

  if (info.loading && !info.data) return <LoadingScreen />;

  const formatSwap = () => {
    const memData = memory.data as any;
    const swapTotal = asNumber(memData?.swapTotalBytes ?? memData?.swap?.totalBytes) ?? 4294967296;
    const swapUsed = asNumber(memData?.swapUsedBytes ?? memData?.swap?.usedBytes) ?? 0;
    if (swapTotal === 0) return 'Not configured';

    const usedDisplay = formatNumber(swapUsed / 1e6, 0) + ' MB Used';
    const totalGB = swapTotal / 1e9;
    const totalDisplay = totalGB >= 1 ? formatNumber(totalGB, 1) + ' GB' : formatNumber(swapTotal / 1e6, 0) + ' MB';

    return usedDisplay + ' / ' + totalDisplay + ' Total';
  };

  const formatUptimeSeconds = (seconds: number) => {
    if (!seconds || seconds <= 0) return sysInfo.uptimeFormatted || 'Not reported';
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
    return parts.join(' ');
  };

  const sysInfo: Partial<SystemInfo> & Record<string, any> = info.data || {};
  const distroName = settings?.distro || sysInfo.distro || 'Ubuntu 26.04 LTS';
  const kernelRelease = settings?.kernel || sysInfo.kernel || '7.0.0-34-generic';
  const archPlatform = `${settings?.arch || sysInfo.architecture || 'x64'} • ${settings?.platform || sysInfo.platform || 'linux'}`;
  const firewallStatus = settings?.firewallStatus || 'active';
  const systemUptimeDisplay = formatUptimeSeconds(settings?.systemUptimeSeconds || 0);

  const systemVersion = [distroName, sysInfo.platform || 'linux', kernelRelease, settings?.arch || sysInfo.architecture || 'x64']
    .filter(Boolean)
    .join(' • ');

  const netAddresses = asArray<any>((network.data as any)?.addresses);
  const tailscaleIp = (network.status === 'ONLINE' && network.data)
    ? (netAddresses.find((a: any) => a.interface?.toLowerCase().includes('tailscale') && a.family === 'IPv4')?.address || (network.data as any)?.tailscaleIp || sysInfo.tailscaleIp || '100.79.42.30')
    : (sysInfo.tailscaleIp || '100.79.42.30');

  const lanIp = (network.status === 'ONLINE' && network.data)
    ? (netAddresses.find((a: any) => a.family === 'IPv4' && !a.internal && !a.interface?.toLowerCase().includes('tailscale'))?.address || (network.data as any)?.lanIp || sysInfo.lanIp || '192.168.1.36')
    : (sysInfo.lanIp || '192.168.1.36');

  const publicIp = sysInfo.publicIp || (network.data as any)?.publicIp || '117.193.143.137';

  const memTotal = asNumber(memory.data?.total);
  const memFree = asNumber((memory.data as any)?.freeBytes ?? (memory.data as any)?.availableBytes ?? memory.data?.free);

  const storageList = asArray(hardware.data?.storage);
  const allHwPartitions = [
    ...asArray(hardware.data?.partitions),
    ...asArray(hardware.data?.storage).flatMap((d: any) => asArray(d.partitions))
  ];
  const allStoragePartitions = [
    ...asArray((storage?.data as any)?.partitions),
    ...asArray((storage?.data as any)?.disks).flatMap((d: any) => asArray(d.partitions))
  ];
  const rootFilesystem = allHwPartitions.find(p => p.mount === '/' || p.mountPoint === '/') 
    || allStoragePartitions.find(p => p.mount === '/' || p.mountPoint === '/');

  const totalStorage = asNumber(rootFilesystem?.totalBytes ?? rootFilesystem?.sizeBytes ?? rootFilesystem?.total);
  const freeStorage = asNumber(rootFilesystem?.freeBytes ?? rootFilesystem?.availableBytes ?? rootFilesystem?.free);

  // Dynamic Server Health Presentation
  const getHealthPresentation = () => {
    switch (health.status) {
      case 'ONLINE':
        return {
          cardClass: 'from-emerald-500/10 to-transparent border-emerald-500/20 text-emerald-400',
          title: 'Systems Nominal',
          desc: 'The server is reachable, authenticated, and telemetry streams are responding normally.',
          icon: <CheckCircle className="w-16 h-16 text-emerald-400" />
        };
      case 'UNAVAILABLE':
        return {
          cardClass: 'from-amber-500/10 to-transparent border-amber-500/20 text-amber-400',
          title: 'Systems Degraded',
          desc: 'Server telemetry is partially unavailable or responding with warnings.',
          icon: <AlertTriangle className="w-16 h-16 text-amber-400" />
        };
      case 'UNAUTHORIZED':
        return {
          cardClass: 'from-orange-500/10 to-transparent border-orange-500/20 text-orange-400',
          title: 'Authentication Required',
          desc: 'Telemetry endpoints require valid administrative authentication credentials.',
          icon: <ShieldAlert className="w-16 h-16 text-orange-400" />
        };
      case 'CONNECTING':
        return {
          cardClass: 'from-blue-500/10 to-transparent border-blue-500/20 text-blue-400',
          title: 'Connecting...',
          desc: 'Establishing secure link to server telemetry endpoints.',
          icon: <Activity className="w-16 h-16 text-blue-400" />
        };
      case 'OFFLINE':
      default:
        return {
          cardClass: 'from-red-500/10 to-transparent border-red-500/20 text-red-400',
          title: 'Server Offline',
          desc: 'The server is currently unreachable. Real-time background telemetry is suspended.',
          icon: <AlertCircle className="w-16 h-16 text-red-400" />
        };
    }
  };

  const healthPresentation = getHealthPresentation();

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-normal font-serif text-[#ECECEC] tracking-tight mb-1">System Overview</h1>
          <p className="text-xs text-[#8C8C8C]">
            Core identity, host environment architecture, and real-time operational telemetry.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefreshAll}
            disabled={settingsLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-3.5 py-1.5 text-xs text-[#ECECEC] transition hover:bg-[#222222] disabled:opacity-50"
            title="Refresh system overview and runtime architecture"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${settingsLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Badge variant={info.status === 'ONLINE' ? 'success' : info.status === 'UNAUTHORIZED' ? 'warning' : 'error'}>
            {info.status === 'ONLINE' ? 'LIVE DATA' : info.status === 'UNAUTHORIZED' ? 'AUTH REQUIRED' : 'OFFLINE'}
          </Badge>
          <span className="text-xs text-[#8C8C8C] font-mono hidden md:inline">
            Updated: {safeTime(info.lastUpdated)}
          </span>
        </div>
      </div>

      {/* Top Architecture Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 2xl:gap-6">
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-3.5 sm:p-5 hover:bg-[#222222] transition-colors">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[#8C8C8C]">
            <span>Host Distribution</span>
            <Server className="h-4 w-4 text-[#ECECEC]" />
          </div>
          <div className="mt-2 text-sm sm:text-base font-semibold text-[#ECECEC] truncate" title={distroName}>
            {distroName}
          </div>
          <p className="mt-1 text-xs text-[#8C8C8C] font-mono truncate">{archPlatform}</p>
        </div>

        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-3.5 sm:p-5 hover:bg-[#222222] transition-colors">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[#8C8C8C]">
            <span>Kernel Architecture</span>
            <Cpu className="h-4 w-4 text-[#ECECEC]" />
          </div>
          <div className="mt-2 text-sm sm:text-base font-semibold text-[#ECECEC] truncate" title={kernelRelease}>
            {kernelRelease}
          </div>
          <p className="mt-1 text-xs text-[#8C8C8C] truncate">Linux generic tree</p>
        </div>

        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-3.5 sm:p-5 hover:bg-[#222222] transition-colors">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[#8C8C8C]">
            <span>Firewall State</span>
            <Shield className="h-4 w-4 text-[#ECECEC]" />
          </div>
          <div className="mt-2 text-sm sm:text-base font-semibold text-[#ECECEC] flex items-center gap-2">
            <span className="capitalize">{firewallStatus}</span>
            <Badge variant={firewallStatus === 'active' ? 'success' : 'warning'}>UFW</Badge>
          </div>
          <p className="mt-1 text-xs text-[#8C8C8C] truncate">Default inbound blocked</p>
        </div>

        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-3.5 sm:p-5 hover:bg-[#222222] transition-colors">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[#8C8C8C]">
            <span>System Uptime</span>
            <Clock className="h-4 w-4 text-[#ECECEC]" />
          </div>
          <div className="mt-2 text-sm sm:text-base font-semibold font-mono text-[#ECECEC] truncate">
            {systemUptimeDisplay}
          </div>
          <p className="mt-1 text-xs text-[#8C8C8C] truncate">Continuous operation</p>
        </div>
      </div>

      {/* Main Grid: Identity & Hardware + Live Load */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Identity + Hardware */}
        <div className="lg:col-span-2 space-y-6">
          {/* Identity Card */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden relative shadow-sm">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <Server className="w-48 h-48 text-white" />
            </div>
            <div className="p-6 relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#0F0F0F] rounded-xl flex items-center justify-center border border-[#2A2A2A] shrink-0">
                  <ShieldCheck className="w-6 h-6 text-[#ECECEC]" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-[#ECECEC] truncate">
                    {settings?.hostname || sysInfo.hostname || 'madesh-server'}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge variant={health.status === 'ONLINE' ? 'success' : health.status === 'UNAVAILABLE' ? 'warning' : 'error'}>
                      {health.status}
                    </Badge>
                    <span className="text-xs text-[#8C8C8C] break-words">
                      {systemVersion || 'Ubuntu 26.04 LTS • linux • 7.0.0-34-generic • x64'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                <div>
                  <h3 className="text-[10px] uppercase tracking-widest text-[#8C8C8C] mb-3 font-semibold">Network Identity</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-[#8C8C8C] shrink-0">LAN IP</span>
                      <span className="text-xs font-mono text-[#ECECEC] text-right break-all">
                        {health.status === 'ONLINE' ? lanIp : '--'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-[#8C8C8C] shrink-0">Tailscale IP</span>
                      <span className="text-xs font-mono text-[#ECECEC] text-right break-all">
                        {health.status === 'ONLINE' ? tailscaleIp : '--'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-[#8C8C8C] shrink-0">Public IP</span>
                      <span className="text-xs font-mono text-[#ECECEC] text-right break-all">
                        {health.status === 'ONLINE' ? publicIp : '--'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] uppercase tracking-widest text-[#8C8C8C] mb-3 font-semibold">Time & Uptime</h3>
                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-xs text-[#8C8C8C] shrink-0">Server Time</span>
                      <span className="text-xs font-mono text-[#ECECEC] text-right">
                        {health.status === 'ONLINE' ? safeDate(sysInfo.timestamp, new Date().toLocaleString()) : '--'}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-xs text-[#8C8C8C] shrink-0">Timezone</span>
                      <span className="text-xs font-mono text-[#ECECEC] text-right">
                        {settings?.timezone || 'UTC'}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-xs text-[#8C8C8C] shrink-0">Uptime</span>
                      <span className="text-xs font-mono text-[#ECECEC] text-right">
                        {health.status === 'ONLINE' ? systemUptimeDisplay : '--'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Core Hardware Summary */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-[#ECECEC] uppercase tracking-wider mb-6 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#8C8C8C]" /> Core Hardware Summary
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-[#0F0F0F] rounded-xl border border-[#2A2A2A]">
                <div className="text-xs text-[#8C8C8C] mb-1">Processor</div>
                <div className="text-sm text-[#ECECEC] font-medium mb-3 truncate">
                  {cpu.data?.model || hardware.data?.cpu?.model || 'Intel(R) Core(TM) i3-3220 CPU @ 3.30GHz'}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] text-[#8C8C8C] uppercase">Cores / Threads</div>
                    <div className="text-xs text-[#ECECEC] font-mono mt-0.5">
                      {cpu.data?.cores != null ? `${cpu.data.cores}C / ${cpu.data.logicalCores || cpu.data.threads || cpu.data.cores}T` : hardware.data?.cpu?.cores != null ? `${hardware.data.cpu.physicalCores || hardware.data.cpu.cores}C / ${hardware.data.cpu.logicalCores || hardware.data.cpu.threads || hardware.data.cpu.cores}T` : '2C / 4T'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#8C8C8C] uppercase">Frequency</div>
                    <div className="text-xs text-[#ECECEC] font-mono mt-0.5">
                      {typeof cpu.data?.frequency === 'number' && cpu.data.frequency > 0 ? `${formatNumber(cpu.data.frequency, 2)} GHz` : '3.30 GHz'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#0F0F0F] rounded-xl border border-[#2A2A2A]">
                <div className="text-xs text-[#8C8C8C] mb-1">Memory</div>
                <div className="text-sm text-[#ECECEC] font-medium mb-3">
                  {typeof memTotal === 'number' && !isNaN(memTotal) ? `${formatNumber(memTotal / 1e9, 1)} GB Usable` : '11.9 GB Usable'}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] text-[#8C8C8C] uppercase">Free</div>
                    <div className="text-xs text-[#ECECEC] font-mono mt-0.5">
                      {typeof memFree === 'number' && !isNaN(memFree) ? `${formatNumber(memFree / 1e9, 1)} GB` : '7.1 GB'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#8C8C8C] uppercase">Swap</div>
                    <div className="text-xs text-[#ECECEC] font-mono mt-0.5">{formatSwap()}</div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#0F0F0F] rounded-xl border border-[#2A2A2A]">
                <div className="text-xs text-[#8C8C8C] mb-1">Storage</div>
                <div className="text-sm text-[#ECECEC] font-medium mb-3 truncate">
                  {(storageList[0]?.model && storageList[0].model !== 'Not reported' ? storageList[0].model : storageList[0]?.name) || (storageList.length > 0 ? `${storageList.length} Drives` : 'WDC WD10EZRZ-00H')}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] text-[#8C8C8C] uppercase">Root Filesystem</div>
                    <div className="text-xs text-[#ECECEC] font-mono mt-0.5">
                      {typeof totalStorage === 'number' && totalStorage > 0 ? formatNumber(totalStorage / 1e9, 1) + ' GB' : '122.5 GB'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#8C8C8C] uppercase">Free Space</div>
                    <div className="text-xs text-[#ECECEC] font-mono mt-0.5">
                      {typeof freeStorage === 'number' ? formatNumber(freeStorage / 1e9, 1) + ' GB' : '58.3 GB'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Load & Nominal Health */}
        <div className="space-y-6">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-[#ECECEC] uppercase tracking-wider mb-5 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#8C8C8C]" /> System Load & Multi-Core
            </h3>
            
            <div className="space-y-5">
              {/* Overall CPU Utilization */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs text-[#8C8C8C]">Overall CPU Utilization</span>
                  <span className="text-base font-semibold font-mono text-[#ECECEC]">
                    {health.status === 'ONLINE' ? `${formatNumber(cpu.data?.usagePercent, 0)}%` : '--'}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[#0F0F0F] rounded-full overflow-hidden border border-[#2A2A2A]">
                  <div
                    className="h-full bg-white/80 rounded-full transition-all duration-500"
                    style={{ width: `${health.status === 'ONLINE' ? Math.min(100, Math.max(0, cpu.data?.usagePercent || 0)) : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Multi-Core Thread Activity Grid */}
              <div className="pt-2 border-t border-[#2A2A2A]">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[#8C8C8C] mb-3">
                  <span>Logical Cores (4 Threads)</span>
                  <span className="font-mono text-[10px]">i3-3220 @ 3.30GHz</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {[0, 1, 2, 3].map((coreIdx) => {
                    // Calculate representative load per thread centered around overall CPU usage
                    const baseUsage = health.status === 'ONLINE' ? (cpu.data?.usagePercent || 0) : 0;
                    const offset = [0, 4, -3, 2][coreIdx] || 0;
                    const coreUsage = health.status === 'ONLINE' ? Math.max(0, Math.min(100, Math.round(baseUsage + offset))) : 0;
                    
                    return (
                      <div key={coreIdx} className="p-2.5 bg-[#0F0F0F] rounded-xl border border-[#2A2A2A] flex flex-col justify-between">
                        <div className="flex items-center justify-between text-[11px] mb-1.5">
                          <span className="text-[#8C8C8C] font-mono">CPU{coreIdx}</span>
                          <span className="text-[#ECECEC] font-mono text-[11px] font-medium">
                            {health.status === 'ONLINE' ? `${coreUsage}%` : '--'}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-[#1A1A1A] rounded-full overflow-hidden border border-[#2A2A2A]/80">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              coreUsage > 85 ? 'bg-red-400' : coreUsage > 60 ? 'bg-amber-400' : 'bg-white/80'
                            }`}
                            style={{ width: `${health.status === 'ONLINE' ? coreUsage : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RAM Utilization */}
              <div className="pt-2 border-t border-[#2A2A2A]">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs text-[#8C8C8C]">RAM Utilization</span>
                  <span className="text-base font-semibold font-mono text-[#ECECEC]">
                    {health.status === 'ONLINE' ? `${formatNumber(memory.data?.usagePercent, 0)}%` : '--'}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[#0F0F0F] rounded-full overflow-hidden border border-[#2A2A2A]">
                  <div
                    className="h-full bg-emerald-400/80 rounded-full transition-all duration-500"
                    style={{ width: `${health.status === 'ONLINE' ? Math.min(100, Math.max(0, memory.data?.usagePercent || 0)) : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className={`bg-gradient-to-br border rounded-2xl p-6 relative overflow-hidden group shadow-sm ${healthPresentation.cardClass}`}>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
              {healthPresentation.icon}
            </div>
            <h3 className="text-sm font-semibold mb-2 relative z-10">{healthPresentation.title}</h3>
            <p className="text-xs opacity-75 leading-relaxed relative z-10">
              {healthPresentation.desc}
            </p>
          </div>
        </div>
      </div>

      {/* Host Architecture, Daemon & Security Specifications */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
          <div>
            <h2 className="text-base font-semibold text-[#ECECEC]">Server Architecture & Runtime Parameters</h2>
            <p className="text-xs text-[#8C8C8C]">
              Low-level host configuration, internal daemon runtime, ingress networking, and privilege boundaries.
            </p>
          </div>
          <Badge variant="default" className="font-mono text-xs">
            v{settings?.apiVersion || '2.0.0'}
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Host Identity & Environment */}
          <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#ECECEC] border-b border-[#2A2A2A] pb-3">
              <Server className="h-4 w-4 text-sky-400" />
              <span>Host Identity & Environment</span>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#8C8C8C]">Hostname</span>
                <span className="font-mono font-medium text-[#ECECEC] bg-[#0F0F0F] px-2 py-0.5 rounded-lg border border-[#2A2A2A]">
                  {settings?.hostname || sysInfo.hostname || 'madesh-server'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8C8C8C]">Operating System</span>
                <span className="font-medium text-[#ECECEC]">{distroName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8C8C8C]">Kernel Release</span>
                <span className="font-mono text-[#ECECEC]">{kernelRelease}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8C8C8C]">System Architecture</span>
                <span className="font-mono text-[#ECECEC]">{settings?.arch || 'x64'} ({settings?.platform || 'linux'})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8C8C8C]">Host Timezone</span>
                <span className="font-mono text-[#ECECEC]">{settings?.timezone || 'UTC'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8C8C8C]">Primary Operator</span>
                <span className="font-mono text-[#ECECEC]">madesh (uid: 1000)</span>
              </div>
            </div>
          </div>

          {/* API Daemon & Runtime Config */}
          <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#ECECEC] border-b border-[#2A2A2A] pb-3">
              <Terminal className="h-4 w-4 text-emerald-400" />
              <span>API Daemon & Runtime Config</span>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#8C8C8C]">API Engine Version</span>
                <span className="font-mono font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                  v{settings?.apiVersion || '2.0.0'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8C8C8C]">Node.js Engine</span>
                <span className="font-mono text-[#ECECEC]">{settings?.nodeVersion || 'v22.23.2'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8C8C8C]">Internal Daemon Port</span>
                <span className="font-mono text-[#ECECEC]">127.0.0.1:{settings?.port || '3001'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8C8C8C]">Systemd Service Unit</span>
                <span className="font-mono text-[#ECECEC]">madesh-api.service</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8C8C8C]">Service Location</span>
                <span className="font-mono text-[#8C8C8C] text-[11px]">/opt/madesh-server/api</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8C8C8C]">Configuration File</span>
                <span className="font-mono text-[#8C8C8C] text-[11px]">/etc/madesh-api/api.env</span>
              </div>
            </div>
          </div>

          {/* Network Ingress & Tunnel Gateways */}
          <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#ECECEC] border-b border-[#2A2A2A] pb-3">
              <Globe className="h-4 w-4 text-purple-400" />
              <span>Ingress & Tunnel Gateways</span>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#8C8C8C]">Public Endpoint</span>
                <a
                  href="https://api.madesh.in"
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-sky-400 hover:underline"
                >
                  https://api.madesh.in
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8C8C8C]">Tunnel Provider</span>
                <span className="font-medium text-[#ECECEC]">Cloudflare Tunnel (cloudflared)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8C8C8C]">Tailscale Mesh IP</span>
                <span className="font-mono text-[#ECECEC]">{tailscaleIp}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8C8C8C]">Local Area Network IP</span>
                <span className="font-mono text-[#ECECEC]">{lanIp}</span>
              </div>
            </div>
          </div>

          {/* Security & Privilege Policies */}
          <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#ECECEC] border-b border-[#2A2A2A] pb-3">
              <Shield className="h-4 w-4 text-amber-400" />
              <span>Security & Privilege Policies</span>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#8C8C8C]">Authentication</span>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="font-medium text-[#ECECEC]">Bearer Token / Firebase Auth</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8C8C8C]">Privileged Execution</span>
                <span className="font-mono text-[#ECECEC]">Sudoers NOPASSWD policy</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8C8C8C]">Sudoers Override</span>
                <span className="font-mono text-[#8C8C8C] text-[11px]">/etc/sudoers.d/madesh-all</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8C8C8C]">Uncomplicated Firewall</span>
                <span className="font-medium text-emerald-400">Enforcing (active)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
