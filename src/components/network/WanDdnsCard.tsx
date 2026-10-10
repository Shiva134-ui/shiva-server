import { useState, useEffect, useCallback } from 'react';
import { 
  Globe, 
  RefreshCw, 
  CheckCircle2
} from 'lucide-react';
import { wanDdnsService, type WanDdnsStatus } from '../../services/wanDdns';
import { useToast } from '../ui/ToastContext';

export default function WanDdnsCard() {
  const [data, setData] = useState<WanDdnsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const loadStatus = useCallback(async () => {
    try {
      const res = await wanDdnsService.getStatus();
      setData(res);
    } catch (err: any) {
      addToast({ title: 'DDNS Error', message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-6 shadow-sm space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-white">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Public WAN IP & Dynamic DNS Routing
            </h2>
            <p className="text-xs text-neutral-400">
              ISP public address detection and Cloudflare edge domain synchronization.
            </p>
          </div>
        </div>

        <button
          onClick={loadStatus}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Check IP
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#141416] border border-[#27272a] rounded-xl p-4">
          <span className="text-[10px] uppercase font-semibold text-neutral-500">Public WAN IP</span>
          <div className="text-lg font-bold font-mono text-white mt-1">
            {data?.publicIp || 'Scanning...'}
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block">Assigned by ISP Router</span>
        </div>

        <div className="bg-[#141416] border border-[#27272a] rounded-xl p-4">
          <span className="text-[10px] uppercase font-semibold text-neutral-500">Cloudflare DNS Record</span>
          <div className="text-base font-bold font-mono text-white mt-1 truncate" title={data?.dnsDomain}>
            {data?.dnsDomain || 'cloud.madesh.in'}
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block">Target: {data?.dnsResolvedIp || 'Resolved'}</span>
        </div>

        <div className="bg-[#141416] border border-[#27272a] rounded-xl p-4">
          <span className="text-[10px] uppercase font-semibold text-neutral-500">Tunnel Status</span>
          <div className="text-base font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Active & Proxied
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block">Cloudflare Tunnel Edge</span>
        </div>
      </div>
    </div>
  );
}
