const express = require('express');
const router = express.Router();
const { 
  getUsers, 
  getUpdates, 
  getSettings, 
  refreshUpdates, 
  upgradePackages, 
  terminateSession 
} = require('../services/adminService');
const { requireServerControl } = require('../middleware/auth');
const { safeJson } = require('../utils/safeJson');

router.get('/', async (req, res, next) => {
  try {
    const settings = await getSettings();
    res.json(safeJson({ status: 'ok', settings }));
  } catch (err) {
    next(err);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const data = await getUsers();
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.post('/sessions/terminate', requireServerControl, async (req, res, next) => {
  try {
    const line = req.body.line || req.body.terminal;
    if (!line) return res.status(400).json({ error: 'line or terminal parameter required' });
    const data = await terminateSession(line);
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.get('/updates', async (req, res, next) => {
  try {
    const data = await getUpdates();
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.post('/updates/refresh', requireServerControl, async (req, res, next) => {
  try {
    const data = await refreshUpdates();
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.post('/updates/upgrade', requireServerControl, async (req, res, next) => {
  try {
    const { package: pkg } = req.body;
    const data = await upgradePackages(pkg);
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.get('/settings', async (req, res, next) => {
  try {
    const data = await getSettings();
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
