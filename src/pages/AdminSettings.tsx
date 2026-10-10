import { useState, useEffect } from 'react';
import {
  Sliders,
  Bell,
  Zap,
  Globe,
  Database,
  Save,
  RotateCcw,
  Thermometer,
  Activity,
  HardDrive,
  CheckCircle2,
  Radio,
  Clock,
  Sparkles,
  Send,
  AlertCircle
} from 'lucide-react';
import { useToast } from '../components/ui/ToastContext';
import { powerService } from '../services/powerService';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';

export interface AppSettings {
  // General & Interface
  pollingIntervalSeconds: number;
  tempUnit: 'celsius' | 'fahrenheit';
  defaultRoute: string;
  compactLists: boolean;
  audibleAlerts: boolean;

  // Alerts & Thresholds
  cpuAlertThreshold: number;
  ramAlertThreshold: number;
  storageAlertThreshold: number;
  containerFailureAlerts: boolean;
  pushNotifications: boolean;

  // Power & Electricity
  electricityTariff: number;
  estimatedWattage: number;
  currencySymbol: string;
  shutdownWarningMinutes: number;

  // Network & Wake-on-LAN
  wolMacAddress: string;
  wolPort: number;
  apiBaseUrl: string;

  // Maintenance & Buffers
  logBufferLines: number;
  dockerRefreshInterval: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  pollingIntervalSeconds: 5,
  tempUnit: 'celsius',
  defaultRoute: '/dashboard',
  compactLists: false,
  audibleAlerts: false,

  cpuAlertThreshold: 85,
  ramAlertThreshold: 85,
  storageAlertThreshold: 85,
  containerFailureAlerts: true,
  pushNotifications: true,

  electricityTariff: 7.0,
  estimatedWattage: 50,
  currencySymbol: '₹',
  shutdownWarningMinutes: 10,

  wolMacAddress: '00:E0:22:DA:B1:67',
  wolPort: 9,
  apiBaseUrl: 'https://api.madesh.in/api/v1',

  logBufferLines: 250,
  dockerRefreshInterval: 20
};

const STORAGE_KEY = 'madesh_server_user_settings';

