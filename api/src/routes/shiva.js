const express = require('express');
const router = express.Router();
const shivaService = require('../services/shivaService');
const { safeJson } = require('../utils/safeJson');

router.get('/state', async (req, res, next) => {
  try {
    const data = await shivaService.getState();
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.get('/models', async (req, res, next) => {
  try {
    const data = await shivaService.getModels();
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.get('/memory', async (req, res, next) => {
  try {
    const data = await shivaService.getMemory();
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.get('/tools', async (req, res, next) => {
  try {
    const data = await shivaService.getTools();
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.get('/tasks', async (req, res, next) => {
  try {
    const data = await shivaService.getTasks();
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.get('/activity', async (req, res, next) => {
  try {
    const data = await shivaService.getActivity();
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.get('/automations', async (req, res, next) => {
  try {
    res.json(safeJson([]));
  } catch (err) {
    next(err);
  }
});

router.get('/devices', async (req, res, next) => {
  try {
    res.json(safeJson([]));
  } catch (err) {
    next(err);
  }
});

router.get('/conversations', async (req, res, next) => {
  try {
    res.json(safeJson([]));
  } catch (err) {
    next(err);
  }
});

router.post('/message', async (req, res, next) => {
  try {
    const { message } = req.body || {};
    const data = await shivaService.sendMessage(message || '');
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.get('/providers', async (req, res, next) => {
  try {
    const data = await shivaService.getProviders();
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.get('/task-pools', async (req, res, next) => {
  try {
    const data = await shivaService.getTaskPools();
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.get('/benchmarks', async (req, res, next) => {
  try {
    const data = await shivaService.getBenchmarks();
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.post('/providers', async (req, res, next) => {
  try {
    const data = await shivaService.createProvider(req.body);
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.post('/models', async (req, res, next) => {
  try {
    const data = await shivaService.createModel(req.body);
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.post('/providers/:id/test', async (req, res, next) => {
  try {
    const data = await shivaService.testProvider(req.params.id);
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.delete('/providers/:id', async (req, res, next) => {
  try {
    const data = await shivaService.deleteProvider(req.params.id);
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.delete('/models/:id', async (req, res, next) => {
  try {
    const data = await shivaService.deleteModel(req.params.id);
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

// Provider Keys
router.get('/providers/:id/keys', async (req, res, next) => {
  try {
    const data = await shivaService.getProviderKeys(req.params.id);
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.post('/providers/:id/keys', async (req, res, next) => {
  try {
    const data = await shivaService.createProviderKey(req.params.id, req.body);
    res.status(201).json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.patch('/providers/:id/keys/:keyId', async (req, res, next) => {
  try {
    const data = await shivaService.updateProviderKey(req.params.id, req.params.keyId, req.body);
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.post('/providers/:id/keys/:keyId/reset-health', async (req, res, next) => {
  try {
    const data = await shivaService.resetProviderKeyHealth(req.params.id, req.params.keyId);
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.delete('/providers/:id/keys/:keyId', async (req, res, next) => {
  try {
    const data = await shivaService.deleteProviderKey(req.params.id, req.params.keyId);
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

// Client API Keys
router.get('/client-keys', async (req, res, next) => {
  try {
    const data = await shivaService.getClientKeys();
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.post('/client-keys', async (req, res, next) => {
  try {
    const data = await shivaService.createClientKey(req.body);
    res.status(201).json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.patch('/client-keys/:id', async (req, res, next) => {
  try {
    const data = await shivaService.updateClientKey(req.params.id, req.body);
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

router.delete('/client-keys/:id', async (req, res, next) => {
  try {
    const data = await shivaService.revokeClientKey(req.params.id);
    res.json(safeJson(data));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
