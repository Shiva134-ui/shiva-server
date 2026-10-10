const express = require('express');
const router = express.Router();
const wanDdns = require('../services/wanDdnsService');

router.get('/', async (req, res, next) => {
  try {
    const data = await wanDdns.getStatus();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
