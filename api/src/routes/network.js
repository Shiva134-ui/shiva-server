const express = require('express');
const router = express.Router();
const { getNetworkInfo } = require('../services/networkService');
const { getFirewallInfo, toggleFirewall, addRule, deleteRule } = require('../services/firewallService');
const { runNetworkDiagnostics } = require('../services/networkDiagService');
const { requireServerControl } = require('../middleware/auth');
const { safeJson } = require('../utils/safeJson');

router.get('/', async (req, res, next) => {
  try {
    const data = await getNetworkInfo();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/interfaces', async (req, res, next) => {
  try {
    const data = await getNetworkInfo();
    res.json(safeJson(data.interfaces || []));
  } catch (err) {
    next(err);
  }
});

router.get('/firewall', async (req, res, next) => {
  try {
    const data = await getFirewallInfo();
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.post('/firewall/toggle', requireServerControl, async (req, res, next) => {
  try {
    const { enable } = req.body;
    const data = await toggleFirewall(Boolean(enable));
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.post('/firewall/rules', requireServerControl, async (req, res, next) => {
  try {
    const data = await addRule(req.body);
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.delete('/firewall/rules/:id', requireServerControl, async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await deleteRule(id);
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.get('/diagnostics', async (req, res, next) => {
  try {
    const data = await runNetworkDiagnostics();
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
