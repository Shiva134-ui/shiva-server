import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, EthernetPort, Globe, RefreshCw, Route, Stethoscope } from 'lucide-react';
import { systemService } from '../services/system';
import ErrorState from './ui/ErrorState';

type Address = { interface?: string; family?: string; address?: string; mac?: string; internal?: boolean };
type Interface = { name?: string; rx?: number; tx?: number };
type NetworkSnapshot = { interfaces?: Interface[]; addresses?: Address[]; defaultRoute?: string | null; timestamp?: string };
type View = 'interfaces' | 'wan' | 'diagnostics';

function formatBytes(value: number | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 'Not reported';
  if (value === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

export default function NetworkSnapshotPage({ view }: { view: View }) {
  const [snapshot, setSnapshot] = useState<NetworkSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSnapshot(await systemService.getNetwork());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error('Server network data could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const title = view === 'interfaces' ? 'Interfaces' : view === 'wan' ? 'WAN' : 'Diagnostics';
  const Icon = view === 'interfaces' ? EthernetPort : view === 'wan' ? Globe : Stethoscope;
  const interfaces = snapshot?.interfaces ?? [];
  const addresses = snapshot?.addresses ?? [];
  const route = snapshot?.defaultRoute?.trim() || null;
  const totals = useMemo(() => interfaces.reduce<{ rx: number; tx: number }>((sum, item) => ({ rx: sum.rx + (typeof item.rx === 'number' ? item.rx : 0), tx: sum.tx + (typeof item.tx === 'number' ? item.tx : 0) }), { rx: 0, tx: 0 }), [interfaces]);

  if (error && !snapshot) return <ErrorState title={`${title} unavailable`} message={error.message} onRetry={() => void refresh()} />;

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#8C8C8C] mb-1 flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5" /> Network Management
          </div>
          <h1 className="text-2xl font-normal font-serif text-[#ECECEC] tracking-tight">{title}</h1>
          <p className="mt-1 text-xs text-[#8C8C8C]">Live network information reported by the Ubuntu server.</p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-3.5 py-2 text-xs font-medium text-[#ECECEC] transition hover:bg-[#222222] active:scale-[0.98] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      {error && <div className="rounded-2xl border border-[#FBBF24]/20 bg-[#FBBF24]/5 px-5 py-3 text-xs text-[#FBBF24]">Refresh failed: {error.message}</div>}

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider font-medium text-[#8C8C8C]">Interfaces</p>
          <p className="mt-2 text-2xl font-normal font-serif tabular-nums text-[#ECECEC]">{interfaces.length}</p>
        </div>
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider font-medium text-[#8C8C8C]">Default route</p>
          <p className="mt-2 truncate text-sm font-medium text-[#ECECEC]" title={route ?? undefined}>{loading && !snapshot ? 'Loading…' : route ? 'Reported' : 'Not reported'}</p>
        </div>
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider font-medium text-[#8C8C8C]">Last sample</p>
          <p className="mt-2 text-xs text-[#ECECEC] font-mono">{snapshot?.timestamp ? new Date(snapshot.timestamp).toLocaleString() : 'Not reported'}</p>
        </div>
      </section>

      {view === 'wan' && <section className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2"><Route className="h-4 w-4 text-[#8C8C8C]" /><h2 className="text-sm font-medium text-[#ECECEC]">Ubuntu default route</h2></div>
        <p className="break-all rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-4 font-mono text-xs text-[#ECECEC]">{route ?? (loading ? 'Loading route…' : 'The server did not report a default route.')}</p>
        <p className="mt-3 text-xs leading-relaxed text-[#8C8C8C]">The server API reports its local routing table here. It does not currently provide a public WAN address or active connectivity probe.</p>
      </section>}

      {view === 'diagnostics' && <section className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 shadow-sm">
        <div className="mb-2 flex items-center gap-2"><Activity className="h-4 w-4 text-[#8C8C8C]" /><h2 className="text-sm font-medium text-[#ECECEC]">Available server diagnostics</h2></div>
        <p className="text-xs leading-relaxed text-[#8C8C8C]">This view uses the network snapshot exposed by the Ubuntu API: interface addresses, cumulative byte counters, and the default route. It does not run ping, DNS, internet-speed or firewall tests because those checks are not exposed by the current server API.</p>
      </section>}

      <section className="overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-sm">
        <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-4">
          <h2 className="text-xs uppercase tracking-wider font-medium text-[#8C8C8C]">Server interfaces</h2>
          <span className="font-mono text-xs text-[#8C8C8C]">{interfaces.length}</span>
        </div>
        {interfaces.length === 0 ? <p className="px-5 py-14 text-center text-xs text-[#8C8C8C]">{loading ? 'Loading network snapshot…' : 'The server reported no interfaces.'}</p> : (
          <ul className="divide-y divide-[#2A2A2A]">{interfaces.map((item, index) => {
            const name = item.name || `Interface ${index + 1}`;
            const interfaceAddresses = addresses.filter(address => address.interface === item.name);
            return <li key={`${name}-${index}`} className="space-y-3 px-5 py-4 hover:bg-[#222222]/30 transition-colors">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2"><EthernetPort className="h-4 w-4 text-[#8C8C8C]" /><span className="text-sm font-medium text-[#ECECEC]">{name}</span></div>
                <span className="text-xs text-[#8C8C8C]">Addresses: {interfaceAddresses.length}</span>
              </div>
              {interfaceAddresses.length > 0 && <div className="flex flex-wrap gap-2">{interfaceAddresses.map((address, addressIndex) => <span key={`${address.address}-${addressIndex}`} className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-2.5 py-1 font-mono text-xs text-[#ECECEC]">{address.family ? `${address.family} ` : ''}{address.address || 'Address not reported'}</span>)}</div>}
              {view !== 'wan' && <div className="grid gap-2 text-xs text-[#8C8C8C] sm:grid-cols-2"><span>Received: <span className="font-mono text-[#ECECEC]">{formatBytes(item.rx)}</span></span><span>Sent: <span className="font-mono text-[#ECECEC]">{formatBytes(item.tx)}</span></span></div>}
            </li>;
          })}</ul>
        )}
      </section>

      {view !== 'wan' && <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider font-medium text-[#8C8C8C]">Total received</p>
          <p className="mt-2 text-xl font-normal font-serif tabular-nums text-[#ECECEC]">{formatBytes(totals.rx)}</p>
        </div>
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider font-medium text-[#8C8C8C]">Total sent</p>
          <p className="mt-2 text-xl font-normal font-serif tabular-nums text-[#ECECEC]">{formatBytes(totals.tx)}</p>
        </div>
      </section>}
      <p className="text-[11px] text-[#8C8C8C]">Cumulative network counters are read from the server API. They are not instantaneous throughput measurements.</p>
    </div>
  );
}
