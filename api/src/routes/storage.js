const express = require('express');
const router = express.Router();
const { getStorageInfo } = require('../services/storageService');
const { listFiles, createDirectory, deleteFile } = require('../services/fileService');
const { getBackupInfo, createBackup, deleteBackup } = require('../services/backupService');
const { requireServerControl } = require('../middleware/auth');
const { safeJson } = require('../utils/safeJson');

router.get('/', async (req, res, next) => {
  try {
    const data = await getStorageInfo();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/files', async (req, res, next) => {
  try {
    const requestedPath = req.query.path || '/home/madesh';
    const data = await listFiles(requestedPath);
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.get('/download', async (req, res, next) => {
  try {
    const targetPath = req.query.path;
    if (!targetPath) return res.status(400).json({ error: 'path required' });
    
    // basic validation to ensure it's a file
    const fs = require('fs');
    const path = require('path');
    const safePath = path.resolve(targetPath);
    
    const { ALLOWED_ROOTS } = require('../services/fileService');
    const isAllowed = ALLOWED_ROOTS.some(root => {
      if (root === '/') return true;
      return safePath === root || safePath.startsWith(root + path.sep);
    });
    if (!isAllowed) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const stat = await fs.promises.stat(safePath);
    if (stat.isDirectory()) {
      const folderName = path.basename(safePath) || 'archive';
      res.setHeader('Content-Disposition', `attachment; filename="${folderName}.tar.gz"`);
      res.setHeader('Content-Type', 'application/gzip');
      const { spawn } = require('child_process');
      const tarProcess = spawn('tar', ['-czf', '-', '-C', path.dirname(safePath), path.basename(safePath)]);
      tarProcess.stdout.pipe(res);
      tarProcess.on('error', (e) => {
        console.error('Tar error:', e);
        if (!res.headersSent) res.status(500).end();
      });
      return;
    }

    res.download(safePath);
  } catch (err) {
    next(err);
  }
});

router.post('/mkdir', requireServerControl, async (req, res, next) => {
  try {
    const { path: targetPath } = req.body;
    if (!targetPath) return res.status(400).json({ error: 'path required' });
    const data = await createDirectory(targetPath);
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.delete('/files', requireServerControl, async (req, res, next) => {
  try {
    const targetPath = req.query.path || req.body.path;
    if (!targetPath) return res.status(400).json({ error: 'path required' });
    const data = await deleteFile(targetPath);
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.get('/backups', async (req, res, next) => {
  try {
    const data = await getBackupInfo();
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.post('/backups/create', requireServerControl, async (req, res, next) => {
  try {
    const data = await createBackup();
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.delete('/backups/:name', requireServerControl, async (req, res, next) => {
  try {
    const { name } = req.params;
    const data = await deleteBackup(name);
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.get('/backup-schedule', async (req, res, next) => {
  try {
    const backupScheduler = require('../services/backupScheduler');
    const schedule = await backupScheduler.getConfig();
    res.json(safeJson(schedule));
  } catch (err) {
    next(err);
  }
});

router.post('/backup-schedule', requireServerControl, async (req, res, next) => {
  try {
    const backupScheduler = require('../services/backupScheduler');
    const updated = await backupScheduler.updateConfig(req.body);
    res.json(safeJson(updated));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
