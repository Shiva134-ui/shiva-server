import { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  RefreshCw, 
  Thermometer, 
  CheckCircle2
} from 'lucide-react';
import { smartHealthService, type SmartDeepResponse } from '../../services/smartHealth';
import { useToast } from '../ui/ToastContext';
import Badge from '../ui/Badge';

export default function SmartDeepScanCard() {
  const [data, setData] = useState<SmartDeepResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const loadHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await smartHealthService.getDeepHealth();
      setData(res);
    } catch (err: any) {
      addToast({ title: 'SMART Scan Failed', message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadHealth();
  }, [loadHealth]);

  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-white">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Hard Drive S.M.A.R.T. Lifespan & Deep Health Probe
            </h2>
            <p className="text-xs text-neutral-400">
              Low-level drive telemetry: Reallocated sectors, power cycles, and endurance metrics.
            </p>
          </div>
        </div>

        <button
          onClick={loadHealth}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Run S.M.A.R.T. Scan
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          <div className="h-44 bg-white/5 rounded-xl border border-white/5" />
          <div className="h-44 bg-white/5 rounded-xl border border-white/5" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data?.devices.map(dev => (
            <div key={dev.device} className="bg-[#141416] border border-[#27272a] rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{dev.model}</span>
                    <Badge variant={dev.passed ? 'success' : 'error'} className="text-[10px] py-0">
                      {dev.healthGrade}
                    </Badge>
                  </div>
                  <div className="text-xs font-mono text-neutral-500 mt-0.5">
                    {dev.device} • Serial: {dev.serial} • {dev.size}
                  </div>
                </div>

                {dev.temperature != null && (
                  <div className="flex items-center gap-1 text-xs font-mono font-bold text-neutral-300 bg-white/5 px-2 py-1 rounded">
                    <Thermometer className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{dev.temperature}°C</span>
                  </div>
                )}
              </div>

              {/* Vital Health Metrics */}
              <div className="grid grid-cols-3 gap-2 py-3 border-y border-[#27272a] text-xs">
                <div>
                  <span className="text-[10px] uppercase text-neutral-500 block">Reallocated Sectors</span>
                  <span className={`font-mono font-bold ${dev.reallocatedSectors === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {dev.reallocatedSectors}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-neutral-500 block">Power-On Hours</span>
                  <span className="font-mono font-bold text-white">
                    {dev.powerOnHours != null ? `${dev.powerOnHours} hrs` : '--'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-neutral-500 block">Pending Sectors</span>
                  <span className={`font-mono font-bold ${dev.pendingSectors === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {dev.pendingSectors}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Self-Test Status: <strong className="text-white font-medium">{dev.passed ? 'PASSED' : 'CHECK DRIVE'}</strong>
                </span>
                <span>Power Cycles: <strong className="text-neutral-200 font-mono">{dev.powerCycles ?? '--'}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
