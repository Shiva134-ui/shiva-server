const express = require('express');
const router = express.Router();
const { getSystemInfo } = require('../services/systemService');
const { safeJson } = require('../utils/safeJson');

router.get('/', (req, res, next) => {
  try {
    const data = getSystemInfo();
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
