import { useState, useEffect, useMemo } from 'react';
import { systemService } from '../services/system';
import type { SystemProcess } from '../types/system';
import LoadingScreen from '../components/ui/LoadingScreen';
import ErrorState from '../components/ui/ErrorState';
import { Search, RefreshCw, X, AlertTriangle, ShieldAlert, ChevronUp, ChevronDown, WifiOff } from 'lucide-react';
import Badge from '../components/ui/Badge';
import { useToast } from '../components/ui/ToastContext';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useServerState } from '../contexts/ServerContext';

type StateVariant = 'success' | 'info' | 'error' | 'default';

const getProcessStateProps = (state?: string): { label: string; variant: StateVariant } => {
  const s = (state || '').toLowerCase();
  if (s.startsWith('r')) return { label: 'Running', variant: 'success' };
  if (s.startsWith('s')) return { label: 'Sleeping', variant: 'info' };
  if (s.startsWith('t')) return { label: 'Stopped', variant: 'error' };
  if (s.startsWith('z')) return { label: 'Zombie', variant: 'error' };
  return { label: 'Unknown', variant: 'default' };
};

const renderUsage = (value?: number | null) => {
  if (value === undefined || value === null || isNaN(value)) return 'Not reported';
  return value.toFixed(1);
};

const formatBytes = (bytes?: number | string | null) => {
  if (bytes === undefined || bytes === null) return 'Not reported';
  const numBytes = typeof bytes === 'string' ? parseFloat(bytes) : bytes;
  if (isNaN(numBytes)) return 'Not reported';
  if (numBytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(numBytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((numBytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const SortIcon = ({ active, direction }: { active: boolean; direction: 'asc' | 'desc' }) =>
  active ? (
    direction === 'asc' ? <ChevronUp className="w-3 h-3 inline-block ml-1" /> : <ChevronDown className="w-3 h-3 inline-block ml-1" />
  ) : null;

export default function SystemProcesses() {
  const { health } = useServerState();
  const [processes, setProcesses] = useState<SystemProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof SystemProcess; direction: 'asc' | 'desc' }>({ key: 'cpuPercent', direction: 'desc' });
  const [selectedProcess, setSelectedProcess] = useState<SystemProcess | null>(null);
  const [killConfirm, setKillConfirm] = useState<{ isOpen: boolean; pid: number | null }>({ isOpen: false, pid: null });

  const { addToast } = useToast();

  const fetchProcesses = async () => {
    try {
      setLoading(true);
      const data = await systemService.getProcesses();
      setProcesses(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch processes'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
  }, []);

  const handleSort = (key: keyof SystemProcess) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const filteredAndSorted = useMemo(() => {
    let result = processes;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p => {
        const name = String(p.name ?? p.command ?? '').toLowerCase();
        const user = String(p.user ?? '').toLowerCase();
        const pid = String(p.pid ?? '');
        return name.includes(q) || user.includes(q) || pid.includes(q);
      });
    }

      result = [...result].sort((a, b) => {
      const aVal = a[sortConfig.key] ?? 0;
      const bVal = b[sortConfig.key] ?? 0;
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [processes, search, sortConfig]);

  const handleKill = async () => {
    if (killConfirm.pid) {
      const targetPid = killConfirm.pid;
      const targetName = selectedProcess?.name || selectedProcess?.command || `PID ${targetPid}`;
      try {
        await systemService.killProcess(targetPid);
        addToast({ type: 'success', title: 'Process Terminated', message: `Sent termination signal to ${targetName} (PID: ${targetPid})` });
        fetchProcesses();
      } catch (e: any) {
        addToast({ type: 'error', title: 'Termination Failed', message: e.message || 'Failed to terminate process' });
      }
      setKillConfirm({ isOpen: false, pid: null });
      setSelectedProcess(null);
    }
  };

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedProcess) {
        setSelectedProcess(null);
      }
    };
    if (selectedProcess) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedProcess]);

  // Lock mobile body/viewport scroll when drawer is open
  useEffect(() => {
    if (selectedProcess) {
      const updateScrollLock = () => {
        if (window.innerWidth < 1024) {
          document.body.style.overflow = 'hidden';
          document.documentElement.style.overflow = 'hidden';
        } else {
          document.body.style.overflow = '';
          document.documentElement.style.overflow = '';
        }
      };
      updateScrollLock();
      window.addEventListener('resize', updateScrollLock);
      return () => {
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        window.removeEventListener('resize', updateScrollLock);
      };
    }
  }, [selectedProcess]);

  if (loading && processes.length === 0) return <LoadingScreen />;
  if (health.status !== 'ONLINE' && processes.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl text-center max-w-lg mx-auto my-12 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-[#0F0F0F] border border-[#2A2A2A] flex items-center justify-center text-[#8C8C8C] mb-4">
          <WifiOff className="w-7 h-7 text-amber-400" />
        </div>
        <h2 className="text-lg font-serif font-normal text-[#ECECEC] mb-1">Server Telemetry Offline</h2>
        <p className="text-xs text-[#8C8C8C] mb-6 leading-relaxed">
          The host server is currently unreachable. Real-time background process inspection and daemon telemetry are suspended until connectivity is restored.
        </p>
        <button
          onClick={fetchProcesses}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F0F0F] hover:bg-[#222222] text-xs text-[#ECECEC] font-medium border border-[#2A2A2A] rounded-xl transition-colors active:scale-[0.98]"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reconnect & Retry
        </button>
      </div>
    );
  }
  if (error && processes.length === 0) return <ErrorState message={error.message} onRetry={fetchProcesses} />;

  const selectedProcessMapped = selectedProcess ? {
    ...selectedProcess,
    memUsage: selectedProcess.memUsage ?? (selectedProcess as any).memoryUsage ?? (selectedProcess as any).memRss ?? (selectedProcess as any).memory,
    state: selectedProcess.state ?? (selectedProcess as any).status ?? (selectedProcess as any).stat
  } : null;

  const selectedState = selectedProcessMapped ? getProcessStateProps(selectedProcessMapped.state) : null;

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-4 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#8C8C8C] mb-1">Compute & System</div>
          <h1 className="text-2xl font-normal font-serif text-[#ECECEC] tracking-tight">System Processes</h1>
          <p className="text-xs text-[#8C8C8C] mt-1 flex items-center gap-2">
            <span>{loading ? 'Loading processes...' : `${processes.length} active OS tasks and daemon threads`}</span>
            {health.status !== 'ONLINE' && (
              <Badge variant="warning">Offline Mode</Badge>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8C8C8C]" />
            <input
              type="text"
              placeholder="Search processes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3.5 py-1.5 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl text-xs text-[#ECECEC] placeholder-[#8C8C8C] focus:outline-none focus:border-[#ECECEC] transition-colors w-full sm:w-64"
            />
          </div>
          <button
            onClick={() => fetchProcesses()}
            title="Refresh"
            className="p-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222] transition-colors shrink-0 active:scale-[0.98]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content Area: Table on Left + Details Drawer on Right */}
      <div className="flex-1 min-h-0 flex gap-6 relative overflow-hidden">
        {/* Process Table Container */}
        <div className="flex-1 min-w-0 h-full min-h-0 flex flex-col bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden shadow-sm">
          <div className={`flex-1 min-h-0 overflow-x-auto ${selectedProcess ? 'max-lg:overflow-hidden lg:overflow-y-auto' : 'overflow-y-auto'}`}>
            <table className="w-full text-left border-collapse min-w-[720px] text-xs">
              <thead className="sticky top-0 bg-[#0F0F0F] text-[11px] uppercase tracking-wider text-[#8C8C8C] z-10 border-b border-[#2A2A2A]">
                <tr>
                  <th className="px-4 py-3 font-medium cursor-pointer hover:text-[#ECECEC] whitespace-nowrap" onClick={() => handleSort('pid')}>PID <SortIcon active={sortConfig.key === 'pid'} direction={sortConfig.direction} /></th>
                  <th className="px-4 py-3 font-medium cursor-pointer hover:text-[#ECECEC] whitespace-nowrap" onClick={() => handleSort('command')}>PROCESS <SortIcon active={sortConfig.key === 'command'} direction={sortConfig.direction} /></th>
                  <th className="px-4 py-3 font-medium cursor-pointer hover:text-[#ECECEC] whitespace-nowrap" onClick={() => handleSort('user')}>USER <SortIcon active={sortConfig.key === 'user'} direction={sortConfig.direction} /></th>
                  <th className="px-4 py-3 font-medium cursor-pointer hover:text-[#ECECEC] whitespace-nowrap" onClick={() => handleSort('cpuPercent')}>CPU <SortIcon active={sortConfig.key === 'cpuPercent'} direction={sortConfig.direction} /></th>
                  <th className="px-4 py-3 font-medium cursor-pointer hover:text-[#ECECEC] whitespace-nowrap" onClick={() => handleSort('memoryPercent')}>RAM <SortIcon active={sortConfig.key === 'memoryPercent'} direction={sortConfig.direction} /></th>
                  <th className="px-4 py-3 font-medium cursor-pointer hover:text-[#ECECEC] whitespace-nowrap" onClick={() => handleSort('memUsage')}>MEMORY <SortIcon active={sortConfig.key === 'memUsage'} direction={sortConfig.direction} /></th>
                  <th className="px-4 py-3 font-medium cursor-pointer hover:text-[#ECECEC] whitespace-nowrap" onClick={() => handleSort('state')}>STATUS <SortIcon active={sortConfig.key === 'state'} direction={sortConfig.direction} /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2A]">
                {filteredAndSorted.map(rawP => {
                  const p = {
                    ...rawP,
                    memUsage: rawP.memUsage ?? (rawP as any).memoryUsage ?? (rawP as any).memRss ?? (rawP as any).memory,
                    state: rawP.state ?? (rawP as any).status ?? (rawP as any).stat
                  };
                  return (
                    <tr
                      key={p.pid}
                      onClick={() => setSelectedProcess(p)}
                      className={`hover:bg-[#222222]/50 cursor-pointer transition-colors ${selectedProcess?.pid === p.pid ? 'bg-[#222222]' : ''}`}
                    >
                      <td className="py-3 px-4 text-[#8C8C8C] font-mono text-[11px] whitespace-nowrap">{p.pid}</td>
                      <td className="py-3 px-4 text-[#ECECEC] font-medium max-w-[220px] truncate" title={p.command || p.name || 'Not reported'}>{p.command || p.name || 'Not reported'}</td>
                      <td className="py-3 px-4 text-[#8C8C8C] whitespace-nowrap">{p.user || 'Not reported'}</td>
                      <td className="py-3 px-4 text-[#ECECEC]">
                        <div className="flex items-center gap-2">
                          <span className="w-12 text-right font-mono text-xs tabular-nums">{renderUsage(p.cpuPercent)}%</span>
                          <div className="w-14 sm:w-16 h-1 bg-[#0A0A0A] rounded-full overflow-hidden border border-[#2A2A2A]">
                            <div className="h-full bg-white/70 rounded-full" style={{ width: `${Math.min(100, p.cpuPercent || 0)}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#ECECEC]">
                        <div className="flex items-center gap-2">
                          <span className="w-12 text-right font-mono text-xs tabular-nums">{renderUsage(p.memoryPercent)}%</span>
                          <div className="w-14 sm:w-16 h-1 bg-[#0A0A0A] rounded-full overflow-hidden border border-[#2A2A2A]">
                            <div className="h-full bg-white/70 rounded-full" style={{ width: `${Math.min(100, p.memoryPercent || 0)}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#8C8C8C] font-mono text-[11px] whitespace-nowrap">{formatBytes(p.memUsage)}</td>
                      <td className="py-3 px-4">
                        <Badge variant={getProcessStateProps(p.state).variant}>{getProcessStateProps(p.state).label}</Badge>
                      </td>
                    </tr>
                  );
                })}
                {filteredAndSorted.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[#8C8C8C] text-xs">No processes found matching your criteria.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Details Drawer */}
        {selectedProcessMapped && selectedState && (
          <>
            {/* Backdrop (mobile/tablet only) */}
            <div
              className="fixed inset-0 bg-black/75 backdrop-blur-md z-40 lg:hidden"
              onClick={() => setSelectedProcess(null)}
              aria-hidden="true"
            />
            {/* Drawer Panel */}
            <aside
              aria-label="Process Details"
              className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-md lg:relative lg:inset-auto lg:z-auto lg:w-[340px] xl:w-[380px] lg:shrink-0 lg:h-full lg:min-h-0 bg-[#1A1A1A] border-l lg:border border-[#2A2A2A] lg:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-6 duration-200"
            >
              {/* Sticky Header */}
              <div className="p-4 sm:p-5 border-b border-[#2A2A2A] flex items-center justify-between bg-[#0F0F0F] shrink-0">
                <h3 className="font-serif text-base font-normal text-[#ECECEC]">Process Details</h3>
                <button
                  onClick={() => setSelectedProcess(null)}
                  className="p-1.5 hover:bg-[#222222] rounded-lg text-[#8C8C8C] hover:text-[#ECECEC] transition-colors"
                  title="Close"
                  aria-label="Close process details"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 min-h-0 p-5 sm:p-6 overflow-y-auto overscroll-y-contain space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-[#0F0F0F] border border-[#2A2A2A] flex items-center justify-center text-sm font-semibold text-[#ECECEC] font-mono">
                      {(selectedProcessMapped.name || selectedProcessMapped.command || '?').substring(0, 2).toUpperCase()}
                    </div>
                    <Badge variant={selectedState.variant}>{selectedState.label}</Badge>
                  </div>
                  <h2 className="text-base font-medium text-[#ECECEC] mb-1 break-words">{selectedProcessMapped.name || selectedProcessMapped.command}</h2>
                  <p className="text-xs text-[#8C8C8C] font-mono">PID: {selectedProcessMapped.pid}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-3">
                    <span className="text-[10px] uppercase tracking-wider text-[#8C8C8C] block mb-1">CPU Usage</span>
                    <span className="text-base font-medium text-[#ECECEC] font-mono tabular-nums">{renderUsage(selectedProcessMapped.cpuPercent)}%</span>
                  </div>
                  <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-3">
                    <span className="text-[10px] uppercase tracking-wider text-[#8C8C8C] block mb-1">RAM Usage</span>
                    <span className="text-base font-medium text-[#ECECEC] font-mono tabular-nums">{renderUsage(selectedProcessMapped.memoryPercent)}%</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <h4 className="text-[11px] font-medium text-[#8C8C8C] uppercase tracking-wider mb-2">Properties</h4>
                  <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A] text-xs">
                    <span className="text-[#8C8C8C]">User</span>
                    <span className="text-[#ECECEC] font-medium">{selectedProcessMapped.user || 'Not reported'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A] text-xs">
                    <span className="text-[#8C8C8C]">Memory (RSS)</span>
                    <span className="text-[#ECECEC] font-mono">{formatBytes(selectedProcessMapped.memUsage)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A] text-xs">
                    <span className="text-[#8C8C8C]">State</span>
                    <span className="text-[#ECECEC] font-medium">{selectedState.label}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A] text-xs">
                    <span className="text-[#8C8C8C]">PID</span>
                    <span className="text-[#ECECEC] font-mono">{selectedProcessMapped.pid}</span>
                  </div>
                  {selectedProcessMapped.vsz !== undefined && (
                    <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A] text-xs">
                      <span className="text-[#8C8C8C]">Virtual Memory (VSZ)</span>
                      <span className="text-[#ECECEC] font-mono">{formatBytes(selectedProcessMapped.vsz * 1024)}</span>
                    </div>
                  )}
                  {selectedProcessMapped.rss !== undefined && (
                    <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A] text-xs">
                      <span className="text-[#8C8C8C]">Resident Set (RSS)</span>
                      <span className="text-[#ECECEC] font-mono">{formatBytes(selectedProcessMapped.rss * 1024)}</span>
                    </div>
                  )}
                  {selectedProcessMapped.tty && (
                    <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A] text-xs">
                      <span className="text-[#8C8C8C]">TTY</span>
                      <span className="text-[#ECECEC] font-mono">{selectedProcessMapped.tty}</span>
                    </div>
                  )}
                  {selectedProcessMapped.start && (
                    <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A] text-xs">
                      <span className="text-[#8C8C8C]">Started</span>
                      <span className="text-[#ECECEC] font-mono">{selectedProcessMapped.start}</span>
                    </div>
                  )}
                  {selectedProcessMapped.time && (
                    <div className="flex justify-between items-center py-2 text-xs">
                      <span className="text-[#8C8C8C]">CPU Time</span>
                      <span className="text-[#ECECEC] font-mono">{selectedProcessMapped.time}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Sticky Action Footer */}
              <div className="p-4 border-t border-[#2A2A2A] bg-[#0F0F0F] shrink-0">
                <button
                  onClick={() => setKillConfirm({ isOpen: true, pid: selectedProcessMapped.pid })}
                  className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl flex items-center justify-center gap-2 text-xs font-medium transition-colors active:scale-[0.98]"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Force Kill Process
                </button>
                <p className="text-[11px] text-[#8C8C8C] text-center mt-2 flex items-center justify-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-[#FBBF24] shrink-0" /> Terminating processes can cause system instability.
                </p>
              </div>
            </aside>
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={killConfirm.isOpen}
        title="Force Kill Process"
        confirmText="Force Kill"
        variant="danger"
        message={`Are you sure you want to terminate ${selectedProcess?.name || selectedProcess?.command || 'this process'} (PID: ${killConfirm.pid})? This will immediately terminate the process and may cause service or system instability.`}
        onConfirm={handleKill}
        onClose={() => setKillConfirm({ isOpen: false, pid: null })}
      />
    </div>
  );
}

