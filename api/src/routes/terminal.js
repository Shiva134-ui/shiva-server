const express = require('express');
const router = express.Router();
const terminal = require('../services/terminalService');
const { requireServerControl } = require('../middleware/auth');

router.get('/presets', (req, res) => {
  res.json({ presets: terminal.getPresets() });
});

router.post('/exec', requireServerControl, async (req, res, next) => {
  try {
    const { command } = req.body;
    if (!command) return res.status(400).json({ error: 'Command is required' });
    const result = await terminal.execute(command);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
