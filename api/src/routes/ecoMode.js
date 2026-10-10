const express = require('express');
const router = express.Router();
const ecoMode = require('../services/ecoModeService');
const { requireServerControl } = require('../middleware/auth');

router.get('/', async (req, res, next) => {
  try {
    const data = await ecoMode.getStatus();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post('/toggle', requireServerControl, async (req, res, next) => {
  try {
    const { state } = req.body;
    const result = await ecoMode.toggleEco(state);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/config', requireServerControl, async (req, res, next) => {
  try {
    const updated = await ecoMode.updateConfig(req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
