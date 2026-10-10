const express = require('express');
const router = express.Router();
const craftyWidget = require('../services/craftyWidgetService');
const { requireServerControl } = require('../middleware/auth');

router.get('/', async (req, res, next) => {
  try {
    const data = await craftyWidget.getStatus();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post('/action', requireServerControl, async (req, res, next) => {
  try {
    const { action } = req.body;
    const result = await craftyWidget.controlContainer(action);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
