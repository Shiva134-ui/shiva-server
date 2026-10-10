const express = require('express');
const router = express.Router();
const { getServices, controlService } = require('../services/serviceManager');
const { requireServerControl } = require('../middleware/auth');
const { safeJson } = require('../utils/safeJson');

router.get('/', async (req, res, next) => {
  try {
    const data = await getServices();
    res.json(safeJson(data));
  } catch (err) {
    console.error('[Services Route] Error fetching services:', err.message);
    res.status(500).json({ error: 'Failed to fetch services', details: err.message });
  }
});

router.post('/:name/:action', requireServerControl, async (req, res, next) => {
  try {
    const { name, action } = req.params;
    
    // Basic validation
    if (!name || !action) {
      return res.status(400).json({ error: 'Missing required parameters: name or action' });
    }
    
    const validActions = ['start', 'stop', 'restart', 'enable', 'disable'];
    if (!validActions.includes(action.toLowerCase())) {
      return res.status(400).json({ error: `Invalid action: ${action}. Allowed: ${validActions.join(', ')}` });
    }

    const type = req.query.type || req.body?.type || 'service';
    const data = await controlService(name, action, type);
    res.json(data);
  } catch (err) {
    console.error(`[Services Route] Error controlling service ${req.params.name}:`, err.message);
    res.status(500).json({ error: 'Failed to execute service control', details: err.message });
  }
});

module.exports = router;
