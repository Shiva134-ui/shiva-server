import { useState, useEffect, useCallback } from 'react';
import { 
  Gamepad2, 
  RotateCw, 
  ExternalLink 
} from 'lucide-react';
import { craftyWidgetService, type CraftyStatus } from '../../services/craftyWidget';
import { useToast } from '../ui/ToastContext';
import Badge from '../ui/Badge';

export default function CraftyMinecraftCard() {
  const [data, setData] = useState<CraftyStatus | null>(null);
  const [acting, setActing] = useState(false);
  const { addToast } = useToast();

  const loadStatus = useCallback(async () => {
    try {
      const res = await craftyWidgetService.getStatus();
      setData(res);
    } catch (_) {}
  }, []);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 15000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  const handleAction = async (action: 'start' | 'stop' | 'restart') => {
    setActing(true);
    addToast({ title: 'Sending Command', message: `Executing ${action} on Crafty container...`, type: 'info' });
    try {
      const res = await craftyWidgetService.controlContainer(action);
      setData(res);
      addToast({ title: 'Success', message: `Container ${action} completed.`, type: 'success' });
    } catch (err: any) {
      addToast({ title: 'Action Failed', message: err.message, type: 'error' });
    } finally {
      setActing(false);
    }
  };

  const isRunning = data?.containerState === 'running';

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#0F0F0F] border border-[#2A2A2A] text-[#ECECEC]">
            <Gamepad2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#ECECEC]">Crafty 4 Minecraft Server</h2>
              <Badge variant={isRunning ? 'success' : 'default'} className="text-[10px] py-0">
                {data?.containerState.toUpperCase() || 'STOPPED'}
              </Badge>
            </div>
            <p className="text-xs text-[#8C8C8C] mt-0.5">
              Dedicated Minecraft multiplayer instance on port 25565 with web panel on 8443.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={data?.craftyUrl || "https://crafty.madesh.in"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white text-[#0A0A0A] hover:bg-neutral-200 transition shadow-sm active:scale-[0.98]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Crafty Web Panel
          </a>

          <button
            onClick={() => handleAction('restart')}
            disabled={acting}
            className="p-2 rounded-xl bg-[#0F0F0F] hover:bg-[#222222] text-[#ECECEC] border border-[#2A2A2A] transition active:scale-[0.98] disabled:opacity-50"
            title="Restart Container"
          >
            <RotateCw className={`w-3.5 h-3.5 text-[#8C8C8C] ${acting ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] uppercase text-[#8C8C8C] font-semibold tracking-wider block">Crafty Web UI</span>
          <div className="font-medium text-[#ECECEC] flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${data?.craftyWebOnline ? 'bg-[#4ADE80]' : 'bg-[#F87171]'}`} />
            {data?.craftyWebOnline ? 'Port 8443 Online' : 'Offline'}
          </div>
        </div>

        <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] uppercase text-[#8C8C8C] font-semibold tracking-wider block">Minecraft Port</span>
          <div className="font-medium text-[#ECECEC] flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${data?.mcPortOnline ? 'bg-[#4ADE80]' : 'bg-[#8C8C8C]'}`} />
            {data?.mcPortOnline ? 'Port 25565 Active' : 'Idle'}
          </div>
        </div>

        <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] uppercase text-[#8C8C8C] font-semibold tracking-wider block">CPU Load</span>
          <div className="font-medium font-mono text-[#ECECEC]">{data?.cpuPercent || '0%'}</div>
        </div>

        <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] uppercase text-[#8C8C8C] font-semibold tracking-wider block">RAM Draw</span>
          <div className="font-medium font-mono text-[#ECECEC]">{data?.memoryUsage || '0 MB'}</div>
        </div>
      </div>
    </div>
  );
}
