const express = require('express');
const router = express.Router();
const { getProcesses } = require('../services/processService');
const { safeJson } = require('../utils/safeJson');

router.get('/', async (req, res, next) => {
  try {
    const limit = req.query.limit ? Math.min(Math.max(parseInt(req.query.limit, 10), 1), 200) : 50;
    const data = await getProcesses(limit);
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
