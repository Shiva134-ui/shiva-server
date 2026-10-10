const express = require('express');
const router = express.Router();
const updateService = require('../services/containerUpdateService');
const { requireServerControl } = require('../middleware/auth');

router.get('/', async (req, res, next) => {
  try {
    const data = await updateService.getUpdatableImages();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post('/pull', requireServerControl, async (req, res, next) => {
  try {
    const { image } = req.body;
    const result = await updateService.pullImage(image);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
