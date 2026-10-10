import { useEffect, useState, useCallback } from 'react';
import { Flame, ShieldAlert, Play, RefreshCw, Sliders } from 'lucide-react';
import { thermalGuardService, type ThermalGuardStatus } from '../../services/thermalGuard';
import { useToast } from '../ui/ToastContext';

export default function ThermalGuardCard() {
  const [status, setStatus] = useState<ThermalGuardStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [resuming, setResuming] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [threshold, setThreshold] = useState(88);
  const [autoThrottle, setAutoThrottle] = useState(true);
  const { addToast } = useToast();

  const loadStatus = useCallback(async () => {
    try {
      const data = await thermalGuardService.getStatus();
      setStatus(data);
      setThreshold(data.criticalThreshold);
      setAutoThrottle(data.autoThrottleEnabled);
    } catch (_) {
      // Ignore background errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 15000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  const handleSaveConfig = async () => {
    try {
      const updated = await thermalGuardService.updateConfig({
        criticalThreshold: threshold,
        autoThrottleEnabled: autoThrottle
      });
      setStatus(updated);
      setShowConfig(false);
      addToast({ title: 'Thermal Guard Updated', message: `Safety cutoff set to ${threshold}°C.`, type: 'success' });
    } catch (err: any) {
      addToast({ title: 'Update Failed', message: err.message, type: 'error' });
    }
  };

  const handleResume = async () => {
    setResuming(true);
    try {
      const res = await thermalGuardService.resumeContainers();
      addToast({ title: 'Containers Resumed', message: `Restarted: ${res.resumed.join(', ') || 'None'}`, type: 'success' });
      await loadStatus();
    } catch (err: any) {
      addToast({ title: 'Resume Failed', message: err.message, type: 'error' });
    } finally {
      setResuming(false);
    }
  };

  if (loading && !status) {
    return (
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 animate-pulse">
        <div className="h-4 w-40 bg-[#2A2A2A] rounded mb-4"></div>
        <div className="h-8 w-24 bg-[#2A2A2A] rounded"></div>
      </div>
    );
  }

  const temp = typeof status?.maxTemp === 'number' && status.maxTemp > 0 
    ? status.maxTemp 
    : (typeof status?.currentTemp === 'number' && status.currentTemp > 0 ? status.currentTemp : null);
  const isCritical = temp !== null && temp >= (status?.criticalThreshold || 88);
  const isWarning = temp !== null && temp >= (status?.warningThreshold || 82) && !isCritical;
  const pausedCount = status?.pausedContainers?.length || 0;

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5">
      {/* Header matching Current Power & Dashboard cards */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-medium text-[#8C8C8C] uppercase tracking-[0.04em] flex items-center gap-2">
          <Flame className="w-3.5 h-3.5 text-[#8C8C8C]" /> Thermal Guard
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-[#2A2A2A] bg-[#141414] text-[10px] font-mono text-[#8C8C8C]">
            <span className={`w-1.5 h-1.5 rounded-full ${isCritical ? 'bg-[#F87171]' : isWarning ? 'bg-[#FBBF24]' : 'bg-[#4ADE80]'}`} />
            {isCritical ? 'Critical' : isWarning ? 'Elevated' : 'Normal'}
          </div>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="p-1 rounded-lg hover:bg-[#222222] text-[#8C8C8C] hover:text-[#ECECEC] transition-colors cursor-pointer"
            title="Configure Thresholds"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={loadStatus}
            className="p-1 rounded-lg hover:bg-[#222222] text-[#8C8C8C] hover:text-[#ECECEC] transition-colors cursor-pointer"
            title="Refresh Sensors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Core Temperature Stat */}
      <div className="flex justify-between items-end mb-2">
        <div>
          <div className="text-2xl font-bold font-mono text-[#ECECEC]">
            {temp !== null ? temp : '--'} <span className="text-xs text-[#8C8C8C] font-normal">°C</span>
          </div>
          <div className="text-[10px] font-medium text-[#8C8C8C] uppercase tracking-wider mt-1">Core Temperature</div>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono text-[#8C8C8C]">i3-3220 • Peak Core</span>
        </div>
      </div>

      {/* Progress bar matching CPU/Memory/Storage */}
      <div className="mb-4">
        <div className="h-1.5 w-full bg-[#2A2A2A] rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-300 ease-out bg-white" 
            style={{ width: `${temp !== null ? Math.min(100, Math.max(0, ((temp - 30) / (105 - 30)) * 100)) : 0}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] font-mono text-[#8C8C8C] mt-1.5">
          <span>30°C</span>
          <span>Limit {status?.criticalThreshold || 88}°C</span>
          <span>Trip 105°C</span>
        </div>
      </div>

      {pausedCount > 0 && (
        <div className="mb-4 rounded-xl border border-[#2A2A2A] bg-[#141414] p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs min-w-0 text-[#ECECEC]">
            <ShieldAlert className="w-4 h-4 text-[#FBBF24] shrink-0" />
            <span className="truncate">
              Auto-Throttle Paused: <strong className="text-white">{status?.pausedContainers.join(', ')}</strong>
            </span>
          </div>
          <button
            onClick={handleResume}
            disabled={resuming}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-neutral-200 text-[#0A0A0A] text-xs font-semibold shrink-0 cursor-pointer transition-colors"
          >
            <Play className="w-3 h-3" />
            {resuming ? '...' : 'Resume'}
          </button>
        </div>
      )}

      {showConfig && (
        <div className="mb-4 rounded-xl border border-[#2A2A2A] bg-[#141414] p-3.5 space-y-3 text-xs animate-fade-in">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-medium text-[#ECECEC]">Safety Throttle Limit</label>
              <span className="font-mono text-xs font-semibold text-[#ECECEC]">{threshold}°C</span>
            </div>
            <input
              type="range"
              min="75"
              max="95"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full accent-white h-1.5 bg-[#2A2A2A] rounded-lg cursor-pointer"
            />
            <p className="text-[10px] text-[#8C8C8C] mt-1">
              Stops non-essential containers when CPU cores exceed limit.
            </p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[#ECECEC] text-[11px]">Auto-Throttle Active</span>
            <input
              type="checkbox"
              checked={autoThrottle}
              onChange={(e) => setAutoThrottle(e.target.checked)}
              className="rounded border-[#2A2A2A] accent-white h-3.5 w-3.5 cursor-pointer"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#2A2A2A]">
            <button
              onClick={() => setShowConfig(false)}
              className="px-2.5 py-1 rounded-lg text-[#8C8C8C] hover:text-[#ECECEC] text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveConfig}
              className="px-3 py-1 rounded-lg bg-white hover:bg-neutral-200 text-[#0A0A0A] text-xs font-semibold cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* 2x2 Metric Grid matching Current Power subcards */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-xl bg-[#141414] p-3 border border-[#2A2A2A]">
          <div className="text-[10px] font-medium text-[#8C8C8C] uppercase tracking-wider mb-1">Peak Temp</div>
          <div className="text-base font-bold font-mono text-[#ECECEC]">
            {temp}°C
          </div>
          <div className="text-[10px] text-[#8C8C8C] mt-0.5">Sensor Live</div>
        </div>

        <div className="rounded-xl bg-[#141414] p-3 border border-[#2A2A2A]">
          <div className="text-[10px] font-medium text-[#8C8C8C] uppercase tracking-wider mb-1">Safety Limit</div>
          <div className="text-base font-bold font-mono text-[#ECECEC]">
            {status?.criticalThreshold || 88}°C
          </div>
          <div className="text-[10px] text-[#8C8C8C] mt-0.5">Auto-Throttle</div>
        </div>

        <div className="rounded-xl bg-[#141414] p-3 border border-[#2A2A2A]">
          <div className="text-[10px] font-medium text-[#8C8C8C] uppercase tracking-wider mb-1">Cutoff Limit</div>
          <div className="text-base font-bold font-mono text-[#ECECEC]">
            105.0°C
          </div>
          <div className="text-[10px] text-[#8C8C8C] mt-0.5">Hardware Trip</div>
        </div>

        <div className="rounded-xl bg-[#141414] p-3 border border-[#2A2A2A]">
          <div className="text-[10px] font-medium text-[#8C8C8C] uppercase tracking-wider mb-1">Throttle Policy</div>
          <div className="text-base font-semibold text-[#ECECEC] flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${status?.autoThrottleEnabled ? 'bg-[#4ADE80]' : 'bg-[#8C8C8C]'}`} />
            <span>{status?.autoThrottleEnabled ? 'Armed' : 'Off'}</span>
          </div>
          <div className="text-[10px] text-[#8C8C8C] mt-0.5">Daemon Guard</div>
        </div>
      </div>
    </div>
  );
}
