import { useState, useEffect, useCallback } from 'react';
import { Moon } from 'lucide-react';
import { ecoModeService, type EcoModeStatus } from '../../services/ecoMode';
import { useToast } from '../ui/ToastContext';
import Badge from '../ui/Badge';

export default function EcoModeCard() {
  const [data, setData] = useState<EcoModeStatus | null>(null);
  const [toggling, setToggling] = useState(false);
  const { addToast } = useToast();

  const loadStatus = useCallback(async () => {
    try {
      const res = await ecoModeService.getStatus();
      setData(res);
    } catch (_) {}
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleToggle = async () => {
    setToggling(true);
    try {
      const res = await ecoModeService.toggleEco(!data?.isCurrentlyEco);
      setData(res);
      addToast({ 
        title: res.isCurrentlyEco ? 'Eco Mode Enabled' : 'Eco Mode Disabled', 
        message: res.isCurrentlyEco ? 'Secondary HDD spun down and quiet profile active.' : 'Restored normal container profile.', 
        type: 'success' 
      });
    } catch (err: any) {
      addToast({ title: 'Action Failed', message: err.message, type: 'error' });
    } finally {
      setToggling(false);
    }
  };

  const isEco = data?.isCurrentlyEco || false;

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border transition-colors ${isEco ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-[#0F0F0F] border-[#2A2A2A] text-[#ECECEC]'}`}>
            <Moon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#ECECEC]">
                Eco & Quiet Night Routine
              </h2>
              <Badge variant={isEco ? 'success' : 'default'} className="text-[10px] py-0">
                {isEco ? 'ECO ACTIVE' : 'STANDARD'}
              </Badge>
            </div>
            <p className="text-xs text-[#8C8C8C] mt-0.5">
              Lowers server wattage, spins down idle WD Blue HDD, and silences heavy background container jobs.
            </p>
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all active:scale-[0.98] ${
            isEco 
              ? 'bg-white text-[#0A0A0A] hover:bg-neutral-200 shadow-sm' 
              : 'bg-[#0F0F0F] hover:bg-[#222222] text-[#ECECEC] border border-[#2A2A2A]'
          }`}
        >
          {isEco ? 'Turn Off Eco Mode' : 'Activate Eco Mode Now'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] uppercase text-[#8C8C8C] font-semibold tracking-wider block">Secondary HDD State</span>
          <div className="font-mono font-medium text-[#ECECEC]">{data?.hddState || 'active/idle'}</div>
          <span className="text-[11px] text-[#8C8C8C]">Target: /dev/sdb (WD 1TB)</span>
        </div>

        <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] uppercase text-[#8C8C8C] font-semibold tracking-wider block">Scheduled Quiet Hours</span>
          <div className="font-mono font-medium text-[#ECECEC]">{data?.quietHoursStart || '23:00'} – {data?.quietHoursEnd || '07:00'}</div>
          <span className="text-[11px] text-[#8C8C8C]">Night automatic sleep</span>
        </div>

        <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] uppercase text-[#8C8C8C] font-semibold tracking-wider block">Workload Throttling</span>
          <div className="font-medium text-[#4ADE80]">Spindown & Pausing Active</div>
          <span className="text-[11px] text-[#8C8C8C]">Saves ~5W to 12W power</span>
        </div>
      </div>
    </div>
  );
}
