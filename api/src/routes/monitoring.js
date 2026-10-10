const express = require('express');
const router = express.Router();
const { getCpuInfo } = require('../services/cpuService');
const { getMemoryInfo } = require('../services/memoryService');
const { getStorageInfo } = require('../services/storageService');

router.get('/chart', async (req, res, next) => {
  try {
    const metric = req.query.metric;
    const timestamp = new Date().toISOString();
    
    if (metric === 'cpu') {
      const data = await getCpuInfo();
      return res.json({ metric: 'cpu', value: data.usagePercent, unit: 'percent', timestamp });
    } else if (metric === 'memory') {
      const data = await getMemoryInfo();
      return res.json({ metric: 'memory', value: data.usedPercent, unit: 'percent', timestamp });
    } else if (metric === 'storage') {
      const data = await getStorageInfo();
      const fs = data.filesystems.find(f => f.mount === '/') || data.filesystems[0];
      const val = fs ? fs.usedPercent : 0;
      return res.json({ metric: 'storage', value: val, unit: 'percent', timestamp });
    }
    
    res.status(400).json({ error: { code: 'INVALID_METRIC', message: 'Invalid metric requested' } });
  } catch (err) {
    next(err);
  }
});

router.get('/metrics', async (req, res, next) => {
  try {
    const [cpu, memory, storage] = await Promise.all([
      getCpuInfo(),
      getMemoryInfo(),
      getStorageInfo()
    ]);
    res.json({ cpu, memory, storage, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

router.get('/alerts', async (req, res, next) => {
  try {
    const alertService = require('../services/alertService');
    const alerts = await alertService.getAlerts();
    res.json({ alerts, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const [cpu, memory] = await Promise.all([
      getCpuInfo(),
      getMemoryInfo()
    ]);
    res.json({
      status: 'ok',
      cpuUsage: cpu.usagePercent,
      memoryUsage: memory.usedPercent,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

