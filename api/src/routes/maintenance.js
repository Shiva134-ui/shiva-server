const express = require('express');
const router = express.Router();
const maintenance = require('../services/maintenanceService');
const { requireServerControl } = require('../middleware/auth');

router.get('/analyze', async (req, res, next) => {
  try {
    const data = await maintenance.analyze();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post('/clean', requireServerControl, async (req, res, next) => {
  try {
    const { targets } = req.body;
    const result = await maintenance.clean(targets || []);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
