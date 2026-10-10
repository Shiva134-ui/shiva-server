const express = require('express');
const router = express.Router();
const { getTelemetry } = require('../services/telemetryService');

router.get('/', async (req, res, next) => {
  try {
    const data = await getTelemetry();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
