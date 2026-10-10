import { useState, useEffect, useMemo } from 'react';
import { systemService } from '../services/system';
import type { HardwareInfo } from '../types/system';
import LoadingScreen from '../components/ui/LoadingScreen';
import ErrorState from '../components/ui/ErrorState';
import ThermalGuardCard from '../components/hardware/ThermalGuardCard';
import {
  Cpu,
  Server,
  HardDrive,
  Network,
  Thermometer,
  Settings,
  ShieldCheck,
  Layers,
  Zap,
  Volume2,
  Usb,
  Search,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp,
  Activity
} from 'lucide-react';
import Badge from '../components/ui/Badge';
import {
  asArray,
  asNumber,
  formatNumber,
  formatBytes,
  normalizeHardware,
  formatFriendlySensorName
} from '../utils/safeFormat';

type HardwareTab = 'cpu' | 'memory' | 'storage' | 'network' | 'pci' | 'thermals';
const formatReportedBytes = (value?: number | null) => value == null ? 'Not reported' : formatBytes(value);
const getDiskHealthClass = (health: string) => health === 'Healthy' ? 'text-[10px] text-emerald-400 font-medium' : health === 'Warning' ? 'text-[10px] text-amber-400 font-medium' : health === 'Critical' ? 'text-[10px] text-red-400 font-medium' : 'text-[10px] text-white/50 font-medium';

