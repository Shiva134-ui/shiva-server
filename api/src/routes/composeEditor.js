const express = require('express');
const router = express.Router();
const composeEditor = require('../services/composeEditorService');
const { requireServerControl } = require('../middleware/auth');

router.get('/files', async (req, res, next) => {
  try {
    const data = await composeEditor.listFiles();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/read', async (req, res, next) => {
  try {
    const { path: relPath } = req.query;
    if (!relPath) return res.status(400).json({ error: 'Path required' });
    const data = await composeEditor.readFile(relPath);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post('/save', requireServerControl, async (req, res, next) => {
  try {
    const { path: relPath, content } = req.body;
    if (!relPath || content === undefined) return res.status(400).json({ error: 'Path and content required' });
    const result = await composeEditor.saveFile(relPath, content);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
