const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

let firebaseApp = null;

/**
 * Initialize Firebase Admin SDK
 */
function initFirebase() {
  if (firebaseApp) {
    return firebaseApp;
  }

  const credentialsPath = process.env.FIREBASE_CREDENTIALS_PATH || './firebase-conf.json';
  const absolutePath = path.resolve(credentialsPath);

  if (!fs.existsSync(absolutePath)) {
    logger.error({ path: absolutePath }, 'Firebase credentials file not found');
    throw new Error(`Firebase credentials file not found at: ${absolutePath}`);
  }

  try {
    const serviceAccount = require(absolutePath);

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
    });

    logger.info(
      { projectId: firebaseApp.options.projectId },
      'Firebase Admin SDK initialized'
    );

    return firebaseApp;
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to initialize Firebase Admin SDK');
    throw error;
  }
}

/**
 * Get Firebase Messaging instance
 */
function getMessaging() {
  if (!firebaseApp) {
    throw new Error('Firebase not initialized. Call initFirebase() first.');
  }
  return admin.messaging();
}

/**
 * Check Firebase health
 */
async function checkHealth() {
  try {
    if (firebaseApp) {
      return { status: 'initialized' };
    }
    return { status: 'not_initialized' };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

module.exports = {
  initFirebase,
  getMessaging,
  checkHealth,
};
