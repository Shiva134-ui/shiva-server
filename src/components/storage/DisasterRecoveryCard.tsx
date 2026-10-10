import { useState } from 'react';
import { 
  ShieldCheck, 
  Download, 
  FileJson, 
  RefreshCw, 
  Eye, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import { auditExportService, type AuditSnapshot } from '../../services/auditExport';
import { useToast } from '../ui/ToastContext';
import Badge from '../ui/Badge';

export default function DisasterRecoveryCard() {
  const [downloading, setDownloading] = useState<'json' | 'md' | null>(null);
  const [preview, setPreview] = useState<AuditSnapshot | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const { addToast } = useToast();

  const handleDownload = async (format: 'json' | 'markdown') => {
    setDownloading(format === 'markdown' ? 'md' : 'json');
    try {
      await auditExportService.downloadAudit(format);
      addToast({ 
        title: 'Export Complete', 
        message: `System recovery audit saved as .${format === 'markdown' ? 'md' : 'json'}.`, 
        type: 'success' 
      });
    } catch (err: any) {
      addToast({ title: 'Download Failed', message: err.message, type: 'error' });
    } finally {
      setDownloading(null);
    }
  };

  const handleTogglePreview = async () => {
    if (!showPreview && !preview) {
      setLoadingPreview(true);
      try {
        const data = await auditExportService.getAudit();
        setPreview(data);
      } catch (err: any) {
        addToast({ title: 'Preview Failed', message: err.message, type: 'error' });
      } finally {
        setLoadingPreview(false);
      }
    }
    setShowPreview(!showPreview);
  };

  return (
    <div className="bg-[#111] border border-white/10 rounded-xl p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Disaster Recovery & System State Audit
              <Badge variant="success" className="text-[10px] py-0">One-Click</Badge>
            </h2>
            <p className="text-xs text-white/50">
              Export exact hardware specs, filesystem UUIDs, network rules, container stacks, and cron schedules.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => handleDownload('json')}
            disabled={downloading !== null}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors disabled:opacity-50"
          >
            {downloading === 'json' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileJson className="w-3.5 h-3.5 text-cyan-400" />}
            Export .JSON
          </button>

          <button
            onClick={() => handleDownload('markdown')}
            disabled={downloading !== null}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {downloading === 'md' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Export .MD Runbook
          </button>
        </div>
      </div>

      {/* Snapshot Inclusions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-white/5 text-xs text-white/70">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Storage Disk UUIDs & Mounts</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span>Docker Container Stacks</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          <span>Tailscale & IP Routing</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span>Crontab Schedules</span>
        </div>
      </div>

      {/* Live Preview Toggle */}
      <div className="mt-4 pt-1">
        <button
          onClick={handleTogglePreview}
          className="flex items-center gap-2 text-xs text-white/50 hover:text-white transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{showPreview ? 'Hide Audit Preview' : 'Inspect Live Snapshot Contents'}</span>
          {showPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showPreview && (
          <div className="mt-3 p-4 bg-[#0a0a0a] border border-white/5 rounded-lg font-mono text-[11px] text-white/80 space-y-3 max-h-96 overflow-y-auto">
            {loadingPreview ? (
              <div className="text-white/40 animate-pulse">Generating snapshot telemetry...</div>
            ) : preview ? (
              <>
                <div className="text-emerald-400 font-bold">Snapshot ID: {preview.snapshotId}</div>
                <div className="text-white/50">Generated: {preview.generatedAt}</div>
                <div className="border-t border-white/5 pt-2">
                  <span className="text-cyan-400 font-bold block mb-1">Host Information:</span>
                  <div>Hostname: {preview.host.hostname} | OS: {preview.host.platform} {preview.host.release} ({preview.host.arch})</div>
                  <div>CPUs: {preview.host.cpus?.length} cores ({preview.host.cpus?.[0]?.model})</div>
                </div>
                <div className="border-t border-white/5 pt-2">
                  <span className="text-amber-400 font-bold block mb-1">Attached Block Devices:</span>
                  <pre className="text-[10px] text-white/70 overflow-x-auto">{JSON.stringify(preview.blockDevices, null, 2)}</pre>
                </div>
                <div className="border-t border-white/5 pt-2">
                  <span className="text-purple-400 font-bold block mb-1">Active Containers ({preview.containers?.length}):</span>
                  <div>{preview.containers?.map(c => c.Names || c.ID).join(', ')}</div>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
