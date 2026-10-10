const express = require('express');
const router = express.Router();
const appPortal = require('../services/appPortalService');
const { requireServerControl } = require('../middleware/auth');

router.get('/', async (req, res, next) => {
  try {
    const apps = await appPortal.getApps();
    res.json({ apps });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireServerControl, async (req, res, next) => {
  try {
    const apps = await appPortal.saveApp(req.body);
    res.json({ success: true, apps });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireServerControl, async (req, res, next) => {
  try {
    const apps = await appPortal.deleteApp(req.params.id);
    res.json({ success: true, apps });
  } catch (err) {
    next(err);
  }
});

router.post('/reset', async (req, res, next) => {
  try {
    const apps = await appPortal.resetDefaults();
    res.json({ success: true, apps });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
