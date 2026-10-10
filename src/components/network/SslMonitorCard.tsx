import { useState, useEffect, useCallback } from 'react';
import { 
  Lock, 
  RefreshCw
} from 'lucide-react';
import { sslMonitorService, type SslMonitorResponse } from '../../services/sslMonitor';
import { useToast } from '../ui/ToastContext';
import Badge from '../ui/Badge';

export default function SslMonitorCard() {
  const [data, setData] = useState<SslMonitorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const loadCerts = useCallback(async () => {
    try {
      const res = await sslMonitorService.checkAll();
      setData(res);
    } catch (err: any) {
      addToast({ title: 'SSL Monitor Error', message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadCerts();
  }, [loadCerts]);

  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-6 shadow-sm space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-white">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              SSL / TLS Certificate Expiration Monitor
            </h2>
            <p className="text-xs text-neutral-400">
              Automated expiry inspection for madesh.in production subdomains.
            </p>
          </div>
        </div>

        <button
          onClick={loadCerts}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Verify Certs
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data?.certificates.map(c => {
          const isHealthy = c.status === 'valid' && (c.daysRemaining || 0) > 15;
          const isExpiringSoon = c.status === 'expiring_soon' || (c.daysRemaining != null && c.daysRemaining <= 15);

          return (
            <div key={c.domain} className="bg-[#141416] border border-[#27272a] rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{c.name}</h3>
                  <span className="text-xs font-mono text-neutral-400">{c.domain}</span>
                </div>
                <Badge variant={isHealthy ? 'success' : isExpiringSoon ? 'warning' : 'error'} className="text-[10px] py-0">
                  {c.status.toUpperCase()}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-[#27272a]">
                <span className="text-neutral-500">Days Remaining:</span>
                <span className={`font-bold ${isHealthy ? 'text-emerald-400' : isExpiringSoon ? 'text-amber-400' : 'text-rose-400'}`}>
                  {c.daysRemaining != null ? `${c.daysRemaining} days` : 'Error'}
                </span>
              </div>

              <div className="text-[11px] text-neutral-500 flex justify-between">
                <span>Issuer: {c.issuer || 'Cloudflare'}</span>
                {c.validTo && <span>Expires: {new Date(c.validTo).toLocaleDateString()}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
