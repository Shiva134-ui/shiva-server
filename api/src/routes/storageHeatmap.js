const express = require('express');
const router = express.Router();
const storageHeatmap = require('../services/storageHeatmapService');

router.get('/', async (req, res, next) => {
  try {
    const data = await storageHeatmap.getHeatmap();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
