const express = require('express');
const router = express.Router();
const thermalGuard = require('../services/thermalGuardService');

router.get('/', async (req, res, next) => {
  try {
    const status = await thermalGuard.getStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
});

router.post('/config', async (req, res, next) => {
  try {
    const updated = await thermalGuard.updateConfig(req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.post('/resume', async (req, res, next) => {
  try {
    const result = await thermalGuard.resumeContainers();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
