const { getChannel } = require('../config/rabbitmq');
const logger = require('../utils/logger');

/**
 * Publish notification result to notification.done topic
 * @param {string} identifier - Message identifier
 * @param {string} deliverAt - ISO 8601 timestamp
 * @returns {Promise<boolean>}
 */
async function publishNotification(identifier, deliverAt) {
  const topicName = process.env.TOPIC_NAME || 'notification.done';
  const channel = getChannel();

  const payload = {
    identifier,
    deliverAt,
  };

  const message = Buffer.from(JSON.stringify(payload));

  try {
    const published = channel.publish(topicName, '', message, {
      persistent: true,
      contentType: 'application/json',
    });

    if (published) {
      logger.info({ identifier, topicName }, 'Published to notification.done topic');
    } else {
      logger.warn({ identifier }, 'Channel buffer is full, message queued');
    }

    return published;
  } catch (error) {
    logger.error(
      { identifier, error: error.message },
      'Failed to publish to topic'
    );
    throw error;
  }
}

module.exports = {
  publishNotification,
};
