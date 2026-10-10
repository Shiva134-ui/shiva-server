import { useState, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  Trash2, 
  ShieldCheck, 
  HardDrive, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Package, 
  FileText 
} from 'lucide-react';
import { maintenanceService, type MaintenanceAnalysis, type CleanResult } from '../services/maintenance';
import { useToast } from '../components/ui/ToastContext';
import Badge from '../components/ui/Badge';

export default function SystemMaintenance() {
  const [analysis, setAnalysis] = useState<MaintenanceAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [cleanResult, setCleanResult] = useState<CleanResult | null>(null);
  const [confirmModal, setConfirmModal] = useState(false);
  const { addToast } = useToast();

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    try {
      const data = await maintenanceService.analyze();
      setAnalysis(data);
      // Default to selecting all safe targets
      setSelectedTargets(data.targets.map(t => t.id));
    } catch (err: any) {
      addToast({ title: 'Analysis Failed', message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  const toggleTarget = (id: string) => {
    setSelectedTargets(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (!analysis) return;
    if (selectedTargets.length === analysis.targets.length) {
      setSelectedTargets([]);
    } else {
      setSelectedTargets(analysis.targets.map(t => t.id));
    }
  };

  const handleClean = async () => {
    if (selectedTargets.length === 0) return;
    setCleaning(true);
    setConfirmModal(false);
    try {
      const res = await maintenanceService.clean(selectedTargets);
      setCleanResult(res);
      addToast({ 
        title: 'Cleanup Completed', 
        message: `Successfully reclaimed ${res.freedMB} of disk space!`, 
        type: 'success' 
      });
      // Refresh analysis after cleanup
      await runAnalysis();
    } catch (err: any) {
      addToast({ title: 'Cleanup Failed', message: err.message, type: 'error' });
    } finally {
      setCleaning(false);
    }
  };

  const getTargetIcon = (id: string) => {
    switch (id) {
      case 'docker-dangling':
      case 'docker-builder':
        return <Layers className="w-5 h-5 text-cyan-400" />;
      case 'apt-cache':
        return <Package className="w-5 h-5 text-purple-400" />;
      case 'journal-vacuum':
        return <FileText className="w-5 h-5 text-amber-400" />;
      default:
        return <HardDrive className="w-5 h-5 text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#8C8C8C] mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Maintenance Operations
          </div>
          <h1 className="text-2xl font-normal font-serif text-[#ECECEC] tracking-tight">System Maintenance</h1>
          <p className="text-xs text-[#8C8C8C] mt-1">
            Reclaim storage by safely pruning orphaned Docker build caches, package caches, and archived system journals.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={runAnalysis}
            disabled={loading || cleaning}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl bg-[#1A1A1A] hover:bg-[#222222] text-[#ECECEC] border border-[#2A2A2A] transition-colors disabled:opacity-50 active:scale-[0.98]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setConfirmModal(true)}
            disabled={loading || cleaning || selectedTargets.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white text-[#0A0A0A] hover:bg-neutral-200 transition-colors disabled:opacity-50 shadow-sm active:scale-[0.98]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clean Selected ({selectedTargets.length})
          </button>
        </div>
      </div>

      {/* Safety Guarantee Banner */}
      <div className="p-4 rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] flex items-start gap-3.5 shadow-sm">
        <ShieldCheck className="w-5 h-5 text-[#4ADE80] shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-medium text-[#ECECEC]">Safety Protocol Guarantee</div>
          <div className="text-[#8C8C8C] leading-relaxed">
            This cleanup routine strictly targets disposable temporary caches: untagged Docker layers, intermediate build caches, downloaded APT packages, and old rotated journals. 
            <strong className="text-[#ECECEC] font-medium ml-1">It will NEVER touch your personal files, Nextcloud data, Immich photos, databases, or active configuration volumes.</strong>
          </div>
        </div>
      </div>

      {/* Storage Status */}
      {analysis && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 shadow-sm">
            <span className="text-[11px] uppercase tracking-wider text-[#8C8C8C] font-medium">Root Disk Size</span>
            <div className="text-2xl font-normal font-serif text-[#ECECEC] mt-1">{analysis.rootTotal}</div>
            <div className="text-xs text-[#8C8C8C] mt-1">Host filesystem total capacity</div>
          </div>
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 shadow-sm">
            <span className="text-[11px] uppercase tracking-wider text-[#8C8C8C] font-medium">Available Free Space</span>
            <div className="text-2xl font-normal font-serif text-[#ECECEC] mt-1">{analysis.rootFree}</div>
            <div className="text-xs text-[#8C8C8C] mt-1">Currently unallocated space</div>
          </div>
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 shadow-sm">
            <span className="text-[11px] uppercase tracking-wider text-[#8C8C8C] font-medium">Root Disk Utilization</span>
            <div className="text-2xl font-normal font-serif text-[#ECECEC] mt-1">{analysis.rootUsedPercent}</div>
            <div className="w-full bg-[#0A0A0A] border border-[#2A2A2A] h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div 
                className="bg-white h-full rounded-full transition-all duration-500"
                style={{ width: analysis.rootUsedPercent }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Targets Checklist */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wider text-[#8C8C8C] flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-[#ECECEC]" />
              Reclaimable Disposable Targets
            </h2>
            <p className="text-xs text-[#8C8C8C] mt-0.5">Select items to purge safely</p>
          </div>
          {analysis && (
            <button
              onClick={selectAll}
              className="text-xs text-[#8C8C8C] hover:text-[#ECECEC] transition-colors"
            >
              {selectedTargets.length === analysis.targets.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="h-20 bg-white/[0.03] rounded-xl border border-[#2A2A2A]" />
            ))}
          </div>
        ) : analysis ? (
          <div className="space-y-3">
            {analysis.targets.map(target => {
              const isSelected = selectedTargets.includes(target.id);
              return (
                <div
                  key={target.id}
                  onClick={() => toggleTarget(target.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isSelected 
                      ? 'bg-[#0F0F0F] border-white/30' 
                      : 'bg-[#0F0F0F]/60 border-[#2A2A2A] hover:border-[#8C8C8C]/40'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // handled by parent div
                      className="mt-1 w-4 h-4 rounded border-[#2A2A2A] bg-[#0A0A0A] text-white focus:ring-0"
                    />
                    <div className="p-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] shrink-0 text-[#ECECEC]">
                      {getTargetIcon(target.id)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#ECECEC]">{target.name}</span>
                        {target.safe && (
                          <Badge variant="success" className="text-[10px] py-0">Safe</Badge>
                        )}
                      </div>
                      <p className="text-xs text-[#8C8C8C] mt-1 max-w-xl">
                        {target.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center pl-10 sm:pl-0">
                    <div className="text-right">
                      <span className="text-[10px] uppercase tracking-wider text-[#8C8C8C] block">Estimated Reclaimable</span>
                      <span className="text-sm font-mono font-medium text-[#ECECEC]">
                        {target.estimatedSpace}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Clean Result Summary */}
      {cleanResult && (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="w-5 h-5 text-[#4ADE80]" />
            <div>
              <h2 className="text-base font-serif font-normal text-[#ECECEC]">Cleanup Complete</h2>
              <p className="text-xs text-[#8C8C8C]">Freed {cleanResult.freedMB} on host filesystem</p>
            </div>
          </div>

          <div className="space-y-2 mt-4 font-mono text-xs">
            {Object.entries(cleanResult.results).map(([key, res]) => (
              <div 
                key={key} 
                className={`p-3 rounded-xl border ${
                  res.success ? 'bg-[#0F0F0F] border-[#2A2A2A] text-[#ECECEC]' : 'bg-red-950/20 border-red-500/20 text-red-300'
                }`}
              >
                <div className="font-semibold text-[#ECECEC]">{key}: {res.success ? 'Success' : 'Failed'}</div>
                <div className="text-[11px] text-[#8C8C8C] mt-1 whitespace-pre-wrap">{res.message || res.error}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-[#FBBF24]">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-serif font-normal text-[#ECECEC]">Confirm Safe Cleanup</h3>
            </div>
            
            <p className="text-xs text-[#8C8C8C] leading-relaxed">
              You are about to prune <strong className="text-[#ECECEC]">{selectedTargets.length} selected cache categories</strong>. 
              Active containers and saved user data will remain untouched.
            </p>

            <ul className="text-xs font-mono text-[#8C8C8C] bg-[#0F0F0F] border border-[#2A2A2A] p-3 rounded-xl space-y-1">
              {selectedTargets.map(t => (
                <li key={t} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]" />
                  {t}
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setConfirmModal(false)}
                className="px-3.5 py-2 text-xs font-medium text-[#8C8C8C] hover:text-[#ECECEC] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClean}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-white text-[#0A0A0A] hover:bg-neutral-200 transition-colors shadow-sm active:scale-[0.98]"
              >
                Start Cleanup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
