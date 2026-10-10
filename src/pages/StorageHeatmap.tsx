import { useState, useEffect, useCallback } from 'react';
import { 
  PieChart, 
  HardDrive, 
  Folder, 
  RefreshCw, 
  Layers, 
  Database,
  Image as ImageIcon
} from 'lucide-react';
import { storageHeatmapService, type StorageHeatmapResponse } from '../services/storageHeatmap';
import { useToast } from '../components/ui/ToastContext';

export default function StorageHeatmap() {
  const [data, setData] = useState<StorageHeatmapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const loadHeatmap = useCallback(async () => {
    setLoading(true);
    try {
      const res = await storageHeatmapService.getHeatmap();
      setData(res);
    } catch (err: any) {
      addToast({ title: 'Heatmap Error', message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadHeatmap();
  }, [loadHeatmap]);

  const disks = (data?.items.filter(i => i.isDisk) || []).sort((a, b) => {
    // 1. SSD first
    if (a.path === '/' && b.path !== '/') return -1;
    if (b.path === '/' && a.path !== '/') return 1;
    // 2. Seagate Primary HDD (7200 RPM) second
    const isSeagateA = a.path.includes('seagate') || a.role?.toLowerCase().includes('primary') || a.rpm === 7200;
    const isSeagateB = b.path.includes('seagate') || b.role?.toLowerCase().includes('primary') || b.rpm === 7200;
    if (isSeagateA && !isSeagateB) return -1;
    if (!isSeagateA && isSeagateB) return 1;
    return a.name.localeCompare(b.name);
  });
  const folders = data?.items.filter(i => !i.isDisk) || [];

  const getFolderIcon = (path: string) => {
    if (path.includes('docker')) return <Layers className="w-4 h-4 text-neutral-300" />;
    if (path.includes('immich')) return <ImageIcon className="w-4 h-4 text-neutral-300" />;
    if (path.includes('nextcloud') || path.includes('keep')) return <Database className="w-4 h-4 text-neutral-300" />;
    if (path.includes('opus')) return <Layers className="w-4 h-4 text-emerald-400" />;
    return <Folder className="w-4 h-4 text-neutral-400" />;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-normal font-serif tracking-tight text-[#ECECEC] flex items-center gap-2.5 sm:gap-3">
            <PieChart className="w-5 h-5 sm:w-6 sm:h-6 text-[#ECECEC] shrink-0" />
            <span>Storage Breakdown & Space Heatmap</span>
          </h1>
          <p className="text-xs text-[#8C8C8C] mt-1">
            Visual inspection across the System SSD, Seagate Barracuda (Primary 7200 RPM HDD), and Western Digital Blue (Secondary 5400 RPM HDD).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadHeatmap}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl bg-[#1A1A1A] hover:bg-[#222222] text-[#ECECEC] border border-[#2A2A2A] transition-colors active:scale-95 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Scan Storage
          </button>
        </div>
      </div>

      {/* Disks Overview Cards (Tri-Tier Storage Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 2xl:gap-6">
        {disks.map(disk => {
          const isSeagate = disk.path.includes('seagate') || disk.rpm === 7200 || disk.role?.toLowerCase().includes('primary');
          const isSsd = disk.path === '/' || disk.diskType === 'SSD';

          return (
            <div 
              key={disk.path} 
              className={`bg-[#1A1A1A] border rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 transition-colors ${
                isSeagate ? 'border-emerald-500/30 hover:border-emerald-500/50' : 'border-[#2A2A2A] hover:border-[#383838]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2.5 rounded-xl border ${
                    isSeagate 
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' 
                      : 'bg-[#141414] border-[#2A2A2A] text-white'
                  }`}>
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[#ECECEC] truncate" title={disk.name}>{disk.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono text-neutral-400">{disk.path}</span>
                    </div>
                  </div>
                </div>
                <span className="text-xs font-mono font-semibold text-white bg-white/10 px-2.5 py-1 rounded-md shrink-0">
                  {disk.usedPercent}% Used
                </span>
              </div>

              {/* Tier & Speed Badge */}
              <div className="flex items-center gap-2 pt-1">
                {isSeagate ? (
                  <span className="inline-flex items-center text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ⚡ PRIMARY HDD • 7200 RPM (HIGH SPEED)
                  </span>
                ) : isSsd ? (
                  <span className="inline-flex items-center text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    🚀 SYSTEM ROOT • SSD
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400 border border-neutral-700/50">
                    📦 SECONDARY HDD • 5400 RPM (BULK/COLD)
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-700 rounded-full ${
                      isSeagate ? 'bg-emerald-400' : isSsd ? 'bg-cyan-400' : 'bg-white'
                    }`}
                    style={{ width: `${Math.min(100, parseFloat(disk.usedPercent || '0'))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-neutral-400">
                  <span>Used: {disk.humanUsed}</span>
                  <span>Free: {disk.humanAvail}</span>
                  <span>Total: {disk.humanTotal}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Folder Size Breakdown */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-300 mb-4 flex items-center gap-2">
          <Folder className="w-4 h-4 text-neutral-400" />
          High-Capacity Storage Directories
        </h2>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="h-14 bg-white/5 rounded-lg" />
            ))}
          </div>
        ) : folders.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 text-xs">
            No directory size scans reported. Click Scan Storage above.
          </div>
        ) : (
          <div className="divide-y divide-[#27272a]">
            {folders.map(item => (
              <div key={item.path} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                    {getFolderIcon(item.path)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{item.name}</div>
                    <div className="text-[11px] font-mono text-neutral-500 truncate" title={item.path}>
                      {item.path}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-mono font-bold text-white block">
                    {item.humanUsed}
                  </span>
                  <span className="text-[10px] text-neutral-400 uppercase">Allocated</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