export default function AdminSettings() {
  const { addToast } = useToast();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<'general' | 'alerts' | 'power' | 'network' | 'maintenance'>('general');
  const [saving, setSaving] = useState(false);
  const [testingWol, setTestingWol] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  // Load persisted settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      }
    } catch (e) {
      console.warn('Could not read user settings from storage:', e);
    }

    // Also fetch live backend power & electricity tariff config
    powerService
      .getElectricityConfig()
      .then((cfg: any) => {
        if (cfg && typeof cfg.tariff === 'number') {
          setSettings((prev) => ({
            ...prev,
            electricityTariff: cfg.tariff,
            estimatedWattage: cfg.estimatedWattage || prev.estimatedWattage
          }));
        }
      })
      .catch((err) => console.warn('Could not load remote electricity config:', err));
  }, []);

  const handleChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Save to browser localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

      // 2. Persist electricity tariff to backend
      await powerService.updateElectricityConfig({
        tariff: settings.electricityTariff,
        estimatedWattage: settings.estimatedWattage
      });

      addToast({
        title: 'Settings Saved',
        message: 'System preferences and electricity tariffs updated successfully.',
        type: 'success'
      });
    } catch (err: any) {
      addToast({
        title: 'Save Partial Warning',
        message: err.message || 'Saved locally, but remote server update encountered an issue.',
        type: 'warning'
      });
    } finally {
      setSaving(false);
    }
  };

  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const handleExecuteResetDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(STORAGE_KEY);
    addToast({
      title: 'Defaults Restored',
      message: 'All settings have been reset to system defaults.',
      type: 'info'
    });
    setResetConfirmOpen(false);
  };

  const handleClearCache = () => {
    try {
      sessionStorage.clear();
      addToast({
        title: 'Cache Cleared',
        message: 'Session metric cache and temporary storage flushed.',
        type: 'success'
      });
    } catch {
      // ignore
    }
  };

  const handleRequestPushPermission = async () => {
    if (typeof Notification === 'undefined') {
      addToast({
        title: 'Unsupported',
        message: 'Desktop notifications are not supported in this browser.',
        type: 'warning'
      });
      return;
    }
    const perm = await Notification.requestPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      new Notification('MΛDESH Server Control', {
        body: 'Desktop alert notifications are active and ready.',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png'
      });
      addToast({
        title: 'Notifications Enabled',
        message: 'Desktop push notifications granted.',
        type: 'success'
      });
    } else {
      addToast({
        title: 'Permission Denied',
        message: 'Browser notifications were not granted.',
        type: 'warning'
      });
    }
  };

  const handleTestWol = async () => {
    setTestingWol(true);
    try {
      const res = await powerService.wakeServer();
      addToast({
        title: 'Magic Packet Sent',
        message: res.message || `WOL broadcast transmitted to ${settings.wolMacAddress}`,
        type: 'success'
      });
    } catch (err: any) {
      addToast({
        title: 'WOL Broadcast Failed',
        message: err.message || 'Could not send wake packet.',
        type: 'error'
      });
    } finally {
      setTestingWol(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-[#2A2A2A] pb-5">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#8C8C8C] mb-1 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#8C8C8C]" /> Administration & Control
          </div>
          <h1 className="text-2xl font-normal font-serif text-[#ECECEC] tracking-tight">System Settings & Preferences</h1>
          <p className="mt-1 text-xs text-[#8C8C8C] max-w-2xl">
            Configure telemetry polling rates, alert thresholds, electricity tariffs, and dashboard behavior.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setResetConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-3.5 py-2 text-xs text-[#8C8C8C] hover:text-[#ECECEC] transition hover:bg-[#222222] cursor-pointer"
            title="Reset all settings to default"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-[#0A0A0A] transition hover:bg-neutral-200 disabled:opacity-50 shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <Save className={`h-3.5 w-3.5 ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </header>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-[#2A2A2A] pb-3 overflow-x-auto scrollbar-none min-w-0">
        {[
          { id: 'general', label: 'General & Interface', icon: Sliders },
          { id: 'alerts', label: 'Alerts & Thresholds', icon: Bell },
          { id: 'power', label: 'Power & Electricity', icon: Zap },
          { id: 'network', label: 'Network & Ingress', icon: Globe },
          { id: 'maintenance', label: 'Data & Maintenance', icon: Database }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs transition cursor-pointer shrink-0 whitespace-nowrap active:scale-95 ${
                isActive
                  ? 'bg-white text-[#0A0A0A] font-semibold shadow-sm'
                  : 'text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#1A1A1A] border border-transparent'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: General & Interface */}
      {activeTab === 'general' && (
        <div className="grid gap-6 md:grid-cols-2 animate-fade-in">
          <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-[#ECECEC] border-b border-[#2A2A2A] pb-3">
              <Activity className="h-4 w-4 text-[#8C8C8C]" />
              <span>Telemetry Polling Frequency</span>
            </div>
            <p className="text-xs text-[#8C8C8C]">
              Choose how frequently the dashboard requests live CPU, RAM, and network statistics from the server.
            </p>
            <div className="space-y-2">
              {[
                { val: 2, label: 'Real-time (2s)', desc: 'Instantaneous telemetry updates (higher network usage)' },
                { val: 5, label: 'Balanced (5s) — Recommended', desc: 'Standard balance between responsiveness and load' },
                { val: 10, label: 'Low Frequency (10s)', desc: 'Minimal telemetry polling for background tabs' }
              ].map((opt) => (
                <label
                  key={opt.val}
                  className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                    settings.pollingIntervalSeconds === opt.val
                      ? 'border-white/30 bg-white/5 text-[#ECECEC]'
                      : 'border-[#2A2A2A] bg-[#0F0F0F] hover:bg-[#222222]/50 text-[#8C8C8C]'
                  }`}
                >
                  <input
                    type="radio"
                    name="pollingInterval"
                    value={opt.val}
                    checked={settings.pollingIntervalSeconds === opt.val}
                    onChange={() => handleChange('pollingIntervalSeconds', opt.val)}
                    className="mt-0.5 accent-white cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-medium text-[#ECECEC]">{opt.label}</div>
                    <div className="text-[11px] text-[#8C8C8C] mt-0.5">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-[#ECECEC] border-b border-[#2A2A2A] pb-3">
              <Thermometer className="h-4 w-4 text-[#8C8C8C]" />
              <span>Display Units & Default Route</span>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[#8C8C8C] mb-1.5 font-medium">Temperature Scale</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleChange('tempUnit', 'celsius')}
                    className={`py-2 px-3 rounded-xl border text-xs transition cursor-pointer ${
                      settings.tempUnit === 'celsius'
                        ? 'border-white/30 bg-white/10 text-[#ECECEC] font-medium'
                        : 'border-[#2A2A2A] bg-[#0F0F0F] text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222]'
                    }`}
                  >
                    Celsius (°C)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('tempUnit', 'fahrenheit')}
                    className={`py-2 px-3 rounded-xl border text-xs transition cursor-pointer ${
                      settings.tempUnit === 'fahrenheit'
                        ? 'border-white/30 bg-white/10 text-[#ECECEC] font-medium'
                        : 'border-[#2A2A2A] bg-[#0F0F0F] text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222]'
                    }`}
                  >
                    Fahrenheit (°F)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[#8C8C8C] mb-1.5 font-medium">Default Landing Route</label>
                <select
                  value={settings.defaultRoute}
                  onChange={(e) => handleChange('defaultRoute', e.target.value)}
                  className="w-full rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-xs text-[#ECECEC] focus:border-white/30 focus:outline-none cursor-pointer"
                >
                  <option value="/dashboard">Main Dashboard (/dashboard)</option>
                  <option value="/system-overview">System Overview (/system-overview)</option>
                  <option value="/docker-containers">Docker Containers (/docker-containers)</option>
                  <option value="/monitoring-metrics">Monitoring Metrics (/monitoring-metrics)</option>
                </select>
                <p className="text-[11px] text-[#8C8C8C] mt-1">Page displayed when navigating to root URL.</p>
              </div>

              <div className="pt-2 border-t border-[#2A2A2A] space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="font-medium text-[#ECECEC]">Compact List Layout</div>
                    <div className="text-[11px] text-[#8C8C8C]">Dense table rows for container and process listings</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.compactLists}
                    onChange={(e) => handleChange('compactLists', e.target.checked)}
                    className="h-4 w-4 rounded border-[#2A2A2A] accent-white cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="font-medium text-[#ECECEC]">Audible Critical Alerts</div>
                    <div className="text-[11px] text-[#8C8C8C]">Play alert chime when a critical server error occurs</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.audibleAlerts}
                    onChange={(e) => handleChange('audibleAlerts', e.target.checked)}
                    className="h-4 w-4 rounded border-[#2A2A2A] accent-white cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Alerts & Thresholds */}
      {activeTab === 'alerts' && (
        <div className="grid gap-6 md:grid-cols-2 animate-fade-in">
          <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 sm:p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-[#ECECEC] border-b border-[#2A2A2A] pb-3">
              <Bell className="h-4 w-4 text-[#8C8C8C]" />
              <span>Resource Utilization Warning Thresholds</span>
            </div>
            <p className="text-xs text-[#8C8C8C]">
              Specify thresholds that trigger warning badges and telemetry alert highlights across dashboard panels.
            </p>

            {/* CPU Threshold */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#8C8C8C] font-medium">CPU Warning Threshold</span>
                <span className="font-mono font-semibold text-[#ECECEC]">{settings.cpuAlertThreshold}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="98"
                value={settings.cpuAlertThreshold}
                onChange={(e) => handleChange('cpuAlertThreshold', Number(e.target.value))}
                className="w-full accent-white cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#8C8C8C] font-mono">
                <span>50%</span>
                <span>85% (Default)</span>
                <span>98%</span>
              </div>
            </div>

            {/* RAM Threshold */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#8C8C8C] font-medium">Memory (RAM) Warning Threshold</span>
                <span className="font-mono font-semibold text-[#ECECEC]">{settings.ramAlertThreshold}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="98"
                value={settings.ramAlertThreshold}
                onChange={(e) => handleChange('ramAlertThreshold', Number(e.target.value))}
                className="w-full accent-white cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#8C8C8C] font-mono">
                <span>50%</span>
                <span>85% (Default)</span>
                <span>98%</span>
              </div>
            </div>

            {/* Storage Threshold */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#8C8C8C] font-medium">Storage Disk Usage Warning</span>
                <span className="font-mono font-semibold text-[#ECECEC]">{settings.storageAlertThreshold}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="98"
                value={settings.storageAlertThreshold}
                onChange={(e) => handleChange('storageAlertThreshold', Number(e.target.value))}
                className="w-full accent-white cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#8C8C8C] font-mono">
                <span>50%</span>
                <span>85% (Default)</span>
                <span>98%</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 sm:p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-[#ECECEC] border-b border-[#2A2A2A] pb-3">
              <Sparkles className="h-4 w-4 text-[#8C8C8C]" />
              <span>Container & Notification Triggers</span>
            </div>

            <div className="space-y-4 text-xs">
              <label className="flex items-start justify-between gap-3 cursor-pointer">
                <div>
                  <div className="font-medium text-[#ECECEC]">Docker Container Failure Alerts</div>
                  <div className="text-[11px] text-[#8C8C8C]">
                    Display high-priority toast when any container unexpectedly exits with non-zero status
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.containerFailureAlerts}
                  onChange={(e) => handleChange('containerFailureAlerts', e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[#2A2A2A] accent-white cursor-pointer"
                />
              </label>

              <div className="pt-3 border-t border-[#2A2A2A]">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium text-[#ECECEC]">Browser Push Notifications</div>
                    <div className="text-[11px] text-[#8C8C8C]">
                      Permission status:{' '}
                      <span className="font-mono uppercase font-semibold text-[#ECECEC] ml-1">
                        {notificationPermission}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleRequestPushPermission}
                    className="py-1.5 px-3 rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] hover:bg-[#222222] text-[#ECECEC] text-xs transition cursor-pointer"
                  >
                    Request Permission
                  </button>
                </div>
                <p className="text-[11px] text-[#8C8C8C] leading-relaxed">
                  Enables OS-level toast alerts when the browser tab is minimized or in the background during power events or container failures.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Power & Electricity */}
      {activeTab === 'power' && (
        <div className="grid gap-6 md:grid-cols-2 animate-fade-in">
          <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-[#ECECEC] border-b border-[#2A2A2A] pb-3">
              <Zap className="h-4 w-4 text-[#8C8C8C]" />
              <span>Electricity Cost & Tariff Rate</span>
            </div>
            <p className="text-xs text-[#8C8C8C]">
              Configures the unit electricity tariff rate used to compute monthly electricity costs on the dashboard and power pages.
            </p>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#8C8C8C] mb-1.5 font-medium">Electricity Tariff (Rate per kWh)</label>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#ECECEC] bg-[#0F0F0F] px-3 py-2 rounded-xl border border-[#2A2A2A]">
                    {settings.currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="100"
                    value={settings.electricityTariff}
                    onChange={(e) => handleChange('electricityTariff', parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 font-mono text-[#ECECEC] focus:border-white/30 focus:outline-none"
                  />
                  <span className="text-[#8C8C8C] font-mono shrink-0">/ kWh</span>
                </div>
                <p className="text-[11px] text-[#8C8C8C] mt-1">Current default rate: ₹7.00 - ₹8.00 per unit.</p>
              </div>

              <div>
                <label className="block text-[#8C8C8C] mb-1.5 font-medium">Estimated Average Power Draw (Watts)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="5"
                    min="10"
                    max="1000"
                    value={settings.estimatedWattage}
                    onChange={(e) => handleChange('estimatedWattage', parseInt(e.target.value, 10) || 50)}
                    className="w-full rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 font-mono text-[#ECECEC] focus:border-white/30 focus:outline-none"
                  />
                  <span className="text-[#8C8C8C] font-mono shrink-0">Watts</span>
                </div>
                <p className="text-[11px] text-[#8C8C8C] mt-1">
                  Used as baseline estimation when hardware telemetry sensors are offline.
                </p>
              </div>

              <div>
                <label className="block text-[#8C8C8C] mb-1.5 font-medium">Currency Symbol</label>
                <div className="grid grid-cols-4 gap-2">
                  {['₹', '$', '€', '£'].map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => handleChange('currencySymbol', sym)}
                      className={`py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        settings.currencySymbol === sym
                          ? 'border-white/30 bg-white/10 text-[#ECECEC]'
                          : 'border-[#2A2A2A] bg-[#0F0F0F] text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222]'
                      }`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-[#ECECEC] border-b border-[#2A2A2A] pb-3">
              <Clock className="h-4 w-4 text-[#8C8C8C]" />
              <span>Automated Schedule Safeguards</span>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[#8C8C8C] mb-1.5 font-medium">Pre-Shutdown Warning Window</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={settings.shutdownWarningMinutes}
                    onChange={(e) => handleChange('shutdownWarningMinutes', parseInt(e.target.value, 10) || 10)}
                    className="w-full rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 font-mono text-[#ECECEC] focus:border-white/30 focus:outline-none"
                  />
                  <span className="text-[#8C8C8C] font-mono shrink-0">Minutes</span>
                </div>
                <p className="text-[11px] text-[#8C8C8C] mt-1">
                  Broadcasts warning toast prior to scheduled power shutdown (configured at 12:00 AM).
                </p>
              </div>

              <div className="rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-3.5 text-[11px] text-[#8C8C8C] space-y-2">
                <div className="font-medium text-[#ECECEC] flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#4ADE80]" />
                  <span>Backend Power Synchronization Active</span>
                </div>
                <p className="leading-relaxed">
                  Tariff and wattage updates will automatically persist to <code className="text-[#ECECEC] font-mono">/opt/madesh-server/api/data/electricityConfig.json</code> on save.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Network & Ingress */}
      {activeTab === 'network' && (
        <div className="grid gap-6 md:grid-cols-2 animate-fade-in">
          <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-[#ECECEC] border-b border-[#2A2A2A] pb-3">
              <Radio className="h-4 w-4 text-[#8C8C8C]" />
              <span>Wake-on-LAN (WOL) Relay Parameters</span>
            </div>
            <p className="text-xs text-[#8C8C8C]">
              Configure MAC target address and UDP broadcast port used by the Wake-on-LAN and ESP32 power relays.
            </p>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#8C8C8C] mb-1.5 font-medium">Target Server MAC Address</label>
                <input
                  type="text"
                  value={settings.wolMacAddress}
                  onChange={(e) => handleChange('wolMacAddress', e.target.value)}
                  className="w-full rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 font-mono text-[#ECECEC] focus:border-white/30 focus:outline-none"
                  placeholder="00:E0:22:DA:B1:67"
                />
              </div>

              <div>
                <label className="block text-[#8C8C8C] mb-1.5 font-medium">WOL UDP Broadcast Port</label>
                <input
                  type="number"
                  value={settings.wolPort}
                  onChange={(e) => handleChange('wolPort', parseInt(e.target.value, 10) || 9)}
                  className="w-full rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 font-mono text-[#ECECEC] focus:border-white/30 focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTestWol}
                  disabled={testingWol}
                  className="w-full py-2.5 px-3 rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] hover:bg-[#222222] text-[#ECECEC] font-medium text-xs transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Send className={`h-3.5 w-3.5 ${testingWol ? 'animate-spin' : ''}`} />
                  <span>{testingWol ? 'Broadcasting...' : 'Test Wake-on-LAN Broadcast Packet'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-[#ECECEC] border-b border-[#2A2A2A] pb-3">
              <Globe className="h-4 w-4 text-[#8C8C8C]" />
              <span>Public Cloudflare Ingress Gateway</span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#8C8C8C] mb-1.5 font-medium">API Base Endpoint</label>
                <input
                  type="text"
                  value={settings.apiBaseUrl}
                  onChange={(e) => handleChange('apiBaseUrl', e.target.value)}
                  className="w-full rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 font-mono text-[#ECECEC] focus:border-white/30 focus:outline-none"
                />
                <p className="text-[11px] text-[#8C8C8C] mt-1">
                  Production Cloudflare Tunnel ingress route for public client traffic.
                </p>
              </div>

              <div className="rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-3.5 space-y-2">
                <div className="text-[#8C8C8C] flex justify-between">
                  <span>Host Tunnel:</span>
                  <span className="font-mono text-[#ECECEC]">Cloudflare Tunnel (cloudflared)</span>
                </div>
                <div className="text-[#8C8C8C] flex justify-between">
                  <span>Internal Daemon:</span>
                  <span className="font-mono text-[#ECECEC]">127.0.0.1:3001</span>
                </div>
                <div className="text-[#8C8C8C] flex justify-between">
                  <span>Local Mesh IP:</span>
                  <span className="font-mono text-[#ECECEC]">100.79.42.30 (Tailscale)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Data & Maintenance */}
      {activeTab === 'maintenance' && (
        <div className="grid gap-6 md:grid-cols-2 animate-fade-in">
          <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-[#ECECEC] border-b border-[#2A2A2A] pb-3">
              <HardDrive className="h-4 w-4 text-[#8C8C8C]" />
              <span>Log Buffers & Docker Polling</span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#8C8C8C] mb-1.5 font-medium">System Log Buffer Lines</label>
                <select
                  value={settings.logBufferLines}
                  onChange={(e) => handleChange('logBufferLines', parseInt(e.target.value, 10))}
                  className="w-full rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-xs text-[#ECECEC] focus:border-white/30 focus:outline-none cursor-pointer"
                >
                  <option value={100}>100 Lines (Fast load)</option>
                  <option value={250}>250 Lines (Default)</option>
                  <option value={500}>500 Lines (Detailed inspection)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#8C8C8C] mb-1.5 font-medium">Backend Docker Daemon Polling</label>
                <div className="font-mono text-[#ECECEC] bg-[#0F0F0F] px-3 py-2 rounded-xl border border-[#2A2A2A] flex justify-between items-center">
                  <span>20 seconds</span>
                  <Badge variant="success">Background Mutex Active</Badge>
                </div>
                <p className="text-[11px] text-[#8C8C8C] mt-1">
                  Protects CPU cores from concurrent shellout contention while keeping 22 containers instant.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-[#ECECEC] border-b border-[#2A2A2A] pb-3">
              <Database className="h-4 w-4 text-[#8C8C8C]" />
              <span>Cache Management & Storage Purge</span>
            </div>

            <p className="text-xs text-[#8C8C8C] leading-relaxed">
              If client telemetry graphs or local states ever appear desynchronized, you can purge client-side cached data without affecting server services.
            </p>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleClearCache}
                className="w-full py-2.5 px-3 rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] hover:bg-[#222222] text-[#ECECEC] font-medium text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 text-[#8C8C8C]" />
                <span>Purge Client Metric Cache</span>
              </button>

              <button
                type="button"
                onClick={() => setResetConfirmOpen(true)}
                className="w-full py-2.5 px-3 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-[#F87171] font-medium text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Reset All Settings to Factory Defaults</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Defaults Confirm Dialog */}
      <ConfirmDialog
        isOpen={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={handleExecuteResetDefaults}
        title="Reset All Settings"
        message="Are you sure you want to restore all settings to default values? Local storage preferences will be cleared."
        confirmText="Reset Defaults"
        variant="danger"
      />
    </div>
  );
}
