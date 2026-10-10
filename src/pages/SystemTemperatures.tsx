import { useState, useEffect } from 'react';
import { 
  Thermometer, 
  Cpu, 
  HardDrive, 
  Activity, 
  RefreshCw, 
  ShieldAlert, 
  Flame,
  CircuitBoard
} from 'lucide-react';
import { systemService, type HardwareTemperaturesResponse } from '../services/system';
import { useServerState } from '../contexts/ServerContext';
import LoadingScreen from '../components/ui/LoadingScreen';
import Badge from '../components/ui/Badge';
import { useToast } from '../components/ui/ToastContext';

export default function SystemTemperatures() {
  const { health } = useServerState();
  const [data, setData] = useState<HardwareTemperaturesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { addToast } = useToast();

  const isOnline = health.status === 'ONLINE';

  const fetchTemperatures = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await systemService.getTemperatures();
      setData(res);
    } catch (err: any) {
      if (!silent) {
        addToast({
          type: 'error',
          title: 'Thermal Telemetry Unavailable',
          message: err.message || 'Failed to query hardware sensors'
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemperatures();
  }, []);

  useEffect(() => {
    if (!autoRefresh || !isOnline) return;
    const interval = setInterval(() => {
      fetchTemperatures(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, isOnline]);

  if (loading && !data) return <LoadingScreen />;

  const summary = data?.summary || {
    packageTemp: null,
    maxTemp: null,
    thermalState: 'nominal' as const,
    throttleThreshold: 88,
    tripPoint: 105
  };

  const getTempColor = (temp: number | null) => {
    if (temp === null) return 'text-[#8C8C8C]';
    if (temp >= 85) return 'text-red-400';
    if (temp >= 70) return 'text-amber-400';
    return 'text-emerald-400';
  };

  const getTempBg = (temp: number | null) => {
    if (temp === null) return 'bg-[#141414] border-[#2A2A2A] text-[#8C8C8C]';
    if (temp >= 85) return 'bg-red-500/10 border-red-500/30 text-red-400';
    if (temp >= 70) return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
    return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
  };

  const maxTemp = isOnline && typeof summary.maxTemp === 'number' ? summary.maxTemp : null;
  const packageTemp = isOnline && typeof summary.packageTemp === 'number' ? summary.packageTemp : null;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#8C8C8C] mb-1 flex items-center gap-1.5">
            <Thermometer className="w-3.5 h-3.5 text-amber-400" /> Hardware Telemetry
          </div>
          <h1 className="text-2xl font-normal font-serif text-[#ECECEC] tracking-tight">System Temperatures</h1>
          <p className="text-xs text-[#8C8C8C] mt-1">
            Real-time thermal monitoring across CPU package, individual cores, motherboard VRMs, and storage drives.
          </p>
        </div>
        
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              autoRefresh 
                ? 'bg-[#1A1A1A] border-[#2A2A2A] text-[#ECECEC]' 
                : 'bg-[#0F0F0F] border-[#2A2A2A] text-[#8C8C8C]'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>{autoRefresh ? '10s Auto-Poll' : 'Paused'}</span>
          </button>

          <button
            onClick={() => fetchTemperatures()}
            title="Refresh Sensors"
            className="p-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222] transition-colors shrink-0 active:scale-[0.98]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Primary Thermal Overview Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Package Temp */}
        <div className="p-5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[#8C8C8C] mb-2">
            <span>CPU Package Temperature</span>
            <Cpu className="w-4 h-4 text-[#ECECEC]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-serif font-normal tracking-tight ${getTempColor(packageTemp)}`}>
              {packageTemp !== null ? `${packageTemp}°C` : '--'}
            </span>
            <span className="text-xs text-[#8C8C8C] font-mono">
              / Limit {summary.throttleThreshold || 88}°C
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Badge variant={!isOnline ? 'default' : summary.thermalState === 'nominal' ? 'success' : summary.thermalState === 'warning' ? 'warning' : 'error'}>
              {!isOnline ? 'OFFLINE' : (summary.thermalState || 'nominal').toUpperCase()}
            </Badge>
            <span className="text-[11px] text-[#8C8C8C]">
              {isOnline ? 'Intel Core i3-3220 (LGA1155)' : 'Telemetry disconnected'}
            </span>
          </div>
        </div>

        {/* Highest Thermal Reading */}
        <div className="p-5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[#8C8C8C] mb-2">
            <span>Peak Component Temp</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-serif font-normal tracking-tight ${getTempColor(maxTemp)}`}>
              {maxTemp !== null ? `${maxTemp}°C` : '--'}
            </span>
            <span className="text-xs text-[#8C8C8C] font-mono">
              / Trip {summary.tripPoint || 105}°C
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[11px] text-[#8C8C8C]">
              Margin to Throttle: <span className="font-mono text-[#ECECEC]">{maxTemp !== null ? `${Math.max(0, (summary.throttleThreshold || 88) - maxTemp)}°C headroom` : '--'}</span>
            </span>
          </div>
        </div>

        {/* Thermal Guard Protection Status */}
        <div className="p-5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl relative overflow-hidden shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[#8C8C8C] mb-2">
              <span>Thermal Guard Engine</span>
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-medium text-[#ECECEC]">Auto-Throttling Armed</span>
              <Badge variant="success">Active</Badge>
            </div>
          </div>
          <p className="text-[11px] text-[#8C8C8C] mt-2 leading-relaxed">
            Automatic background pause triggers if CPU hits {summary.throttleThreshold || 88}°C to protect hardware silicon.
          </p>
        </div>
      </div>

      {/* Section 1: CPU Per-Core Temperatures */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#2A2A2A] pb-3 gap-1">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#ECECEC]" />
            <h2 className="text-sm font-semibold text-[#ECECEC] uppercase tracking-wider">
              CPU Individual Cores
            </h2>
          </div>
          <span className="text-xs text-[#8C8C8C] font-mono">
            {data?.cpu?.cores?.length || 2} Cores Reported • sysfs coretemp
          </span>
        </div>

        {(!data?.cpu?.cores || data.cpu.cores.length === 0) ? (
          <div className="py-6 text-center text-xs text-[#8C8C8C]">
            Awaiting core sensor stream...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 2xl:gap-6">
            {data.cpu.cores.map((core, i) => {
              const tempVal = isOnline && typeof core.temp === 'number' ? core.temp : null;
              return (
                <div key={i} className="p-4 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-[#8C8C8C]">{core.name}</span>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded-lg border ${getTempBg(tempVal)}`}>
                      {tempVal !== null ? `${tempVal}°C` : '--'}
                    </span>
                  </div>
                  
                  {/* Visual Gauge Meter */}
                  <div className="space-y-1.5 mt-2">
                    <div className="h-2 w-full bg-[#1A1A1A] rounded-full overflow-hidden border border-[#2A2A2A]">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          tempVal && tempVal >= 85 ? 'bg-red-400' : tempVal && tempVal >= 70 ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(10, ((tempVal ?? 35) / 105) * 100))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-[#8C8C8C] font-mono">
                      <span>Floor 30°C</span>
                      <span>Trip {summary.tripPoint || 105}°C</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Storage Disks Temperatures (SMART Health) */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#2A2A2A] pb-3 gap-1">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[#ECECEC]" />
            <h2 className="text-sm font-semibold text-[#ECECEC] uppercase tracking-wider">
              Storage Disks Thermals (S.M.A.R.T.)
            </h2>
          </div>
          <span className="text-xs text-[#8C8C8C]">
            Safe operating range: 25°C – 55°C
          </span>
        </div>

        {(!data?.disks || data.disks.length === 0) ? (
          <div className="py-6 text-center text-xs text-[#8C8C8C]">
            Scanning host disk drive telemetry...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 2xl:gap-6">
            {data.disks.map((disk, i) => {
              const diskTemp = isOnline && typeof disk.temp === 'number' ? disk.temp : null;
              return (
                <div key={i} className="p-4 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-medium text-[#ECECEC]">{disk.device}</span>
                      <span className={`text-xs font-mono px-2 py-0.5 rounded-lg border ${getTempBg(diskTemp)}`}>
                        {diskTemp !== null ? `${diskTemp}°C` : 'N/A'}
                      </span>
                    </div>
                    <div className="text-xs text-[#ECECEC] font-medium truncate" title={disk.model}>
                      {disk.model}
                    </div>
                    <div className="text-[11px] text-[#8C8C8C] mt-0.5">
                      Capacity: {disk.size} • Health: <span className="text-emerald-400">{disk.healthGrade}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#2A2A2A] flex items-center justify-between text-[11px]">
                    <span className="text-[#8C8C8C]">Sensor Status</span>
                    <span className={diskTemp !== null ? 'text-emerald-400 font-medium' : 'text-[#8C8C8C]'}>
                      {diskTemp !== null ? (diskTemp >= 55 ? 'Elevated' : 'Optimal Operating Temp') : 'No Probe Data'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 3: Motherboard & ACPI Sensors */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
          <div className="flex items-center gap-2">
            <CircuitBoard className="w-4 h-4 text-[#ECECEC]" />
            <h2 className="text-sm font-semibold text-[#ECECEC] uppercase tracking-wider">
              Motherboard & Platform Sensors
            </h2>
          </div>
          <span className="text-xs text-[#8C8C8C]">Zebronics H61 ACPI & PCH</span>
        </div>

        {(!data?.motherboard || data.motherboard.length === 0) ? (
          <div className="py-6 text-center text-xs text-[#8C8C8C]">
            No auxiliary platform sensor probes reported by host ACPI driver.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.motherboard.map((sensor, i) => {
              const sTemp = isOnline && typeof sensor.temp === 'number' ? sensor.temp : null;
              return (
                <div key={i} className="p-4 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-[#ECECEC]">{sensor.sensor}</div>
                    <div className="text-[11px] text-[#8C8C8C] font-mono mt-0.5">{sensor.adapter}</div>
                  </div>
                  <div className={`text-base font-mono font-medium px-2.5 py-1 rounded-xl border ${getTempBg(sTemp)}`}>
                    {sTemp !== null ? `${sTemp}°C` : '--'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
