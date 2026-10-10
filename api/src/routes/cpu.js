const express = require('express');
const router = express.Router();
const { getCpuInfo } = require('../services/cpuService');
const { safeJson } = require('../utils/safeJson');

router.get('/', async (req, res, next) => {
  try {
    const data = await getCpuInfo('route');
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
