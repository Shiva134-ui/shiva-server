const fs = require('fs');
const path = require('path');
const { runCommand } = require('../utils/command');

async function getBackupInfo() {
  const backups = [];
  const searchDirs = ['/var/backups', '/home/madesh/backups'];

  for (const dir of searchDirs) {
    try {
      if (fs.existsSync(dir)) {
        const files = await fs.promises.readdir(dir);
        for (const file of files) {
          try {
            const filePath = path.join(dir, file);
            const stat = await fs.promises.stat(filePath);
            backups.push({
              name: file,
              path: filePath,
              directory: dir,
              sizeBytes: stat.size,
              mtime: stat.mtime.toISOString(),
              type: file.endsWith('.gz') ? 'compressed_archive' : file.endsWith('.sql') ? 'database_dump' : 'system_backup'
            });
          } catch (_) {}
        }
      }
    } catch (_) {}
  }

  // Check backup timers / services
  let backupServices = [];
  try {
    const stdout = await runCommand('systemctl', ['list-timers', '--all', '--no-pager']).catch(() => '');
    const lines = stdout.split('\n');
    for (const line of lines) {
      if (/backup|snapshot|rsync|timeshift/i.test(line)) {
        backupServices.push(line.trim());
      }
    }
  } catch (_) {}

  // Total size
  const totalSizeBytes = backups.reduce((sum, b) => sum + (b.sizeBytes || 0), 0);

  return {
    backups,
    totalCount: backups.length,
    totalSizeBytes,
    monitoredDirectories: searchDirs,
    activeTimers: backupServices,
    timestamp: new Date().toISOString()
  };
}

async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const targetDir = '/home/madesh/backups';
  if (!fs.existsSync(targetDir)) {
    await fs.promises.mkdir(targetDir, { recursive: true });
  }
  const archivePath = path.join(targetDir, `madesh-api-backup-${timestamp}.tar.gz`);
  await runCommand('tar', ['-czf', archivePath, '-C', '/opt/madesh-server/api', 'src']);
  return { success: true, archive: archivePath, timestamp: new Date().toISOString() };
}

async function deleteBackup(archiveName) {
  const safeName = path.basename(archiveName);
  const searchDirs = ['/var/backups', '/home/madesh/backups'];
  for (const dir of searchDirs) {
    const fullPath = path.join(dir, safeName);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      return { success: true, deleted: fullPath, timestamp: new Date().toISOString() };
    }
  }
  throw new Error(`Backup archive ${safeName} not found`);
}

module.exports = { getBackupInfo, createBackup, deleteBackup };
