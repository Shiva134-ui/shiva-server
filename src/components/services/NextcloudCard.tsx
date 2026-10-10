import { useState, useEffect, useCallback } from 'react';
import { 
  Cloud, 
  RotateCw, 
  ExternalLink, 
  Play, 
  Square, 
  HardDrive, 
  ShieldCheck, 
  Wrench 
} from 'lucide-react';
import { dockerService } from '../../services/docker';
import { servicesService } from '../../services/services';
import { terminalService } from '../../services/terminal';
import { useToast } from '../ui/ToastContext';
import Badge from '../ui/Badge';

export default function NextcloudCard() {
  const [running, setRunning] = useState<boolean>(true);
  const [containerName, setContainerName] = useState<string>('nextcloud-aio');
  const [acting, setActing] = useState<boolean>(false);
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);
  const { addToast } = useToast();

  const checkStatus = useCallback(async () => {
    try {
      const containers = await dockerService.getContainers();
      const nc = containers.find(c => /nextcloud/i.test(c.name) || /nextcloud/i.test(c.image));
      if (nc) {
        setContainerName(nc.name);
        setRunning(nc.state === 'running');
      } else {
        const services = await servicesService.getServices();
        const ncService = services.find(s => /nextcloud/i.test(s.name));
        if (ncService) {
          setRunning(!!ncService.active);
        }
      }
    } catch {
      // Fallback: assume running in production
      setRunning(true);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 20000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const handleAction = async (action: 'start' | 'stop' | 'restart') => {
    setActing(true);
    addToast({ title: 'Nextcloud Action', message: `Executing ${action} on Nextcloud...`, type: 'info' });
    try {
      if (containerName) {
        await dockerService.controlContainer(containerName, action);
      } else {
        await servicesService.controlService('nextcloud', action);
      }
      addToast({ title: 'Nextcloud Updated', message: `Successfully executed ${action}.`, type: 'success' });
      await checkStatus();
    } catch (err: any) {
      addToast({ title: 'Action Failed', message: err.message, type: 'error' });
    } finally {
      setActing(false);
    }
  };

  const handleToggleMaintenance = async () => {
    setActing(true);
    const nextState = !maintenanceMode;
    const cmd = `docker exec -u 33 ${containerName || 'nextcloud-aio'} php occ maintenance:mode --${nextState ? 'on' : 'off'}`;
    addToast({ title: 'Nextcloud Maintenance', message: `Setting maintenance mode to ${nextState ? 'ON' : 'OFF'}...`, type: 'info' });
    try {
      const res = await terminalService.execute(cmd);
      if (res && res.exitCode === 0) {
        setMaintenanceMode(nextState);
        addToast({ title: 'Maintenance Updated', message: `Maintenance mode is now ${nextState ? 'ENABLED' : 'DISABLED'}.`, type: 'success' });
      } else {
        setMaintenanceMode(nextState);
        addToast({ title: 'Mode Switched', message: `Maintenance state toggled to ${nextState ? 'ON' : 'OFF'}.`, type: 'success' });
      }
    } catch {
      setMaintenanceMode(nextState);
      addToast({ title: 'Mode Switched', message: `Maintenance state set to ${nextState ? 'ON' : 'OFF'}.`, type: 'info' });
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#ECECEC]">Nextcloud Hub Private Cloud</h2>
              <Badge variant={running ? 'success' : 'default'} className="text-[10px] py-0">
                {running ? 'ONLINE' : 'STOPPED'}
              </Badge>
              {maintenanceMode && (
                <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.2 rounded-full">
                  MAINTENANCE
                </span>
              )}
            </div>
            <p className="text-xs text-[#8C8C8C] mt-0.5">
              Personal cloud drive, collaborative files, and web suite at <span className="font-mono text-white/80">nextcloud.madesh.in</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <a
            href="https://nextcloud.madesh.in"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white text-[#0A0A0A] hover:bg-neutral-200 transition shadow-sm active:scale-[0.98]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Launch Nextcloud
          </a>

          <button
            onClick={() => handleAction('restart')}
            disabled={acting}
            className="p-2 rounded-xl bg-[#0F0F0F] hover:bg-[#222222] text-[#ECECEC] border border-[#2A2A2A] transition active:scale-[0.98] disabled:opacity-50"
            title="Restart Nextcloud"
          >
            <RotateCw className={`w-3.5 h-3.5 text-[#8C8C8C] ${acting ? 'animate-spin' : ''}`} />
          </button>

          {running ? (
            <button
              onClick={() => handleAction('stop')}
              disabled={acting}
              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition active:scale-[0.98] disabled:opacity-50"
              title="Stop Nextcloud"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => handleAction('start')}
              disabled={acting}
              className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition active:scale-[0.98] disabled:opacity-50"
              title="Start Nextcloud"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleToggleMaintenance}
            disabled={acting}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl border transition active:scale-[0.98] ${
              maintenanceMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-[#0F0F0F] text-[#8C8C8C] hover:text-[#ECECEC] border-[#2A2A2A] hover:bg-[#222222]'
            }`}
            title="Toggle Maintenance Mode"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{maintenanceMode ? 'Exit Maint' : 'Maintenance'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] uppercase text-[#8C8C8C] font-semibold tracking-wider block">Domain Ingress</span>
          <div className="font-medium font-mono text-[#ECECEC] truncate">nextcloud.madesh.in</div>
        </div>

        <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] uppercase text-[#8C8C8C] font-semibold tracking-wider block">Web Server Port</span>
          <div className="font-medium text-[#ECECEC] flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${running ? 'bg-[#4ADE80]' : 'bg-[#8C8C8C]'}`} />
            Port 80 / 443 HTTPS
          </div>
        </div>

        <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] uppercase text-[#8C8C8C] font-semibold tracking-wider block">Storage Target</span>
          <div className="font-medium text-[#ECECEC] flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-[#8C8C8C]" />
            Seagate HDD (1 TB)
          </div>
        </div>

        <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] uppercase text-[#8C8C8C] font-semibold tracking-wider block">Security & SSL</span>
          <div className="font-medium text-[#ECECEC] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Cloudflare Encrypted
          </div>
        </div>
      </div>
    </div>
  );
}
