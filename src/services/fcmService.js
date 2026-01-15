const { getMessaging } = require('../config/firebase');
const logger = require('../utils/logger');

/**
 * Send FCM notification to a device
 * @param {object} data - Message data containing deviceId and text
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
async function sendFCM(data) {
  const { deviceId, text, identifier } = data;

  const message = {
    token: deviceId,
    notification: {
      title: 'Incoming message',
      body: text,
    },
    data: {
      identifier: identifier,
      type: data.type || 'notification',
    },
  };

  try {
    const messaging = getMessaging();
    const messageId = await messaging.send(message);

    logger.info(
      { identifier, messageId, deviceId: deviceId.substring(0, 20) + '...' },
      'FCM notification sent successfully'
    );

    return { success: true, messageId };
  } catch (error) {
    logger.error(
      {
        identifier,
        deviceId: deviceId.substring(0, 20) + '...',
        errorCode: error.code,
        error: error.message,
      },
      'FCM notification failed'
    );

    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }
}

module.exports = {
  sendFCM,
};
