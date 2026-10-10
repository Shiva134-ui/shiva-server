import { useState, useEffect, useCallback } from 'react';
import { 
  Terminal, 
  UserCheck, 
  RefreshCw, 
  Lock, 
  Users,
  ShieldCheck,
  ShieldAlert,
  PowerOff,
  Radio
} from 'lucide-react';
import { securityWatchdogService, type SecurityWatchdogResponse } from '../services/securityWatchdog';
import { adminService } from '../services/admin';
import { useToast } from '../components/ui/ToastContext';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Badge from '../components/ui/Badge';

export default function SecurityWatchdog() {
  const [data, setData] = useState<SecurityWatchdogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [terminating, setTerminating] = useState<string | null>(null);
  const [confirmTerminate, setConfirmTerminate] = useState<{ terminal: string; user: string } | null>(null);
  const { addToast } = useToast();

  const loadSecurity = useCallback(async () => {
    try {
      const res = await securityWatchdogService.getStatus();
      setData(res);
    } catch (err: any) {
      addToast({ title: 'Security Monitor Error', message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadSecurity();
    const interval = setInterval(loadSecurity, 10000);
    return () => clearInterval(interval);
  }, [loadSecurity]);

  const handleExecuteTerminate = async () => {
    if (!confirmTerminate) return;
    const { terminal, user } = confirmTerminate;
    setTerminating(terminal);
    try {
      await adminService.terminateSession(terminal);
      // Optimistically update session list and count immediately
      setData(prev => prev ? {
        ...prev,
        activeSessions: prev.activeSessions.filter(s => s.terminal !== terminal && s.id !== `session-${terminal.replace(/[^a-zA-Z0-9]/g, '-')}`),
        totalActiveSessions: Math.max(0, prev.totalActiveSessions - 1)
      } : null);
      addToast({ 
        title: 'Session Disconnected', 
        message: `Terminated active terminal session ${terminal} for user ${user}.`, 
        type: 'success' 
      });
      // Allow host kernel time to reap processes before synchronizing
      setTimeout(() => {
        loadSecurity();
      }, 600);
    } catch (err: any) {
      addToast({ title: 'Termination Failed', message: err.message || 'Could not kill session', type: 'error' });
    } finally {
      setTerminating(null);
      setConfirmTerminate(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#8C8C8C] mb-1 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> Access Security
          </div>
          <h1 className="text-2xl font-normal font-serif text-[#ECECEC] tracking-tight">Security Watchdog</h1>
          <p className="text-xs text-[#8C8C8C] mt-1">
            Real-time tracking of active host terminal sessions, authentication events, and firewall enforcement.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadSecurity}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl bg-[#1A1A1A] hover:bg-[#222222] text-[#ECECEC] border border-[#2A2A2A] transition-colors active:scale-[0.98]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Scan Sessions
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 2xl:gap-6">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider font-medium text-[#8C8C8C]">Live Active Sessions</span>
              <Radio className={`w-3.5 h-3.5 ${data.totalActiveSessions > 0 ? 'text-[#4ADE80] animate-pulse' : 'text-[#8C8C8C]'}`} />
            </div>
            <div className="text-2xl font-normal font-serif text-[#ECECEC] mt-1">{data.totalActiveSessions}</div>
            <div className="text-xs text-[#8C8C8C] mt-1">Logged into Ubuntu Host</div>
          </div>

          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider font-medium text-[#8C8C8C]">Failed Attempts (Recent)</span>
              {data.failedAttemptsCount > 0 ? (
                <ShieldAlert className="w-3.5 h-3.5 text-[#FBBF24]" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-[#4ADE80]" />
              )}
            </div>
            <div className={`text-2xl font-normal font-serif mt-1 ${data.failedAttemptsCount > 0 ? 'text-[#FBBF24]' : 'text-[#4ADE80]'}`}>
              {data.failedAttemptsCount}
            </div>
            <div className="text-xs text-[#8C8C8C] mt-1">SSH Authentication Denials</div>
          </div>

          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider font-medium text-[#8C8C8C]">UFW Host Firewall</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-base font-medium text-[#4ADE80] uppercase mt-1">{data.firewallState}</div>
            <div className="text-xs text-[#8C8C8C] mt-1">Packet Filtering Active</div>
          </div>
        </div>
      )}

      {/* Active Logged-in Sessions */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-medium uppercase tracking-wider text-[#8C8C8C] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#8C8C8C]" />
            Active Terminal & SSH Logins
          </h2>
          <span className="text-[11px] font-mono text-[#8C8C8C]">
            {data?.activeSessions.length || 0} active
          </span>
        </div>

        {data?.activeSessions.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#8C8C8C] bg-[#141414] border border-[#2A2A2A] rounded-xl">
            No interactive SSH sessions currently active.
          </div>
        ) : (
          <div className="divide-y divide-[#2A2A2A]">
            {data?.activeSessions.map(s => (
              <div key={s.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[#4ADE80]">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#ECECEC]">{s.user}</span>
                      <Badge variant="success" className="text-[10px] py-0">{s.terminal}</Badge>
                    </div>
                    <div className="text-[#8C8C8C] text-[11px] mt-0.5">
                      Client: <span className="text-[#ECECEC] font-mono">{s.ip}</span> • Since: {s.loginTime}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setConfirmTerminate({ terminal: s.terminal, user: s.user })}
                  disabled={terminating === s.terminal}
                  className="self-start sm:self-center flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  title="Force disconnect this session"
                >
                  <PowerOff className="w-3.5 h-3.5" />
                  <span>{terminating === s.terminal ? 'Terminating…' : 'Disconnect'}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Auth Log Timeline */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 sm:p-6 shadow-sm">
        <h2 className="text-xs font-medium uppercase tracking-wider text-[#8C8C8C] mb-4 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#8C8C8C]" />
          Recent SSH Security & Auth Activity
        </h2>

        <div className="space-y-2 font-mono text-[11px] max-h-80 overflow-y-auto">
          {data?.recentLogs.map(log => (
            <div 
              key={log.id} 
              className={`p-3 rounded-xl border leading-relaxed ${
                log.type === 'failed' 
                  ? 'bg-rose-950/20 border-rose-500/30 text-rose-300' 
                  : log.type === 'accepted' 
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' 
                  : 'bg-[#0F0F0F] border-[#2A2A2A] text-[#8C8C8C]'
              }`}
            >
              {log.raw}
            </div>
          ))}
        </div>
      </div>

      {/* Terminate Session Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!confirmTerminate}
        onClose={() => setConfirmTerminate(null)}
        onConfirm={handleExecuteTerminate}
        title="Disconnect Terminal Session"
        message={`Are you sure you want to forcibly terminate active terminal session "${confirmTerminate?.terminal}" for user "${confirmTerminate?.user}"? Any running commands in that session will be stopped.`}
        confirmText="Disconnect Session"
        variant="danger"
      />
    </div>
  );
}
