const { runCommand } = require('../utils/command');
const fs = require('fs');
const path = require('path');

function parseCronHuman(schedule) {
  const parts = schedule.trim().split(/\s+/);
  if (parts.length !== 5) return schedule;

  const [min, hour, dom, mon, dow] = parts;
  if (min === '0' && hour === '8' && dom === '*' && mon === '*' && dow === '*') {
    return 'Every day at 08:00 AM';
  }
  if (min === '0' && hour === '0' && dom === '*' && mon === '*' && dow === '*') {
    return 'Every day at 12:00 AM (Midnight)';
  }
  if (min === '0' && hour === '10' && dom === '*' && mon === '*' && dow === '0') {
    return 'Every Sunday at 10:00 AM';
  }
  if (min === '*/5' && hour === '*' && dom === '*' && mon === '*' && dow === '*') {
    return 'Every 5 minutes';
  }
  if (min === '0' && hour === '*/1' && dom === '*' && mon === '*' && dow === '*') {
    return 'Every hour on the hour';
  }
  if (min === '0' && hour === '*/6' && dom === '*' && mon === '*' && dow === '*') {
    return 'Every 6 hours';
  }
  if (min === '0' && hour === '3' && dom === '*' && mon === '*' && dow === '0') {
    return 'Every Sunday at 03:00 AM (SSD TRIM)';
  }
  if (min === '0' && hour === '4' && dom === '*' && mon === '*' && dow === '*') {
    return 'Every day at 04:00 AM (Logrotate)';
  }

  // General fallback parser
  let desc = `At minute ${min}`;
  if (hour !== '*') desc += `, hour ${hour}`;
  if (dom !== '*') desc += `, day-of-month ${dom}`;
  if (mon !== '*') desc += `, month ${mon}`;
  if (dow !== '*') desc += `, day-of-week ${dow}`;
  return desc;
}

// Memory fallback cache for development or when crontab is initialized
let devJobsCache = [
  {
    id: 'cron-dev-1',
    schedule: '0 3 * * 0',
    command: '/sbin/fstrim -av',
    enabled: true,
    comment: 'Weekly SSD wear leveling TRIM',
    humanSchedule: 'Every Sunday at 03:00 AM (SSD TRIM)'
  },
  {
    id: 'cron-dev-2',
    schedule: '0 4 * * *',
    command: 'journalctl --vacuum-time=7d',
    enabled: true,
    comment: 'Clean journal logs older than 7 days',
    humanSchedule: 'Every day at 04:00 AM (Logrotate)'
  }
];

class CronService {
  async getJobs() {
    let rawCrontab = '';
    let isLiveHost = false;
    try {
      rawCrontab = await runCommand('crontab', ['-l']).catch(() => '');
      if (rawCrontab) isLiveHost = true;
    } catch (_) {}

    // Also check sudo crontab if regular crontab returned empty
    if (!rawCrontab) {
      try {
        rawCrontab = await runCommand('sudo', ['crontab', '-l']).catch(() => '');
        if (rawCrontab) isLiveHost = true;
      } catch (_) {}
    }

    const lines = rawCrontab.split('\n');
    const jobs = [];
    let pendingComment = '';

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) {
        pendingComment = '';
        return;
      }

