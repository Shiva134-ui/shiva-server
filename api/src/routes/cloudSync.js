const express = require('express');
const router = express.Router();
const cloudSync = require('../services/cloudSyncService');
const { requireServerControl } = require('../middleware/auth');

router.get('/', async (req, res, next) => {
  try {
    const data = await cloudSync.getConfig();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post('/trigger', requireServerControl, async (req, res, next) => {
  try {
    const { profileId } = req.body;
    const result = await cloudSync.triggerSync(profileId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/profile', requireServerControl, async (req, res, next) => {
  try {
    const updated = await cloudSync.saveProfile(req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
