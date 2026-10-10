const express = require('express');
const router = express.Router();
const tariffService = require('../services/electricityTariffService');
const { requireServerControl } = require('../middleware/auth');

router.get('/', async (req, res, next) => {
  try {
    const data = await tariffService.getTariff();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireServerControl, async (req, res, next) => {
  try {
    const updated = await tariffService.updateTariff(req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
