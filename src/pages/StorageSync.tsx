import { useState, useEffect, useCallback } from 'react';
import { 
  FolderSync, 
  Play, 
  Plus, 
  RefreshCw, 
  Clock, 
  X
} from 'lucide-react';
import { cloudSyncService, type CloudSyncConfig, type SyncProfile } from '../services/cloudSync';
import { useToast } from '../components/ui/ToastContext';
import Badge from '../components/ui/Badge';

export default function StorageSync() {
  const [config, setConfig] = useState<CloudSyncConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProfile, setNewProfile] = useState<Partial<SyncProfile>>({
    name: '',
    source: '/storage/wd/',
    destination: '/home/madesh/mirrors/',
    schedule: 'Daily at 04:00 AM',
    enabled: true
  });
  const { addToast } = useToast();

  const loadConfig = useCallback(async () => {
    try {
      const res = await cloudSyncService.getConfig();
      setConfig(res);
    } catch (err: any) {
      addToast({ title: 'Sync Error', message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleTrigger = async (profileId: string) => {
    setSyncingId(profileId);
    addToast({ title: 'Sync Initiated', message: 'Running rsync backup replication...', type: 'info' });
    try {
      await cloudSyncService.triggerSync(profileId);
      addToast({ title: 'Sync Finished', message: 'Replication completed successfully.', type: 'success' });
      await loadConfig();
    } catch (err: any) {
      addToast({ title: 'Sync Failed', message: err.message, type: 'error' });
    } finally {
      setSyncingId(null);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfile.name || !newProfile.source || !newProfile.destination) {
      addToast({ title: 'Validation', message: 'Name, source, and destination are required', type: 'error' });
      return;
    }
    try {
      const updated = await cloudSyncService.saveProfile(newProfile);
      setConfig(updated);
      setIsModalOpen(false);
      addToast({ title: 'Profile Saved', message: 'New backup sync profile created.', type: 'success' });
    } catch (err: any) {
      addToast({ title: 'Save Failed', message: err.message, type: 'error' });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#8C8C8C] mb-1">Storage Management</div>
          <h1 className="text-2xl font-normal font-serif text-[#ECECEC] tracking-tight flex items-center gap-2.5">
            <FolderSync className="w-5 h-5 text-[#8C8C8C]" />
            Storage Replication & Sync Manager
          </h1>
          <p className="text-xs text-[#8C8C8C] mt-1">
            Automated rsync and cloud mirrors between WD Blue storage, USB drives, and backup repositories.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white text-[#0A0A0A] hover:bg-neutral-200 transition-colors shadow-sm active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            New Sync Profile
          </button>
        </div>
      </div>

      {/* Profiles List */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[#2A2A2A] flex items-center justify-between text-xs text-[#8C8C8C] font-medium">
          <span className="uppercase tracking-wider text-[11px]">Configured Profiles</span>
          <span className="text-[11px] font-mono text-[#8C8C8C]">rsync engine</span>
        </div>

        {loading ? (
          <div className="p-6 space-y-3 animate-pulse">
            <div className="h-20 bg-white/[0.03] rounded-xl" />
            <div className="h-20 bg-white/[0.03] rounded-xl" />
          </div>
        ) : config?.profiles.map(p => (
          <div key={p.id} className="p-4 sm:p-5 border-b border-[#2A2A2A] last:border-b-0 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#222222]/40 transition-colors">
            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="text-sm font-medium text-[#ECECEC]">{p.name}</span>
                <Badge variant={p.enabled ? 'success' : 'default'} className="text-[10px] py-0">
                  {p.enabled ? 'Enabled' : 'Paused'}
                </Badge>
                <span className="text-xs text-[#8C8C8C] font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3 shrink-0" /> {p.schedule}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#8C8C8C]">
                <span className="text-[#ECECEC] bg-[#0A0A0A] border border-[#2A2A2A] px-2 py-0.5 rounded-lg break-all">{p.source}</span>
                <span className="shrink-0">➔</span>
                <span className="text-[#ECECEC] bg-[#0A0A0A] border border-[#2A2A2A] px-2 py-0.5 rounded-lg break-all">{p.destination}</span>
              </div>

              {p.lastRun && (
                <div className="text-[11px] text-[#8C8C8C] truncate">
                  Last ran: {new Date(p.lastRun).toLocaleString()} • Status: <strong className="text-[#ECECEC] font-normal">{p.lastStatus}</strong>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
              <button
                onClick={() => handleTrigger(p.id)}
                disabled={syncingId === p.id}
                className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-white hover:bg-neutral-200 text-[#0A0A0A] transition-all disabled:opacity-50 active:scale-[0.98] shadow-sm cursor-pointer"
              >
                {syncingId === p.id ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-current" />
                    Sync Now
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Profile Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl relative max-h-[90dvh] overflow-y-auto overscroll-contain">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-5 top-5 text-[#8C8C8C] hover:text-[#ECECEC] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-serif font-normal text-[#ECECEC] tracking-tight mb-4">Create Sync Profile</h3>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#8C8C8C] mb-1.5 font-medium">Profile Name *</label>
                <input
                  type="text"
                  required
                  value={newProfile.name}
                  onChange={e => setNewProfile({ ...newProfile, name: e.target.value })}
                  placeholder="e.g. Immich Media Backup"
                  className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-2.5 text-[#ECECEC] focus:outline-none focus:border-[#ECECEC] placeholder-[#8C8C8C]/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[#8C8C8C] mb-1.5 font-medium">Source Path *</label>
                <input
                  type="text"
                  required
                  value={newProfile.source}
                  onChange={e => setNewProfile({ ...newProfile, source: e.target.value })}
                  className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-2.5 text-[#ECECEC] font-mono focus:outline-none focus:border-[#ECECEC] transition-colors"
                />
              </div>

              <div>
                <label className="block text-[#8C8C8C] mb-1.5 font-medium">Destination Target *</label>
                <input
                  type="text"
                  required
                  value={newProfile.destination}
                  onChange={e => setNewProfile({ ...newProfile, destination: e.target.value })}
                  className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-2.5 text-[#ECECEC] font-mono focus:outline-none focus:border-[#ECECEC] transition-colors"
                />
              </div>

              <div>
                <label className="block text-[#8C8C8C] mb-1.5 font-medium">Schedule</label>
                <input
                  type="text"
                  value={newProfile.schedule}
                  onChange={e => setNewProfile({ ...newProfile, schedule: e.target.value })}
                  className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-2.5 text-[#ECECEC] focus:outline-none focus:border-[#ECECEC] transition-colors"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-[#8C8C8C] hover:text-[#ECECEC] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-white text-[#0A0A0A] hover:bg-neutral-200 transition-colors shadow-sm active:scale-[0.98]"
                >
                  Create Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
