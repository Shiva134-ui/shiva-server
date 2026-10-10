const express = require('express');
const router = express.Router();
const { killProcess } = require('../services/processService');
const { requireServerControl } = require('../middleware/auth');

router.post('/kill', requireServerControl, async (req, res, next) => {
  try {
    const { pid, signal } = req.body;
    await killProcess(pid, signal);
    res.json({ success: true, pid, signal, timestamp: new Date().toISOString() });
  } catch (err) {
    if (err.message.startsWith('Invalid PID') || err.message.startsWith('Invalid signal')) {
      const error = new Error(err.message);
      error.status = 400;
      error.code = 'INVALID_REQUEST';
      error.isPublic = true;
      return next(error);
    }
    next(err);
  }
});

module.exports = router;
