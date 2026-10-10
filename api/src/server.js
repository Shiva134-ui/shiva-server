const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config/config');
const { requireAuth, optionalAuth } = require('./middleware/auth');
const { errorHandler } = require('./middleware/error');
const { requestLogger } = require('./middleware/requestLogger');

const app = express();

app.disable('x-powered-by');
app.use(helmet({ 
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

const corsOptions = {
  origin: (origin, callback) => {
    // Non-browser requests (mobile native app, curl, server-to-server)
    if (!origin) return callback(null, true);

    // Explicitly allowed origins
    if (config.corsOrigins && config.corsOrigins.includes(origin)) return callback(null, true);

    // Localhost and 127.0.0.1 on any port (for local dev)
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);

    // Vercel deployment preview and production domains
    if (/^https:\/\/([a-zA-Z0-9_-]+\.)?vercel\.app$/.test(origin)) return callback(null, true);

    // Subdomains of madesh.in
    if (/^https:\/\/([a-zA-Z0-9_-]+\.)?madesh\.in$/.test(origin)) return callback(null, true);

    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-token']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '100kb' }));
app.use(requestLogger);

// Public Routes
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'madesh-server-api',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// Authenticated Routes
app.use('/api/v1', requireAuth);

app.get('/api/v1/test-auth', (req, res) => {
  res.json({
    authenticated: true,
    uid: req.user.uid,
    authMethod: req.user.authMethod
  });
});

app.use('/api/v1/system/cpu', require('./routes/cpu'));
app.use('/api/v1/system/memory', require('./routes/memory'));
app.use('/api/v1/system/hardware', require('./routes/hardware'));
app.use('/api/v1/system/processes', require('./routes/processes'));
app.use('/api/v1/system', require('./routes/system'));
app.use('/api/v1/cpu', require('./routes/cpu'));
app.use('/api/v1/memory', require('./routes/memory'));
app.use('/api/v1/storage', require('./routes/storage'));
app.use('/api/v1/network', require('./routes/network'));
app.use('/api/v1/processes', require('./routes/processes'));
app.use('/api/v1/hardware', require('./routes/hardware'));
app.use('/api/v1/docker', require('./routes/docker'));
app.use('/api/v1/services', require('./routes/services'));
app.use('/api/v1/telemetry', require('./routes/telemetry'));
app.use('/api/v1/alerts', require('./routes/alerts'));
app.use('/api/v1/monitoring', require('./routes/monitoring'));
app.use('/api/v1/power', require('./routes/power'));
app.use('/api/v1/notifications', require('./routes/notifications'));
app.use('/api/v1/notification-rules', require('./routes/notification-rules'));
app.use('/api/v1/logs', require('./routes/logs'));
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/admin', require('./routes/admin'));
app.use('/api/v1/system', require('./routes/commands')); // For /api/v1/system/kill

// New Enhanced Homelab Routes
app.use('/api/v1/system/thermal-guard', require('./routes/thermalGuard'));
app.use('/api/v1/system/maintenance', require('./routes/maintenance'));
app.use('/api/v1/network/speedtest', require('./routes/speedtest'));
app.use('/api/v1/apps/portal', require('./routes/appPortal'));
app.use('/api/v1/system/terminal', require('./routes/terminal'));
app.use('/api/v1/system/cron', require('./routes/cron'));
app.use('/api/v1/system/audit-export', require('./routes/auditExport'));

// Additional Storage, Security, Power & Container Routes
app.use('/api/v1/storage/heatmap', require('./routes/storageHeatmap'));
app.use('/api/v1/storage/smart-deep', require('./routes/smartHealth'));
app.use('/api/v1/storage/sync', require('./routes/cloudSync'));
app.use('/api/v1/network/tailscale-mesh', require('./routes/tailscaleMesh'));
app.use('/api/v1/security/watchdog', require('./routes/securityWatchdog'));
app.use('/api/v1/security/ssl-monitor', require('./routes/sslMonitor'));
app.use('/api/v1/network/wan-ddns', require('./routes/wanDdns'));
app.use('/api/v1/power/tariff', require('./routes/electricityTariff'));
app.use('/api/v1/power/eco-mode', require('./routes/ecoMode'));
app.use('/api/v1/docker/updates', require('./routes/containerUpdates'));
app.use('/api/v1/docker/compose-files', require('./routes/composeEditor'));
app.use('/api/v1/apps/crafty', require('./routes/craftyWidget'));

// Initialize Background Daemon Services
try {
  const thermalGuard = require('./services/thermalGuardService');
  thermalGuard.init();
} catch (e) {
  console.warn('[Server] ThermalGuard init error:', e.message);
}

// 404 Handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  err.code = 'NOT_FOUND';
  next(err);
});

// Centralized Error Handler
app.use(errorHandler);

const electricityEngine = require('./services/electricityEngine');
const powerEngine = require('./services/powerEngine');
const backupScheduler = require('./services/backupScheduler');

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`MΛDESH Server API listening on 0.0.0.0:${config.port}`);
  electricityEngine.start();
  powerEngine.start();
  backupScheduler.start();
});
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
