const express = require('express');
const router = express.Router();
const speedtest = require('../services/speedtestService');

router.get('/', async (req, res, next) => {
  try {
    const status = await speedtest.getStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
});

router.post('/run', async (req, res, next) => {
  try {
    const result = await speedtest.runTest();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
