const express = require('express');
const router = express.Router();
const cronService = require('../services/cronService');
const { requireServerControl } = require('../middleware/auth');

router.get('/', async (req, res, next) => {
  try {
    const data = await cronService.getJobs();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireServerControl, async (req, res, next) => {
  try {
    const data = await cronService.addJob(req.body);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireServerControl, async (req, res, next) => {
  try {
    const data = await cronService.updateJob(req.params.id, req.body);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireServerControl, async (req, res, next) => {
  try {
    const data = await cronService.deleteJob(req.params.id);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