      if (trimmed.startsWith('#')) {
        const withoutHash = trimmed.replace(/^#\s*/, '');
        const cronMatch = withoutHash.match(/^([0-9*,\/-]+\s+[0-9*,\/-]+\s+[0-9*,\/-]+\s+[0-9*,\/-]+\s+[0-9*,\/-]+)\s+(.+)$/);
        if (cronMatch) {
          jobs.push({
            id: `cron-${index}`,
            lineIndex: index,
            schedule: cronMatch[1],
            command: cronMatch[2],
            enabled: false,
            comment: pendingComment,
            humanSchedule: parseCronHuman(cronMatch[1])
          });
          pendingComment = '';
          return;
        }

        pendingComment = withoutHash;
        return;
      }

      const cronMatch = trimmed.match(/^([0-9*,\/-]+\s+[0-9*,\/-]+\s+[0-9*,\/-]+\s+[0-9*,\/-]+\s+[0-9*,\/-]+)\s+(.+)$/);
      if (cronMatch) {
        jobs.push({
          id: `cron-${index}`,
          lineIndex: index,
          schedule: cronMatch[1],
          command: cronMatch[2],
          enabled: true,
          comment: pendingComment,
          humanSchedule: parseCronHuman(cronMatch[1])
        });
        pendingComment = '';
      }
    });

    // If on Windows dev or no crontab configured yet and in local mode, provide memory cache
    const finalJobs = (jobs.length > 0 || isLiveHost) ? jobs : devJobsCache;

    // Fetch systemd timers for complete infrastructure visibility
    let timers = [];
    try {
      const timerOut = await runCommand('systemctl', ['list-timers', '--all', '--no-pager']).catch(() => '');
      const timerLines = timerOut.trim().split('\n');
      if (timerLines.length > 1) {
        timers = timerLines.slice(1, 15).map(l => l.trim()).filter(l => l && !l.startsWith('10 timers') && !l.includes('NEXT'));
      }
    } catch (_) {}

    if (timers.length === 0 && (process.platform === 'win32' || process.env.NODE_ENV === 'development')) {
      timers = [
        'Mon 2026-10-12 00:00:00 IST   fstrim.timer                  fstrim.service',
        'Sun 2026-10-11 03:10:00 IST   logrotate.timer               logrotate.service',
        'Sat 2026-10-10 06:25:00 IST   apt-daily.timer               apt-daily.service',
        'Sat 2026-10-10 06:00:00 IST   systemd-tmpfiles-clean.timer  systemd-tmpfiles-clean.service'
      ];
    }

    return { jobs: finalJobs, timers, rawCrontab };
  }

  async saveJobs(jobs) {
    devJobsCache = [...jobs];

    const lines = [];
    jobs.forEach(job => {
      if (job.comment) lines.push(`# ${job.comment}`);
      const prefix = job.enabled ? '' : '# ';
      lines.push(`${prefix}${job.schedule} ${job.command}`);
    });

    const newCrontab = lines.join('\n') + '\n';
    
    // Write new crontab to server
    const tmpPath = `/tmp/crontab-${Date.now()}.tmp`;
    try {
      fs.writeFileSync(tmpPath, newCrontab);
      try {
        await runCommand('crontab', [tmpPath]);
      } catch (err) {
        await runCommand('sudo', ['crontab', tmpPath]).catch(() => null);
      }
    } catch (_) {
      // Ignore if filesystem is read-only or in dev
    } finally {
      try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (_) {}
    }

    return await this.getJobs();
  }

  async addJob(job) {
    const { jobs } = await this.getJobs();
    const newJob = {
      id: `cron-${Date.now()}`,
      schedule: job.schedule.trim(),
      command: job.command.trim(),
      comment: (job.comment || '').trim(),
      enabled: job.enabled !== false,
      humanSchedule: parseCronHuman(job.schedule)
    };
    jobs.push(newJob);
    return await this.saveJobs(jobs);
  }

  async updateJob(id, updates) {
    const { jobs } = await this.getJobs();
    const idx = jobs.findIndex(j => j.id === id);
    if (idx >= 0) {
      if (updates.schedule) {
        jobs[idx].schedule = updates.schedule.trim();
        jobs[idx].humanSchedule = parseCronHuman(updates.schedule);
      }
      if (updates.command) jobs[idx].command = updates.command.trim();
      if (typeof updates.comment === 'string') jobs[idx].comment = updates.comment.trim();
      if (typeof updates.enabled === 'boolean') jobs[idx].enabled = updates.enabled;
    }
    return await this.saveJobs(jobs);
  }

  async deleteJob(id) {
    const { jobs } = await this.getJobs();
    const filtered = jobs.filter(j => j.id !== id);
    return await this.saveJobs(filtered);
  }
}

module.exports = new CronService();
