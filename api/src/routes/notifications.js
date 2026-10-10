const express = require('express');
const router = express.Router();
const notificationEngine = require('../services/notificationEngine');

router.get('/', async (req, res, next) => {
  try {
    const history = await notificationEngine.getHistory();
    res.json({ history });
  } catch (err) {
    next(err);
  }
});

router.get('/config', async (req, res, next) => {
  try {
    const config = await notificationEngine.getConfig();
    res.json({ config });
  } catch (err) {
    next(err);
  }
});

router.post('/config', async (req, res, next) => {
  try {
    const newConfig = req.body;
    await notificationEngine.saveConfig(newConfig);
    res.json({ success: true, config: newConfig });
  } catch (err) {
    next(err);
  }
});

router.get('/history', async (req, res, next) => {
  try {
    const history = await notificationEngine.getHistory();
    res.json({ history });
  } catch (err) {
    next(err);
  }
});

router.delete('/history', async (req, res, next) => {
  try {
    await notificationEngine.clearHistory();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/register-device', async (req, res, next) => {
  try {
    const { token, platform, browser, name } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    await notificationEngine.registerDevice({ token, platform, browser, name, active: true });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/device/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    await notificationEngine.removeDevice(token);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get('/devices', async (req, res, next) => {
  try {
    const devices = await notificationEngine.getDevices();
    res.json({ devices });
  } catch (err) {
    next(err);
  }
});

router.post('/test', async (req, res, next) => {
  try {
    const { title, body } = req.body;
    const result = await notificationEngine.sendNotification({
      title: title || 'Test Notification',
      body: body || 'This is a test notification from MΛDESH Server.',
      severity: 'info',
      category: 'system'
    });
    res.json({ success: true, result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
