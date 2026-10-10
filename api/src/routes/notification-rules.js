const express = require('express');
const router = express.Router();
const Store = require('../utils/store');
const rulesStore = new Store('notificationRules.json', { rules: [] });
const { requireAuth } = require('../middleware/auth'); // Optionally restrict rule editing to admins later

router.get('/', async (req, res, next) => {
  try {
    const data = await rulesStore.read();
    res.json({ rules: data.rules });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const newRule = req.body;
    if (!newRule.id) newRule.id = Date.now().toString();
    
    const data = await rulesStore.read();
    data.rules.push(newRule);
    await rulesStore.write(data);
    
    res.json({ success: true, rule: newRule });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedRule = req.body;
    
    const data = await rulesStore.read();
    const index = data.rules.findIndex(r => r.id === id);
    if (index >= 0) {
      data.rules[index] = { ...data.rules[index], ...updatedRule, id };
      await rulesStore.write(data);
      res.json({ success: true, rule: data.rules[index] });
    } else {
      res.status(404).json({ error: 'Rule not found' });
    }
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await rulesStore.read();
    data.rules = data.rules.filter(r => r.id !== id);
    await rulesStore.write(data);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
