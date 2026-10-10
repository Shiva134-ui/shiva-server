import { useState, useEffect, useCallback } from 'react';
import { Cpu, RefreshCw, Zap, Wifi, Radio, Clock, ShieldCheck, AlertCircle, RotateCcw, Activity, Edit3 } from 'lucide-react';
import { powerService, type Esp32EventsResponse, type PowerScheduleConfig } from '../services/powerService';
import PageLoader from '../components/ui/PageLoader';
import ErrorState from '../components/ui/ErrorState';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { useToast } from '../components/ui/ToastContext';

export default function PowerEsp32() {
  const { addToast } = useToast();
  const [data, setData] = useState<Esp32EventsResponse | null>(null);
  const [config, setConfig] = useState<PowerScheduleConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Edit policy modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [masterEnabled, setMasterEnabled] = useState(true);
  const [dailyStartEnabled, setDailyStartEnabled] = useState(false);
  const [startTime, setStartTime] = useState('08:00');
  const [dailyShutdownEnabled, setDailyShutdownEnabled] = useState(false);
  const [shutdownTime, setShutdownTime] = useState('00:00');
  const [restorationDelay, setRestorationDelay] = useState(25);
  const [autoResumeOnOutage, setAutoResumeOnOutage] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [eventsRes, configRes] = await Promise.all([
        powerService.getEsp32Events(),
        powerService.getPowerConfig().catch(() => null)
      ]);
      setData(eventsRes);
      if (configRes) {
        setConfig(configRes);
        setMasterEnabled(configRes.masterEnabled ?? true);
        setDailyStartEnabled(configRes.dailyStartEnabled ?? false);
        setStartTime(configRes.startTime || '08:00');
        setDailyShutdownEnabled(configRes.dailyShutdownEnabled ?? false);
        setShutdownTime(configRes.shutdownTime || '00:00');
        setRestorationDelay(configRes.restorationDelay ?? 25);
        setAutoResumeOnOutage((configRes as any).autoResumeOnOutage ?? (eventsRes?.esp32Relay as any)?.autoResumeOnOutage ?? false);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load ESP32 relay activity'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleWakePacket = async () => {
    setActionLoading(true);
    try {
      const res = await powerService.wakeServer();
      addToast({
        title: 'Wake-on-LAN Broadcasted',
        message: res.message || 'Magic packet dispatched to server MAC address',
        type: 'success'
      });
    } catch (err: any) {
      addToast({
        title: 'Wake Broadcast Failed',
        message: err.message || 'Could not send WOL magic packet',
        type: 'error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const updated = await powerService.updatePowerConfig({
        masterEnabled,
        dailyStartEnabled,
        startTime,
        dailyShutdownEnabled,
        shutdownTime,
        restorationDelay: Number(restorationDelay),
        autoResumeOnOutage,
        restorePowerAction: autoResumeOnOutage ? 'policy' : 'ignore',
        allowedWakeWindowStart: startTime || '08:00',
        allowedWakeWindowEnd: shutdownTime || '23:59'
      } as any);
      setConfig(updated);
      setShowEditModal(false);
      addToast({
        title: 'Policy Saved',
        message: 'Power automation policy updated successfully!',
        type: 'success'
      });
      loadData();
    } catch (err: any) {
      addToast({
        title: 'Policy Update Failed',
        message: err.message || 'Unknown error occurred while saving policy',
        type: 'error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const relay = data?.esp32Relay;
  const events = data?.events || [];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#8C8C8C] mb-1 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-[#8C8C8C]" /> Hardware & Power
          </div>
          <h1 className="text-2xl font-normal font-serif text-[#ECECEC] tracking-tight">ESP32 Wake-on-LAN Controller</h1>
          <p className="text-xs text-[#8C8C8C] mt-1 max-w-2xl">
            Hardware Wi-Fi relay telemetry, magic packet broadcast profiles, power loss detection, and state engine logs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleWakePacket}
            disabled={actionLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] hover:bg-[#222222] hover:border-emerald-500/40 px-3.5 py-2 text-xs font-medium text-[#ECECEC] shadow-sm transition active:scale-[0.98] disabled:opacity-50"
            title="Dispatch Wake-on-LAN magic packet to server"
          >
            <Zap className="h-3.5 w-3.5 text-emerald-400" />
            <span>Broadcast Wake</span>
          </button>
          <button
            onClick={() => setShowEditModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] hover:bg-[#222222] px-3.5 py-2 text-xs font-medium text-[#ECECEC] transition active:scale-[0.98]"
          >
            <Edit3 className="h-3.5 w-3.5 text-[#8C8C8C]" />
            <span>Configure Policy</span>
          </button>
          <button
            onClick={loadData}
            disabled={loading || actionLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] hover:bg-[#222222] px-3 py-2 text-xs font-medium text-[#ECECEC] transition active:scale-[0.98] disabled:opacity-50"
            title="Refresh ESP32 telemetry"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#8C8C8C] ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Loading & Error States */}
      {loading && !data && <PageLoader />}
      {error && !loading && <ErrorState title="Failed to load ESP32 data" message={error.message} onRetry={loadData} />}

      {relay && (
        <div className="space-y-6">
          {/* Metrics Row */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 2xl:gap-6">
            <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-3.5 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between text-xs text-[#8C8C8C]">
                <span>Relay Hardware State</span>
                <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
              </div>
              <div className="mt-2 text-lg sm:text-xl font-normal font-mono text-emerald-400 capitalize truncate">
                {relay.status || 'Active'}
              </div>
              <p className="mt-1 text-[11px] text-[#8C8C8C] truncate">Hardware relay linked</p>
            </div>

            <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-3.5 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between text-xs text-[#8C8C8C]">
                <span>Last State Reason</span>
                <Clock className="h-4 w-4 text-sky-400" />
              </div>
              <div className="mt-2 text-base sm:text-lg font-normal font-mono text-[#ECECEC] truncate" title={relay.lastShutdownReason}>
                {relay.lastShutdownReason || 'None'}
              </div>
              <p className="mt-1 text-[11px] text-[#8C8C8C] truncate">Power engine event</p>
            </div>

            <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-3.5 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between text-xs text-[#8C8C8C]">
                <span>WOL Magic Packets</span>
                <Zap className="h-4 w-4 text-amber-400" />
              </div>
              <div className="mt-2 text-lg sm:text-xl font-normal font-mono text-[#ECECEC] truncate">
                {relay.wolRetryCount ?? 3} bursts
              </div>
              <p className="mt-1 text-[11px] text-[#8C8C8C] truncate">{relay.wolRetryInterval ?? 30}s interval</p>
            </div>

            <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-3.5 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between text-xs text-[#8C8C8C]">
                <span>Power Loss Protection</span>
                <ShieldCheck className="h-4 w-4 text-purple-400" />
              </div>
              <div className="mt-2 text-lg sm:text-xl font-normal font-mono text-[#ECECEC] capitalize truncate">
                {(relay as any).autoResumeOnOutage ? 'Auto-Resume' : (relay.restorePowerAction || 'Hold Off')}
              </div>
              <p className="mt-1 text-[11px] text-[#8C8C8C] truncate">
                {(relay as any).autoResumeOnOutage ? 'Sensors armed' : (relay.powerLossDetection ? 'Sensors armed' : 'Disabled')}
              </p>
            </div>
          </div>

          {/* Controller & Automation Details Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Target Machine WOL Hardware Profile */}
            <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#ECECEC] border-b border-[#2A2A2A] pb-3">
                <Wifi className="h-4 w-4 text-[#8C8C8C]" />
                <span>Target Host Hardware Profile</span>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#8C8C8C]">Target Hostname / IP</span>
                  <span className="font-mono font-medium text-[#ECECEC] bg-[#0F0F0F] px-2.5 py-1 rounded-lg border border-[#2A2A2A]">
                    {relay.targetHost}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8C8C8C]">Target NIC MAC Address</span>
                  <span className="font-mono font-medium text-[#4ADE80] bg-[#4ADE80]/10 border border-[#4ADE80]/30 px-2.5 py-1 rounded-lg">
                    {relay.macAddress}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8C8C8C]">Relay Architecture</span>
                  <span className="font-medium text-[#ECECEC]">ESP32-WROOM-32 2.4GHz Wi-Fi</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8C8C8C]">WOL Broadcast Port</span>
                  <span className="font-mono text-[#8C8C8C]">UDP Port 9 (Subnet broadcast)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8C8C8C]">Wake Injection Protocol</span>
                  <span className="font-medium text-[#8C8C8C]">Raw Magic Packet (6x 0xFF + 16x MAC)</span>
                </div>
              </div>
            </div>

            {/* Power Policy & Schedule */}
            <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#ECECEC]">
                  <Activity className="h-4 w-4 text-[#4ADE80]" />
                  <span>Power Automation Policies</span>
                </div>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="text-xs text-[#ECECEC] hover:underline flex items-center gap-1"
                >
                  <Edit3 className="h-3 w-3 text-[#8C8C8C]" /> Edit
                </button>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#8C8C8C]">Master Schedule Engine</span>
                  <Badge variant={config?.masterEnabled ? 'success' : 'default'}>
                    {config?.masterEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8C8C8C]">Wake Time Window</span>
                  <span className="font-mono text-[#ECECEC]">
                    {config?.allowedWakeWindowStart || '08:00'} - {config?.allowedWakeWindowEnd || '23:59'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8C8C8C]">Scheduled Daily Boot</span>
                  <span className="font-mono text-[#8C8C8C]">
                    {config?.dailyStartEnabled ? `Enabled at ${config.startTime}` : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8C8C8C]">Scheduled Daily Shutdown</span>
                  <span className="font-mono text-[#8C8C8C]">
                    {config?.dailyShutdownEnabled ? `Enabled at ${config.shutdownTime}` : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8C8C8C]">Restoration Delay</span>
                  <span className="font-mono text-[#ECECEC]">
                    {config?.restorationDelay || 25}s line stabilization
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Activity / Event Log */}
          <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between bg-[#0F0F0F]">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#ECECEC]">
                <RotateCcw className="h-4 w-4 text-[#8C8C8C]" />
                <span>ESP32 Relay & Power Event History</span>
              </div>
              <span className="text-xs text-[#8C8C8C] font-mono">{events.length} logged events</span>
            </div>

            {events.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8C8C8C] space-y-2">
                <AlertCircle className="h-5 w-5 mx-auto text-[#8C8C8C] opacity-50" />
                <p>No unexpected power loss or recent wake events recorded.</p>
                <p className="text-[11px] text-[#8C8C8C]">Hardware relay is synchronized with the server power engine.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#2A2A2A] bg-[#0F0F0F] text-[#8C8C8C] uppercase tracking-wider font-semibold text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Event</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2A2A]/60">
                    {events.map((evt, idx) => (
                      <tr key={idx} className="hover:bg-[#222222]/40 transition">
                        <td className="px-4 py-3 font-mono text-[#8C8C8C]">
                          {new Date(evt.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-medium text-[#ECECEC] capitalize">
                          {evt.type}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={evt.status === 'sent' ? 'success' : evt.status === 'failed' ? 'error' : 'default'}>
                            {evt.status || 'recorded'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-mono text-[#8C8C8C]">
                          {evt.source || 'esp32'}
                        </td>
                        <td className="px-4 py-3 text-[#8C8C8C]">
                          {evt.message || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Policy Modal */}
      {showEditModal && (
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Configure Power Automation Policy"
        >
          <form onSubmit={handleSavePolicy} className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#2A2A2A] bg-[#0F0F0F]">
              <div>
                <p className="text-xs font-medium text-[#ECECEC]">Master Schedule Engine</p>
                <p className="text-[11px] text-[#8C8C8C]">Enable automatic daily boot and shutdown</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={masterEnabled}
                  onChange={(e) => setMasterEnabled(e.target.checked)}
                />
                <div className="w-10 h-5 bg-[#2A2A2A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white peer-checked:after:bg-[#0A0A0A]"></div>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#ECECEC]">Daily Boot (WOL)</span>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={dailyStartEnabled}
                      onChange={(e) => setDailyStartEnabled(e.target.checked)}
                    />
                    <div className="w-10 h-5 bg-[#2A2A2A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white peer-checked:after:bg-[#0A0A0A]"></div>
                  </label>
                </div>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={!dailyStartEnabled}
                  className="w-full px-2.5 py-1.5 bg-[#141414] border border-[#2A2A2A] rounded-lg text-xs text-[#ECECEC] font-mono disabled:opacity-40 focus:outline-none focus:border-[#ECECEC]/40"
                />
              </div>

              <div className="p-3.5 rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#ECECEC]">Daily Shutdown</span>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={dailyShutdownEnabled}
                      onChange={(e) => setDailyShutdownEnabled(e.target.checked)}
                    />
                    <div className="w-10 h-5 bg-[#2A2A2A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white peer-checked:after:bg-[#0A0A0A]"></div>
                  </label>
                </div>
                <input
                  type="time"
                  value={shutdownTime}
                  onChange={(e) => setShutdownTime(e.target.value)}
                  disabled={!dailyShutdownEnabled}
                  className="w-full px-2.5 py-1.5 bg-[#141414] border border-[#2A2A2A] rounded-lg text-xs text-[#ECECEC] font-mono disabled:opacity-40 focus:outline-none focus:border-[#ECECEC]/40"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#2A2A2A] bg-[#0F0F0F]">
              <div>
                <p className="text-xs font-medium text-[#ECECEC]">Outage Auto-Resume</p>
                <p className="text-[11px] text-[#8C8C8C]">ESP32 automatically wakes server when AC returns during daytime hours</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={autoResumeOnOutage}
                  onChange={(e) => setAutoResumeOnOutage(e.target.checked)}
                />
                <div className="w-10 h-5 bg-[#2A2A2A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white peer-checked:after:bg-[#0A0A0A]"></div>
              </label>
            </div>

            <div className="p-3.5 rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] space-y-1.5">
              <label className="block text-xs font-medium text-[#ECECEC]">
                AC Line Stabilization Delay (Seconds)
              </label>
              <p className="text-[11px] text-[#8C8C8C]">
                Buffer time after grid power returns to allow line voltage and Wi-Fi router to stabilize before sending WOL.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={restorationDelay}
                  onChange={(e) => setRestorationDelay(Number(e.target.value))}
                  className="w-28 px-3 py-1.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-xs text-[#ECECEC] font-mono focus:outline-none focus:border-[#ECECEC]/40"
                />
                <span className="text-xs text-[#8C8C8C] font-mono">seconds (recommended: 25s)</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#2A2A2A]">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-3.5 py-2 rounded-xl border border-[#2A2A2A] bg-[#141414] text-xs font-medium text-[#ECECEC] hover:bg-[#222222] transition active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-white text-[#0A0A0A] text-xs font-semibold hover:bg-neutral-200 transition shadow-sm active:scale-[0.98] disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Save Policy'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
