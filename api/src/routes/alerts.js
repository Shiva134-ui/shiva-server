const express = require('express');
const router = express.Router();
const { getAlerts } = require('../services/alertService');

router.get('/', async (req, res, next) => {
  try {
    const data = await getAlerts();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
