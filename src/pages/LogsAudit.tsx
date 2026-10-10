import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, ShieldAlert, ShieldCheck, User, Globe, Check } from 'lucide-react';
import { logsService, type AuditLogsResponse, type AuditLogEntry } from '../services/logs';
import LogsNavHeader from '../components/logs/LogsNavHeader';
import { exportLogsAsFile, copyLogsToClipboard } from '../utils/logExport';
import { useToast } from '../components/ui/ToastContext';
import PageLoader from '../components/ui/PageLoader';
import ErrorState from '../components/ui/ErrorState';

export default function LogsAudit() {
  const { addToast } = useToast();
  const [data, setData] = useState<AuditLogsResponse | null>(null);
  const [lines, setLines] = useState(100);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedRowId, setCopiedRowId] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const logContainerRef = useRef<HTMLDivElement>(null);

  const loadAudit = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await logsService.getAuditLogs(lines);
      setData(res);
      setError(null);
    } catch (err) {
      if (!isBackground) {
        setError(err instanceof Error ? err : new Error('Failed to load audit logs'));
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [lines]);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  // Live streaming interval (every 3 seconds)
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      loadAudit(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [isLive, loadAudit]);

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [data, autoScroll]);

  const events: AuditLogEntry[] = data?.events || [];

  const filteredEvents = events.filter((evt) => {
    if (typeFilter !== 'all') {
      if (typeFilter === 'ssh' && !evt.type.startsWith('ssh')) return false;
      if (typeFilter === 'failed' && evt.type !== 'ssh_login_failed') return false;
      if (typeFilter === 'sudo' && evt.type !== 'sudo_command') return false;
      if (typeFilter === 'session' && !evt.type.startsWith('session')) return false;
    }

    if (!search) return true;
    const q = search.toLowerCase();
    return (
      evt.raw.toLowerCase().includes(q) ||
      (evt.user && evt.user.toLowerCase().includes(q)) ||
      (evt.ip && evt.ip.toLowerCase().includes(q)) ||
      (evt.command && evt.command.toLowerCase().includes(q))
    );
  });

  const handleCopyAll = async () => {
    const text = filteredEvents.map((e) => e.raw).join('\n');
    const ok = await copyLogsToClipboard(text);
    if (ok) {
      setCopied(true);
      addToast({ title: 'Audit Trail Copied', message: `${filteredEvents.length} events copied to clipboard.`, type: 'success' });
      setTimeout(() => setCopied(false), 2000);
    } else {
      addToast({ title: 'Copy Failed', type: 'error' });
    }
  };

  const handleCopySingle = async (evt: AuditLogEntry) => {
    const ok = await copyLogsToClipboard(evt.raw);
    if (ok) {
      setCopiedRowId(evt.id);
      setTimeout(() => setCopiedRowId(null), 1500);
    }
  };

  const handleExport = () => {
    const text = filteredEvents.map((e) => e.raw).join('\n');
    const dateStr = new Date().toISOString().slice(0, 10);
    exportLogsAsFile(`audit-trail-${dateStr}.log`, text);
    addToast({ title: 'Audit Trail Exported', message: `Downloaded audit-trail-${dateStr}.log`, type: 'success' });
  };

  const renderBadge = (type: string) => {
    switch (type) {
      case 'ssh_login_success':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            SSH LOGIN
          </span>
        );
      case 'ssh_login_failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="w-3 h-3 text-rose-400" />
            FAILED AUTH
          </span>
        );
      case 'sudo_command':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            SUDO
          </span>
        );
      case 'session_open':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-[#1F1F1F] text-[#A3A3A3] border border-[#2E2E2E]">
            SESSION OPEN
          </span>
        );
      case 'session_close':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-[#1A1A1A] text-[#737373] border border-[#262626]">
            SESSION CLOSE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-[#1A1A1A] text-[#8C8C8C] border border-[#2A2A2A]">
            AUDIT
          </span>
        );
    }
  };

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
        title="Security Audit Trail"
        description="Tamper-evident authentication attempts, sudo privilege escalations, and systemd-logind sessions."
        count={filteredEvents.length}
        loading={loading}
        onRefresh={() => loadAudit(false)}
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
            placeholder="Search user, IP, sudo command, or auth reason..."
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

        {/* Category Pills */}
        <div className="flex items-center gap-1 p-1 bg-[#141414] border border-[#2A2A2A] rounded-xl">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
              typeFilter === 'all'
                ? 'bg-white text-[#0A0A0A] font-semibold shadow-sm'
                : 'text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222]/50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setTypeFilter('ssh')}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
              typeFilter === 'ssh'
                ? 'bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30'
                : 'text-[#8C8C8C] hover:text-emerald-400 hover:bg-[#222222]/50'
            }`}
          >
            SSH Logins
          </button>
          <button
            onClick={() => setTypeFilter('failed')}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
              typeFilter === 'failed'
                ? 'bg-rose-500/15 text-rose-300 font-semibold border border-rose-500/30'
                : 'text-[#8C8C8C] hover:text-rose-400 hover:bg-[#222222]/50'
            }`}
          >
            Failed Auth
          </button>
          <button
            onClick={() => setTypeFilter('sudo')}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
              typeFilter === 'sudo'
                ? 'bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30'
                : 'text-[#8C8C8C] hover:text-amber-400 hover:bg-[#222222]/50'
            }`}
          >
            Sudo
          </button>
          <button
            onClick={() => setTypeFilter('session')}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
              typeFilter === 'session'
                ? 'bg-[#2A2A2A] text-white font-medium border border-[#3A3A3A]'
                : 'text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222]/50'
            }`}
          >
            Sessions
          </button>
        </div>

        {/* Lines Limit */}
        <select
          value={lines}
          onChange={(e) => setLines(Number(e.target.value))}
          className="bg-[#141414] border border-[#2A2A2A] rounded-xl px-3 py-2 text-xs text-[#ECECEC] focus:outline-none focus:border-[#ECECEC]/40 font-mono cursor-pointer transition"
        >
          <option value={50}>Last 50 events</option>
          <option value={100}>Last 100 events</option>
          <option value={200}>Last 200 events</option>
          <option value={500}>Last 500 events</option>
        </select>
      </div>

      {error ? (
        <ErrorState message={error.message} onRetry={() => loadAudit(false)} />
      ) : loading && !data ? (
        <PageLoader />
      ) : (
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#0E0E0E] overflow-hidden shadow-2xl">
          {/* Claude Obsidian Console Header */}
          <div className="flex flex-wrap items-center justify-between border-b border-[#2A2A2A] bg-[#121212] px-4 py-2.5 text-xs text-[#8C8C8C] gap-2">
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[#8C8C8C]">audit</span>
              <span className="text-[#ECECEC] bg-[#1C1C1C] px-2 py-0.5 rounded border border-[#2E2E2E] font-medium">
                auth.log & journald
              </span>
              <span className="text-[#555555]">-n {lines}</span>
            </div>

            <div className="flex items-center gap-2.5 font-mono text-[11px]">
              {search && (
                <span className="text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Matches: {filteredEvents.length}
                </span>
              )}
              <span className="text-[#737373]">{filteredEvents.length} / {events.length} security events</span>
            </div>
          </div>

          {/* Audit Event Stream */}
          <div
            ref={logContainerRef}
            className="p-3 font-mono text-xs max-h-[640px] overflow-y-auto space-y-1.5 select-text scroll-smooth"
          >
            {filteredEvents.length === 0 ? (
              <div className="py-16 text-center text-xs text-[#8C8C8C] space-y-2">
                <ShieldCheck className="w-8 h-8 mx-auto text-[#444444]" />
                <p>No audit events match the selected category or search filter.</p>
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
              filteredEvents.map((evt) => {
                const isFail = evt.type === 'ssh_login_failed';
                const isCopied = copiedRowId === evt.id;

                return (
                  <div
                    key={evt.id}
                    onClick={() => handleCopySingle(evt)}
                    title="Click line to copy to clipboard"
                    className={`group flex flex-col md:flex-row md:items-center justify-between gap-2.5 p-2.5 rounded-xl border transition-colors cursor-pointer select-text ${
                      isFail
                        ? 'bg-rose-500/[0.06] border-rose-500/25 hover:bg-rose-500/[0.12]'
                        : 'bg-[#121212] border-[#222222] hover:bg-[#181818] hover:border-[#2E2E2E]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                      {renderBadge(evt.type)}

                      {/* User Pill */}
                      {evt.user && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1C1C1C] text-[#ECECEC] text-[11px] font-mono border border-[#2A2A2A]">
                          <User className="w-3 h-3 text-[#8C8C8C]" />
                          <span>{evt.user}</span>
                        </span>
                      )}

                      {/* Remote IP Pill */}
                      {evt.ip && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1C1C1C] text-[#ECECEC] text-[11px] font-mono border border-[#2A2A2A]">
                          <Globe className="w-3 h-3 text-[#8C8C8C]" />
                          <span>{evt.ip}</span>
                        </span>
                      )}

                      {/* Raw message / Command */}
                      <span className="text-[#ECECEC] text-[12px] break-all leading-relaxed">
                        {renderHighlighted(evt.raw, search)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end md:self-auto text-[11px] font-mono text-[#666666]">
                      <span className="tabular-nums">{evt.timestamp}</span>
                      <span className="opacity-0 group-hover:opacity-100 transition text-[#737373]">
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <span className="text-[10px]">copy</span>
                        )}
                      </span>
                    </div>
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
