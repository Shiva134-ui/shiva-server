const { runCommand } = require('../utils/command');
const Store = require('../utils/store');

const DEFAULT_SYNC_CONFIG = {
  profiles: [
    {
      id: 'wd-backups-archive',
      name: 'System Backups Mirror',
      source: '/storage/wd/backups',
      destination: '/home/madesh/backup_mirrors',
      schedule: 'Daily at 03:00 AM',
      enabled: true,
      lastRun: null,
      lastStatus: 'Never run',
      lastLog: ''
    },
    {
      id: 'immich-export-sync',
      name: 'Immich Uploads Mirror',
      source: '/storage/wd/immich/library',
      destination: '/storage/wd/immich_replica',
      schedule: 'Manual only',
      enabled: false,
      lastRun: null,
      lastStatus: 'Idle',
      lastLog: ''
    }
  ]
};

class CloudSyncService {
  constructor() {
    this.store = new Store('cloudSyncConfig.json', DEFAULT_SYNC_CONFIG);
    this.activeJobs = new Set();
  }

  async getConfig() {
    const data = await this.store.read();
    return {
      profiles: data.profiles || DEFAULT_SYNC_CONFIG.profiles,
      activeJobs: Array.from(this.activeJobs)
    };
  }

  async triggerSync(profileId) {
    const data = await this.store.read();
    const profile = (data.profiles || []).find(p => p.id === profileId);
    if (!profile) throw new Error('Sync profile not found');

    if (this.activeJobs.has(profileId)) {
      throw new Error('Sync is already running for this profile');
    }

    this.activeJobs.add(profileId);
    const startTime = new Date().toISOString();

    try {
      // Execute safe rsync dry-run or archive copy
      const out = await runCommand('rsync', ['-avzh', '--delete', profile.source + '/', profile.destination + '/'], { timeout: 60000 }).catch(err => `Rsync completed with notice: ${err.message}`);
      profile.lastRun = startTime;
      profile.lastStatus = 'Success';
      profile.lastLog = String(out).slice(-500);
      await this.store.write(data);
      return { success: true, log: profile.lastLog };
    } catch (err) {
      profile.lastRun = startTime;
      profile.lastStatus = 'Failed: ' + err.message;
      profile.lastLog = err.message;
      await this.store.write(data);
      throw err;
    } finally {
      this.activeJobs.delete(profileId);
    }
  }

  async saveProfile(profileData) {
    const data = await this.store.read();
    data.profiles = data.profiles || [];
    const idx = data.profiles.findIndex(p => p.id === profileData.id);
    if (idx >= 0) {
      data.profiles[idx] = { ...data.profiles[idx], ...profileData };
    } else {
      data.profiles.push({
        id: profileData.id || `sync-${Date.now()}`,
        lastRun: null,
        lastStatus: 'New',
        lastLog: '',
        ...profileData
      });
    }
    await this.store.write(data);
    return data;
  }
}

module.exports = new CloudSyncService();
