import { useState, useEffect, useCallback } from 'react';
import { HardDrive, RefreshCw, Archive, Clock, Plus, Trash2, Calendar, CheckCircle2 } from 'lucide-react';
import { storageService, type BackupResponse, type BackupItem, type BackupScheduleConfig } from '../services/storage';
import { formatBytes } from '../utils/safeFormat';
import PageLoader from '../components/ui/PageLoader';
import ErrorState from '../components/ui/ErrorState';
import Badge from '../components/ui/Badge';
import DisasterRecoveryCard from '../components/storage/DisasterRecoveryCard';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function StorageBackups() {
  const [data, setData] = useState<BackupResponse | null>(null);
  const [schedule, setSchedule] = useState<BackupScheduleConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, sched] = await Promise.all([
        storageService.getBackups(),
        storageService.getBackupSchedule().catch(() => ({
          enabled: true,
          scheduleDay: 0,
          scheduleTime: '10:00',
          retentionCount: 4,
          lastBackupDate: null,
          lastBackupStatus: 'none',
          lastBackupFile: null
        }))
      ]);
      setData(res);
      setSchedule(sched);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load backup inventory'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateBackup = async () => {
    setActionLoading(true);
    try {
      const res = await storageService.createBackup();
      setFeedbackMsg(`Backup created successfully: ${res.archive}`);
      setTimeout(() => setFeedbackMsg(null), 5000);
      await loadData();
    } catch (err: any) {
      alert(`Failed to create backup: ${err.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteBackup = async (item: BackupItem) => {
    if (!window.confirm(`Are you sure you want to delete backup archive:\n\n${item.name}?`)) {
      return;
    }
    setActionLoading(true);
    try {
      await storageService.deleteBackup(item.name);
      await loadData();
    } catch (err: any) {
      alert(`Failed to delete backup: ${err.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateSchedule = async (updates: Partial<BackupScheduleConfig>) => {
    if (!schedule) return;
    setScheduleSaving(true);
    try {
      const updated = await storageService.updateBackupSchedule(updates);
      setSchedule(updated);
      setFeedbackMsg('Backup schedule settings saved.');
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      alert(`Failed to update backup schedule: ${err.message || 'Unknown error'}`);
    } finally {
      setScheduleSaving(false);
    }
  };

  if (error && !data) {
    return <ErrorState title="Backups unavailable" message={error.message} onRetry={loadData} />;
  }

  if (loading && !data) {
    return <PageLoader />;
  }

  const backups = data?.backups || [];

  return (
    <div className="space-y-6 pb-8 animate-slide-up">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs text-[#8C8C8C]">
            <HardDrive className="h-4 w-4" /> Storage
          </div>
          <h1 className="text-2xl font-normal font-serif tracking-tight text-[#ECECEC]">Backups & Archives</h1>
          <p className="mt-1 text-xs text-[#8C8C8C]">
            Automated Sunday 10:00 AM system backups, instant archive generation, and retention management.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCreateBackup}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-white hover:bg-neutral-200 px-3.5 py-2 text-xs font-semibold text-[#0A0A0A] transition shadow-sm active:scale-[0.98] disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{actionLoading ? 'Creating Archive...' : 'Create Backup'}</span>
          </button>
          <button
            onClick={loadData}
            disabled={loading || actionLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-3.5 py-2 text-xs text-[#ECECEC] transition hover:bg-[#222222] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {feedbackMsg && (
        <div className="p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-[#ECECEC] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Disaster Recovery & System Audit Export */}
      <DisasterRecoveryCard />

      {/* Automated Backup Schedule Card */}
      {schedule && (
        <section className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2A2A2A] pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#141414] border border-[#2A2A2A] flex items-center justify-center text-[#ECECEC]">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-[#ECECEC] flex items-center gap-2">
                  Automated Weekly Backup Schedule
                  {scheduleSaving && <span className="text-xs text-[#8C8C8C] animate-pulse">Saving...</span>}
                </h2>
                <p className="text-xs text-[#8C8C8C] mt-0.5">
                  Creates a compressed system snapshot, dispatches push notification, and rotates historical archives.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-[#8C8C8C]">
                {schedule.enabled ? 'Automation Active' : 'Automation Disabled'}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={schedule.enabled}
                  onChange={(e) => handleUpdateSchedule({ enabled: e.target.checked })}
                />
                <div className="w-10 h-5 bg-[#2A2A2A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white"></div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-[#8C8C8C] mb-1.5 uppercase tracking-wider">
                Day of Week (IST)
              </label>
              <select
                value={schedule.scheduleDay}
                disabled={!schedule.enabled}
                onChange={(e) => handleUpdateSchedule({ scheduleDay: Number(e.target.value) })}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-3 py-2 text-xs text-[#ECECEC] focus:outline-none focus:border-white disabled:opacity-50"
              >
                {DAYS.map((dayName, idx) => (
                  <option key={idx} value={idx}>
                    Every {dayName} {idx === 0 ? '(Default)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#8C8C8C] mb-1.5 uppercase tracking-wider">
                Backup Time (IST)
              </label>
              <input
                type="time"
                value={schedule.scheduleTime}
                disabled={!schedule.enabled}
                onChange={(e) => handleUpdateSchedule({ scheduleTime: e.target.value })}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-3 py-2 text-xs text-[#ECECEC] focus:outline-none focus:border-white disabled:opacity-50 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#8C8C8C] mb-1.5 uppercase tracking-wider">
                Last Scheduled Execution
              </label>
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl px-3 py-2 text-xs text-[#ECECEC] flex items-center justify-between">
                <span className="font-mono text-xs text-[#8C8C8C]">
                  {schedule.lastBackupDate || 'Pending next Sunday'}
                </span>
                <Badge variant={schedule.lastBackupStatus === 'success' ? 'success' : schedule.lastBackupStatus === 'failed' ? 'error' : 'default'}>
                  {schedule.lastBackupStatus || 'scheduled'}
                </Badge>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Summary Cards */}
      <section className="grid gap-3 sm:grid-cols-3 2xl:gap-6">
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-wider font-medium text-[#8C8C8C]">Discovered Archives</p>
          <p className="mt-2 text-2xl font-normal font-serif tabular-nums text-[#ECECEC]">
            {backups.length}
          </p>
        </div>
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-wider font-medium text-[#8C8C8C]">Total Backup Footprint</p>
          <p className="mt-2 text-2xl font-normal font-serif tabular-nums text-[#ECECEC] font-mono">
            {formatBytes(data?.totalSizeBytes || 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-wider font-medium text-[#8C8C8C]">Monitored Locations</p>
          <p className="mt-2 text-xs text-[#ECECEC] font-mono truncate">
            {data?.monitoredDirectories?.join(', ') || '/var/backups'}
          </p>
        </div>
      </section>

      {/* Active System Timers */}
      {data?.activeTimers && data.activeTimers.length > 0 && (
        <section className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 sm:p-5">
          <div className="flex items-center gap-2 text-xs text-[#8C8C8C] uppercase tracking-wider font-medium mb-2">
            <Clock className="h-3.5 w-3.5" /> Scheduled Timers & Automation
          </div>
          <div className="space-y-1">
            {data.activeTimers.map((timer, idx) => (
              <p key={idx} className="font-mono text-xs text-[#ECECEC]/80 truncate">
                {timer}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* Backups Inventory */}
      <section className="overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-sm">
        <div className="flex items-center justify-between border-b border-[#2A2A2A] px-4 sm:px-5 py-3 text-xs">
          <span className="font-medium text-[#8C8C8C] uppercase tracking-wider text-[11px]">Backup Files</span>
          <span className="font-mono text-xs text-[#8C8C8C]">{backups.length} total</span>
        </div>
        {backups.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-[#8C8C8C]">
            <Archive className="mx-auto mb-3 h-8 w-8 text-[#8C8C8C]/40" />
            <p className="text-[#ECECEC]">No persistent backup archives found in monitored directories.</p>
            <p className="text-xs text-[#8C8C8C] mt-1">Checked /var/backups and /home/madesh/backups</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#2A2A2A]">
            {backups.map((item) => (
              <li key={item.path} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 px-4 py-3.5 hover:bg-[#222222]/40 transition">
                <div className="min-w-0 flex items-center gap-3">
                  <Archive className="w-5 h-5 text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-mono text-xs sm:text-sm font-medium text-[#ECECEC] truncate">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-[#8C8C8C] truncate mt-0.5">
                      {item.path}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 text-xs font-mono text-[#8C8C8C] shrink-0 self-stretch sm:self-auto border-t sm:border-t-0 border-[#2A2A2A]/40 pt-2 sm:pt-0">
                  <Badge variant="default" className="text-[10px] py-0">{item.type.replace('_', ' ')}</Badge>
                  <span className="text-right text-[#ECECEC]">
                    {formatBytes(item.sizeBytes)}
                  </span>
                  <span className="hidden md:inline w-36 text-right">
                    {new Date(item.mtime).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleDeleteBackup(item)}
                    disabled={actionLoading}
                    title="Delete Backup"
                    className="p-1.5 rounded-lg text-[#8C8C8C] hover:text-[#F87171] hover:bg-[#222222] transition cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
