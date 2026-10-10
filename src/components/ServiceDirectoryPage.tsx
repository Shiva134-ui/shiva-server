import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Server, Play, Square, RotateCw, Search, Boxes, Activity } from 'lucide-react';
import { servicesService } from '../services/services';
import { dockerService } from '../services/docker';
import type { AppService } from '../types/services';
import type { DockerContainer } from '../types/docker';
import ErrorState from './ui/ErrorState';
import Badge from './ui/Badge';
import { useToast } from './ui/ToastContext';

export default function ServiceDirectoryPage({ title, description, matches }: {
  title: string;
  description: string;
  matches?: RegExp;
}) {
  const [services, setServices] = useState<AppService[]>([]);
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'daemons' | 'containers'>('all');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [serviceError, setServiceError] = useState<Error | null>(null);
  const [containerError, setContainerError] = useState<Error | null>(null);
  const { addToast } = useToast();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [serviceResult, containerResult] = await Promise.allSettled([
        servicesService.getServices(),
        dockerService.getContainers()
      ]);
      if (serviceResult.status === 'fulfilled') {
        setServices(serviceResult.value);
        setServiceError(null);
      } else {
        setServiceError(serviceResult.reason instanceof Error ? serviceResult.reason : new Error('System service inventory could not be loaded.'));
      }
      if (containerResult.status === 'fulfilled') {
        setContainers(containerResult.value);
        setContainerError(null);
      } else {
        setContainerError(containerResult.reason instanceof Error ? containerResult.reason : new Error('Docker service inventory could not be loaded.'));
      }
    } catch {
      setServiceError(new Error('The server service inventory could not be loaded.'));
      setContainerError(new Error('The Docker inventory could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleServiceAction = async (serviceName: string, action: 'start' | 'stop' | 'restart') => {
    const key = `service-${serviceName}-${action}`;
    setActionInProgress(key);
    addToast({ title: 'Executing Action', message: `${action.toUpperCase()} requested for ${serviceName}...`, type: 'info' });
    try {
      await servicesService.controlService(serviceName, action);
      addToast({ title: 'Service Action Complete', message: `Service "${serviceName}" successfully ${action}ed.`, type: 'success' });
      await refresh();
    } catch (err: any) {
      addToast({ title: 'Service Action Error', message: err.message || 'Action failed on server', type: 'error' });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleContainerAction = async (containerName: string, action: 'start' | 'stop' | 'restart') => {
    const key = `docker-${containerName}-${action}`;
    setActionInProgress(key);
    addToast({ title: 'Executing Docker Action', message: `${action.toUpperCase()} requested for ${containerName}...`, type: 'info' });
    try {
      await dockerService.controlContainer(containerName, action);
      addToast({ title: 'Container Action Complete', message: `Container "${containerName}" successfully ${action}ed.`, type: 'success' });
      await refresh();
    } catch (err: any) {
      addToast({ title: 'Docker Action Error', message: err.message || 'Action failed on server', type: 'error' });
    } finally {
      setActionInProgress(null);
    }
  };

  const visibleServices = useMemo(() => {
    let list = matches ? services.filter(service => matches.test(service.name)) : services;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q)));
    }
    return list;
  }, [services, matches, search]);

  const visibleContainers = useMemo(() => {
    let list = matches ? containers.filter(item => matches.test(`${item.name} ${item.image}`)) : containers;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || (c.image && c.image.toLowerCase().includes(q)));
    }
    return list;
  }, [containers, matches, search]);

  if (serviceError && containerError && services.length === 0 && containers.length === 0) {
    return <ErrorState title={`${title} unavailable`} message={`${serviceError.message} ${containerError.message}`} onRetry={() => void refresh()} />;
  }

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#8C8C8C] mb-1 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-[#8C8C8C]" /> Services & Daemons Directory
          </div>
          <h1 className="text-2xl font-normal font-serif text-[#ECECEC] tracking-tight">{title}</h1>
          <p className="mt-1 text-xs text-[#8C8C8C] max-w-2xl">{description}</p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] hover:bg-[#222222] px-3.5 py-2 text-xs font-medium text-[#ECECEC] transition active:scale-[0.98] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-[#8C8C8C] ${loading ? 'animate-spin' : ''}`} /> Refresh All
        </button>
      </header>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#1A1A1A] border border-[#2A2A2A] p-2.5 rounded-2xl">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#8C8C8C] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter daemons or containers by name..."
            className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl pl-9 pr-3 py-2 text-xs text-[#ECECEC] placeholder-[#8C8C8C] focus:outline-none focus:border-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filterType === 'all'
                ? 'bg-white text-[#0A0A0A] font-semibold shadow-sm'
                : 'text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222]'
            }`}
          >
            All Inventory ({visibleServices.length + visibleContainers.length})
          </button>
          <button
            onClick={() => setFilterType('daemons')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filterType === 'daemons'
                ? 'bg-white text-[#0A0A0A] font-semibold shadow-sm'
                : 'text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222]'
            }`}
          >
            Daemons ({visibleServices.length})
          </button>
          <button
            onClick={() => setFilterType('containers')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filterType === 'containers'
                ? 'bg-white text-[#0A0A0A] font-semibold shadow-sm'
                : 'text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222]'
            }`}
          >
            Containers ({visibleContainers.length})
          </button>
        </div>
      </div>

      {(serviceError || containerError) && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          Some telemetry could not be reached: {[serviceError?.message, containerError?.message].filter(Boolean).join(' · ')}
        </div>
      )}

      {/* Ubuntu System Services */}
      {(filterType === 'all' || filterType === 'daemons') && (
        <section className="overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-sm">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-3.5 bg-[#0F0F0F] text-xs">
            <span className="font-semibold text-[#ECECEC] flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Systemd Daemons & Background Services
            </span>
            <span className="font-mono text-[11px] text-[#8C8C8C]">{visibleServices.length} registered</span>
          </div>
          {visibleServices.length === 0 ? (
            <p className="px-5 py-10 text-center text-xs text-[#8C8C8C]">
              {loading ? 'Querying system services…' : 'No matching system services found.'}
            </p>
          ) : (
            <ul className="divide-y divide-[#2A2A2A]/60">
              {visibleServices.map(service => {
                const state = service.state || (service.active ? 'active' : 'inactive');
                const active = service.active ?? ['active', 'running'].includes(state.toLowerCase());
                const isWorking = actionInProgress?.startsWith(`service-${service.name}`);

                return (
                  <li key={service.name} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-[#222222]/40 transition text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-xs font-mono font-medium text-[#ECECEC]">{service.name}</p>
                        {service.category && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#141414] text-[#8C8C8C] border border-[#2A2A2A]">
                            {service.category}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-[#8C8C8C]">
                        {service.description || `Substate: ${service.subState || 'Not reported'}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={active ? 'success' : 'default'}>{state}</Badge>
                      <div className="flex items-center gap-1.5 border-l border-[#2A2A2A] pl-3">
                        <button
                          onClick={() => handleServiceAction(service.name, 'restart')}
                          disabled={isWorking}
                          title="Restart Service"
                          className="p-1.5 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222] disabled:opacity-50 transition active:scale-[0.98]"
                        >
                          <RotateCw className={`h-3.5 w-3.5 ${actionInProgress === `service-${service.name}-restart` ? 'animate-spin' : ''}`} />
                        </button>
                        {active ? (
                          <button
                            onClick={() => handleServiceAction(service.name, 'stop')}
                            disabled={isWorking}
                            title="Stop Service"
                            className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 disabled:opacity-50 transition active:scale-[0.98]"
                          >
                            <Square className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleServiceAction(service.name, 'start')}
                            disabled={isWorking}
                            title="Start Service"
                            className="p-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition active:scale-[0.98]"
                          >
                            <Play className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* Docker Containers */}
      {(filterType === 'all' || filterType === 'containers') && (
        <section className="overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-sm">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-3.5 bg-[#0F0F0F] text-xs">
            <span className="font-semibold text-[#ECECEC] flex items-center gap-2">
              <Boxes className="w-4 h-4 text-cyan-400" />
              Docker Containers
            </span>
            <span className="font-mono text-[11px] text-[#8C8C8C]">{visibleContainers.length} containers</span>
          </div>
          {visibleContainers.length === 0 ? (
            <p className="px-5 py-10 text-center text-xs text-[#8C8C8C]">
              {loading ? 'Querying Docker daemon…' : 'No matching Docker containers reported.'}
            </p>
          ) : (
            <ul className="divide-y divide-[#2A2A2A]/60">
              {visibleContainers.map(container => {
                const isRunning = container.state === 'running';
                const isWorking = actionInProgress?.startsWith(`docker-${container.name}`);

                return (
                  <li key={container.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-[#222222]/40 transition text-xs">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-mono font-medium text-[#ECECEC]">{container.name}</p>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-[#8C8C8C]">{container.image}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={isRunning ? 'success' : 'default'}>{container.status || container.state}</Badge>
                      <div className="flex items-center gap-1.5 border-l border-[#2A2A2A] pl-3">
                        <button
                          onClick={() => handleContainerAction(container.name, 'restart')}
                          disabled={isWorking}
                          title="Restart Container"
                          className="p-1.5 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222] disabled:opacity-50 transition active:scale-[0.98]"
                        >
                          <RotateCw className={`h-3.5 w-3.5 ${actionInProgress === `docker-${container.name}-restart` ? 'animate-spin' : ''}`} />
                        </button>
                        {isRunning ? (
                          <button
                            onClick={() => handleContainerAction(container.name, 'stop')}
                            disabled={isWorking}
                            title="Stop Container"
                            className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 disabled:opacity-50 transition active:scale-[0.98]"
                          >
                            <Square className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleContainerAction(container.name, 'start')}
                            disabled={isWorking}
                            title="Start Container"
                            className="p-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition active:scale-[0.98]"
                          >
                            <Play className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
