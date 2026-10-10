const express = require('express');
const router = express.Router();
const securityWatchdog = require('../services/securityWatchdogService');

router.get('/', async (req, res, next) => {
  try {
    const data = await securityWatchdog.getStatus();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
