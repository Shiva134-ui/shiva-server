import { useServerState } from '../contexts/ServerContext';
import { HardDrive, Server } from 'lucide-react';
import LoadingScreen from '../components/ui/LoadingScreen';
import ErrorState from '../components/ui/ErrorState';
import Badge from '../components/ui/Badge';
import SmartDeepScanCard from '../components/storage/SmartDeepScanCard';
import { asArray, asNumber, normalizeStorage, formatBytes } from '../utils/safeFormat';

const formatReportedBytes = (value?: number | null) => value == null ? 'Not reported' : formatBytes(value);

export default function StorageDisks() {
  const { storage } = useServerState();

  if (storage.loading && (!storage.data || asArray(storage.data).length === 0)) return <LoadingScreen />;
  if (storage.error && (!storage.data || asArray(storage.data).length === 0)) return <ErrorState message={storage.error.message} />;

  const disks = [...normalizeStorage(storage.data)].sort((a, b) => {
    if (a.type === 'SSD' && b.type !== 'SSD') return -1;
    if (b.type === 'SSD' && a.type !== 'SSD') return 1;
    // In HDDs: Seagate is Primary HDD (7200 RPM, higher speed) and must appear before WD Blue (5400 RPM)
    const isSeagateA = (a.model && a.model.toLowerCase().includes('seagate')) || a.id === 'sdb' || a.name === 'sdb' || a.rpm === 7200;
    const isSeagateB = (b.model && b.model.toLowerCase().includes('seagate')) || b.id === 'sdb' || b.name === 'sdb' || b.rpm === 7200;
    if (isSeagateA && !isSeagateB) return -1;
    if (!isSeagateA && isSeagateB) return 1;
    return (a.name || '').localeCompare(b.name || '');
  });

  return (
    <div className="animate-slide-up pb-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-normal font-serif text-[#ECECEC] mb-1 tracking-tight">Physical Storage</h1>
          <p className="text-xs text-[#8C8C8C]">Raw allocated capacities based on detected block devices</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={storage.status === 'ONLINE' ? 'success' : 'error'}>
            {storage.status === 'ONLINE' ? 'LIVE' : 'OFFLINE'}
          </Badge>
        </div>
      </div>

      {/* S.M.A.R.T. Health Deep Probe */}
      <div className="mb-6">
        <SmartDeepScanCard />
      </div>

      {disks.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-12 text-center flex flex-col items-center">
          <HardDrive className="w-10 h-10 text-[#8C8C8C] mb-3" />
          <h3 className="text-sm font-medium text-[#ECECEC] mb-1">No Storage Detected</h3>
          <p className="text-xs text-[#8C8C8C]">Unable to locate physical disks or the API returned no valid block devices.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-5 sm:gap-6">
          {disks.map((disk) => {
            const partitions = asArray(disk.partitions);
            const total = asNumber(disk.capacity ?? disk.total);
            const used = asNumber(disk.used);
            const free = asNumber(disk.free);
            const usagePercent = asNumber(disk.usagePercent);

            return (
              <div key={disk.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 sm:p-6 flex flex-col relative overflow-hidden group hover:border-[#383838] transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 relative z-10 mb-5">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 bg-[#141414] border border-[#2A2A2A] rounded-xl flex items-center justify-center shrink-0">
                      <Server className="w-5 h-5 text-[#ECECEC]" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm sm:text-base font-semibold text-[#ECECEC] mb-0.5 truncate">{disk.model || disk.name}</h2>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-mono text-[#8C8C8C]">
                        <span>{disk.id}</span>
                        {disk.type && (
                          <>
                            <span>•</span>
                            <span className="text-[#ECECEC]">{disk.type}</span>
                          </>
                        )}
                        {disk.rpm && (
                          <>
                            <span>•</span>
                            <span>{disk.rpm} RPM</span>
                          </>
                        )}
                        {disk.temperatureC !== null && disk.temperatureC !== undefined && (
                          <>
                            <span>•</span>
                            <span className="text-[#ECECEC]">{disk.temperatureC}°C</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                    {((disk.model && disk.model.toLowerCase().includes('seagate')) || disk.id === 'sdb' || disk.rpm === 7200) && (
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        PRIMARY HDD
                      </span>
                    )}
                    {((disk.model && disk.model.toLowerCase().includes('wd')) || (disk.model && disk.model.toLowerCase().includes('western')) || disk.id === 'sda' || (disk.type === 'HDD' && disk.rpm === 5400)) && (
                      <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400 border border-neutral-700/50">
                        SECONDARY HDD
                      </span>
                    )}
                    {disk.health && (
                      <Badge variant={disk.health === 'PASSED' || disk.health === 'SMART: PASSED' || disk.health === 'Healthy' || disk.health === '100% OK' ? 'success' : disk.health === 'Critical' ? 'error' : 'default'}>
                        {disk.health}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5 relative z-10">
                  <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-2.5 sm:p-3">
                    <div className="text-[10px] text-[#8C8C8C] uppercase mb-1">Capacity</div>
                    <div className="text-xs font-medium text-[#ECECEC] font-mono">{formatReportedBytes(total)}</div>
                  </div>
                  <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-3">
                    <div className="text-[10px] text-[#8C8C8C] uppercase mb-1">Used</div>
                    <div className="text-xs font-medium text-[#ECECEC] font-mono">{formatReportedBytes(used)}</div>
                  </div>
                  <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-3">
                    <div className="text-[10px] text-[#8C8C8C] uppercase mb-1">Free</div>
                    <div className="text-xs font-medium text-[#ECECEC] font-mono">{formatReportedBytes(free)}</div>
                  </div>
                </div>

                <div className="mb-5 relative z-10">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[11px] text-[#8C8C8C] uppercase tracking-wider">Allocated Usage</span>
                    <span className="text-xs font-semibold text-[#ECECEC] font-mono">{usagePercent == null ? '--' : usagePercent + '%'}</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#2A2A2A] rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-300 ease-out bg-white" 
                      style={{ width: `${usagePercent == null ? 0 : Math.min(100, Math.max(0, usagePercent))}%` }}
                    />
                  </div>
                </div>

                <div className="mt-auto border-t border-[#2A2A2A] pt-4 relative z-10">
                  <h4 className="text-[10px] text-[#8C8C8C] uppercase tracking-wider mb-2.5">Partitions ({partitions.length})</h4>
                  {partitions.length === 0 ? (
                    <div className="text-xs text-[#8C8C8C] italic">No mounted partitions</div>
                  ) : (
                    <div className="space-y-1.5">
                      {partitions.map(p => (
                        <div key={p.device || p.mount} className="flex items-center justify-between text-xs py-1">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="text-[#8C8C8C] font-mono truncate max-w-[120px]" title={p.device}>{p.device || 'unnamed'}</span>
                            {p.mount && (
                              <>
                                <span className="text-[#8C8C8C]/50">on</span>
                                <span className="text-[#ECECEC] font-medium truncate max-w-[100px]" title={p.mount}>{p.mount}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[#8C8C8C] font-mono text-[11px] shrink-0">
                            <span className="text-right">{formatReportedBytes(p.used)}</span>
                            <span>/</span>
                            <span>{formatReportedBytes(p.total)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
