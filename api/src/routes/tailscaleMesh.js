const express = require('express');
const router = express.Router();
const tailscaleMesh = require('../services/tailscaleMeshService');

router.get('/', async (req, res, next) => {
  try {
    const data = await tailscaleMesh.getMeshStatus();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
