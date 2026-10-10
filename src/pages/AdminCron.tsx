import { useState, useEffect, useCallback } from 'react';
import { 
  CalendarClock, 
  Plus, 
  Trash2, 
  Edit2, 
  RefreshCw, 
  Clock, 
  Terminal, 
  ChevronDown, 
  ChevronUp, 
  Play,
  X 
} from 'lucide-react';
import { cronService, type CronJob, type CronResponse } from '../services/cron';
import { terminalService } from '../services/terminal';
import { useToast } from '../components/ui/ToastContext';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Badge from '../components/ui/Badge';

const CRON_PRESETS = [
  { label: 'Weekly SSD TRIM', schedule: '0 3 * * 0', command: '/sbin/fstrim -av', comment: 'Weekly SSD wear leveling TRIM' },
  { label: 'Daily Logrotate', schedule: '0 4 * * *', command: 'journalctl --vacuum-time=7d', comment: 'Clean journal logs older than 7 days' },
  { label: 'Docker Cache Prune', schedule: '0 5 * * 0', command: 'docker system prune -f', comment: 'Weekly Docker cache cleanup' },
  { label: 'Clock NTP Sync', schedule: '0 */6 * * *', command: 'sudo systemctl restart systemd-timesyncd', comment: 'Sync system clock every 6 hours' }
];

