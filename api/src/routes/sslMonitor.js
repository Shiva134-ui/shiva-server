const express = require('express');
const router = express.Router();
const sslMonitor = require('../services/sslMonitorService');

router.get('/', async (req, res, next) => {
  try {
    const data = await sslMonitor.checkAll();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
