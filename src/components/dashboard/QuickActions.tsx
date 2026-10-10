import { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, RotateCcw, Power, Loader2 } from 'lucide-react';
import { apiClient } from '../../services/api';
import { powerService } from '../../services/powerService';
import { useAuth } from '../../contexts/AuthContext';
import { useServerState } from '../../contexts/ServerContext';
import { powerState } from '../../services/powerState';

const STORAGE_KEY = 'madesh_power_action_counts';

interface ActionCounts {
  wake: number;
  restart: number;
  shutdown: number;
}

interface CountdownState {
  action: 'wake' | 'restart' | 'shutdown';
  secondsLeft: number;
  totalSeconds: number;
  label: string;
}

function getStoredCounts(): ActionCounts {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        wake: Number(parsed.wake) || 0,
        restart: Number(parsed.restart) || 0,
        shutdown: Number(parsed.shutdown) || 0,
      };
    }
  } catch (_) {}
  return { wake: 7, restart: 3, shutdown: 5 }; // baseline fallback
}

function saveStoredCounts(counts: ActionCounts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
  } catch (_) {}
}

export default function QuickActions() {
  const { getIdToken, user } = useAuth();
  const { health, info } = useServerState();
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [counts, setCounts] = useState<ActionCounts>(getStoredCounts);
  const [countdown, setCountdown] = useState<CountdownState | null>(null);

  const countdownIntervalRef = useRef<number | null>(null);
  const isOnline = health.status === 'ONLINE' || info.status === 'ONLINE' || info.status === 'UNAUTHORIZED';

  // Restart tracking: null = idle, number = timestamp when POST succeeded
  const restartRequestedAt = useRef<number | null>(null);
  const sawUnavailable = useRef(false);
  const fallbackTimer = useRef<number | null>(null);

  const incrementCount = useCallback((action: 'wake' | 'restart' | 'shutdown') => {
    setCounts(prev => {
      const updated = { ...prev, [action]: prev[action] + 1 };
      saveStoredCounts(updated);
      return updated;
    });
  }, []);

  const stopCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(null);
    setIsExecuting(false);
  }, []);

  const startCountdown = useCallback((action: 'wake' | 'restart' | 'shutdown', totalSeconds: number, label: string) => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown({ action, secondsLeft: totalSeconds, totalSeconds, label });

    countdownIntervalRef.current = window.setInterval(() => {
      setCountdown(prev => {
        if (!prev) return null;
        if (prev.secondsLeft <= 1) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
          setIsExecuting(false);
          setStatusMsg(action === 'wake' 
            ? 'Wake packet dispatched. Waiting for server to boot...' 
            : action === 'restart' 
            ? 'Restart window elapsed. Waiting for server heartbeat...' 
            : 'Shutdown sequence completed.');
          setTimeout(() => setStatusMsg(null), 8000);
          return null;
        }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);
  }, []);

  const clearRestart = useCallback((msg: string) => {
    restartRequestedAt.current = null;
    sawUnavailable.current = false;
    stopCountdown();
    if (fallbackTimer.current) {
      clearTimeout(fallbackTimer.current);
      fallbackTimer.current = null;
    }
    setStatusMsg(msg);
    setIsExecuting(false);
    setTimeout(() => setStatusMsg(null), 5000);
  }, [stopCountdown]);

  // Reactive listener to cancel/complete countdown when server state changes
  useEffect(() => {
    if (!countdown) return;

    if ((countdown.action === 'wake' || countdown.action === 'restart') && isOnline && sawUnavailable.current) {
      stopCountdown();
      clearRestart('Server is online and healthy.');
    } else if (countdown.action === 'shutdown' && !isOnline) {
      stopCountdown();
      setStatusMsg('Server shutdown complete. Host is now offline.');
      setIsExecuting(false);
      setTimeout(() => setStatusMsg(null), 5000);
    }
  }, [countdown, isOnline, clearRestart, stopCountdown]);

  useEffect(() => {
    if (restartRequestedAt.current === null) return;

    if (health.status === 'UNAVAILABLE' || health.status === 'OFFLINE' || info.status === 'OFFLINE') {
      sawUnavailable.current = true;
      return;
    }

    if (isOnline) {
      if (sawUnavailable.current) {
        // Classic path: went down, came back
        clearRestart('Server successfully restarted.');
        return;
      }

      // Fast-reboot path: server bounced faster than polling detected
      const elapsed = Date.now() - restartRequestedAt.current;
      if (elapsed > 10_000) {
        clearRestart('Server successfully restarted.');
      }
    }
  }, [health.status, health.lastUpdated, info.status, info.lastUpdated, isOnline, clearRestart]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  const handleWake = async () => {
    if (isExecuting || isOnline) return;
    if (!confirm('Wake Server?')) return;
    setIsExecuting(true);
    setStatusMsg('Broadcasting wake packet to ESP32...');
    startCountdown('wake', 30, 'ESP32 waking server node');
    incrementCount('wake');
    
    let eventId: string | null = null;
    try {
      if (user?.id && !user.id.startsWith('dev-admin')) {
        try {
          eventId = await powerState.recordPowerEvent('wake', user.id, 'Wake request initiated from dashboard');
        } catch (auditErr) {
          console.warn('[QuickActions] Audit log failed (proceeding with wake):', auditErr);
        }
      }

      const token = await getIdToken();
      const res = await powerService.wakeServer(token);
      
      if (eventId) {
        try {
          await powerState.updatePowerEventStatus(eventId, 'sent', 'Wake request successfully sent to WOL service');
        } catch (_) {}
      }
      
      setStatusMsg(res.message || 'Wake request sent! ESP32 broadcasting WOL packet.');
    } catch (e: any) {
      stopCountdown();
      if (eventId) {
        try {
          await powerState.updatePowerEventStatus(eventId, 'failed', e.message);
        } catch (_) {}
      }
      setStatusMsg(`Error: ${e.message}`);
      setIsExecuting(false);
      setTimeout(() => setStatusMsg(null), 6000);
    }
  };

  const handleRestart = async () => {
    if (isExecuting) return;
    if (!confirm('This will restart the MΛDESH Server.')) return;
    setIsExecuting(true);
    setStatusMsg('Restart requested...');
    restartRequestedAt.current = null;
    sawUnavailable.current = false;
    startCountdown('restart', 45, 'Rebooting system... Connection will drop');
    incrementCount('restart');
    
    let eventId: string | null = null;
    try {
      if (user?.id) {
        eventId = await powerState.recordPowerEvent('restart', user.id, 'Restart request initiated from dashboard');
      }

      const token = await getIdToken();
      await apiClient.post('/power/restart', {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (eventId) {
        await powerState.updatePowerEventStatus(eventId, 'sent', 'Restart API called successfully');
      }

      restartRequestedAt.current = Date.now();
      setStatusMsg('Restarting... Connection will be lost temporarily.');

      // Absolute fallback: clear after 60s no matter what
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
      fallbackTimer.current = window.setTimeout(() => {
        if (restartRequestedAt.current !== null) {
          clearRestart('Restart timed out — check server status.');
        }
      }, 60_000);
    } catch (e: any) {
      stopCountdown();
      if (eventId) {
        await powerState.updatePowerEventStatus(eventId, 'failed', e.message);
      }
      setStatusMsg(`Error: ${e.message}`);
      setIsExecuting(false);
      restartRequestedAt.current = null;
      setTimeout(() => setStatusMsg(null), 5000);
    }
  };

  const handleShutdown = async () => {
    if (isExecuting) return;
    if (!confirm('This will power off the MΛDESH Server.')) return;
    setIsExecuting(true);
    setStatusMsg('Shutdown requested...');
    startCountdown('shutdown', 15, 'Operating system shutting down');
    incrementCount('shutdown');
    
    let eventId: string | null = null;
    try {
      if (user?.id) {
        eventId = await powerState.recordPowerEvent('shutdown', user.id, 'Shutdown request initiated from dashboard');
      }

      const token = await getIdToken();
      await apiClient.post('/power/shutdown', {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (eventId) {
        await powerState.updatePowerEventStatus(eventId, 'sent', 'Shutdown API called successfully');
      }
      
      setStatusMsg('Server shutting down. Connection will be lost.');
      
      // Re-enable actions after 5 seconds so the user can use the Wake button later
      setTimeout(() => {
        setIsExecuting(false);
      }, 5000);
    } catch (e: any) {
      stopCountdown();
      if (eventId) {
        await powerState.updatePowerEventStatus(eventId, 'failed', e.message);
      }
      setStatusMsg(`Error: ${e.message}`);
      setIsExecuting(false);
      setTimeout(() => setStatusMsg(null), 5000);
    }
  };

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 mb-6">
      {/* Header with Title & Active Countdown Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h3 className="text-xs font-medium text-[#8C8C8C] uppercase tracking-[0.04em] flex items-center gap-2">
          Quick Server Actions
        </h3>
        
        <div className="flex flex-wrap items-center gap-3">
          {statusMsg && (
            <span className="text-xs text-[#ECECEC] font-medium animate-fade-in">{statusMsg}</span>
          )}
          {countdown && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs">
              <span className="w-2 h-2 rounded-full bg-[#FBBF24] animate-ping" />
              <span className="text-[#ECECEC] font-mono font-bold">{countdown.secondsLeft}s</span>
              <span className="text-[#8C8C8C] truncate">{countdown.label}</span>
            </div>
          )}
        </div>
      </div>

      {/* Active Countdown Progress Bar */}
      {countdown && (
        <div className="mb-4">
          <div className="h-1 w-full bg-[#2A2A2A] rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${(countdown.secondsLeft / countdown.totalSeconds) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Buttons with Counters */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2.5 sm:gap-3">
        {/* Wake Server Button */}
        <button 
          disabled={isExecuting || isOnline} 
          onClick={handleWake} 
          title={isOnline ? 'Server is already online' : undefined}
          className={`flex items-center justify-center gap-2.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
            isOnline 
              ? 'bg-[#141414] text-[#8C8C8C]/50 border border-[#2A2A2A] cursor-not-allowed' 
              : 'bg-white text-[#0A0A0A] hover:bg-neutral-200 shadow-sm active:scale-[0.98]'
          }`}
        >
          {countdown?.action === 'wake' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isExecuting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Zap className="w-3.5 h-3.5 text-[#FBBF24]" />
          )}
          <span>{countdown?.action === 'wake' ? `Waking (${countdown.secondsLeft}s)` : 'Wake Server'}</span>
          <span 
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md border ${
              isOnline 
                ? 'bg-[#1A1A1A] text-[#8C8C8C] border-[#2A2A2A]' 
                : 'bg-black/10 text-[#0A0A0A] border-black/15 font-bold'
            }`}
            title={`Wake has been triggered ${counts.wake} times`}
          >
            {counts.wake}
          </span>
        </button>

        {/* Restart Button */}
        <button 
          disabled={isExecuting || !isOnline} 
          onClick={handleRestart} 
          className="flex items-center justify-center gap-2.5 px-4 py-2 bg-[#1A1A1A] hover:bg-[#222222] disabled:opacity-40 disabled:cursor-not-allowed text-[#ECECEC] border border-[#2A2A2A] rounded-xl text-xs font-medium transition-all duration-150 active:scale-[0.98] cursor-pointer"
        >
          {countdown?.action === 'restart' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ECECEC]" />
          ) : isExecuting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RotateCcw className="w-3.5 h-3.5" />
          )}
          <span>{countdown?.action === 'restart' ? `Restarting (${countdown.secondsLeft}s)` : 'Restart'}</span>
          <span 
            className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-[#141414] text-[#8C8C8C] border border-[#2A2A2A]"
            title={`Restart has been triggered ${counts.restart} times`}
          >
            {counts.restart}
          </span>
        </button>

        {/* Shutdown Button */}
        <button 
          disabled={isExecuting || !isOnline} 
          onClick={handleShutdown} 
          className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2.5 px-4 py-2 bg-[#1A1A1A] hover:bg-[#F87171]/10 disabled:opacity-40 disabled:cursor-not-allowed text-[#F87171] border border-[#F87171]/30 rounded-xl text-xs font-medium transition-all duration-150 active:scale-[0.98] cursor-pointer"
        >
          {countdown?.action === 'shutdown' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F87171]" />
          ) : isExecuting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Power className="w-3.5 h-3.5" />
          )}
          <span>{countdown?.action === 'shutdown' ? `Shutting down (${countdown.secondsLeft}s)` : 'Shutdown'}</span>
          <span 
            className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-[#F87171]/10 text-[#F87171] border border-[#F87171]/20 font-semibold"
            title={`Shutdown has been triggered ${counts.shutdown} times`}
          >
            {counts.shutdown}
          </span>
        </button>
      </div>
    </div>
  );
}