import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Terminal, Container, Check, WrapText, Clock } from 'lucide-react';
import { logsService, type DockerLogsResponse, type DockerLogEntry } from '../services/logs';
import { dockerService } from '../services/docker';
import type { DockerContainer } from '../types/docker';
import LogsNavHeader from '../components/logs/LogsNavHeader';
import { exportLogsAsFile, copyLogsToClipboard } from '../utils/logExport';
import { useToast } from '../components/ui/ToastContext';
import LoadingScreen from '../components/ui/LoadingScreen';
import ErrorState from '../components/ui/ErrorState';

export default function LogsDocker() {
  const { addToast } = useToast();
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<string>('');
  const [data, setData] = useState<DockerLogsResponse | null>(null);
  const [tail, setTail] = useState(100);
  const [search, setSearch] = useState('');
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [wrapLines, setWrapLines] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedRowId, setCopiedRowId] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const logContainerRef = useRef<HTMLDivElement>(null);

  // Load container list
  useEffect(() => {
    async function loadContainers() {
      try {
        const list = await dockerService.getContainers();
        setContainers(list);
        if (list.length > 0 && !selectedContainer) {
          // Default to running container if available, or first container
          const running = list.find((c) => c.state === 'running');
          setSelectedContainer(running ? running.name : list[0].name);
        }
      } catch (_) {}
    }
    loadContainers();
  }, [selectedContainer]);

  const loadLogs = useCallback(async (isBackground = false) => {
    if (!selectedContainer) return;
    if (!isBackground) setLoading(true);
    try {
      const res = await logsService.getDockerLogs(selectedContainer, tail);
      setData(res);
      setError(null);
    } catch (err) {
      if (!isBackground) {
        setError(err instanceof Error ? err : new Error('Failed to load container logs'));
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [selectedContainer, tail]);

  useEffect(() => {
    if (selectedContainer) {
      loadLogs();
    }
  }, [loadLogs, selectedContainer]);

  // Live streaming interval (every 3 seconds)
  useEffect(() => {
    if (!isLive || !selectedContainer) return;
    const interval = setInterval(() => {
      loadLogs(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [isLive, selectedContainer, loadLogs]);

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [data, autoScroll]);

  const logs: DockerLogEntry[] = data?.logs || [];
  const filteredLogs = logs.filter((item) =>
    !search || item.raw.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopyAll = async () => {
    const text = filteredLogs.map((l) => l.raw).join('\n');
    const ok = await copyLogsToClipboard(text);
    if (ok) {
      setCopied(true);
      addToast({ title: 'Container Logs Copied', message: `${filteredLogs.length} lines copied to clipboard.`, type: 'success' });
      setTimeout(() => setCopied(false), 2000);
    } else {
      addToast({ title: 'Copy Failed', type: 'error' });
    }
  };

  const handleCopySingle = async (item: DockerLogEntry) => {
    const ok = await copyLogsToClipboard(item.raw);
    if (ok) {
      setCopiedRowId(item.id);
      setTimeout(() => setCopiedRowId(null), 1500);
    }
  };

  const handleExport = () => {
    const text = filteredLogs.map((l) => l.raw).join('\n');
    const dateStr = new Date().toISOString().slice(0, 10);
    const containerTag = selectedContainer.replace(/[^a-zA-Z0-9]/g, '_');
    exportLogsAsFile(`docker-${containerTag}-${dateStr}.log`, text);
    addToast({ title: 'Logs Exported', message: `Downloaded docker-${containerTag}-${dateStr}.log`, type: 'success' });
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

  const currentContainerObj = containers.find((c) => c.name === selectedContainer);

  return (
    <div className="space-y-6 pb-8">
      <LogsNavHeader
        title="Docker Containers"
        description="Standard output and error streams captured from Docker engine container runtimes."
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

      {/* Selectors and Filter Bar */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Container Dropdown */}
        <div className="relative min-w-[220px]">
          <select
            value={selectedContainer}
            onChange={(e) => setSelectedContainer(e.target.value)}
            className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-3 py-2 text-xs text-[#ECECEC] font-mono focus:outline-none focus:border-[#ECECEC]/40 cursor-pointer transition"
          >
            {containers.length === 0 ? (
              <option value="">No containers found</option>
            ) : (
              containers.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name} {c.state === 'running' ? '● running' : '○ stopped'}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Lines Limit */}
        <select
          value={tail}
          onChange={(e) => setTail(Number(e.target.value))}
          className="bg-[#141414] border border-[#2A2A2A] rounded-xl px-3 py-2 text-xs text-[#ECECEC] focus:outline-none focus:border-[#ECECEC]/40 font-mono cursor-pointer transition"
        >
          <option value={50}>Last 50 lines</option>
          <option value={100}>Last 100 lines</option>
          <option value={200}>Last 200 lines</option>
          <option value={500}>Last 500 lines</option>
          <option value={1000}>Last 1000 lines</option>
        </select>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8C8C8C]" />
          <input
            type="text"
            placeholder="Search stdout/stderr text..."
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

        {/* View Options Toggle: Timestamps & Wordwrap */}
        <div className="flex items-center gap-1 bg-[#141414] border border-[#2A2A2A] p-1 rounded-xl">
          <button
            onClick={() => setShowTimestamps(!showTimestamps)}
            className={`px-2.5 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5 ${
              showTimestamps
                ? 'bg-white text-[#0A0A0A] font-medium shadow-sm'
                : 'text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222]/50'
            }`}
            title={showTimestamps ? 'Hide timestamps' : 'Show timestamps'}
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Time</span>
          </button>
          <button
            onClick={() => setWrapLines(!wrapLines)}
            className={`px-2.5 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5 ${
              wrapLines
                ? 'bg-white text-[#0A0A0A] font-medium shadow-sm'
                : 'text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222]/50'
            }`}
            title={wrapLines ? 'Disable line wrap' : 'Enable line wrap'}
          >
            <WrapText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Wrap</span>
          </button>
        </div>
      </div>

      {error ? (
        <ErrorState message={error.message} onRetry={() => loadLogs(false)} />
      ) : loading && !data ? (
        <LoadingScreen />
      ) : (
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#0E0E0E] overflow-hidden shadow-2xl">
          {/* Claude Obsidian Console Header */}
          <div className="flex flex-wrap items-center justify-between border-b border-[#2A2A2A] bg-[#121212] px-4 py-2.5 text-xs text-[#8C8C8C] gap-2">
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <Terminal className="w-3.5 h-3.5 text-[#8C8C8C]" />
              <span className="text-[#8C8C8C]">docker logs</span>
              <span className="text-[#555555]">--tail {tail}</span>
              {showTimestamps && <span className="text-[#555555]">-t</span>}
              <span className="text-[#ECECEC] bg-[#1C1C1C] px-2 py-0.5 rounded border border-[#2E2E2E] font-medium">
                {selectedContainer || 'none'}
              </span>
              {currentContainerObj && (
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
                  currentContainerObj.state === 'running'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    currentContainerObj.state === 'running' ? 'bg-emerald-400' : 'bg-zinc-400'
                  }`}></span>
                  {currentContainerObj.state}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 font-mono text-[11px]">
              {search && (
                <span className="text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Matches: {filteredLogs.length}
                </span>
              )}
              <span className="text-[#737373]">{filteredLogs.length} / {logs.length} lines</span>
            </div>
          </div>

          {/* Log Stream Body */}
          <div
            ref={logContainerRef}
            className={`p-3 font-mono text-xs max-h-[640px] overflow-y-auto space-y-1 select-text scroll-smooth ${
              wrapLines ? '' : 'overflow-x-auto whitespace-pre'
            }`}
          >
            {filteredLogs.length === 0 ? (
              <div className="py-16 text-center text-xs text-[#8C8C8C] space-y-2">
                <Container className="w-8 h-8 mx-auto text-[#444444]" />
                <p>
                  {selectedContainer
                    ? 'No log entries match the search criteria for this container.'
                    : 'Select a Docker container to view logs.'}
                </p>
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
                const isErr = item.level === 'error' || /error|failed|fatal|exception|crash/i.test(item.raw);
                const isWarn = item.level === 'warn' || /warn|warning/i.test(item.raw);
                const isCopied = copiedRowId === item.id;

                const formattedTime = item.timestamp
                  ? item.timestamp.length > 19
                    ? item.timestamp.substring(11, 19)
                    : item.timestamp
                  : '';

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
                    {showTimestamps && formattedTime && (
                      <span className="text-[#666666] text-[11px] shrink-0 select-none pt-0.5 tabular-nums">
                        {formattedTime}
                      </span>
                    )}

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

                    <span className={`flex-1 text-[12px] leading-relaxed ${wrapLines ? 'break-all' : ''}`}>
                      {renderHighlighted(item.message || item.raw, search)}
                    </span>

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
