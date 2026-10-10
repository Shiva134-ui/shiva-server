const express = require('express');
const router = express.Router();
const auditExport = require('../services/auditExportService');

router.get('/', async (req, res, next) => {
  try {
    const format = req.query.format || 'json';
    const auditData = await auditExport.generateAudit();

    if (format === 'markdown' || format === 'md') {
      const md = auditExport.generateMarkdown(auditData);
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${auditData.snapshotId}.md"`);
      return res.send(md);
    }

    res.json(auditData);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
