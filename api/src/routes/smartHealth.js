const express = require('express');
const router = express.Router();
const smartHealth = require('../services/smartHealthService');

router.get('/', async (req, res, next) => {
  try {
    const data = await smartHealth.getDeepHealth();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
