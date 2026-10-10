require('dotenv').config({ path: '/etc/madesh-api/api.env' });
require('dotenv').config();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3001,
  apiToken: process.env.API_TOKEN || null,
  firebaseAdminKeyPath: process.env.FIREBASE_ADMIN_KEY_PATH || null,
  corsOrigins: Array.from(new Set([
    ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(v => v.trim()).filter(Boolean) : []),
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://madesh.in',
    'https://www.madesh.in',
    'https://cloud.madesh.in',
    'https://api.madesh.in'
  ])),
  serverControlUids: process.env.SERVER_CONTROL_UIDS
    ? process.env.SERVER_CONTROL_UIDS.split(',').map(v => v.trim()).filter(Boolean)
    : [],
  serviceAllowlist: process.env.SERVICE_ALLOWLIST
    ? process.env.SERVICE_ALLOWLIST.split(',').map(v => v.trim()).filter(Boolean)
    : ['madesh-api', 'cloudflared', 'docker'],
  dockerContainerAllowlist: process.env.DOCKER_CONTAINER_ALLOWLIST
    ? process.env.DOCKER_CONTAINER_ALLOWLIST.split(',').map(v => v.trim()).filter(Boolean)
    : [],
  shivaUrl: process.env.SHIVA_URL || 'http://127.0.0.1:8787',
  shivaAdminKey: process.env.SHIVA_ADMIN_KEY || null
};
