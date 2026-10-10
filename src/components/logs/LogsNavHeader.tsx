import { RefreshCw, Copy, Check, Download, ArrowDownToLine } from 'lucide-react';

interface LogsNavHeaderProps {
  title: string;
  description: string;
  count?: number;
  loading?: boolean;
  onRefresh: () => void;
  // Live streaming
  isLive?: boolean;
  onToggleLive?: () => void;
  // Auto-scroll
  autoScroll?: boolean;
  onToggleAutoScroll?: () => void;
  // Copy
  onCopy?: () => void;
  copied?: boolean;
  // Export
  onExport?: () => void;
  exportFileName?: string;
}

export default function LogsNavHeader({
  title,
  description,
  count,
  loading = false,
  onRefresh,
  isLive = false,
  onToggleLive,
  autoScroll,
  onToggleAutoScroll,
  onCopy,
  copied = false,
  onExport
}: LogsNavHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col gap-1.5">
        <div className="text-[11px] font-medium uppercase tracking-wider text-[#8C8C8C] mb-0.5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]"></span>
          <span>Logs & Telemetry</span>
          {count !== undefined && (
            <>
              <span className="text-[#333333]">•</span>
              <span className="font-mono text-[#A3A3A3] text-[11px]">{count} entries</span>
            </>
          )}
        </div>
        <h1 className="text-2xl font-normal font-serif text-[#ECECEC] tracking-tight">{title}</h1>
        <p className="mt-0.5 text-xs text-[#8C8C8C] max-w-2xl leading-relaxed">
          {description}
        </p>
      </div>

      {/* Action Bar (Live toggle, Auto-scroll, Copy, Export, Manual Refresh) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-[#2A2A2A]/40">
        <div className="flex items-center gap-2">
          {onToggleLive && (
            <button
              onClick={onToggleLive}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                isLive
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-[#141414] text-[#8C8C8C] border-[#2A2A2A] hover:bg-[#1A1A1A] hover:text-[#ECECEC]'
              }`}
              title={isLive ? 'Pause live auto-refresh' : 'Start live auto-refresh (every 3s)'}
            >
              <span className="relative flex h-2 w-2">
                {isLive && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-emerald-400' : 'bg-[#555555]'}`}></span>
              </span>
              <span className="font-mono text-[11px]">{isLive ? 'LIVE' : 'PAUSED'}</span>
            </button>
          )}

          {onToggleAutoScroll && (
            <button
              onClick={onToggleAutoScroll}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                autoScroll
                  ? 'bg-[#222222] text-[#ECECEC] border-[#3A3A3A]'
                  : 'bg-[#141414] text-[#8C8C8C] border-[#2A2A2A] hover:bg-[#1A1A1A] hover:text-[#ECECEC]'
              }`}
              title={autoScroll ? 'Disable stick to bottom' : 'Enable auto-scroll to latest log'}
            >
              <ArrowDownToLine className={`w-3.5 h-3.5 ${autoScroll ? 'text-white' : 'text-[#8C8C8C]'}`} />
              <span className="hidden sm:inline">Stick to Bottom</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {onCopy && (
            <button
              onClick={onCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#2A2A2A] bg-[#141414] hover:bg-[#1E1E1E] text-xs font-medium text-[#ECECEC] transition active:scale-[0.98]"
              title="Copy visible logs to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#8C8C8C]" />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}

          {onExport && (
            <button
              onClick={onExport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#2A2A2A] bg-[#141414] hover:bg-[#1E1E1E] text-xs font-medium text-[#ECECEC] transition active:scale-[0.98]"
              title="Download logs as text file"
            >
              <Download className="w-3.5 h-3.5 text-[#8C8C8C]" />
              <span>Export</span>
            </button>
          )}

          <button
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] hover:bg-[#222222] text-xs font-medium text-[#ECECEC] transition active:scale-[0.98] disabled:opacity-50"
            title="Manual refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#8C8C8C] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </div>
  );
}
