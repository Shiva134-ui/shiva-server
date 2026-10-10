import { useServerState } from '../contexts/ServerContext';
import { Activity, Cpu, HardDrive, MemoryStick, RefreshCw, Wifi } from 'lucide-react';
import { formatBytes } from '../utils/safeFormat';

export default function MonitoringMetrics() {
  const { cpu, memory, storage, network, telemetryHistory, refreshAll } = useServerState();
  const systemDisk = storage.data?.find(disk => disk.filesystem === '/' || disk.partitions?.some(partition => partition.mount === '/')) ?? storage.data?.[0];
  const latest = telemetryHistory[telemetryHistory.length - 1];
  const values = [
    { label: 'CPU usage', value: cpu.data?.usagePercent, unit: '%', icon: Cpu, status: cpu.status },
    { label: 'Memory usage', value: memory.data?.usagePercent, unit: '%', icon: MemoryStick, status: memory.status },
    { label: 'System disk', value: systemDisk?.usagePercent, unit: '%', icon: HardDrive, status: storage.status },
    { label: 'Network interfaces', value: network.data?.interfaces?.length, unit: '', icon: Wifi, status: network.status }
  ];

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#8C8C8C] mb-1 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#8C8C8C]" /> Monitoring & Health
          </div>
          <h1 className="text-2xl font-normal font-serif text-[#ECECEC] tracking-tight">Metrics</h1>
          <p className="mt-1 text-xs text-[#8C8C8C] max-w-2xl">Live measurements and capacity breakdown from the authenticated Ubuntu API.</p>
        </div>
        <button
          onClick={() => void refreshAll()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] hover:bg-[#222222] px-3.5 py-2 text-xs font-medium text-[#ECECEC] transition active:scale-[0.98]"
        >
          <RefreshCw className="h-3.5 w-3.5 text-[#8C8C8C]" /> Refresh
        </button>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {values.map(metric => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 shadow-sm">
              <div className="flex items-center justify-between text-xs text-[#8C8C8C]">
                <span>{metric.label}</span>
                <Icon className="h-4 w-4 text-[#8C8C8C]" />
              </div>
              <p className="mt-3 text-2xl font-normal font-mono text-[#ECECEC]">{metric.value == null ? 'Not reported' : `${metric.value}${metric.unit}`}</p>
              <p className="mt-1 text-[11px] text-[#8C8C8C]">{metric.status === 'ONLINE' ? 'Live from server' : metric.status === 'CONNECTING' ? 'Connecting to server' : metric.status.toLowerCase()}</p>
            </article>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 sm:p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-[#ECECEC]">Recent CPU and memory samples</h2>
            <p className="mt-0.5 text-xs text-[#8C8C8C]">Samples collected by the server telemetry poller during this session.</p>
          </div>
          <div className="space-y-4 pt-1">
            {latest ? (
              <>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs"><span className="text-[#8C8C8C]">CPU Load</span><span className="font-mono text-[#ECECEC]">{latest.cpuUsage}%</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#0F0F0F] border border-[#2A2A2A]/50"><div className="h-full rounded-full bg-[#ECECEC]" style={{ width: `${Math.max(0, Math.min(100, latest.cpuUsage))}%` }} /></div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs"><span className="text-[#8C8C8C]">Memory Draw</span><span className="font-mono text-[#ECECEC]">{latest.memoryUsage}%</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#0F0F0F] border border-[#2A2A2A]/50"><div className="h-full rounded-full bg-[#ECECEC]" style={{ width: `${Math.max(0, Math.min(100, latest.memoryUsage))}%` }} /></div>
                </div>
                <p className="pt-2 text-[11px] text-[#8C8C8C] font-mono">Sample time: {new Date(latest.timestamp).toLocaleTimeString()}</p>
              </>
            ) : <p className="py-8 text-center text-xs text-[#8C8C8C]">Waiting for server telemetry samples.</p>}
          </div>
        </div>
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 sm:p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-[#ECECEC]">Current capacity</h2>
            <p className="mt-0.5 text-xs text-[#8C8C8C]">Primary storage and networking interfaces.</p>
          </div>
          <div className="divide-y divide-[#2A2A2A]/60">
            <div className="flex justify-between gap-4 py-3 text-xs"><span className="text-[#8C8C8C]">Memory used</span><span className="font-mono text-[#ECECEC]">{memory.data ? `${formatBytes(memory.data.used)} / ${formatBytes(memory.data.total)}` : 'Not reported'}</span></div>
            <div className="flex justify-between gap-4 py-3 text-xs"><span className="text-[#8C8C8C]">System disk free</span><span className="font-mono text-[#ECECEC]">{systemDisk ? formatBytes(systemDisk.free) : 'Not reported'}</span></div>
            <div className="flex justify-between gap-4 py-3 text-xs"><span className="text-[#8C8C8C]">Active route</span><span className="font-mono text-[#ECECEC]">{network.data?.activeInterface || 'Not reported'}</span></div>
          </div>
          <p className="text-[11px] text-[#8C8C8C] font-mono">Last API update: {cpu.lastUpdated ? new Date(cpu.lastUpdated).toLocaleTimeString() : 'Waiting for server data'}</p>
        </div>
      </section>
    </div>
  );
}
