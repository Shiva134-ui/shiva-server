const express = require('express');
const router = express.Router();
const { getSystemLogs, getDockerLogs, getAuditLogs } = require('../services/logService');
const { safeJson } = require('../utils/safeJson');

router.get('/', async (req, res, next) => {
  try {
    const { lines, unit } = req.query;
    const data = await getSystemLogs(lines || 100, unit);
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.get('/system', async (req, res, next) => {
  try {
    const { lines, unit } = req.query;
    const data = await getSystemLogs(lines, unit);
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.get('/docker', async (req, res, next) => {
  try {
    const { container, tail } = req.query;
    if (!container) {
      return res.json({ logs: [], container: null, totalLines: 0 });
    }
    const data = await getDockerLogs(container, tail);
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.get('/audit', async (req, res, next) => {
  try {
    const { lines } = req.query;
    const data = await getAuditLogs(lines);
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
