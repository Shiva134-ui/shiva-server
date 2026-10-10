const fs = require('fs');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getMessaging } = require('firebase-admin/messaging');

const config = require('./config');

let isInitialized = false;
let auth = null;
let messaging = null;

if (config.firebaseAdminKeyPath) {
  try {
    if (!fs.existsSync(config.firebaseAdminKeyPath)) {
      throw new Error(
        `Firebase Admin key not found: ${config.firebaseAdminKeyPath}`
      );
    }

    const serviceAccount = JSON.parse(
      fs.readFileSync(config.firebaseAdminKeyPath, 'utf8')
    );

    if (
      !serviceAccount.project_id ||
      !serviceAccount.client_email ||
      !serviceAccount.private_key
    ) {
      throw new Error('Firebase Admin credential is incomplete');
    }

    const app =
      getApps().length > 0
        ? getApps()[0]
        : initializeApp({
            credential: cert(serviceAccount),
          });

    auth = getAuth(app);
    messaging = getMessaging(app);
    isInitialized = true;

    console.log('[FIREBASE] Admin SDK initialized.');
  } catch (err) {
    console.error(
      '[FIREBASE] Failed to initialize Admin SDK:',
      err.message
    );
  }
} else {
  console.warn(
    '[FIREBASE] FIREBASE_ADMIN_KEY_PATH not set. Firebase auth will not work.'
  );
}

module.exports = {
  auth,
  messaging,
  isInitialized,
};