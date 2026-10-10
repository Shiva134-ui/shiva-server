import { useState, useEffect } from 'react';
import {
  Bell,
  Smartphone,
  ListFilter,
  History,
  Trash2,
  Send,
  Settings,
  AlertTriangle,
  Plus,
  Sparkles,
  RefreshCw,
  Edit3
} from 'lucide-react';
import { apiClient as api } from '../services/api';
import { requestNotificationPermission } from '../services/fcm';
import { useToast } from '../components/ui/ToastContext';
import RuleEditor, { type Rule } from '../components/notifications/RuleEditor';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Badge from '../components/ui/Badge';
import { asArray, safeDate } from '../utils/safeFormat';

interface Device {
  token: string;
  name: string;
  platform: string;
  browser: string;
  active: boolean;
  lastActive: string;
}

interface NotificationConfig {
  pushNotificationsEnabled?: boolean;
  emailNotificationsEnabled?: boolean;
  emailRecipient?: string;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  minSeverity?: string;
  digestEnabled?: boolean;
  digestFrequency?: string;
  masterEnabled?: boolean;
  allowCriticalInQuietHours?: boolean;
  maxNotificationsPerHour?: number;
}

export default function Notifications() {
  const [activeTab, setActiveTab] = useState<'overview' | 'devices' | 'rules' | 'history' | 'settings'>('overview');
  const [devices, setDevices] = useState<Device[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [config, setConfig] = useState<NotificationConfig | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isApiUnavailable, setIsApiUnavailable] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [showRuleEditor, setShowRuleEditor] = useState(false);
  const [loadingPresets, setLoadingPresets] = useState(false);

  // Quick Test Push Form state
  const [testTitle, setTestTitle] = useState('MΛDESH Server  •  Status Check');
  const [testBody, setTestBody] = useState('Core telemetry active  •  Status: NOMINAL');
  const [testSeverity, setTestSeverity] = useState<'info' | 'warning' | 'critical'>('info');
  const [sendingTest, setSendingTest] = useState(false);

  // Confirm Dialog state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    onConfirm: () => {}
  });

  const fcmConfigured = !!import.meta.env.VITE_FIREBASE_VAPID_KEY;
  const { addToast } = useToast();

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    setIsRefreshing(true);
    setIsApiUnavailable(false);
    try {
      const [devRes, ruleRes, histRes, confRes] = await Promise.all([
        api.get<{ devices: Device[] }>('/notifications/devices').catch(() => ({ devices: [] })),
        api.get<{ rules: Rule[] }>('/notification-rules').catch(() => ({ rules: [] })),
        api.get<{ history: any[] }>('/notifications/history').catch(() => ({ history: [] })),
        api.get<{ config: NotificationConfig }>('/notifications/config').catch(() => ({
          config: {
            masterEnabled: true,
            quietHoursEnabled: false,
            quietHoursStart: '22:00',
            quietHoursEnd: '08:00',
            allowCriticalInQuietHours: true
          }
        }))
      ]);
      setDevices(asArray(devRes?.devices));
      setRules(asArray(ruleRes?.rules));
      setHistory(asArray(histRes?.history));
      setConfig(confRes?.config || null);
    } catch (err: any) {
      console.error(err);
      if (err.status === 404 || err.status === 401) {
        setIsApiUnavailable(true);
      } else {
        addToast({ title: 'Error fetching notification data', type: 'error' });
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const enableNotifications = async () => {
    if (!fcmConfigured) {
      addToast({ title: 'FCM not configured in env', message: 'VITE_FIREBASE_VAPID_KEY is missing.', type: 'error' });
      return;
    }
    const token = await requestNotificationPermission();
    if (token) {
      addToast({ title: 'Notifications Enabled', message: 'This device is now registered to receive live alerts.', type: 'success' });
      fetchData();
    } else {
      addToast({ title: 'Permission Denied or Failed', message: 'Browser notification permission was not granted.', type: 'error' });
    }
  };

  const handleRemoveDevice = (token: string, deviceName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove Registered Device',
      message: `Are you sure you want to deregister "${deviceName}"? It will no longer receive push notifications.`,
      confirmText: 'Remove Device',
      onConfirm: async () => {
        try {
          await api.delete(`/notifications/device/${token}`);
          setDevices((prev) => prev.filter((d) => d.token !== token));
          addToast({ title: 'Device Removed', type: 'success' });
        } catch (err: any) {
          addToast({ title: 'Failed to remove device', message: err.message, type: 'error' });
        }
      }
    });
  };

  const handleSendTestPush = async () => {
    setSendingTest(true);
    try {
      const finalTitle = testTitle.trim() || 'MΛDESH Server  •  Status Check';
      const finalBody = testBody.trim() || 'Core telemetry active  •  Status: NOMINAL';

      const res = await api.post<{ success: boolean; result: string }>('/notifications/test', {
        title: finalTitle,
        body: finalBody,
        severity: testSeverity
      });

      // Show immediate desktop notification if permission granted with black 'M' monogram
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(finalTitle, {
            body: finalBody,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
            tag: 'madesh-test-alert'
          });
        } catch (_) {}
      }

      addToast({
        title: 'Test Notification Sent',
        message: res.result || 'Notification dispatched to registered endpoints.',
        type: 'success'
      });
      fetchData();
    } catch (err: any) {
      addToast({ title: 'Error sending test', message: err.message, type: 'error' });
    } finally {
      setSendingTest(false);
    }
  };

  const handleSaveRule = async (rule: Rule) => {
    try {
      if (rule.id) {
        await api.put(`/notification-rules/${rule.id}`, rule);
        addToast({ title: 'Rule Updated', message: `Rule "${rule.name}" saved.`, type: 'success' });
      } else {
        await api.post('/notification-rules', rule);
        addToast({ title: 'Rule Created', message: `Rule "${rule.name}" added to monitoring.`, type: 'success' });
      }
      setShowRuleEditor(false);
      setEditingRule(null);
      fetchData();
    } catch (err: any) {
      addToast({ title: 'Error saving rule', message: err.message, type: 'error' });
    }
  };

  const handleDeleteRule = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Notification Rule',
      message: `Are you sure you want to permanently delete rule "${name}"?`,
      confirmText: 'Delete Rule',
      onConfirm: async () => {
        try {
          await api.delete(`/notification-rules/${id}`);
          setRules((prev) => prev.filter((r) => r.id !== id));
          addToast({ title: 'Rule Deleted', type: 'success' });
        } catch (err: any) {
          addToast({ title: 'Error deleting rule', message: err.message, type: 'error' });
        }
      }
    });
  };

  const handleToggleRule = async (rule: Rule) => {
    const updated = { ...rule, enabled: !rule.enabled };
    setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
    try {
      await api.put(`/notification-rules/${rule.id}`, updated);
      addToast({
        title: updated.enabled ? 'Rule Activated' : 'Rule Paused',
        message: `Rule "${rule.name}" is now ${updated.enabled ? 'active' : 'disabled'}.`,
        type: 'success'
      });
    } catch (err: any) {
      addToast({ title: 'Error updating rule', message: err.message, type: 'error' });
      fetchData();
    }
  };

  const handleLoadPresets = async () => {
    setLoadingPresets(true);
    const presets: Omit<Rule, 'id'>[] = [
      { name: 'High CPU Core Load', category: 'hardware', metric: 'cpuUsage', operator: '>', threshold: 85, duration: 5, cooldown: 30, severity: 'warning', enabled: true },
      { name: 'High CPU Temperature', category: 'hardware', metric: 'cpuTemperature', operator: '>', threshold: 75, duration: 3, cooldown: 15, severity: 'critical', enabled: true },
      { name: 'High RAM Consumption', category: 'hardware', metric: 'ramUsage', operator: '>', threshold: 90, duration: 5, cooldown: 30, severity: 'warning', enabled: true },
      { name: 'Root Disk Low Space', category: 'hardware', metric: 'storageUsage', operator: '>', threshold: 90, duration: 0, cooldown: 60, severity: 'critical', enabled: true },
      { name: 'AC Grid Power Outage', category: 'power', event: 'power_outage', cooldown: 5, severity: 'critical', enabled: true },
      { name: 'AC Grid Power Restored', category: 'power', event: 'power_restored', cooldown: 5, severity: 'info', enabled: true },
      { name: 'Server Online & Booted', category: 'power', event: 'server_online', cooldown: 5, severity: 'info', enabled: true }
    ];

    try {
      for (const p of presets) {
        await api.post('/notification-rules', p);
      }
      addToast({ title: 'Default Rules Loaded', message: '7 essential server rules added successfully.', type: 'success' });
      fetchData();
    } catch (err: any) {
      addToast({ title: 'Error loading default rules', message: err.message, type: 'error' });
    } finally {
      setLoadingPresets(false);
    }
  };

  const handleClearHistory = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Clear Notification History',
      message: 'Are you sure you want to clear all logged notifications? This action cannot be undone.',
      confirmText: 'Clear History',
      onConfirm: async () => {
        try {
          await api.delete('/notifications/history');
          setHistory([]);
          addToast({ title: 'History Cleared', type: 'success' });
        } catch (err: any) {
          addToast({ title: 'Failed to clear history', message: err.message, type: 'error' });
        }
      }
    });
  };

  const saveConfig = async (updates: Partial<NotificationConfig>) => {
    if (!config) return;
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    try {
      await api.post('/notifications/config', newConfig);
      addToast({ title: 'Settings Saved', type: 'success' });
    } catch (err: any) {
      console.error(err);
      addToast({ title: 'Error saving settings', message: err.message, type: 'error' });
      setConfig(config);
    }
  };

  const tabs: { id: 'overview' | 'devices' | 'rules' | 'history' | 'settings'; label: string; icon: any; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: Bell },
    { id: 'devices', label: 'Devices', icon: Smartphone, count: devices.length },
    { id: 'rules', label: 'Rules', icon: ListFilter, count: rules.length },
    { id: 'history', label: 'History', icon: History, count: history.length },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  if (isLoading) return <div className="p-8 text-xs text-[#8C8C8C] font-mono">Loading notifications…</div>;

  return (
    <div className="space-y-6 pb-10">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#8C8C8C] mb-1 flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5 text-[#8C8C8C]" /> Notifications & Alerts
          </div>
          <h1 className="text-2xl font-normal font-serif text-[#ECECEC] tracking-tight">Notifications</h1>
          <p className="text-xs text-[#8C8C8C] mt-1 max-w-2xl">
            Configure threshold rules, track registered FCM client devices, and manage real-time alert dispatch.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] hover:bg-[#222222] px-3.5 py-2 text-xs font-medium text-[#ECECEC] transition active:scale-[0.98] disabled:opacity-50"
            title="Refresh Notification Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#8C8C8C] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={enableNotifications}
            disabled={isApiUnavailable || !fcmConfigured}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] hover:bg-[#222222] hover:border-emerald-500/40 text-[#ECECEC] px-3.5 py-2 text-xs font-medium shadow-sm transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>{fcmConfigured ? 'Enable on this Device' : 'FCM Not Configured'}</span>
          </button>
        </div>
      </div>

      {isApiUnavailable && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-amber-300 text-xs font-semibold">Notifications API Unavailable</h3>
            <p className="text-[#8C8C8C] text-xs mt-0.5">
              The remote backend returned 404/401 for notification routes. Please verify that the API server has notification routes mounted.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-[#141414] border border-[#2A2A2A] rounded-2xl max-w-full overflow-x-auto scrollbar-none shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-white text-[#0A0A0A] font-semibold shadow-sm'
                : 'text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222]/50'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && tab.count > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === tab.id ? 'bg-[#0A0A0A]/10 text-[#0A0A0A]' : 'bg-[#2A2A2A] text-[#8C8C8C]'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Sub-tab 1: Overview */}
      {!isApiUnavailable && activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 shadow-sm">
              <div className="text-xs text-[#8C8C8C] flex justify-between items-center mb-1">
                <span>Active Client Devices</span>
                <Smartphone className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-normal font-mono text-[#ECECEC] mt-1">{devices.length}</p>
              <p className="text-[11px] text-[#8C8C8C] mt-1">Registered for FCM push delivery</p>
            </div>

            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 shadow-sm">
              <div className="text-xs text-[#8C8C8C] flex justify-between items-center mb-1">
                <span>Active Rules</span>
                <ListFilter className="w-4 h-4 text-sky-400" />
              </div>
              <p className="text-2xl font-normal font-mono text-[#ECECEC] mt-1">{rules.filter((r) => r.enabled).length}</p>
              <p className="text-[11px] text-[#8C8C8C] mt-1">{rules.length} total rules configured</p>
            </div>

            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 shadow-sm">
              <div className="text-xs text-[#8C8C8C] flex justify-between items-center mb-1">
                <span>Logged Events</span>
                <History className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-normal font-mono text-[#ECECEC] mt-1">{history.length}</p>
              <p className="text-[11px] text-[#8C8C8C] mt-1">Retained notification history</p>
            </div>

            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 shadow-sm">
              <div className="text-xs text-[#8C8C8C] flex justify-between items-center mb-1">
                <span>Master Engine</span>
                <Bell className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-2xl font-normal font-mono text-[#4ADE80] mt-1">
                {config?.masterEnabled ? 'Active' : 'Muted'}
              </p>
              <p className="text-[11px] text-[#8C8C8C] mt-1">
                {config?.quietHoursEnabled ? 'Quiet hours armed' : 'Standard dispatch'}
              </p>
            </div>
          </div>

          {/* Test Push Card */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="border-b border-[#2A2A2A] pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#ECECEC] flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#8C8C8C]" /> Instant Test Push Dispatcher
                </h2>
                <p className="text-xs text-[#8C8C8C] mt-0.5">
                  Send a live test alert to verify end-to-end delivery on all registered devices.
                </p>
              </div>
              <Badge variant={fcmConfigured ? 'success' : 'warning'}>
                {fcmConfigured ? 'FCM Armed' : 'FCM Missing'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#ECECEC] mb-1.5">Alert Title</label>
                <input
                  type="text"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl px-3 py-2 text-xs text-[#ECECEC] focus:outline-none focus:border-[#ECECEC]/40"
                  placeholder="e.g. Test Alert"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#ECECEC] mb-1.5">Alert Body</label>
                <input
                  type="text"
                  value={testBody}
                  onChange={(e) => setTestBody(e.target.value)}
                  className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl px-3 py-2 text-xs text-[#ECECEC] focus:outline-none focus:border-[#ECECEC]/40"
                  placeholder="e.g. Message contents"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#ECECEC] mb-1.5">Severity Level</label>
                <select
                  value={testSeverity}
                  onChange={(e) => setTestSeverity(e.target.value as any)}
                  className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl px-3 py-2 text-xs text-[#ECECEC] focus:outline-none focus:border-[#ECECEC]/40 font-mono"
                >
                  <option value="info">INFO</option>
                  <option value="warning">WARNING</option>
                  <option value="critical">CRITICAL</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleSendTestPush}
                disabled={sendingTest || !fcmConfigured}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F0F0F] hover:bg-[#222222] border border-[#2A2A2A] hover:border-emerald-500/40 rounded-xl text-xs font-medium text-[#ECECEC] transition active:scale-[0.98] disabled:opacity-50"
              >
                <Send className={`w-3.5 h-3.5 text-emerald-400 ${sendingTest ? 'animate-spin' : ''}`} />
                <span>{sendingTest ? 'Dispatching…' : 'Send Test Push'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 2: Devices */}
      {!isApiUnavailable && activeTab === 'devices' && (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 sm:px-6 border-b border-[#2A2A2A] bg-[#0F0F0F] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#ECECEC]">Registered FCM Client Devices</h2>
              <p className="text-xs text-[#8C8C8C] mt-0.5">Devices currently active to receive real-time push alerts.</p>
            </div>
            <span className="text-xs font-mono text-[#8C8C8C]">{devices.length} devices</span>
          </div>

          {devices.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#8C8C8C] space-y-3">
              <Smartphone className="w-8 h-8 text-[#8C8C8C] mx-auto opacity-50" />
              <p>No client devices registered yet.</p>
              <button
                onClick={enableNotifications}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0F0F0F] hover:bg-[#222222] border border-[#2A2A2A] rounded-xl text-xs font-medium text-[#ECECEC] transition"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Register This Browser Now</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0F0F0F] text-[#8C8C8C] uppercase text-[10px] tracking-wider font-semibold border-b border-[#2A2A2A]">
                  <tr>
                    <th className="px-5 py-3">Device Name</th>
                    <th className="px-5 py-3">Platform & User-Agent</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2A2A]/60">
                  {devices.map((d) => (
                    <tr key={d.token} className="hover:bg-[#222222]/40 transition">
                      <td className="px-5 py-3.5 text-[#ECECEC] font-medium font-mono">{d.name}</td>
                      <td className="px-5 py-3.5 text-[#8C8C8C] font-mono text-[11px] max-w-xs truncate" title={d.browser}>
                        {d.platform} — {d.browser}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                            d.active
                              ? 'bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/20'
                              : 'bg-[#F87171]/10 text-[#F87171] border border-[#F87171]/20'
                          }`}
                        >
                          {d.active ? 'Active' : 'Inactive'}
                        </span>
                        <div className="text-[10px] text-[#8C8C8C] mt-1 font-mono">Last Seen: {safeDate(d.lastActive)}</div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleRemoveDevice(d.token, d.name)}
                          className="p-1.5 text-[#8C8C8C] hover:text-[#F87171] hover:bg-[#222222] rounded-lg transition"
                          title="Remove device"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sub-tab 3: Rules */}
      {!isApiUnavailable && activeTab === 'rules' && (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[#ECECEC]">Automated Alert Trigger Rules</h2>
              <p className="text-[#8C8C8C] text-xs mt-0.5">Rules evaluate telemetry conditions and send notifications when triggered.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleLoadPresets}
                disabled={loadingPresets}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#0F0F0F] hover:bg-[#222222] border border-[#2A2A2A] rounded-xl text-xs font-medium text-[#ECECEC] transition active:scale-[0.98] disabled:opacity-50"
                title="Load 7 essential server rules"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{loadingPresets ? 'Loading…' : 'Load Default Rules'}</span>
              </button>
              <button
                onClick={() => {
                  setEditingRule(null);
                  setShowRuleEditor(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-neutral-200 text-[#0A0A0A] font-semibold rounded-xl text-xs shadow-sm transition active:scale-[0.98]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Rule</span>
              </button>
            </div>
          </div>

          {rules.length === 0 ? (
            <div className="text-center py-12 px-4 bg-[#0F0F0F] rounded-2xl border border-[#2A2A2A] space-y-3">
              <ListFilter className="w-8 h-8 text-[#8C8C8C] mx-auto opacity-40" />
              <div className="text-xs text-[#ECECEC] font-medium">No monitoring rules configured</div>
              <p className="text-[11px] text-[#8C8C8C] max-w-md mx-auto">
                Add custom rules for CPU temperature, RAM usage, and power events, or load recommended homelab defaults with one click.
              </p>
              <div className="pt-2 flex items-center justify-center gap-2">
                <button
                  onClick={handleLoadPresets}
                  disabled={loadingPresets}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-neutral-200 text-[#0A0A0A] font-semibold rounded-xl text-xs shadow-sm transition active:scale-[0.98]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Load Recommended Server Rules</span>
                </button>
              </div>
            </div>
          ) : (
            <ul className="space-y-3">
              {rules.map((r) => (
                <li
                  key={r.id}
                  className="p-4 bg-[#0F0F0F] rounded-xl border border-[#2A2A2A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-[#383838] transition"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[#ECECEC] text-sm">{r.name}</span>
                      <span
                        className={`px-2 py-0.5 text-[10px] rounded-full font-mono font-medium uppercase ${
                          r.severity === 'critical'
                            ? 'bg-[#F87171]/10 text-[#F87171] border border-[#F87171]/20'
                            : r.severity === 'warning'
                            ? 'bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/20'
                            : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        }`}
                      >
                        {r.severity}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] rounded-full font-mono font-medium uppercase ${
                          r.enabled
                            ? 'bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/20'
                            : 'bg-[#2A2A2A] text-[#8C8C8C]'
                        }`}
                      >
                        {r.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <div className="text-xs text-[#8C8C8C]">
                      <span className="font-mono text-[#ECECEC] uppercase">{r.category}</span> &rarr;{' '}
                      {r.metric ? `${r.metric} ${r.operator} ${r.threshold}` : r.event}
                      {r.duration ? ` (sustained for ${r.duration}m)` : ''}
                      <span className="text-[#8C8C8C] ml-3 font-mono">Cooldown: {r.cooldown}m</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Inline Switch to toggle active state */}
                    <label className="relative inline-flex items-center cursor-pointer" title={r.enabled ? 'Disable rule' : 'Enable rule'}>
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={r.enabled}
                        onChange={() => handleToggleRule(r)}
                      />
                      <div className="w-10 h-5 bg-[#2A2A2A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white peer-checked:after:bg-[#0A0A0A]"></div>
                    </label>

                    <button
                      onClick={() => {
                        setEditingRule(r);
                        setShowRuleEditor(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-[#ECECEC] bg-[#141414] hover:bg-[#222222] border border-[#2A2A2A] rounded-lg transition"
                      title="Edit rule"
                    >
                      <Edit3 className="w-3 h-3 text-[#8C8C8C]" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleDeleteRule(r.id!, r.name)}
                      className="p-1.5 text-[#8C8C8C] hover:text-[#F87171] hover:bg-[#222222] rounded-lg transition"
                      title="Delete rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Sub-tab 4: History */}
      {!isApiUnavailable && activeTab === 'history' && (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 sm:px-6 border-b border-[#2A2A2A] bg-[#0F0F0F] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#ECECEC]">Notification Dispatch History</h2>
              <p className="text-xs text-[#8C8C8C] mt-0.5">Audit log of all triggered notifications and FCM delivery statuses.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#8C8C8C]">{history.length} logged events</span>
              {history.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-[#F87171] hover:bg-[#F87171]/10 border border-[#F87171]/30 rounded-lg transition"
                  title="Clear all logged notification events"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear History</span>
                </button>
              )}
            </div>
          </div>

          {history.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#8C8C8C]">No notifications logged yet.</div>
          ) : (
            <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-[#0F0F0F] text-[#8C8C8C] uppercase text-[10px] tracking-wider font-semibold border-b border-[#2A2A2A] z-10">
                  <tr>
                    <th className="px-5 py-3">Timestamp</th>
                    <th className="px-5 py-3">Severity</th>
                    <th className="px-5 py-3">Title & Alert Message</th>
                    <th className="px-5 py-3">FCM Delivery Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2A2A]/60">
                  {history.map((h, idx) => (
                    <tr key={h.id || idx} className="hover:bg-[#222222]/40 transition">
                      <td className="px-5 py-3.5 text-[#8C8C8C] font-mono whitespace-nowrap text-[11px]">
                        {safeDate(h.timestamp)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium uppercase ${
                            h.severity === 'critical'
                              ? 'bg-[#F87171]/10 text-[#F87171] border border-[#F87171]/20'
                              : h.severity === 'warning'
                              ? 'bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/20'
                              : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                          }`}
                        >
                          {h.severity || 'INFO'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-[#ECECEC] font-medium">{h.title}</div>
                        <div className="text-[#8C8C8C] mt-0.5 text-xs">{h.message}</div>
                      </td>
                      <td className="px-5 py-3.5 text-[#8C8C8C] text-xs font-mono max-w-[200px] truncate" title={h.deliveryStatus}>
                        {h.deliveryStatus || 'Recorded'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sub-tab 5: Settings */}
      {!isApiUnavailable && activeTab === 'settings' && config && (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl shadow-sm p-5 sm:p-6 space-y-5 max-w-2xl">
          <div className="border-b border-[#2A2A2A] pb-3">
            <h2 className="text-sm font-semibold text-[#ECECEC] flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#8C8C8C]" /> Notification Engine Policy
            </h2>
            <p className="text-xs text-[#8C8C8C] mt-0.5">Control global notification suppression and quiet hours windows.</p>
          </div>

          {/* Master Switch */}
          <div className="flex items-center justify-between p-4 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl">
            <div>
              <h3 className="font-medium text-[#ECECEC] text-xs">Master Dispatch Switch</h3>
              <p className="text-[11px] text-[#8C8C8C] mt-0.5">Globally enable or pause all outbound notifications.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={config.masterEnabled}
                onChange={(e) => saveConfig({ masterEnabled: e.target.checked })}
              />
              <div className="w-10 h-5 bg-[#2A2A2A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white peer-checked:after:bg-[#0A0A0A]"></div>
            </label>
          </div>

          {/* Quiet Hours */}
          <div className="space-y-4 p-4 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-[#ECECEC] text-xs">Quiet Hours Suppression</h3>
                <p className="text-[11px] text-[#8C8C8C] mt-0.5">Mute non-critical alert sounds during sleep or focus hours.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={config.quietHoursEnabled}
                  onChange={(e) => saveConfig({ quietHoursEnabled: e.target.checked })}
                />
                <div className="w-10 h-5 bg-[#2A2A2A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white peer-checked:after:bg-[#0A0A0A]"></div>
              </label>
            </div>

            {config.quietHoursEnabled && (
              <div className="space-y-3 pt-2 border-t border-[#2A2A2A]">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-[#8C8C8C] mb-1 font-medium">Start Time</label>
                    <input
                      type="time"
                      value={config.quietHoursStart}
                      onChange={(e) => saveConfig({ quietHoursStart: e.target.value })}
                      className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-3 py-2 text-xs text-[#ECECEC] font-mono outline-none focus:border-[#ECECEC]/40"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#8C8C8C] mb-1 font-medium">End Time</label>
                    <input
                      type="time"
                      value={config.quietHoursEnd}
                      onChange={(e) => saveConfig({ quietHoursEnd: e.target.value })}
                      className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-3 py-2 text-xs text-[#ECECEC] font-mono outline-none focus:border-[#ECECEC]/40"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-[#141414] rounded-xl border border-[#2A2A2A]">
                  <div>
                    <span className="text-xs text-[#ECECEC] font-medium block">Allow Critical Alerts</span>
                    <span className="text-[11px] text-[#8C8C8C] block mt-0.5">Power outage or critical hardware alerts will bypass quiet hours</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={config.allowCriticalInQuietHours}
                      onChange={(e) => saveConfig({ allowCriticalInQuietHours: e.target.checked })}
                    />
                    <div className="w-10 h-5 bg-[#2A2A2A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white peer-checked:after:bg-[#0A0A0A]"></div>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rule Editor Modal */}
      {showRuleEditor && (
        <RuleEditor
          rule={editingRule || undefined}
          onSave={handleSaveRule}
          onClose={() => {
            setShowRuleEditor(false);
            setEditingRule(null);
          }}
        />
      )}

      {/* Confirm Action Modal */}
      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          confirmModal.onConfirm();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }}
      />
    </div>
  );
}
