const express = require('express');
const router = express.Router();
const { getDockerInfo, getContainers, getStats, getImages, getVolumes, getNetworks, controlContainer } = require('../services/dockerService');
const { requireServerControl } = require('../middleware/auth');
const { safeJson } = require('../utils/safeJson');

router.get('/', async (req, res, next) => {
  try {
    const data = await getDockerInfo();
    if (!data) return res.status(503).json({ error: { code: 'DOCKER_UNAVAILABLE', message: 'Docker is unavailable' } });
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.get('/containers', async (req, res, next) => {
  try {
    const data = await getContainers();
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.get('/stats', async (req, res, next) => {
  try {
    const data = await getStats();
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.get('/images', async (req, res, next) => {
  try {
    res.json(safeJson(await getImages()));
  } catch (err) {
    next(err);
  }
});

router.get('/volumes', async (req, res, next) => {
  try {
    res.json(safeJson(await getVolumes()));
  } catch (err) {
    next(err);
  }
});

router.get('/networks', async (req, res, next) => {
  try {
    res.json(safeJson(await getNetworks()));
  } catch (err) {
    next(err);
  }
});

router.get('/:container/logs', async (req, res, next) => {
  try {
    const { container } = req.params;
    const { getDockerLogs } = require('../services/logService');
    const tail = req.query.tail ? parseInt(req.query.tail, 10) : 100;
    const data = await getDockerLogs(container, tail);
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.post('/:container/:action', requireServerControl, async (req, res, next) => {
  try {
    const { container, action } = req.params;
    const data = await controlContainer(container, action);
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
