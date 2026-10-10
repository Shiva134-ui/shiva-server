import { useCallback, useEffect, useState } from 'react';
import { Bell, RefreshCw, ShieldAlert } from 'lucide-react';
import type { SystemAlert } from '../types/alerts';
import { alertsService } from '../services/alerts';
import ErrorState from '../components/ui/ErrorState';

export default function MonitoringAlerts() {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setAlerts(await alertsService.getAlerts());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error('Could not load alerts from the server.'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  if (error && alerts.length === 0) return <ErrorState title="Alerts unavailable" message={error.message} onRetry={() => void refresh()} />;

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#8C8C8C] mb-1 flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5 text-[#8C8C8C]" /> Monitoring & Health
          </div>
          <h1 className="text-2xl font-normal font-serif text-[#ECECEC] tracking-tight">Alerts</h1>
          <p className="mt-1 text-xs text-[#8C8C8C] max-w-2xl">Current threshold and service alerts reported by the server engine.</p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] hover:bg-[#222222] px-3.5 py-2 text-xs font-medium text-[#ECECEC] transition active:scale-[0.98] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-[#8C8C8C] ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300">Refresh failed: {error.message}</div>}

      <section className="overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-sm">
        <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-3.5 bg-[#0F0F0F] text-xs">
          <span className="font-semibold text-[#ECECEC]">Active Alerts</span>
          <span className="font-mono text-[11px] text-[#8C8C8C]">{alerts.length}</span>
        </div>
        {alerts.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <ShieldAlert className="mx-auto mb-3 h-6 w-6 text-[#8C8C8C] opacity-50" />
            <p className="text-xs text-[#8C8C8C]">{loading ? 'Checking server thresholds…' : 'The server reports no active alerts.'}</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#2A2A2A]/60">
            {alerts.map(alert => (
              <li key={alert.id} className="flex gap-4 px-5 py-4 hover:bg-[#222222]/40 transition text-xs">
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${alert.type === 'critical' ? 'bg-[#F87171]' : alert.type === 'warning' ? 'bg-[#FBBF24]' : 'bg-[#8C8C8C]'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-medium text-[#ECECEC]">{alert.title}</p>
                    <span className="rounded-full bg-[#0F0F0F] border border-[#2A2A2A] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#8C8C8C] font-mono">{alert.type}</span>
                  </div>
                  <p className="mt-1 text-xs text-[#8C8C8C]">{alert.message}</p>
                  <time className="mt-2 block text-[11px] text-[#8C8C8C] font-mono">{new Date(alert.timestamp).toLocaleString()}</time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
