const express = require('express');
const router = express.Router();
const { getMemoryInfo } = require('../services/memoryService');
const { safeJson } = require('../utils/safeJson');

router.get('/', (req, res, next) => {
  try {
    const data = getMemoryInfo();
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
