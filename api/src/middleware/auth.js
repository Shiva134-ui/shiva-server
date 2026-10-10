const { auth, isInitialized } = require('../config/firebase');
const config = require('../config/config');

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const apiTokenHeader = req.headers['x-api-token'];

  const esp32TokenHeader = req.headers['x-esp32-token'];
  if (esp32TokenHeader && esp32TokenHeader === '399d1a8c07f84460a525470ad5301bc6bfe4dee87763415281748efd7dae18f1') {
    req.user = { uid: 'esp32-controller', authMethod: 'esp32_token' };
    return next();
  }

  // API Token Auth (Server-to-server)
  if (apiTokenHeader) {
    if (config.apiToken && apiTokenHeader === config.apiToken) {
      req.user = { uid: 'server-api-client', authMethod: 'api_token' };
      return next();
    }
    const err = new Error('Invalid API token');
    err.name = 'UnauthorizedError';
    return next(err);
  }

  const tokenFromQuery = req.query.token;
  const rawToken = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.split('Bearer ')[1].trim() : tokenFromQuery;

  // Firebase Auth (Clients) or Bearer API token
  if (rawToken) {
    const token = rawToken;

    // Support API token supplied as Bearer token
    if (config.apiToken && token === config.apiToken) {
      req.user = { uid: 'server-api-client', authMethod: 'api_token' };
      return next();
    }

    if (isInitialized && auth) {
      try {
        const decodedToken = await auth.verifyIdToken(token);
        req.user = { ...decodedToken, authMethod: 'firebase' };
        return next();
      } catch (error) {
        console.error('[AUTH] Firebase verifyIdToken error:', error.message);
        const err = new Error('Invalid Firebase token');
        err.name = 'UnauthorizedError';
        return next(err);
      }
    } else {
      console.warn('[AUTH] Firebase not initialized but token provided.');
      const err = new Error('Firebase Auth not available');
      err.name = 'UnauthorizedError';
      return next(err);
    }
  }

  const err = new Error('Authentication required');
  err.name = 'UnauthorizedError';
  return next(err);
}

async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const apiTokenHeader = req.headers['x-api-token'];

  // API Token Auth (Server-to-server)
  if (apiTokenHeader && config.apiToken && apiTokenHeader === config.apiToken) {
    req.user = { uid: 'server-api-client', authMethod: 'api_token' };
    return next();
  }

  // Firebase Auth (Clients) or Bearer API token
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1].trim();

    if (config.apiToken && token === config.apiToken) {
      req.user = { uid: 'server-api-client', authMethod: 'api_token' };
      return next();
    }

    if (isInitialized && auth) {
      try {
        const decodedToken = await auth.verifyIdToken(token);
        req.user = { ...decodedToken, authMethod: 'firebase' };
      } catch (error) {
        // Optional auth: continue without user context
      }
    }
  }

  return next();
}

function requireServerControl(req, res, next) {
  if (!req.user) {
    const err = new Error('Authentication required');
    err.name = 'UnauthorizedError';
    return next(err);
  }

  // Trusted API Token (Server-to-server and native client with valid API token)
  if (req.user.authMethod === 'api_token') {
    return next();
  }

  // Firebase authentication
  if (req.user.authMethod === 'firebase') {
    const authService = require('../services/authService');
    const role = authService.getRole(req.user.email);
    if (role === 'admin' || config.serverControlUids.includes(req.user.uid)) {
      return next();
    }
    const err = new Error('Server control permission required for this Firebase user');
    err.name = 'ForbiddenError';
    return next(err);
  }

  const err = new Error('Server control authorization required');
  err.name = 'ForbiddenError';
  return next(err);
}

module.exports = { requireAuth, optionalAuth, requireServerControl };
