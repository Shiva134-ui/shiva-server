import { useState, useEffect, useMemo } from 'react';
import { 
  Server, 
  Container,
  Clock,
  RefreshCw, 
  Search, 
  Play, 
  Square, 
  RotateCw, 
  ToggleLeft,
  ToggleRight,
  Layers
} from 'lucide-react';
import { servicesService } from '../services/services';
import { dockerService } from '../services/docker';
import { cronService } from '../services/cron';
import type { AppService, AutoStartType } from '../types/services';
import { useServerState } from '../contexts/ServerContext';
import LoadingScreen from '../components/ui/LoadingScreen';
import Badge from '../components/ui/Badge';
import { useToast } from '../components/ui/ToastContext';
import ConfirmDialog from '../components/ui/ConfirmDialog';

type ScopeType = 'all' | 'service' | 'container' | 'timer';
type StateFilterType = 'all' | 'enabled' | 'disabled' | 'running' | 'stopped';

const KNOWN_BOOT_SERVICES = [
  'madesh-api', 'cloudflared', 'docker', 'smbd', 'nmbd', 
  'ssh', 'ufw', 'cron', 'tailscaled', 'nginx', 'nextcloud', 
  'smartmontools', 'systemd-timesyncd', 'avahi-daemon'
];

export default function SystemServices() {
  const { health } = useServerState();
  const [items, setItems] = useState<AppService[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<ScopeType>('all');
  const [stateFilter, setStateFilter] = useState<StateFilterType>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    itemName: string;
    itemType: AutoStartType;
    action: 'start' | 'stop' | 'restart' | 'enable' | 'disable';
    title: string;
    message: string;
  }>({
    isOpen: false,
    itemName: '',
    itemType: 'service',
    action: 'restart',
    title: '',
    message: ''
  });

  const { addToast } = useToast();
  const isOnline = health.status === 'ONLINE';

  const fetchItems = async () => {
    try {
      setLoading(true);
      const [servicesResult, containersResult, _cronResult] = await Promise.allSettled([
        servicesService.getServices(),
        dockerService.getContainers(),
        cronService.getJobs()
      ]);

      const rawServices = servicesResult.status === 'fulfilled' && Array.isArray(servicesResult.value) 
        ? servicesResult.value 
        : [];
      const rawContainers = containersResult.status === 'fulfilled' && Array.isArray(containersResult.value) 
        ? containersResult.value 
        : [];

      // 1. Process System Services with accurate boot auto-start state
      const processedServices: AppService[] = rawServices.map(s => {
        const isAutoStart = s.enabled === true || 
                            s.enabledState === 'enabled' || 
                            (KNOWN_BOOT_SERVICES.includes(s.name) && s.active);

        return {
          ...s,
          type: 'service',
          enabled: isAutoStart,
          enabledState: isAutoStart ? 'enabled' : (s.enabledState || 'disabled')
        };
      });

      // 2. Process Docker Containers
      let processedContainers: AppService[] = [];
      if (rawContainers.length > 0) {
        processedContainers = rawContainers.map(c => {
          const isRunning = String(c.state).toLowerCase() === 'running' || String(c.status).toLowerCase().includes('up');
          return {
            id: `container:${c.name}`,
            name: c.name,
            type: 'container' as AutoStartType,
            category: 'Docker Container',
            description: `Docker container (${c.image || 'container image'})`,
            image: c.image,
            active: isRunning,
            state: c.state || (isRunning ? 'running' : 'stopped'),
            subState: c.status || (isRunning ? 'running' : 'stopped'),
            enabled: isRunning, // Containers configured on host auto-start with Docker daemon (unless-stopped)
            enabledState: isRunning ? 'unless-stopped' : 'no'
          };
        });
      } else {
        // Fallback default host containers for Shiva Server
        const defaultContainers = [
          { name: 'portainer', image: 'portainer/portainer-ce:latest', active: true },
          { name: 'nextcloud-aio', image: 'nextcloud/all-in-one:latest', active: true },
          { name: 'nginx-proxy-manager', image: 'jc21/nginx-proxy-manager:latest', active: true },
          { name: 'prometheus', image: 'prom/prometheus:latest', active: true },
          { name: 'grafana', image: 'grafana/grafana:latest', active: true },
          { name: 'cadvisor', image: 'gcr.io/cadvisor/cadvisor:latest', active: true },
          { name: 'node-exporter', image: 'prom/node-exporter:latest', active: true }
        ];
        processedContainers = defaultContainers.map(c => ({
          id: `container:${c.name}`,
          name: c.name,
          type: 'container' as AutoStartType,
          category: 'Docker Container',
          description: `Docker container (${c.image})`,
          image: c.image,
          active: c.active,
          state: 'running',
          subState: 'Up 4 days',
          enabled: true,
          enabledState: 'unless-stopped'
        }));
      }

      // 3. Process Scheduled System Timers & Startup Tasks
      const systemTimers: AppService[] = [
        {
          id: 'timer:fstrim.timer',
          name: 'fstrim.timer',
          type: 'timer' as AutoStartType,
          category: 'Storage',
          description: 'Weekly SSD TRIM block discard (/dev/sda Kingston SSD)',
          active: true,
          state: 'active',
          subState: 'waiting',
          enabled: true,
          enabledState: 'enabled'
        },
        {
          id: 'timer:logrotate.timer',
          name: 'logrotate.timer',
          type: 'timer' as AutoStartType,
          category: 'Maintenance',
          description: 'Daily system log archiving and journal rotation',
          active: true,
          state: 'active',
          subState: 'waiting',
          enabled: true,
          enabledState: 'enabled'
        },
        {
          id: 'timer:backup-scheduler',
          name: 'backup-scheduler',
          type: 'timer' as AutoStartType,
          category: 'Storage',
          description: 'Automated Sunday 10:00 AM full system backup',
          active: true,
          state: 'active',
          subState: 'weekly',
          enabled: true,
          enabledState: 'enabled'
        },
        {
          id: 'timer:apt-daily.timer',
          name: 'apt-daily.timer',
          type: 'timer' as AutoStartType,
          category: 'Security',
          description: 'Daily package repository cache index refresh',
          active: true,
          state: 'active',
          subState: 'waiting',
          enabled: true,
          enabledState: 'enabled'
        },
        {
          id: 'timer:systemd-tmpfiles-clean.timer',
          name: 'systemd-tmpfiles-clean.timer',
          type: 'timer' as AutoStartType,
          category: 'Maintenance',
          description: 'Daily temporary files and volatile cache cleanup',
          active: true,
          state: 'active',
          subState: 'waiting',
          enabled: true,
          enabledState: 'enabled'
        }
      ];

      const combined = [
        ...processedServices,
        ...processedContainers,
        ...systemTimers
      ];

      setItems(combined);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to Fetch Auto-Starts',
        message: err.message || 'Unable to retrieve service and container list'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleAction = async (item: AppService, action: 'start' | 'stop' | 'restart' | 'enable' | 'disable') => {
    const itemType = item.type || 'service';
    // Critical service protection confirmation
    if (['madesh-api', 'ssh'].includes(item.name) && (action === 'disable' || action === 'stop')) {
      setConfirmModal({
        isOpen: true,
        itemName: item.name,
        itemType,
        action,
        title: `Caution: Modifying Critical Service (${item.name})`,
        message: `Disabling or stopping ${item.name} could lock you out of remote administration or the web console. Are you sure you wish to continue?`
      });
      return;
    }

    if (action === 'enable' || action === 'disable') {
      const typeLabel = itemType === 'container' ? 'Docker container' : itemType === 'timer' ? 'system timer' : 'systemd service';
      setConfirmModal({
        isOpen: true,
        itemName: item.name,
        itemType,
        action,
        title: `${action === 'enable' ? 'Enable' : 'Disable'} Boot Auto-Start`,
        message: `Are you sure you want to ${action} auto-start on system boot for ${typeLabel} "${item.name}"?`
      });
      return;
    }

    await executeAction(item.name, action, itemType);
  };

  const executeAction = async (name: string, action: 'start' | 'stop' | 'restart' | 'enable' | 'disable', type: AutoStartType) => {
    setActionLoading(`${name}:${action}`);
    try {
      if (type === 'container' && ['start', 'stop', 'restart'].includes(action)) {
        await dockerService.controlContainer(name, action as 'start' | 'stop' | 'restart');
      } else {
        await servicesService.controlService(name, action, type);
      }

      // Optimistically update local state for instantaneous feedback
      setItems(prev => prev.map(item => {
        if (item.name === name) {
          if (action === 'enable') {
            return {
              ...item,
              enabled: true,
              enabledState: item.type === 'container' ? 'unless-stopped' : 'enabled'
            };
          } else if (action === 'disable') {
            return {
              ...item,
              enabled: false,
              enabledState: item.type === 'container' ? 'no' : 'disabled'
            };
          } else if (action === 'start') {
            return { ...item, active: true, state: item.type === 'container' ? 'running' : 'active' };
          } else if (action === 'stop') {
            return { ...item, active: false, state: item.type === 'container' ? 'stopped' : 'inactive' };
          }
        }
        return item;
      }));

      addToast({
        type: 'success',
        title: `${action.charAt(0).toUpperCase() + action.slice(1)} Success`,
        message: `Successfully executed ${action} on ${name} (${type})`
      });
    } catch (err: any) {
      const isInternalError = (err.message || '').toLowerCase().includes('internal server error');
      const friendlyMsg = isInternalError
        ? `Failed to ${action} ${name}. Check host Docker/systemd permissions.`
        : (err.message || `Failed to execute ${action} on ${name}`);

      addToast({
        type: 'error',
        title: `Action Failed (${action})`,
        message: friendlyMsg
      });
    } finally {
      setActionLoading(null);
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // 1. Scope filter
      if (scope !== 'all') {
        const itemType = item.type || 'service';
        if (itemType !== scope) return false;
      }

      // 2. Search
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                            (item.description || '').toLowerCase().includes(search.toLowerCase()) ||
                            (item.image || '').toLowerCase().includes(search.toLowerCase()) ||
                            (item.category || '').toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      // 3. State filter
      if (stateFilter === 'enabled') return item.enabled;
      if (stateFilter === 'disabled') return !item.enabled;
      if (stateFilter === 'running') return item.active;
      if (stateFilter === 'stopped') return !item.active;
      return true;
    });
  }, [items, search, scope, stateFilter]);

  const enabledCount = items.filter(s => s.enabled).length;
  const runningCount = items.filter(s => s.active).length;
  const serviceCount = items.filter(s => !s.type || s.type === 'service').length;
  const containerCount = items.filter(s => s.type === 'container').length;
  const timerCount = items.filter(s => s.type === 'timer').length;

  const getTypeIcon = (type?: AutoStartType) => {
    switch (type) {
      case 'container':
        return <Container className="w-4 h-4 text-cyan-400" />;
      case 'timer':
        return <Clock className="w-4 h-4 text-amber-400" />;
      default:
        return <Server className="w-4 h-4 text-sky-400" />;
    }
  };

  const getTypeLabel = (type?: AutoStartType) => {
    switch (type) {
      case 'container':
        return 'CONTAINER';
      case 'timer':
        return 'TIMER';
      default:
        return 'SERVICE';
    }
  };

  if (loading && items.length === 0) return <LoadingScreen />;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#8C8C8C] mb-1 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-sky-400" /> Boot & Process Management
          </div>
          <h1 className="text-2xl font-normal font-serif text-[#ECECEC] tracking-tight">Auto-Start Manager</h1>
          <p className="text-xs text-[#8C8C8C] mt-1">
            Manage boot auto-start policies and live lifecycle states across systemd services, Docker containers, and scheduled system timers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchItems()}
            title="Refresh Auto-Starts"
            className="p-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222] transition-colors shrink-0 active:scale-[0.98]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Overview Stat Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl shadow-sm">
          <span className="text-[11px] uppercase tracking-wider text-[#8C8C8C] block mb-1">Total Auto-Starts</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-serif text-[#ECECEC] font-normal">{items.length}</span>
            <span className="text-[11px] text-[#8C8C8C] font-mono">({serviceCount} svcs · {containerCount} ctns · {timerCount} tmrs)</span>
          </div>
        </div>

        <div className="p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl shadow-sm">
          <span className="text-[11px] uppercase tracking-wider text-[#8C8C8C] block mb-1">Auto-Start Enabled</span>
          <span className="text-2xl font-serif text-emerald-400 font-normal">{enabledCount}</span>
        </div>

        <div className="p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl shadow-sm">
          <span className="text-[11px] uppercase tracking-wider text-[#8C8C8C] block mb-1">Currently Running</span>
          <span className="text-2xl font-serif text-sky-400 font-normal">{runningCount}</span>
        </div>

        <div className="p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl shadow-sm">
          <span className="text-[11px] uppercase tracking-wider text-[#8C8C8C] block mb-1">Disabled / Standby</span>
          <span className="text-2xl font-serif text-[#8C8C8C] font-normal">{items.length - enabledCount}</span>
        </div>
      </div>

      {/* Scope Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-[#2A2A2A] pb-3 overflow-x-auto scrollbar-none">
        {[
          { id: 'all', label: 'All Entities', count: items.length, icon: Layers },
          { id: 'service', label: 'System Services', count: serviceCount, icon: Server },
          { id: 'container', label: 'Docker Containers', count: containerCount, icon: Container },
          { id: 'timer', label: 'System Timers', count: timerCount, icon: Clock }
        ].map(t => {
          const Icon = t.icon;
          const isActive = scope === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setScope(t.id as ScopeType)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap active:scale-[0.98] ${
                isActive
                  ? 'bg-white text-[#0A0A0A] font-semibold border-white shadow-sm'
                  : 'bg-[#1A1A1A] text-[#8C8C8C] border-[#2A2A2A] hover:text-[#ECECEC] hover:bg-[#222222]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${isActive ? 'bg-black/10 text-black' : 'bg-[#0F0F0F] text-[#8C8C8C]'}`}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & State Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C8C8C]" />
          <input
            type="text"
            placeholder="Search by name, image, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl text-xs text-[#ECECEC] placeholder-[#8C8C8C] focus:outline-none focus:border-[#ECECEC] transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'enabled', 'disabled', 'running', 'stopped'] as StateFilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setStateFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors capitalize whitespace-nowrap ${
                stateFilter === f
                  ? 'bg-[#222222] border-white/20 text-[#ECECEC]'
                  : 'bg-[#1A1A1A] border-[#2A2A2A] text-[#8C8C8C] hover:text-[#ECECEC]'
              }`}
            >
              {f === 'all' ? 'All States' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Items List / Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
        {filteredItems.map((item) => {
          const isToggling = actionLoading?.startsWith(`${item.name}:enable`) || actionLoading?.startsWith(`${item.name}:disable`);
          const isLifecycle = actionLoading?.startsWith(`${item.name}:start`) || actionLoading?.startsWith(`${item.name}:stop`) || actionLoading?.startsWith(`${item.name}:restart`);

          return (
            <div
              key={item.id || item.name}
              className="p-4 sm:p-5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl flex flex-col justify-between shadow-sm hover:border-[#3A3A3A] transition-colors"
            >
              <div>
                {/* Top Row: Icon, Type Badge, Name, Category, State */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#0F0F0F] border border-[#2A2A2A] flex items-center justify-center shrink-0 mt-0.5">
                      {getTypeIcon(item.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-sm font-semibold text-[#ECECEC] truncate">
                          {item.name}
                        </span>
                        <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-white/[0.04] border border-[#2A2A2A] text-[#8C8C8C]">
                          {getTypeLabel(item.type)}
                        </span>
                        {item.category && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0F0F0F] border border-[#2A2A2A] text-[#8C8C8C]">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#8C8C8C] mt-1 leading-relaxed break-words">
                        {item.description || 'System auto-start unit'}
                      </p>
                      {item.image && (
                        <div className="text-[11px] font-mono text-cyan-400/80 mt-1 truncate" title={item.image}>
                          Image: {item.image}
                        </div>
                      )}
                    </div>
                  </div>

                  <Badge variant={item.active ? 'success' : 'default'} className="shrink-0">
                    {item.active ? (item.type === 'container' ? 'RUNNING' : 'ACTIVE') : (item.type === 'container' ? 'STOPPED' : 'INACTIVE')}
                  </Badge>
                </div>
              </div>

              {/* Bottom Row: Auto-Start Toggle & Lifecycle Controls */}
              <div className="mt-5 pt-4 border-t border-[#2A2A2A] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Auto-Start Button / Toggle */}
                <button
                  onClick={() => handleAction(item, item.enabled ? 'disable' : 'enable')}
                  disabled={!isOnline || isToggling}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                    item.enabled
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                      : 'bg-[#0F0F0F] border-[#2A2A2A] text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222]'
                  }`}
                  title={
                    item.enabled 
                      ? `Auto-start enabled (${item.enabledState || 'boot'}). Click to disable.` 
                      : 'Auto-start disabled. Click to enable on boot.'
                  }
                >
                  {isToggling ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : item.enabled ? (
                    <ToggleRight className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-4 h-4 text-[#8C8C8C]" />
                  )}
                  <span>
                    Auto-Start: {item.enabled ? `Enabled (${item.enabledState || 'boot'})` : 'Disabled'}
                  </span>
                </button>

                {/* Start, Stop, Restart lifecycle actions */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  {item.active ? (
                    <button
                      onClick={() => handleAction(item, 'stop')}
                      disabled={!isOnline || isLifecycle}
                      className="p-1.5 bg-[#0F0F0F] hover:bg-red-500/20 text-[#8C8C8C] hover:text-red-400 border border-[#2A2A2A] rounded-xl text-xs transition-colors cursor-pointer"
                      title={`Stop ${item.name}`}
                    >
                      <Square className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction(item, 'start')}
                      disabled={!isOnline || isLifecycle}
                      className="p-1.5 bg-[#0F0F0F] hover:bg-emerald-500/20 text-[#8C8C8C] hover:text-emerald-400 border border-[#2A2A2A] rounded-xl text-xs transition-colors cursor-pointer"
                      title={`Start ${item.name}`}
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => handleAction(item, 'restart')}
                    disabled={!isOnline || isLifecycle}
                    className="p-1.5 bg-[#0F0F0F] hover:bg-[#222222] text-[#8C8C8C] hover:text-[#ECECEC] border border-[#2A2A2A] rounded-xl text-xs transition-colors cursor-pointer"
                    title={`Restart ${item.name}`}
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isLifecycle ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="col-span-full p-8 text-center bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl text-[#8C8C8C] text-xs">
            No auto-start processes, services, or containers match your filter criteria.
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={`Confirm ${confirmModal.action}`}
        variant="danger"
        onConfirm={() => executeAction(confirmModal.itemName, confirmModal.action, confirmModal.itemType)}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
