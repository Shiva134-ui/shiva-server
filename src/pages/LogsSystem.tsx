import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Terminal, AlertCircle, AlertTriangle, Check } from 'lucide-react';
import { logsService, type SystemLogsResponse, type SystemLogEntry } from '../services/logs';
import LogsNavHeader from '../components/logs/LogsNavHeader';
import { exportLogsAsFile, copyLogsToClipboard } from '../utils/logExport';
import { useToast } from '../components/ui/ToastContext';
import PageLoader from '../components/ui/PageLoader';
import ErrorState from '../components/ui/ErrorState';

export default function LogsSystem() {
  const { addToast } = useToast();
  const [data, setData] = useState<SystemLogsResponse | null>(null);
  const [lines, setLines] = useState(100);
  const [unit, setUnit] = useState('');
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [copiedRowId, setCopiedRowId] = useState<number | null>(null);

  const logContainerRef = useRef<HTMLDivElement>(null);

  const loadLogs = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await logsService.getSystemLogs(lines, unit || undefined);
      setData(res);
      setError(null);
    } catch (err) {
      if (!isBackground) {
        setError(err instanceof Error ? err : new Error('Failed to load system logs'));
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [lines, unit]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Live streaming interval (every 3 seconds)
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      loadLogs(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [isLive, loadLogs]);

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [data, autoScroll]);

  const rawLogs: SystemLogEntry[] = data?.logs || [];

  const filteredLogs = rawLogs.filter((item) => {
    // Level filter
    if (levelFilter !== 'all') {
      const itemLevel = item.level || (
        /error|failed|fatal|critical/i.test(item.raw) ? 'error' :
        /warn/i.test(item.raw) ? 'warn' : 'info'
      );
      if (levelFilter === 'error' && itemLevel !== 'error') return false;
      if (levelFilter === 'warn' && itemLevel !== 'warn' && itemLevel !== 'error') return false;
      if (levelFilter === 'info' && itemLevel !== 'info') return false;
    }

    // Search query
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.raw.toLowerCase().includes(q) ||
      (item.process && item.process.toLowerCase().includes(q)) ||
      (item.message && item.message.toLowerCase().includes(q))
    );
  });

  const handleCopyAll = async () => {
    const text = filteredLogs.map((l) => l.raw).join('\n');
    const ok = await copyLogsToClipboard(text);
    if (ok) {
      setCopied(true);
      addToast({ title: 'Logs Copied', message: `${filteredLogs.length} lines copied to clipboard.`, type: 'success' });
      setTimeout(() => setCopied(false), 2000);
    } else {
      addToast({ title: 'Copy Failed', type: 'error' });
    }
  };

  const handleCopySingle = async (item: SystemLogEntry) => {
    const ok = await copyLogsToClipboard(item.raw);
    if (ok) {
      setCopiedRowId(item.id);
      setTimeout(() => setCopiedRowId(null), 1500);
    }
  };

  const handleExport = () => {
    const text = filteredLogs.map((l) => l.raw).join('\n');
    const dateStr = new Date().toISOString().slice(0, 10);
    const unitTag = unit ? unit.replace(/[^a-zA-Z0-9]/g, '_') : 'all';
    exportLogsAsFile(`journalctl-${unitTag}-${dateStr}.log`, text);
    addToast({ title: 'Logs Exported', message: `Downloaded journalctl-${unitTag}-${dateStr}.log`, type: 'success' });
  };

  // Helper to highlight matching text in query
  const renderHighlighted = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-amber-400/20 text-amber-200 px-0.5 rounded font-semibold">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="space-y-6 pb-8">
      <LogsNavHeader
        title="System Journal"
        description="High-fidelity journald stream from Ubuntu 24.04 systemd units and host daemon services."
        count={filteredLogs.length}
        loading={loading}
        onRefresh={() => loadLogs(false)}
        isLive={isLive}
        onToggleLive={() => setIsLive(!isLive)}
        autoScroll={autoScroll}
        onToggleAutoScroll={() => setAutoScroll(!autoScroll)}
        onCopy={handleCopyAll}
        copied={copied}
        onExport={handleExport}
      />

      {/* Filter and Limit Controls */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8C8C8C]" />
          <input
            type="text"
            placeholder="Search journalctl message, process, or PID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-[#141414] border border-[#2A2A2A] rounded-xl text-xs text-[#ECECEC] placeholder:text-[#8C8C8C] focus:outline-none focus:border-[#ECECEC]/40 font-mono transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[#8C8C8C] hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Unit Selector */}
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="bg-[#141414] border border-[#2A2A2A] rounded-xl px-3 py-2 text-xs text-[#ECECEC] focus:outline-none focus:border-[#ECECEC]/40 font-mono cursor-pointer transition"
        >
          <option value="">All Services (journald)</option>
          <option value="madesh-api">madesh-api.service (Backend API)</option>
          <option value="cloudflared">cloudflared.service (Cloudflare Tunnel)</option>
          <option value="docker">docker.service (Docker Daemon)</option>
          <option value="ssh">ssh.service (OpenSSH)</option>
          <option value="tailscaled">tailscaled.service (Tailscale VPN)</option>
          <option value="nginx">nginx.service (Reverse Proxy)</option>
          <option value="systemd-journald">systemd-journald (Journal)</option>
          <option value="cron">cron.service (Cron)</option>
          <option value="smartmontools">smartmontools.service (Storage Health)</option>
          <option value="ufw">ufw.service (Firewall)</option>
        </select>

        {/* Severity Level Filter */}
        <div className="flex items-center gap-1 p-1 bg-[#141414] border border-[#2A2A2A] rounded-xl">
          <button
            onClick={() => setLevelFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
              levelFilter === 'all'
                ? 'bg-white text-[#0A0A0A] font-semibold shadow-sm'
                : 'text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222]/50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setLevelFilter('error')}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
              levelFilter === 'error'
                ? 'bg-rose-500/15 text-rose-300 font-semibold border border-rose-500/30'
                : 'text-[#8C8C8C] hover:text-rose-400 hover:bg-[#222222]/50'
            }`}
          >
            <AlertCircle className="w-3 h-3 text-rose-400" />
            <span>Errors</span>
          </button>
          <button
            onClick={() => setLevelFilter('warn')}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
              levelFilter === 'warn'
                ? 'bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30'
                : 'text-[#8C8C8C] hover:text-amber-400 hover:bg-[#222222]/50'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>Warnings</span>
          </button>
        </div>

        {/* Lines Limit */}
        <select
          value={lines}
          onChange={(e) => setLines(Number(e.target.value))}
          className="bg-[#141414] border border-[#2A2A2A] rounded-xl px-3 py-2 text-xs text-[#ECECEC] focus:outline-none focus:border-[#ECECEC]/40 font-mono cursor-pointer transition"
        >
          <option value={50}>Last 50 lines</option>
          <option value={100}>Last 100 lines</option>
          <option value={200}>Last 200 lines</option>
          <option value={500}>Last 500 lines</option>
        </select>
      </div>

      {error ? (
        <ErrorState message={error.message} onRetry={() => loadLogs(false)} />
      ) : loading && !data ? (
        <PageLoader />
      ) : (
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#0E0E0E] overflow-hidden shadow-2xl">
          {/* Claude Obsidian Console Header */}
          <div className="flex flex-wrap items-center justify-between border-b border-[#2A2A2A] bg-[#121212] px-4 py-2.5 text-xs text-[#8C8C8C] gap-2">
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <Terminal className="w-3.5 h-3.5 text-[#8C8C8C]" />
              <span className="text-[#8C8C8C]">journalctl</span>
              {unit ? (
                <span className="text-[#ECECEC] bg-[#1C1C1C] px-2 py-0.5 rounded border border-[#2E2E2E] font-medium">
                  -u {unit}
                </span>
              ) : (
                <span className="text-[#737373]">--system</span>
              )}
              <span className="text-[#555555]">-n {lines}</span>
              <span className="text-[#555555] hidden sm:inline">--no-pager</span>
            </div>

            <div className="flex items-center gap-2.5 font-mono text-[11px]">
              {search && (
                <span className="text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Matches: {filteredLogs.length}
                </span>
              )}
              <span className="text-[#737373]">{filteredLogs.length} / {rawLogs.length} events</span>
            </div>
          </div>

          {/* Log Event Stream Body */}
          <div
            ref={logContainerRef}
            className="p-3 font-mono text-xs max-h-[640px] overflow-y-auto space-y-1 select-text scroll-smooth"
          >
            {filteredLogs.length === 0 ? (
              <div className="py-16 text-center text-xs text-[#8C8C8C] space-y-2">
                <Terminal className="w-8 h-8 mx-auto text-[#444444]" />
                <p>No journal entries match the current search or severity filter.</p>
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="text-white hover:underline text-xs"
                  >
                    Clear search filter
                  </button>
                )}
              </div>
            ) : (
              filteredLogs.map((item) => {
                const isErr = item.level === 'error' || /error|failed|fatal|critical|alert/i.test(item.raw);
                const isWarn = item.level === 'warn' || /warn|warning/i.test(item.raw);
                const isCopied = copiedRowId === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleCopySingle(item)}
                    title="Click line to copy to clipboard"
                    className={`group flex items-start gap-2.5 py-1 px-2.5 rounded-lg transition-colors font-mono text-xs leading-relaxed cursor-pointer select-text ${
                      isErr
                        ? 'bg-rose-500/[0.06] hover:bg-rose-500/[0.12] text-rose-200'
                        : isWarn
                        ? 'bg-amber-500/[0.06] hover:bg-amber-500/[0.12] text-amber-200'
                        : 'hover:bg-[#161616] text-[#ECECEC]'
                    }`}
                  >
                    {/* Timestamp */}
                    <span className="text-[#666666] text-[11px] shrink-0 select-none pt-0.5 tabular-nums">
                      {item.timestamp || '--:--:--'}
                    </span>

                    {/* Process Pill */}
                    {item.process && (
                      <span className="shrink-0 text-[#A3A3A3] bg-[#1A1A1A] px-1.5 py-0.5 rounded text-[10.5px] font-medium border border-[#2A2A2A]">
                        {item.process}
                      </span>
                    )}

                    {/* Minimal severity tag if warn/err */}
                    {isErr && (
                      <span className="shrink-0 text-[#F87171] text-[10px] font-semibold tracking-wider pt-0.5">
                        ERR
                      </span>
                    )}
                    {isWarn && (
                      <span className="shrink-0 text-[#FBBF24] text-[10px] font-semibold tracking-wider pt-0.5">
                        WARN
                      </span>
                    )}

                    {/* Message */}
                    <span className="break-all flex-1 text-[12px] leading-relaxed">
                      {renderHighlighted(item.message || item.raw, search)}
                    </span>

                    {/* Quick copy indicator on hover */}
                    <span className="opacity-0 group-hover:opacity-100 transition shrink-0 text-[#737373] pl-2 pt-0.5">
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <span className="text-[10px] font-mono text-[#8C8C8C]">copy</span>
                      )}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