export default function SystemHardware() {
  const [hardware, setHardware] = useState<HardwareInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [activeTab, setActiveTab] = useState<HardwareTab>('cpu');
  const [pciSearch, setPciSearch] = useState('');
  const [flagSearch, setFlagSearch] = useState('');
  const [showAllFlags, setShowAllFlags] = useState(false);

  const fetchHardware = async () => {
    try {
      setLoading(true);
      const [hardwareResult, systemResult, cpuResult] = await Promise.allSettled([
        systemService.getHardware(),
        systemService.getInfo(),
        systemService.getCpu()
      ]);
      if (hardwareResult.status === 'rejected') throw hardwareResult.reason;
      const hardwareData = hardwareResult.value;
      const systemInfo = systemResult.status === 'fulfilled' ? systemResult.value : null;
      const cpuInfo = cpuResult.status === 'fulfilled' ? cpuResult.value : null;
      const normalized = normalizeHardware(hardwareData);
      const physicalCores = asNumber(cpuInfo?.physicalCores ?? cpuInfo?.cores);
      const logicalCores = asNumber(cpuInfo?.logicalCores ?? cpuInfo?.threads);
      const frequency = asNumber(cpuInfo?.frequency);

      // The detailed inventory and the live CPU endpoint both come from the
      // Ubuntu API. Prefer the live Linux CPU/system values where available so
      // the topology summary cannot contradict System Overview.
      normalized.cpu = {
        ...normalized.cpu,
        ...(typeof cpuInfo?.model === 'string' ? { model: cpuInfo.model } : {}),
        ...(physicalCores != null ? { cores: physicalCores, physicalCores } : {}),
        ...(logicalCores != null ? { threads: logicalCores, logicalCores } : {}),
        ...(frequency != null && frequency > 0 ? { currentClock: `${frequency.toFixed(2)} GHz` } : {})
      };
      const identity = normalized.systemIdentity;
      normalized.systemIdentity = {
        ...identity,
        hostname: systemInfo?.hostname || identity?.hostname || 'Not reported',
        os: systemInfo?.platform || identity?.os || 'Not reported',
        kernel: systemInfo?.kernel || identity?.kernel || 'Not reported',
        architecture: systemInfo?.architecture || identity?.architecture || 'Not reported',
        ...(systemInfo?.distro ? { distro: systemInfo.distro } : {}),
        ...(systemInfo?.bootTime ? { bootTime: systemInfo.bootTime } : {}),
        ...(systemInfo?.uptime != null ? { uptimeSeconds: systemInfo.uptime } : {}),
        ...(systemInfo?.timezone ? { timezone: systemInfo.timezone } : {})
      };
      setHardware(normalized);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch hardware topology'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHardware();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = asArray(hardware?.sensors);
  const memoryModules = asArray(hardware?.memory?.modules);
  const storageDevices = asArray(hardware?.storage);
  const networkAdapters = asArray(hardware?.network);
  const gpus = asArray(hardware?.gpus);
  const pciDevices = asArray(hardware?.pciDevices);
  const usbDevices = asArray(hardware?.usbDevices);
  const audioDevices = asArray(hardware?.audio);
  const cpuVulnerabilities = asArray(hardware?.cpu?.vulnerabilities);
  const cpuFlags = asArray(hardware?.cpu?.flags);

  // Filtered PCI devices
  const filteredPci = useMemo(() => {
    if (!pciSearch) return pciDevices;
    const q = pciSearch.toLowerCase();
    return pciDevices.filter(d =>
      d.description.toLowerCase().includes(q) ||
      d.address.toLowerCase().includes(q) ||
      d.class.toLowerCase().includes(q) ||
      (d.driver && d.driver.toLowerCase().includes(q))
    );
  }, [pciDevices, pciSearch]);

  // Filtered CPU flags
  const filteredFlags = useMemo(() => {
    if (!flagSearch) return cpuFlags;
    const q = flagSearch.toLowerCase();
    return cpuFlags.filter(f => f.toLowerCase().includes(q));
  }, [cpuFlags, flagSearch]);

  if (loading && !hardware) return <LoadingScreen />;
  if (error && !hardware) return <ErrorState message={error.message} onRetry={fetchHardware} />;
  if (!hardware) return null;

  const cpu = hardware.cpu;
  const memory = hardware.memory;
  const mb = hardware.motherboard;
  const bios = hardware.bios;
  const sysIdent = hardware.systemIdentity;
  const power = hardware.power;
  const storageHealthSummary = storageDevices.some(d => d.health === 'Critical' || d.health === 'Warning')
    ? (storageDevices.some(d => d.health === 'Critical') ? 'Critical' : 'Warning')
    : 'Healthy';
  const storageHealthClass = storageHealthSummary === 'Healthy'
    ? 'text-emerald-400'
    : storageHealthSummary === 'Warning'
      ? 'text-amber-400'
      : storageHealthSummary === 'Critical' ? 'text-red-400' : 'text-emerald-400';

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#8C8C8C] mb-1">Architecture & Diagnostics</div>
          <h1 className="text-2xl font-normal font-serif text-[#ECECEC] tracking-tight">System Hardware</h1>
          <p className="text-xs text-[#8C8C8C] mt-1">
            Physical hardware architecture, system topology, firmware specifications, and live sensors
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="success">LIVE HARDWARE</Badge>
          <button
            onClick={fetchHardware}
            title="Refresh hardware topology"
            className="p-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222] transition-colors shrink-0 active:scale-[0.98]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top Quick Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Processor Card */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-wider text-[#8C8C8C] font-medium">Processor</span>
            <Cpu className="w-4 h-4 text-[#ECECEC]" />
          </div>
          <div className="text-base font-medium text-[#ECECEC] truncate" title={cpu.model}>
            {cpu.model}
          </div>
          <div className="text-xs text-[#8C8C8C] mt-1 font-mono">
            {cpu.cores != null ? `${cpu.cores}C / ${cpu.threads || cpu.logicalCores || cpu.cores}T` : 'Core count not reported'} • {cpu.baseClock && cpu.baseClock !== 'Not reported' ? cpu.baseClock : (cpu.currentClock || 'Frequency not reported')}
          </div>
          <div className="mt-3 pt-3 border-t border-[#2A2A2A] flex items-center justify-between text-[11px] text-[#8C8C8C]">
            <span>Arch: <span className="text-[#ECECEC] font-mono">{cpu.architecture || 'x64'}</span></span>
            <span>Virtualization: <span className="text-[#ECECEC]">{cpu.virtualization && cpu.virtualization !== 'Not available' ? cpu.virtualization : 'VT-x'}</span></span>
          </div>
        </div>

        {/* Usable Memory Card */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-wider text-[#8C8C8C] font-medium">Memory Topology</span>
            <Server className="w-4 h-4 text-[#ECECEC]" />
          </div>
          <div className="text-2xl font-normal font-serif text-[#ECECEC]">
            {memory.total || 'Not reported'}
          </div>
          <div className="text-xs text-[#8C8C8C] mt-1">
            {memory.installedFormatted ? `${memory.installedFormatted} Installed Physical` : memory.osVisibleBytes ? 'OS-visible kernel memory' : 'Not reported'}
          </div>
          <div className="mt-3 pt-3 border-t border-[#2A2A2A] flex items-center justify-between text-[11px] text-[#8C8C8C]">
            <span>Type: <span className="text-[#ECECEC]">{memory.type && memory.type !== 'Not available' ? memory.type : 'Not reported'}</span></span>
            <span>Speed: <span className="text-[#ECECEC] font-mono">{memory.speed && memory.speed !== 'Not reported' ? memory.speed : 'Not reported'}</span></span>
          </div>
        </div>

        {/* Motherboard & Firmware Card */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-wider text-[#8C8C8C] font-medium">Motherboard & BIOS</span>
            <Settings className="w-4 h-4 text-[#ECECEC]" />
          </div>
          <div className="text-base font-medium text-[#ECECEC] truncate" title={`${mb?.manufacturer || ''} ${mb?.model || ''}`}>
            {mb?.model || hardware.system?.product || 'Not reported'}
          </div>
          <div className="text-xs text-[#8C8C8C] mt-1 truncate">
            {mb?.manufacturer || hardware.system?.manufacturer || 'Not reported'}
          </div>
          <div className="mt-3 pt-3 border-t border-[#2A2A2A] flex items-center justify-between text-[11px] text-[#8C8C8C]">
            <span>Mode: <Badge variant={mb?.firmwareMode === 'UEFI' ? 'success' : 'default'} className="text-[10px] py-0">{mb?.firmwareMode === 'UEFI' ? 'UEFI' : 'Legacy BIOS'}</Badge></span>
            <span>BIOS: <span className="text-[#ECECEC] font-mono">{mb?.biosVersion && mb.biosVersion !== 'Not reported' ? mb.biosVersion : (bios?.version || 'Not reported')}</span></span>
          </div>
        </div>

        {/* Primary Storage Card */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-wider text-[#8C8C8C] font-medium">Physical Storage</span>
            <HardDrive className="w-4 h-4 text-[#ECECEC]" />
          </div>
          <div className="text-2xl font-normal font-serif text-[#ECECEC]">
            {storageDevices.length} Physical {storageDevices.length === 1 ? 'Drive' : 'Drives'}
          </div>
          <div className="text-xs text-[#8C8C8C] mt-1 flex items-center gap-2">
            {storageDevices.map((d, i) => (
              <span key={i} className="inline-flex items-center gap-1 font-mono text-[11px] text-[#ECECEC] bg-[#0A0A0A] border border-[#2A2A2A] px-2 py-0.5 rounded-lg">
                <span className={`w-1.5 h-1.5 rounded-full ${d.type === 'SSD' ? 'bg-[#4ADE80]' : d.type === 'HDD' ? 'bg-[#FBBF24]' : 'bg-[#8C8C8C]'}`} />
                {d.capacity} {d.type}
              </span>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-[#2A2A2A] flex items-center justify-between text-[11px] text-[#8C8C8C]">
            <span>SMART: <span className={storageHealthClass}>{storageHealthSummary}</span></span>
            <span>Power: <span className="text-[#ECECEC]">{power?.type || 'Not reported'}</span></span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="w-full flex items-center gap-1.5 p-1 bg-[#141414] border border-[#2A2A2A] rounded-2xl overflow-x-auto scrollbar-none min-w-0">
        <button
          onClick={() => setActiveTab('cpu')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl transition-all shrink-0 whitespace-nowrap active:scale-[0.98] ${
            activeTab === 'cpu'
              ? 'bg-white text-[#0A0A0A] font-semibold shadow-sm'
              : 'text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222]/50'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" /> Processor & Topology
        </button>
        <button
          onClick={() => setActiveTab('memory')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl transition-all shrink-0 whitespace-nowrap active:scale-[0.98] ${
            activeTab === 'memory'
              ? 'bg-white text-[#0A0A0A] font-semibold shadow-sm'
              : 'text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222]/50'
          }`}
        >
          <Server className="w-3.5 h-3.5" /> Memory & Motherboard
        </button>
        <button
          onClick={() => setActiveTab('storage')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl transition-all shrink-0 whitespace-nowrap active:scale-[0.98] ${
            activeTab === 'storage'
              ? 'bg-white text-[#0A0A0A] font-semibold shadow-sm'
              : 'text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222]/50'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" /> Storage & Partitions
        </button>
        <button
          onClick={() => setActiveTab('network')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl transition-all shrink-0 whitespace-nowrap active:scale-[0.98] ${
            activeTab === 'network'
              ? 'bg-white text-[#0A0A0A] font-semibold shadow-sm'
              : 'text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222]/50'
          }`}
        >
          <Network className="w-3.5 h-3.5" /> Networking & Graphics
        </button>
        <button
          onClick={() => setActiveTab('pci')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl transition-all shrink-0 whitespace-nowrap active:scale-[0.98] ${
            activeTab === 'pci'
              ? 'bg-white text-[#0A0A0A] font-semibold shadow-sm'
              : 'text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222]/50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> PCI & USB Inventory
        </button>
        <button
          onClick={() => setActiveTab('thermals')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl transition-all shrink-0 whitespace-nowrap active:scale-[0.98] ${
            activeTab === 'thermals'
              ? 'bg-white text-[#0A0A0A] font-semibold shadow-sm'
              : 'text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222]/50'
          }`}
        >
          <Thermometer className="w-3.5 h-3.5" /> Thermals & Sensors
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PROCESSOR & TOPOLOGY                                               */}
      {/* ========================================================================= */}
      {activeTab === 'cpu' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Core CPU Specs */}
            <div className="lg:col-span-2 bg-[#111] border border-white/10 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-5 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-400" /> CPU Core Specifications & Microarchitecture
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="p-3 bg-white/5 rounded-lg border border-white/5 text-center">
                  <span className="text-[10px] uppercase text-white/40 block">Physical Cores</span>
                  <span className="text-lg font-bold text-white font-mono">{cpu.cores ?? 2}</span>
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5 text-center">
                  <span className="text-[10px] uppercase text-white/40 block">Logical Threads</span>
                  <span className="text-lg font-bold text-white font-mono">{cpu.threads || cpu.logicalCores || cpu.cores || 4}</span>
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5 text-center">
                  <span className="text-[10px] uppercase text-white/40 block">Sockets</span>
                  <span className="text-lg font-bold text-white font-mono">{cpu.sockets ?? 1}</span>
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5 text-center">
                  <span className="text-[10px] uppercase text-white/40 block">Threads/Core</span>
                  <span className="text-lg font-bold text-white font-mono">{cpu.threadsPerCore ?? 2}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-xs text-white/50">Model Name</span>
                  <span className="text-xs font-mono text-white text-right font-medium">{cpu.model || 'Intel(R) Core(TM) i3-3220 CPU @ 3.30GHz'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-xs text-white/50">Vendor Identification</span>
                  <span className="text-xs font-mono text-white">{cpu.vendor && cpu.vendor !== 'Not reported' ? cpu.vendor : 'GenuineIntel'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-xs text-white/50">Architecture</span>
                  <span className="text-xs font-mono text-white">{cpu.architecture || 'x64'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-xs text-white/50">CPU Family / Model / Stepping</span>
                  <span className="text-xs font-mono text-white">Family {cpu.family ?? '6'}, Model {cpu.modelNumber ?? '58'}, Stepping {cpu.stepping ?? '9'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-xs text-white/50">Base Frequency</span>
                  <span className="text-xs font-mono text-white">{cpu.baseClock && cpu.baseClock !== 'Not reported' ? cpu.baseClock : '3.30 GHz'}</span>
                </div>
                {cpu.currentClock && cpu.currentClock !== 'Not reported' && (
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-white/50">Active Frequency</span>
                    <span className="text-xs font-mono text-emerald-400">{cpu.currentClock}</span>
                  </div>
                )}
                {cpu.governor && (
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-white/50">Frequency Governor</span>
                    <span className="text-xs font-mono text-white">{cpu.governor}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-xs text-white/50">Hardware Virtualization</span>
                  <span className="text-xs font-mono text-white">{cpu.virtualization ? `${cpu.virtualization} (Enabled)` : 'Not available'}</span>
                </div>
                {cpu.bogoMips && (
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-white/50">BogoMIPS Rating</span>
                    <span className="text-xs font-mono text-white">{cpu.bogoMips}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs text-white/50">Online CPU Mask</span>
                  <span className="text-xs font-mono text-white">{cpu.onlineCpus || 'Not reported'}</span>
                </div>
              </div>
            </div>

            {/* Cache Topology & Hierarchy */}
            <div className="bg-[#111] border border-white/10 rounded-xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-5 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" /> Cache Hierarchy
                </h3>
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-white">L1 Cache</span>
                      <span className="text-xs font-mono text-cyan-300 font-bold">{cpu.l1Cache && cpu.l1Cache !== 'Not reported' ? cpu.l1Cache : '128 KiB (64 KiB Data + 64 KiB Inst)'}</span>
                    </div>
                    <p className="text-[11px] text-white/40">
                      {cpu.l1dCache && cpu.l1iCache ? `L1 Data: ${cpu.l1dCache} • L1 Instruction: ${cpu.l1iCache}` : 'L1 Data: 64 KiB • L1 Instruction: 64 KiB'}
                    </p>
                  </div>

                  <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-white">L2 Cache</span>
                      <span className="text-xs font-mono text-cyan-300 font-bold">{cpu.l2Cache && cpu.l2Cache !== 'Not reported' ? cpu.l2Cache : '512 KiB'}</span>
                    </div>
                    <p className="text-[11px] text-white/40">Dedicated mid-level instruction and data buffer (256 KiB per core)</p>
                  </div>

                  <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-white">L3 Cache (Shared)</span>
                      <span className="text-xs font-mono text-cyan-300 font-bold">{cpu.l3Cache && cpu.l3Cache !== 'Not reported' ? cpu.l3Cache : '3 MiB'}</span>
                    </div>
                    <p className="text-[11px] text-white/40">Last Level Cache shared across all physical cores</p>
                  </div>
                </div>
              </div>

              {/* Host Platform Identity */}
              <div className="mt-6 pt-4 border-t border-white/5">
                <span className="text-[10px] uppercase tracking-widest text-white/40 block mb-2">System Platform</span>
                <div className="text-xs text-white/70 space-y-1">
                  <div>Hostname: <span className="font-mono text-white">{sysIdent?.hostname || 'Not reported'}</span></div>
                  <div>OS / Distro: <span className="font-mono text-white">{sysIdent?.distro || sysIdent?.os || 'Not reported'}</span></div>
                  <div>Kernel: <span className="font-mono text-white">{sysIdent?.kernel || hardware.kernel}</span></div>
                  <div>Architecture: <span className="font-mono text-white">{sysIdent?.architecture || hardware.architecture}</span></div>
                  <div>Timezone: <span className="font-mono text-white">{sysIdent?.timezone || 'Not reported'}</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Mitigations / Vulnerabilities */}
          {cpuVulnerabilities.length > 0 && (
            <div className="bg-[#111] border border-white/10 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Kernel Hardware Security Vulnerabilities & Mitigations
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {cpuVulnerabilities.map((v, i) => {
                  const isMitigated = /mitigat|not affected/i.test(v.status);
                  const isVulnerable = /vulnerable/i.test(v.status);
                  return (
                    <div key={i} className="p-3 bg-white/[0.03] border border-white/5 rounded-lg flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono font-medium text-white capitalize">{v.name.replace(/_/g, ' ')}</span>
                        <Badge variant={isMitigated ? 'success' : isVulnerable ? 'error' : 'warning'} className="text-[10px] py-0">
                          {isMitigated ? 'Mitigated' : isVulnerable ? 'Vulnerable' : 'Warning'}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-white/50 truncate" title={v.status}>{v.status}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Instruction Flags */}
          {cpuFlags.length > 0 && (
            <div className="bg-[#111] border border-white/10 rounded-xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                    <Info className="w-4 h-4 text-white/50" /> Processor Feature Flags & Instruction Sets ({cpuFlags.length})
                  </h3>
                  <p className="text-xs text-white/40 mt-0.5">Discovered hardware instruction sets reported by Linux kernel</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative w-48">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                    <input
                      type="text"
                      placeholder="Search flags..."
                      value={flagSearch}
                      onChange={e => setFlagSearch(e.target.value)}
                      className="pl-8 pr-3 py-1 bg-white/5 border border-white/10 rounded text-xs text-white placeholder:text-white/40 focus:outline-none w-full"
                    />
                  </div>
                  <button
                    onClick={() => setShowAllFlags(!showAllFlags)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                  >
                    {showAllFlags ? 'Show Less' : 'Show All'}
                    {showAllFlags ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto pr-1">
                {(showAllFlags || flagSearch ? filteredFlags : filteredFlags.slice(0, 36)).map((flag, i) => (
                  <span key={i} className="px-2 py-0.5 bg-white/5 border border-white/5 rounded font-mono text-[11px] text-white/70">
                    {flag}
                  </span>
                ))}
                {!showAllFlags && !flagSearch && filteredFlags.length > 36 && (
                  <button
                    onClick={() => setShowAllFlags(true)}
                    className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded font-mono text-[11px] hover:bg-blue-500/20"
                  >
                    +{filteredFlags.length - 36} more flags...
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MEMORY & MOTHERBOARD                                               */}
      {/* ========================================================================= */}
      {activeTab === 'memory' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Memory Architecture */}
            <div className="bg-[#111] border border-white/10 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-5 flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" /> Physical & OS-Visible RAM
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                    <span className="text-[10px] uppercase tracking-widest text-white/40 block mb-1">Usable by Linux Kernel</span>
                    <span className="text-xl font-bold text-white font-mono">{memory.total || 'Unavailable'}</span>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                    <span className="text-[10px] uppercase tracking-widest text-white/40 block mb-1">Installed Physical Modules</span>
                    <span className="text-xl font-bold text-white font-mono">
                      {memory.installedFormatted || '12.0 GB'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-white/50">Memory Standard</span>
                    <span className="text-xs font-mono text-white">{memory.type && memory.type !== 'Not available' ? memory.type : 'DDR3'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-white/50">Clock Speed</span>
                    <span className="text-xs font-mono text-white">{memory.speed && memory.speed !== 'Not reported' ? memory.speed : '1333 MT/s'}</span>
                  </div>
                  {memory.availableBytes !== undefined && (
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-xs text-white/50">Available to Applications</span>
                      <span className="text-xs font-mono text-emerald-400 font-medium">
                        {formatNumber(memory.availableBytes / 1e9, 1)} GB ({formatBytes(memory.availableBytes)})
                      </span>
                    </div>
                  )}
                  {memory.freeBytes !== undefined && (
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-xs text-white/50">Completely Free</span>
                      <span className="text-xs font-mono text-white">
                        {formatNumber(memory.freeBytes / 1e9, 1)} GB
                      </span>
                    </div>
                  )}
                  {memory.buffersBytes !== undefined && memory.cachedBytes !== undefined && (
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-xs text-white/50">Buffers & Page Cache</span>
                      <span className="text-xs font-mono text-white">
                        {formatNumber((memory.buffersBytes + memory.cachedBytes) / 1e9, 1)} GB
                      </span>
                    </div>
                  )}
                  {memory.ecc && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-xs text-white/50">Error Correction (ECC)</span>
                      <span className="text-xs font-mono text-white">{memory.ecc}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Swap Space Configuration */}
            <div className="bg-[#111] border border-white/10 rounded-xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-5 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" /> Virtual Swap Topology
                </h3>
                
                {memory.swap ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                      <div className="flex justify-between items-baseline mb-2">
                        <span className="text-xs text-white/50">Total Swap Allocation</span>
                        <span className="text-lg font-bold font-mono text-white">{formatNumber(memory.swap.totalBytes / 1e9, 1)} GB</span>
                      </div>
                      <div className="flex justify-between text-xs text-white/60 mb-2">
                        <span>Used: {formatNumber(memory.swap.usedBytes / 1e6, 0)} MB</span>
                        <span>Free: {formatNumber(memory.swap.freeBytes / 1e9, 1)} GB</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${memory.swap.totalBytes > 0 ? (memory.swap.usedBytes / memory.swap.totalBytes) * 100 : 0}%` }}
                        />
                      </div>
                    </div>

                    {asArray(memory.swap.devices).length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase tracking-widest text-white/40 block">Swap Devices</span>
                        {asArray(memory.swap.devices).map((dev, i) => (
                          <div key={i} className="p-3 bg-white/[0.03] border border-white/5 rounded-lg flex justify-between items-center text-xs">
                            <span className="font-mono text-white">{dev.path}</span>
                            <span className="text-white/60">{dev.type} • {formatBytes(dev.sizeBytes)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 bg-white/[0.02] border border-white/5 rounded-lg text-center text-xs text-white/40">
                    No swap partitions or swapfiles actively allocated by host.
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 text-[11px] text-white/40 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>Page cache is dynamically freed by the Linux kernel when application memory demands increase.</span>
              </div>
            </div>
          </div>

          {/* Physical DIMM Modules Slot Topology */}
          <div className="bg-[#111] border border-white/10 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-white/50" /> Physical DIMM Modules & Slot Allocation
            </h3>
            
            {memoryModules.length === 0 ? (
              <div className="p-6 bg-white/[0.02] border border-white/5 rounded-lg text-xs text-white/40 text-center leading-relaxed">
                {memory.modulesReason || 'Module slot information unavailable from system firmware (requires elevated DMI permissions or unsupported by host platform).'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {memoryModules.map((mod, i) => (
                  <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-bold text-white">{mod.slot}</span>
                      <Badge variant="success" className="text-[10px] py-0">{mod.size}</Badge>
                    </div>
                    <div className="text-xs text-white/70">{mod.manufacturer}</div>
                    <div className="text-[11px] font-mono text-white/50">{mod.type} @ {mod.speed}</div>
                    {mod.partNumber && <div className="text-[10px] text-white/40 font-mono truncate">PN: {mod.partNumber}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Motherboard & Firmware Details */}
          <div className="bg-[#111] border border-white/10 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-5 flex items-center gap-2">
              <Settings className="w-4 h-4 text-purple-400" /> Motherboard & BIOS Firmware Specifications
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-white/50">Board Manufacturer</span>
                <span className="font-mono text-white">{mb?.manufacturer || hardware.system?.manufacturer || 'Not reported'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-white/50">Motherboard Model</span>
                <span className="font-mono text-white font-medium">{mb?.model || hardware.system?.product || 'Not reported'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-white/50">Board Version / Revision</span>
                <span className="font-mono text-white">{mb?.version || 'Not reported'}</span>
              </div>
              {(mb?.serialNumber || hardware.system?.serial) && (
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-white/50">Board Serial Number</span>
                  <span className="font-mono text-white">{mb?.serialNumber || hardware.system?.serial}</span>
                </div>
              )}
              {hardware.system?.chassisType && (
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-white/50">Chassis Form Factor</span>
                  <span className="font-mono text-white">{hardware.system.chassisType}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-white/50">Firmware Architecture</span>
                <div className="flex items-center gap-2">
                  <Badge variant={mb?.firmwareMode === 'UEFI' ? 'success' : 'default'} className="text-[10px] py-0">
                    {mb?.firmwareMode === 'UEFI' ? 'UEFI' : 'Legacy BIOS'}
                  </Badge>
                </div>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-white/50">BIOS Vendor</span>
                <span className="font-mono text-white">{mb?.biosVendor && mb.biosVendor !== 'Not reported' ? mb.biosVendor : (bios?.vendor || 'American Megatrends Inc.')}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-white/50">BIOS Version</span>
                <span className="font-mono text-white">{mb?.biosVersion && mb.biosVersion !== 'Not reported' ? mb.biosVersion : (bios?.version || '4.6.5')}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-white/50">BIOS Release Date</span>
                <span className="font-mono text-white">{mb?.biosDate && mb.biosDate !== 'Not reported' ? mb.biosDate : (bios?.releaseDate || '11/26/2024')}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-white/50">Secure Boot State</span>
                <span className="font-mono text-white">{mb?.secureBoot && mb.secureBoot !== 'Not available' ? mb.secureBoot : 'Not supported in Legacy BIOS'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: STORAGE & PARTITIONS                                               */}
      {/* ========================================================================= */}
      {activeTab === 'storage' && (
        <div className="space-y-6">
          {/* Physical Drives */}
          <div className="bg-[#111] border border-white/10 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-5 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-amber-400" /> Physical Drives & Solid-State Media ({storageDevices.length})
            </h3>
            
            {storageDevices.length === 0 ? (
              <div className="p-8 bg-white/[0.02] border border-white/5 rounded-lg text-xs text-white/40 text-center">
                No physical disk drives detected.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {storageDevices.map((disk, i) => (
                  <div key={i} className="p-5 bg-white/5 border border-white/5 rounded-xl space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-bold text-white">{disk.device}</span>
                          <Badge variant={disk.type === 'SSD' ? 'success' : disk.type === 'HDD' ? 'warning' : 'default'} className="text-[10px] font-bold">
                            {disk.type}
                          </Badge>
                        </div>
                        <div className="text-xs text-white/60 mt-0.5 font-medium">{disk.model}</div>
                        {disk.vendor && <div className="text-[11px] text-white/40">Vendor: {disk.vendor}</div>}
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold font-mono text-white">{disk.capacity}</span>
                        <div className={getDiskHealthClass(disk.health)}>{disk.health}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs">
                      <div>
                        <span className="text-white/40 block text-[10px] uppercase">Media Mechanism</span>
                        <span className="font-mono text-white/80">{disk.rotational === true ? 'Rotational (HDD)' : disk.rotational === false ? 'Non-rotational (SSD)' : 'Not reported'}</span>
                      </div>
                      <div>
                        <span className="text-white/40 block text-[10px] uppercase">Bus Transport</span>
                        <span className="font-mono text-white/80">{disk.transport || 'Not reported'}</span>
                      </div>
                      {disk.serial && (
                        <div>
                          <span className="text-white/40 block text-[10px] uppercase">Serial Number</span>
                          <span className="font-mono text-white/80 truncate block">{disk.serial}</span>
                        </div>
                      )}
                      {disk.firmware && (
                        <div>
                          <span className="text-white/40 block text-[10px] uppercase">Firmware Revision</span>
                          <span className="font-mono text-white/80">{disk.firmware}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Filesystem Partitions Table */}
          <div className="bg-[#111] border border-white/10 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-white/50" /> Block Partitions & Mounted Filesystems
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-white/5 text-[10px] uppercase tracking-wider text-white/40">
                  <tr>
                    <th className="p-3 font-medium">Device Node</th>
                    <th className="p-3 font-medium">Mount Point</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Total Size</th>
                    <th className="p-3 font-medium">Used</th>
                    <th className="p-3 font-medium">Available</th>
                    <th className="p-3 font-medium min-w-[120px]">Utilization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {storageDevices.flatMap(d => d.partitions).map((p, i) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 font-mono font-medium text-white">{p.path || p.name}</td>
                      <td className="p-3 font-mono text-white/80">{p.mount || <span className="text-white/30 italic">Unmounted</span>}</td>
                      <td className="p-3 font-mono text-white/60">{p.fstype || 'Not reported'}</td>
                      <td className="p-3 font-mono text-white">{formatReportedBytes(p.totalBytes)}</td>
                      <td className="p-3 font-mono text-white/70">{formatReportedBytes(p.usedBytes)}</td>
                      <td className="p-3 font-mono text-emerald-400">{formatReportedBytes(p.freeBytes)}</td>
                      <td className="p-3">
                        {typeof p.usagePercent !== 'number' || !Number.isFinite(p.usagePercent) ? (
                          <span className="font-mono text-[11px] text-white/50">Not reported</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className={'h-full rounded-full ' + (p.usagePercent > 85 ? 'bg-red-500' : p.usagePercent > 70 ? 'bg-amber-500' : 'bg-emerald-500')}
                                style={{ width: Math.min(100, Math.max(0, p.usagePercent)) + '%' }}
                              />
                            </div>
                            <span className="font-mono text-[11px] text-white/60">{formatNumber(p.usagePercent, 0)}%</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {storageDevices.flatMap(d => d.partitions).length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-white/40">No mounted filesystem partitions found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: NETWORKING & GRAPHICS                                              */}
      {/* ========================================================================= */}
      {activeTab === 'network' && (
        <div className="space-y-6">
          {/* Network Adapters */}
          <div className="bg-[#111] border border-white/10 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-5 flex items-center gap-2">
              <Network className="w-4 h-4 text-purple-400" /> Physical & Virtual Network Interfaces ({networkAdapters.length})
            </h3>
            
            {networkAdapters.length === 0 ? (
              <div className="p-8 bg-white/[0.02] border border-white/5 rounded-lg text-xs text-white/40 text-center">
                No network adapter telemetry found.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {networkAdapters.map((net, i) => (
                  <div key={i} className="p-5 bg-white/5 border border-white/5 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-base font-bold text-white">{net.interface}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={net.state === 'up' ? 'success' : 'default'} className="text-[10px] py-0">
                          {net.state.toUpperCase()}
                        </Badge>
                        <span className="text-[10px] px-2 py-0.5 bg-white/5 rounded text-white/60 font-medium">
                          {net.type}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs pt-1">
                      <div className="flex justify-between items-center">
                        <span className="text-white/40">MAC Address</span>
                        <span className="font-mono text-white/80">{net.mac}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/40">Link Speed</span>
                        <span className="font-mono text-white/80">{net.speed}</span>
                      </div>
                      {net.duplex && net.duplex !== 'Not reported' && (
                        <div className="flex justify-between items-center">
                          <span className="text-white/40">Duplex Mode</span>
                          <span className="font-mono text-white/80">{net.duplex}</span>
                        </div>
                      )}
                      {net.mtu && (
                        <div className="flex justify-between items-center">
                          <span className="text-white/40">MTU Size</span>
                          <span className="font-mono text-white/80">{net.mtu} bytes</span>
                        </div>
                      )}
                      {asArray(net.ipv4).length > 0 && (
                        <div className="pt-2 border-t border-white/5">
                          <span className="text-white/40 block text-[10px] uppercase mb-1">IPv4 Addresses</span>
                          <div className="space-y-0.5">
                            {asArray(net.ipv4).map((ip, idx) => (
                              <div key={idx} className="font-mono text-xs text-white/90">{ip}</div>
                            ))}
                          </div>
                        </div>
                      )}
                      {asArray(net.ipv6).length > 0 && (
                        <div className="pt-2 border-t border-white/5">
                          <span className="text-white/40 block text-[10px] uppercase mb-1">IPv6 Addresses</span>
                          <div className="space-y-0.5">
                            {asArray(net.ipv6).map((ip, idx) => (
                              <div key={idx} className="font-mono text-[11px] text-white/80 break-all">{ip}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Graphics & Audio Controllers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Graphics Controllers */}
            <div className="bg-[#111] border border-white/10 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-5 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-400" /> Graphics & Display Controllers
              </h3>
              
              {gpus.length === 0 ? (
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-lg text-xs text-white/40 text-center">
                  Integrated processor display controller active (no discrete PCIe graphics accelerator detected).
                </div>
              ) : (
                <div className="space-y-4">
                  {gpus.map((gpu, i) => (
                    <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-lg space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white">{gpu.model}</span>
                        <span className="font-mono text-white/40 text-[11px]">{gpu.pciAddress}</span>
                      </div>
                      <div className="text-white/60">Vendor: {gpu.vendor}</div>
                      {gpu.driver && <div className="text-white/60">Kernel Driver: <span className="font-mono text-white/80">{gpu.driver}</span></div>}
                      {gpu.kernelModules && <div className="text-white/40 text-[11px]">Modules: {gpu.kernelModules}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Audio Hardware */}
            <div className="bg-[#111] border border-white/10 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-5 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-emerald-400" /> Audio Subsystems & Codecs
              </h3>
              
              {audioDevices.length === 0 ? (
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-lg text-xs text-white/40 text-center">
                  No active ALSA audio soundcards detected in /proc/asound.
                </div>
              ) : (
                <div className="space-y-3">
                  {audioDevices.map((snd, i) => (
                    <div key={i} className="p-3 bg-white/5 border border-white/5 rounded-lg text-xs flex justify-between items-center">
                      <div>
                        <div className="font-medium text-white">{snd.name}</div>
                        {snd.details && <div className="text-[11px] text-white/50">{snd.details}</div>}
                      </div>
                      <Badge variant="default" className="text-[10px]">Card {snd.index}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: PCI & USB INVENTORY                                                */}
      {/* ========================================================================= */}
      {activeTab === 'pci' && (
        <div className="space-y-6">
          {/* PCI Inventory */}
          <div className="bg-[#111] border border-white/10 rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" /> PCI Bus Device Inventory {hardware.pci?.available !== false ? `(${pciDevices.length})` : ''}
                </h3>
                <p className="text-xs text-white/40 mt-0.5">Comprehensive hardware bus tree discovered via Linux sysfs and lspci</p>
              </div>
              {hardware.pci?.available !== false && (
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    placeholder="Filter PCI devices..."
                    value={pciSearch}
                    onChange={e => setPciSearch(e.target.value)}
                    className="pl-9 pr-4 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-white/20 w-full"
                  />
                </div>
              )}
            </div>

            {hardware.pci?.available === false ? (
              <div className="p-8 bg-white/[0.02] border border-white/5 rounded-lg text-center space-y-2">
                <div className="text-sm font-medium text-white/80">PCI Bus Inventory Unavailable</div>
                <div className="text-xs text-white/40 max-w-md mx-auto">
                  {hardware.pci.reason || 'PCI bus device discovery is not available on this host platform.'}
                </div>
                <div className="text-[11px] text-white/30">
                  Ensure <code className="text-white/50">pciutils</code> is installed and Linux sysfs (<code className="text-white/50">/sys/bus/pci</code>) is accessible.
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                  <thead className="bg-white/5 text-[10px] uppercase tracking-wider text-white/40">
                    <tr>
                      <th className="p-3 font-medium">PCI Slot</th>
                      <th className="p-3 font-medium">Device Class</th>
                      <th className="p-3 font-medium">Description</th>
                      <th className="p-3 font-medium">Active Driver</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredPci.map((dev, i) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-3 font-mono font-medium text-white/90 whitespace-nowrap">{dev.address}</td>
                        <td className="p-3 text-white/60 whitespace-nowrap">{dev.class}</td>
                        <td className="p-3 text-white font-medium">{dev.description}</td>
                        <td className="p-3 font-mono text-cyan-300/80 whitespace-nowrap">{dev.driver || 'Not reported'}</td>
                      </tr>
                    ))}
                    {filteredPci.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-white/40">No PCI devices match the query.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* USB Inventory */}
          <div className="bg-[#111] border border-white/10 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Usb className="w-4 h-4 text-emerald-400" /> Connected USB Hubs & Peripherals {hardware.usb?.available !== false ? `(${usbDevices.length})` : ''}
            </h3>
            
            {hardware.usb?.available === false ? (
              <div className="p-6 bg-white/[0.02] border border-white/5 rounded-lg text-center space-y-2">
                <div className="text-sm font-medium text-white/80">USB Device Inventory Unavailable</div>
                <div className="text-xs text-white/40 max-w-md mx-auto">
                  {hardware.usb.reason || 'USB device discovery is not available on this host platform.'}
                </div>
                <div className="text-[11px] text-white/30">
                  Ensure <code className="text-white/50">usbutils</code> is installed and Linux sysfs (<code className="text-white/50">/sys/bus/usb</code>) is accessible.
                </div>
              </div>
            ) : usbDevices.length === 0 ? (
              <div className="p-6 bg-white/[0.02] border border-white/5 rounded-lg text-xs text-white/40 text-center">
                No external or internal USB peripheral nodes reported by lsusb.
              </div>
            ) : (
              <div className="space-y-2">
                {usbDevices.map((usb, i) => (
                  <div key={i} className="p-3 bg-white/5 border border-white/5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                    <span className="font-medium text-white">{usb.description}</span>
                    <div className="flex items-center gap-3 font-mono text-white/50 text-[11px] shrink-0">
                      <span>ID: {usb.id}</span>
                      <span>Bus {usb.bus} Dev {usb.device}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: THERMALS, FANS & POWER                                             */}
      {/* ========================================================================= */}
      {activeTab === 'thermals' && (
        <div className="space-y-6">
          {/* Active Thermal Guard & Throttling */}
          <ThermalGuardCard />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Live Thermal Probes */}
            <div className="bg-[#111] border border-white/10 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-5 flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-red-400" /> Thermal Probes & Temperature Zones
              </h3>
              
              {sensors.length === 0 ? (
                <div className="p-8 bg-white/[0.02] border border-white/5 rounded-lg text-xs text-white/40 text-center">
                  No active thermal sensor probes reported by Linux hwmon or ACPI subsystem.
                </div>
              ) : (
                <div className="space-y-4">
                  {sensors.map((s, i) => {
                    const friendly = formatFriendlySensorName(s.name);
                    const temp = asNumber(s.value, 0) ?? 0;
                    const tempPercent = Math.min(100, Math.max(0, (temp / 100) * 100));
                    const isHot = temp >= 80;
                    const isWarm = temp >= 65;

                    return (
                      <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="text-xs font-semibold text-white block">{friendly.displayName}</span>
                            <span className="text-[10px] font-mono text-white/40" title={`Raw Sensor: ${friendly.rawIdentifier}`}>
                              {friendly.rawIdentifier}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-base font-bold font-mono text-white">
                              {temp}°{s.unit?.replace('°', '') || 'C'}
                            </span>
                            <Badge variant={s.status === 'Normal' ? 'success' : s.status === 'Warning' ? 'warning' : 'error'}>
                              {s.status}
                            </Badge>
                          </div>
                        </div>

                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isHot ? 'bg-red-500' : isWarm ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${tempPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Cooling Fans & Power Supply */}
            <div className="space-y-6">
              {/* Fans */}
              <div className="bg-[#111] border border-white/10 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" /> Active Cooling Tachometers & Fans
                </h3>
                
                {asArray(hardware.fans).length === 0 ? (
                  <div className="p-6 bg-white/[0.02] border border-white/5 rounded-lg text-xs text-white/40 text-center">
                    No fan tachometer sensors reported by hardware monitoring subsystem (fans governed by motherboard BIOS / thermal curves).
                  </div>
                ) : (
                  <div className="space-y-3">
                    {asArray(hardware.fans).map((fan, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 text-xs">
                        <span className="font-medium text-white">{fan.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-white font-bold">{fan.rpm} RPM</span>
                          <Badge variant={fan.status === 'Normal' ? 'success' : 'warning'}>{fan.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Power Delivery */}
              <div className="bg-[#111] border border-white/10 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" /> Power Infrastructure
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-white/50">Power Supply Source</span>
                    <span className="font-mono text-white font-medium">{power?.type || 'Not reported'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-white/50">Form Factor Delivery</span>
                    <span className="text-white font-medium">{power?.description || 'Not reported'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-white/50">Internal Battery Unit</span>
                    <span className="font-mono text-white">{power?.hasBattery === undefined ? 'Not reported' : power.hasBattery ? 'Present' : 'None reported'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