export default function AdminCron() {
  const [data, setData] = useState<CronResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTimers, setShowTimers] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Partial<CronJob> | null>(null);
  const [saving, setSaving] = useState(false);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [deleteConfirmJob, setDeleteConfirmJob] = useState<CronJob | null>(null);
  const { addToast } = useToast();

  const loadJobs = useCallback(async () => {
    try {
      const res = await cronService.getJobs();
      setData(res);
    } catch (err: any) {
      addToast({ title: 'Cron Load Failed', message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleToggle = async (job: CronJob) => {
    try {
      const res = await cronService.updateJob(job.id, { enabled: !job.enabled });
      setData(prev => prev ? { ...prev, jobs: res.jobs } : prev);
      addToast({ 
        title: job.enabled ? 'Task Paused' : 'Task Enabled', 
        message: `Task is now ${job.enabled ? 'disabled (commented out)' : 'active'}.`, 
        type: 'success' 
      });
    } catch (err: any) {
      addToast({ title: 'Toggle Failed', message: err.message, type: 'error' });
    }
  };

  const handleExecuteDelete = async () => {
    if (!deleteConfirmJob) return;
    try {
      const res = await cronService.deleteJob(deleteConfirmJob.id);
      setData(prev => prev ? { ...prev, jobs: res.jobs } : prev);
      addToast({ title: 'Task Deleted', message: 'Cron job removed successfully.', type: 'success' });
    } catch (err: any) {
      addToast({ title: 'Delete Failed', message: err.message, type: 'error' });
    } finally {
      setDeleteConfirmJob(null);
    }
  };

  const handleRunNow = async (job: CronJob) => {
    setRunningJobId(job.id);
    addToast({ title: 'Executing Cron Task', message: `Running "${job.command}"...`, type: 'info' });
    try {
      const res = await terminalService.execute(job.command);
      if (res && res.exitCode === 0) {
        addToast({ 
          title: 'Task Succeeded', 
          message: res.stdout?.slice(0, 120) || 'Task ran successfully (Exit Code 0).', 
          type: 'success' 
        });
      } else {
        addToast({ 
          title: 'Task Output', 
          message: res.stderr?.slice(0, 120) || `Finished with exit code ${res.exitCode}`, 
          type: 'info' 
        });
      }
    } catch (err: any) {
      addToast({ title: 'Execution Error', message: err.message || 'Command failed', type: 'error' });
    } finally {
      setRunningJobId(null);
    }
  };

  const handleOpenAdd = () => {
    setEditingJob({
      schedule: '0 2 * * *',
      command: '/usr/local/bin/backup-sync.sh > /dev/null 2>&1',
      comment: 'Nightly data backup routine',
      enabled: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (job: CronJob) => {
    setEditingJob({ ...job });
    setIsModalOpen(true);
  };

  const applyPreset = (preset: typeof CRON_PRESETS[0]) => {
    setEditingJob(prev => ({
      ...prev,
      schedule: preset.schedule,
      command: preset.command,
      comment: preset.comment
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob?.schedule || !editingJob?.command) {
      addToast({ title: 'Validation', message: 'Schedule and Command are required', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      if (editingJob.id) {
        const res = await cronService.updateJob(editingJob.id, editingJob);
        setData(prev => prev ? { ...prev, jobs: res.jobs } : prev);
        addToast({ title: 'Task Updated', message: 'Cron job saved successfully.', type: 'success' });
      } else {
        const res = await cronService.addJob(editingJob);
        setData(prev => prev ? { ...prev, jobs: res.jobs } : prev);
        addToast({ title: 'Task Added', message: 'New scheduled task registered.', type: 'success' });
      }
      setIsModalOpen(false);
      setEditingJob(null);
    } catch (err: any) {
      addToast({ title: 'Save Failed', message: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#8C8C8C] mb-1 flex items-center gap-1.5">
            <CalendarClock className="w-3.5 h-3.5" /> Scheduled Automation
          </div>
          <h1 className="text-2xl font-normal font-serif text-[#ECECEC] tracking-tight">Scheduled Tasks & Cron Manager</h1>
          <p className="text-xs text-[#8C8C8C] mt-1">
            Configure automated system routines, recurring maintenance scripts, and view active timer units on the Ubuntu host.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadJobs}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl bg-[#1A1A1A] hover:bg-[#222222] text-[#ECECEC] border border-[#2A2A2A] transition-colors active:scale-[0.98]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-white text-[#0A0A0A] hover:bg-neutral-200 transition shadow-sm active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            New Scheduled Task
          </button>
        </div>
      </div>

      {/* Main Jobs List */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#2A2A2A] bg-[#0F0F0F] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#ECECEC]">
            <Clock className="w-4 h-4 text-[#8C8C8C]" />
            Active User Crontab Tasks ({data?.jobs?.length || 0})
          </div>
          <span className="text-[11px] text-[#8C8C8C] font-mono">User: madesh</span>
        </div>

        {loading ? (
          <div className="p-6 space-y-3 animate-pulse">
            {[1, 2, 3].map(n => (
              <div key={n} className="h-16 bg-[#0F0F0F] rounded-xl" />
            ))}
          </div>
        ) : !data?.jobs || data.jobs.length === 0 ? (
          <div className="text-center py-12 text-[#8C8C8C] space-y-2">
            <CalendarClock className="w-8 h-8 mx-auto opacity-30 text-[#8C8C8C]" />
            <p className="text-xs">No active cron jobs defined for user madesh.</p>
            <button
              onClick={handleOpenAdd}
              className="text-xs text-[#ECECEC] hover:underline cursor-pointer font-medium"
            >
              Click here to create a scheduled task
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#2A2A2A]/60">
            {data.jobs.map(job => (
              <div 
                key={job.id} 
                className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                  job.enabled ? 'hover:bg-[#222222]/40' : 'opacity-60 bg-[#0F0F0F]/30'
                }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-medium text-sm text-[#ECECEC]">
                      {job.comment || 'Untitled Cron Task'}
                    </span>
                    <Badge variant={job.enabled ? 'success' : 'default'} className="text-[10px] py-0">
                      {job.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                    <span className="text-[11px] text-[#ECECEC] font-medium bg-[#0F0F0F] border border-[#2A2A2A] px-2 py-0.5 rounded-lg">
                      {job.humanSchedule}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono text-[#8C8C8C]">
                    <span className="bg-[#0F0F0F] border border-[#2A2A2A] px-2 py-0.5 rounded-lg text-[#ECECEC]">{job.schedule}</span>
                    <span className="truncate max-w-xl text-[#8C8C8C]" title={job.command}>{job.command}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0 self-start sm:self-center">
                  <button
                    onClick={() => handleRunNow(job)}
                    disabled={runningJobId === job.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition cursor-pointer active:scale-[0.98] disabled:opacity-50"
                    title="Run task immediately in background"
                  >
                    <Play className={`w-3.5 h-3.5 ${runningJobId === job.id ? 'animate-spin' : ''}`} />
                    <span>{runningJobId === job.id ? 'Running…' : 'Run Now'}</span>
                  </button>

                  <button
                    onClick={() => handleToggle(job)}
                    className="px-3 py-1.5 text-xs font-medium rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] hover:bg-[#222222] text-[#ECECEC] transition cursor-pointer active:scale-[0.98]"
                  >
                    {job.enabled ? 'Pause' : 'Activate'}
                  </button>

                  <button
                    onClick={() => handleOpenEdit(job)}
                    className="p-2 rounded-xl bg-[#0F0F0F] hover:bg-[#222222] text-[#8C8C8C] hover:text-[#ECECEC] border border-[#2A2A2A] transition cursor-pointer"
                    title="Edit Task"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setDeleteConfirmJob(job)}
                    className="p-2 rounded-xl bg-[#0F0F0F] hover:bg-rose-500/20 text-[#8C8C8C] hover:text-[#F87171] border border-[#2A2A2A] transition cursor-pointer"
                    title="Delete Task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Systemd Timers Collapsible Section */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden shadow-sm">
        <button
          onClick={() => setShowTimers(!showTimers)}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-[#222222]/40 transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#8C8C8C]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#ECECEC]">
              Systemd Background Timers ({data?.timers?.length || 0})
            </span>
          </div>
          {showTimers ? <ChevronUp className="w-4 h-4 text-[#8C8C8C]" /> : <ChevronDown className="w-4 h-4 text-[#8C8C8C]" />}
        </button>

        {showTimers && (
          <div className="p-4 sm:p-5 border-t border-[#2A2A2A] bg-[#0A0A0A] font-mono text-[11px] text-[#8C8C8C] space-y-1.5 overflow-x-auto">
            {data?.timers && data.timers.length > 0 ? (
              data.timers.map((timer, idx) => (
                <div key={idx} className="p-2 rounded-xl bg-[#0F0F0F] border border-[#2A2A2A] text-[#ECECEC] whitespace-pre">
                  {timer}
                </div>
              ))
            ) : (
              <p className="text-[#8C8C8C]">No systemd timers detected.</p>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && editingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 sm:p-7 max-w-lg w-full shadow-2xl relative max-h-[90dvh] overflow-y-auto overscroll-contain">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-[#8C8C8C] hover:text-[#ECECEC] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-normal font-serif text-[#ECECEC] mb-4">
              {editingJob.id ? 'Edit Scheduled Task' : 'Create Scheduled Task'}
            </h3>

            {/* Quick Presets */}
            <div className="mb-4">
              <span className="text-[11px] text-[#8C8C8C] block mb-1.5">Quick Presets:</span>
              <div className="flex flex-wrap gap-1.5">
                {CRON_PRESETS.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="px-2.5 py-1 text-[11px] rounded-lg bg-[#0F0F0F] border border-[#2A2A2A] text-[#8C8C8C] hover:text-[#ECECEC] hover:border-white/30 transition"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#8C8C8C] mb-1 font-medium">Task Title / Comment</label>
                <input
                  type="text"
                  value={editingJob.comment || ''}
                  onChange={e => setEditingJob({ ...editingJob, comment: e.target.value })}
                  placeholder="e.g. Daily Photo Backup or Log Rotation"
                  className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-2.5 text-[#ECECEC] focus:outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="block text-[#8C8C8C] mb-1 font-medium">Cron Expression * (min hour dom mon dow)</label>
                <input
                  type="text"
                  required
                  value={editingJob.schedule || ''}
                  onChange={e => setEditingJob({ ...editingJob, schedule: e.target.value })}
                  placeholder="0 2 * * *"
                  className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-2.5 text-[#ECECEC] font-mono focus:outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="block text-[#8C8C8C] mb-1 font-medium">Terminal Command *</label>
                <input
                  type="text"
                  required
                  value={editingJob.command || ''}
                  onChange={e => setEditingJob({ ...editingJob, command: e.target.value })}
                  placeholder="/usr/local/bin/backup-sync.sh"
                  className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-2.5 text-[#ECECEC] font-mono focus:outline-none focus:border-white/30"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="cronEnabled"
                  checked={editingJob.enabled !== false}
                  onChange={e => setEditingJob({ ...editingJob, enabled: e.target.checked })}
                  className="rounded border-[#2A2A2A] bg-[#0F0F0F] text-white focus:ring-0"
                />
                <label htmlFor="cronEnabled" className="text-[#ECECEC] cursor-pointer">
                  Enable task on creation
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#2A2A2A]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] hover:bg-[#222222] text-[#8C8C8C] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-white text-[#0A0A0A] font-semibold hover:bg-neutral-200 transition shadow-sm active:scale-[0.98] disabled:opacity-50"
                >
                  {saving ? 'Saving…' : editingJob.id ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirmJob}
        onClose={() => setDeleteConfirmJob(null)}
        onConfirm={handleExecuteDelete}
        title="Delete Scheduled Task"
        message={`Are you sure you want to remove the scheduled task "${deleteConfirmJob?.comment || deleteConfirmJob?.command}"?`}
        confirmText="Delete Task"
        variant="danger"
      />
    </div>
  );
}
