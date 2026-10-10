import { useState, useEffect, useRef } from 'react';
import { 
  Terminal as TerminalIcon, 
  Trash2, 
  Copy, 
  Check, 
  CornerDownLeft, 
  Sparkles 
} from 'lucide-react';
import { terminalService, type TerminalPreset, type TerminalResult } from '../services/terminal';
import { useToast } from '../components/ui/ToastContext';
import Badge from '../components/ui/Badge';

interface HistoryItem {
  id: string;
  command: string;
  result: TerminalResult;
  timestamp: string;
}

export default function SystemTerminal() {
  const [presets, setPresets] = useState<TerminalPreset[]>([]);
  const [command, setCommand] = useState('');
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { addToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalService.getPresets().then(res => {
      setPresets(res.presets || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    consoleBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const runCommand = async (cmdToRun: string) => {
    const trimmed = cmdToRun.trim();
    if (!trimmed || running) return;

    setRunning(true);
    try {
      const result = await terminalService.execute(trimmed);
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        command: trimmed,
        result,
        timestamp: new Date().toLocaleTimeString()
      };
      setHistory(prev => [...prev, newItem]);
      setCommand('');
    } catch (err: any) {
      addToast({ title: 'Execution Failed', message: err.message, type: 'error' });
    } finally {
      setRunning(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runCommand(command);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#8C8C8C] mb-1 flex items-center gap-1.5">
            <TerminalIcon className="w-3.5 h-3.5" /> Host Console
          </div>
          <h1 className="text-2xl font-normal font-serif text-[#ECECEC] tracking-tight">System Terminal</h1>
          <p className="text-xs text-[#8C8C8C] mt-1">
            Execute host diagnostics, query hardware sensors, and inspect containers directly from the browser.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={clearHistory}
            disabled={history.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl bg-[#1A1A1A] hover:bg-[#222222] text-[#8C8C8C] hover:text-[#ECECEC] border border-[#2A2A2A] transition-colors disabled:opacity-40 active:scale-[0.98]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Terminal
          </button>
        </div>
      </div>

      {/* Preset Command Shortcuts */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 shadow-sm">
        <div className="text-[11px] font-medium uppercase tracking-wider text-[#8C8C8C] mb-3 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#ECECEC]" />
          Diagnostic Presets
        </div>
        <div className="flex flex-wrap gap-2">
          {presets.map(p => (
            <button
              key={p.id}
              onClick={() => runCommand(p.command)}
              disabled={running}
              title={p.description}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0F0F0F] hover:bg-[#222222] border border-[#2A2A2A] text-xs text-[#ECECEC] transition-colors disabled:opacity-50 active:scale-[0.98]"
            >
              <span className="font-medium">{p.label}</span>
              <span className="font-mono text-[10px] text-[#8C8C8C] bg-white/[0.04] px-1.5 py-0.5 rounded border border-[#2A2A2A]">
                {p.command.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Terminal Window Box */}
      <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl shadow-2xl overflow-hidden font-mono text-xs flex flex-col min-h-[360px] sm:min-h-[500px]">
        {/* Terminal Header Bar */}
        <div className="bg-[#0F0F0F] border-b border-[#2A2A2A] px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#F87171]/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#FBBF24]/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#4ADE80]/80" />
            <span className="ml-2 text-[#8C8C8C] text-[11px] font-mono">
              madesh@shiva-server (100.79.42.30) — bash
            </span>
          </div>
          <span className="text-[10px] text-[#8C8C8C] uppercase tracking-wider">Interactive Session</span>
        </div>

        {/* Terminal Output Area */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {history.length === 0 && (
            <div className="text-[#8C8C8C] py-14 text-center space-y-2">
              <TerminalIcon className="w-8 h-8 mx-auto opacity-30 text-[#8C8C8C]" />
              <p className="text-xs">Type a command below or click any quick preset above to start.</p>
              <p className="text-[11px] text-[#8C8C8C]/60">Execution timeout: 15 seconds per command.</p>
            </div>
          )}

          {history.map(item => (
            <div key={item.id} className="space-y-2">
              {/* Command Prompt Line */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[#ECECEC] bg-[#1A1A1A] p-3 rounded-xl border border-[#2A2A2A]">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="text-[#8C8C8C] font-mono font-medium shrink-0 text-[11px]">madesh@shiva-server:~$</span>
                  <span className="text-[#ECECEC] font-mono font-medium break-all text-[11px]">{item.command}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-[#8C8C8C] shrink-0 font-mono self-end sm:self-auto">
                  <span>{item.timestamp}</span>
                  <span>{item.result.durationMs}ms</span>
                  <Badge variant={item.result.exitCode === 0 ? 'success' : 'error'} className="text-[9px] py-0">
                    Exit {item.result.exitCode}
                  </Badge>
                  <button
                    onClick={() => handleCopy(item.id, item.result.stdout || item.result.stderr)}
                    className="text-[#8C8C8C] hover:text-[#ECECEC] transition-colors"
                    title="Copy Output"
                  >
                    {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-[#4ADE80]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Stdout */}
              {item.result.stdout && (
                <pre className="text-[#ECECEC]/90 whitespace-pre-wrap overflow-x-auto pl-3.5 border-l border-[#2A2A2A] py-1 leading-relaxed text-[11px] font-mono">
                  {item.result.stdout}
                </pre>
              )}

              {/* Stderr */}
              {item.result.stderr && (
                <pre className="text-[#F87171] whitespace-pre-wrap overflow-x-auto pl-3.5 border-l border-[#F87171]/50 py-1 text-[11px] font-mono">
                  {item.result.stderr}
                </pre>
              )}
            </div>
          ))}

          {/* Running State Spinner */}
          {running && (
            <div className="flex items-center gap-2.5 text-[#ECECEC] py-2 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>Executing command on host...</span>
            </div>
          )}

          <div ref={consoleBottomRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="border-t border-[#2A2A2A] bg-[#0F0F0F] p-3 sm:p-3.5 flex items-center gap-2 sm:gap-3">
          <span className="text-[#8C8C8C] font-mono font-medium shrink-0 text-xs hidden sm:inline">madesh@shiva-server:~$</span>
          <span className="text-[#8C8C8C] font-mono font-medium shrink-0 text-xs sm:hidden">$</span>
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={e => setCommand(e.target.value)}
            disabled={running}
            placeholder="Type command (e.g. uname -a, sensors, docker ps)..."
            className="flex-1 min-w-0 bg-transparent border-none text-[#ECECEC] focus:outline-none placeholder-[#8C8C8C]/50 text-xs font-mono"
            autoFocus
          />
          <button
            type="submit"
            disabled={running || !command.trim()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white text-[#0A0A0A] font-semibold text-xs transition-colors hover:bg-neutral-200 disabled:opacity-40 active:scale-[0.98] shadow-sm"
          >
            <span>Run</span>
            <CornerDownLeft className="w-3 h-3" />
          </button>
        </form>
      </div>
    </div>
  );
}
