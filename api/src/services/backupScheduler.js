const Store = require('../utils/store');
const backupService = require('./backupService');
const notificationEngine = require('./notificationEngine');
const eventEngine = require('./eventEngine');

const INTERVAL_MS = 60000; // Check every 60 seconds

class BackupScheduler {
  constructor() {
    this.interval = null;
    this.store = new Store('backupConfig.json', {
      enabled: true,
      scheduleDay: 0, // 0 = Sunday
      scheduleTime: '10:00', // 10:00 AM IST
      retentionCount: 4, // Keep last 4 weekly backups
      lastBackupDate: null,
      lastBackupStatus: 'none',
      lastBackupFile: null
    });
  }

  async start() {
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(() => this.tick(), INTERVAL_MS);
    console.log('[BackupScheduler] Weekly backup scheduler initialized (Sunday 10:00 AM IST).');
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }

  async getConfig() {
    return await this.store.read();
  }

  async updateConfig(newConfig) {
    const current = await this.store.read();
    const updated = { ...current, ...newConfig };
    await this.store.write(updated);
    return updated;
  }

  async tick() {
    try {
      const config = await this.store.read();
      if (!config.enabled) return;

      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false
      });
      
      const parts = formatter.formatToParts(now);
      const y = parts.find(p => p.type === 'year').value;
      const m = parts.find(p => p.type === 'month').value;
      const d = parts.find(p => p.type === 'day').value;
      const h = parts.find(p => p.type === 'hour').value;
      const min = parts.find(p => p.type === 'minute').value;
      
      const currentDateStr = `${y}-${m}-${d}`;
      const currentTimeStr = `${h}:${min}`;
      
      const istDateStr = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
      const istDate = new Date(istDateStr);
      const currentDayOfWeek = istDate.getDay();

      if (
        currentDayOfWeek === config.scheduleDay &&
        currentTimeStr === config.scheduleTime &&
        config.lastBackupDate !== currentDateStr
      ) {
        console.log('[BackupScheduler] Executing scheduled weekly backup (Sunday 10:00 AM IST)...');
        config.lastBackupDate = currentDateStr;

        try {
          const result = await backupService.createBackup();
          config.lastBackupStatus = 'success';
          config.lastBackupFile = result.archive;
          await this.store.write(config);

          await notificationEngine.sendNotification({
            title: 'Weekly Backup Succeeded',
            body: `Automated Sunday 10:00 AM backup created: ${result.archive}`,
            severity: 'info',
            category: 'storage',
            event: 'backup_success'
          });

          eventEngine.dispatchEvent('backup', 'backup_success', { file: result.archive });
        } catch (err) {
          console.error('[BackupScheduler] Backup failed:', err);
          config.lastBackupStatus = 'failed';
          await this.store.write(config);

          await notificationEngine.sendNotification({
            title: 'Weekly Backup Failed',
            body: `Automated Sunday backup failed: ${err.message}`,
            severity: 'critical',
            category: 'storage',
            event: 'backup_failed'
          });

          eventEngine.dispatchEvent('backup', 'backup_failed', { error: err.message });
        }
      }
    } catch (err) {
      console.error('[BackupScheduler] Tick error:', err);
    }
  }
}

module.exports = new BackupScheduler();
