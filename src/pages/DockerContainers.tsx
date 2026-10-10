import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Container, Play, RefreshCw, RotateCw, Search, Square } from 'lucide-react';
import type { DockerContainer as DockerContainerInfo } from '../types/docker';
import { dockerService, type DockerResourceStat } from '../services/docker';
import ErrorState from '../components/ui/ErrorState';
import ConfirmDialog from '../components/ui/ConfirmDialog';

type ContainerAction = 'start' | 'stop' | 'restart';

export default function DockerContainers() {
  const [containers, setContainers] = useState<DockerContainerInfo[]>([]);
  const [stats, setStats] = useState<DockerResourceStat[]>([]);
  const [version, setVersion] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [statsError, setStatsError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ name: string; action: ContainerAction } | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [containerResult, statsResult, dockerResult] = await Promise.allSettled([
      dockerService.getContainers(),
      dockerService.getStats(),
      dockerService.getDocker()
    ]);
    if (containerResult.status === 'fulfilled') {
      setContainers(Array.isArray(containerResult.value) ? containerResult.value : []);
      setError(null);
    } else {
      setError(containerResult.reason instanceof Error ? containerResult.reason : new Error('Container inventory could not be loaded.'));
    }
    setStats(statsResult.status === 'fulfilled' && Array.isArray(statsResult.value) ? statsResult.value : []);
    setStatsError(statsResult.status === 'rejected');
    setVersion(dockerResult.status === 'fulfilled' && typeof dockerResult.value?.version === 'string' ? dockerResult.value.version : null);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const visibleContainers = useMemo(() => {
    const value = query.trim().toLowerCase();
    return value ? containers.filter(item => `${item.name} ${item.image} ${item.id} ${item.state}`.toLowerCase().includes(value)) : containers;
  }, [containers, query]);

  const performAction = async (name: string, action: ContainerAction) => {
    setBusy(true);
    setActionError(null);
    try {
      await dockerService.controlContainer(name, action);
      await refresh();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : `Could not ${action} ${name}.`);
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  if (error && containers.length === 0) return <ErrorState title="Docker containers unavailable" message={error.message} onRetry={() => void refresh()} />;

  const running = containers.filter(item => String(item.state).toLowerCase() === 'running').length;

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#8C8C8C] mb-1 flex items-center gap-1.5">
            <Container className="h-3.5 w-3.5" /> Docker Management
          </div>
          <h1 className="text-2xl font-normal font-serif text-[#ECECEC] tracking-tight">Containers</h1>
          <p className="mt-1 text-xs text-[#8C8C8C]">Live inventory from the Ubuntu Docker engine{version ? ` · Docker ${version}` : ''}</p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-3.5 py-2 text-xs font-medium text-[#ECECEC] transition hover:bg-[#222222] active:scale-[0.98] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[['Containers', containers.length], ['Running', running], ['Stopped', containers.length - running]].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <p className="text-[11px] uppercase tracking-wider font-medium text-[#8C8C8C]">{label}</p>
            <p className="mt-2 text-2xl font-normal font-serif tabular-nums text-[#ECECEC]">{value}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#2A2A2A] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#8C8C8C]">{loading ? 'Refreshing server inventory…' : `${visibleContainers.length} of ${containers.length} containers`}</p>
          <label className="flex items-center gap-2 rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-1.5 sm:w-72">
            <Search className="h-3.5 w-3.5 shrink-0 text-[#8C8C8C]" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search containers…"
              className="min-w-0 flex-1 bg-transparent text-xs text-[#ECECEC] outline-none placeholder:text-[#8C8C8C]"
            />
          </label>
        </div>
        {statsError && <div className="border-b border-[#2A2A2A] px-5 py-3 text-xs text-[#8C8C8C]">Container resource metrics are unavailable; inventory is still current.</div>}
        {actionError && <div className="flex items-start gap-2 border-b border-[#2A2A2A] bg-red-950/20 px-5 py-3 text-xs text-red-300"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{actionError}</div>}
        {visibleContainers.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <Container className="mx-auto mb-3 h-6 w-6 text-[#8C8C8C]" />
            <p className="text-xs text-[#8C8C8C]">{query ? 'No containers match this search.' : loading ? 'Loading server inventory…' : 'The server reports no Docker containers.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-left text-xs">
              <thead className="bg-[#0F0F0F]/60 text-[11px] uppercase tracking-wider text-[#8C8C8C] border-b border-[#2A2A2A]">
                <tr>{['Container', 'Image', 'State', 'CPU', 'Memory', 'Network I/O', 'Actions'].map(label => <th key={label} className="px-5 py-3 font-medium">{label}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2A]">
                {visibleContainers.map(item => {
                  const itemStats = stats.find(stat => stat.name === item.name);
                  const active = String(item.state).toLowerCase() === 'running';
                  return (
                    <tr key={item.id} className="transition hover:bg-[#222222]/40">
                      <td className="px-5 py-3.5"><div className="font-medium text-[#ECECEC]">{item.name}</div><div className="font-mono text-[11px] text-[#8C8C8C]">{item.id}</div></td>
                      <td className="max-w-[240px] truncate px-5 py-3.5 font-mono text-[11px] text-[#ECECEC]/90" title={item.image}>{item.image}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] border ${active ? 'border-[#4ADE80]/30 bg-[#4ADE80]/10 text-[#4ADE80]' : 'border-[#2A2A2A] bg-white/[0.03] text-[#8C8C8C]'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-[#4ADE80]' : 'bg-[#8C8C8C]'}`} />
                          {item.status || item.state}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono tabular-nums text-[#ECECEC]">{itemStats ? `${itemStats.cpuPercent.toFixed(1)}%` : '—'}</td>
                      <td className="px-5 py-3.5 font-mono tabular-nums text-[#ECECEC]">{itemStats ? `${itemStats.memoryPercent.toFixed(1)}%` : '—'}</td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-[#8C8C8C]">{itemStats ? `${itemStats.netRx} ↓ · ${itemStats.netTx} ↑` : '—'}</td>
                      <td className="px-5 py-3.5"><div className="flex items-center gap-1">
                        {!active && <button title="Start container" onClick={() => setPending({ name: item.name, action: 'start' })} className="rounded-lg p-1.5 text-[#8C8C8C] hover:bg-[#222222] hover:text-[#ECECEC] transition-colors"><Play className="h-3.5 w-3.5" /></button>}
                        {active && <button title="Stop container" onClick={() => setPending({ name: item.name, action: 'stop' })} className="rounded-lg p-1.5 text-[#8C8C8C] hover:bg-[#222222] hover:text-[#ECECEC] transition-colors"><Square className="h-3.5 w-3.5" /></button>}
                        {active && <button title="Restart container" onClick={() => setPending({ name: item.name, action: 'restart' })} className="rounded-lg p-1.5 text-[#8C8C8C] hover:bg-[#222222] hover:text-[#ECECEC] transition-colors"><RotateCw className="h-3.5 w-3.5" /></button>}
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <ConfirmDialog isOpen={!!pending} onClose={() => setPending(null)} onConfirm={() => { if (pending) void performAction(pending.name, pending.action); }} title={`${pending?.action ?? 'Control'} container?`} message={pending ? `This will ${pending.action} ${pending.name} on the Ubuntu server. The server only allows actions for containers explicitly on its control allowlist.` : ''} confirmText={busy ? 'Working…' : pending?.action ?? 'Confirm'} />
    </div>
  );
}
