const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { requireServerControl } = require('../middleware/auth');
const { safeJson } = require('../utils/safeJson');

router.get('/me', (req, res) => {
  const role = authService.checkAndRegisterUser(req.user);
  res.json({ role, user: req.user });
});

router.get('/users', requireServerControl, (req, res) => {
  res.json(safeJson(authService.getAllUsers()));
});

router.post('/users/approve', requireServerControl, (req, res) => {
  const email = req.body && req.body.email;
  if (!email) return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'email is required' } });
  authService.approveUser(email);
  res.json({ success: true, approved: email });
});

router.post('/users/reject', requireServerControl, (req, res) => {
  const email = req.body && req.body.email;
  if (!email) return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'email is required' } });
  authService.rejectUser(email);
  res.json({ success: true, rejected: email });
});

module.exports = router;
