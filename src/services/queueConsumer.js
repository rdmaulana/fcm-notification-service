const { getChannel } = require('../config/rabbitmq');
const { validateMessage } = require('../validators/messageValidator');
const { sendFCM } = require('./fcmService');
const { saveFcmJob } = require('../models/FcmJob');
const { publishNotification } = require('./notificationPublisher');
const logger = require('../utils/logger');

/**
 * Process a single message from the queue
 * @param {object} msg - RabbitMQ message
 * @param {object} channel - RabbitMQ channel
 */
async function processMessage(msg, channel) {
  let data;

  try {
    data = JSON.parse(msg.content.toString());

    const validation = validateMessage(data);
    if (!validation.valid) {
      logger.warn(
        { error: validation.error, identifier: data?.identifier },
        'Invalid message format'
      );
      channel.nack(msg, false, false); // Don't requeue invalid messages
      return;
    }

    channel.ack(msg);
    logger.info({ identifier: data.identifier }, 'Message acknowledged');
  } catch (parseError) {
    logger.error({ error: parseError.message }, 'Failed to parse message');
    channel.nack(msg, false, false); // Don't requeue unparseable messages
    return;
  }

  // POST-ACK PROCESSING
  try {
    const fcmResult = await sendFCM(data);

    if (!fcmResult.success) {
      logger.error(
        {
          identifier: data.identifier,
          error: fcmResult.error,
          deviceId: data.deviceId.substring(0, 20) + '...',
        },
        'FCM delivery failed'
      );
      return;
    }

    const deliverAt = new Date().toISOString();
    logger.info({ identifier: data.identifier, deliverAt }, 'FCM sent successfully');

    try {
      await saveFcmJob(data.identifier, deliverAt);
    } catch (dbError) {
      logger.error(
        { identifier: data.identifier, error: dbError.message },
        'Database save failed'
      );
      return;
    }

    // Publish to notification.done topic
    try {
      await publishNotification(data.identifier, deliverAt);
    } catch (pubError) {
      logger.error(
        { identifier: data.identifier, error: pubError.message },
        'Failed to publish to topic'
      );
      // Log but don't fail - notification was delivered
    }
  } catch (error) {
    logger.error(
      {
        identifier: data?.identifier,
        error: error.message,
        stack: error.stack,
      },
      'Unexpected error in post-ACK processing'
    );
  }
}

/**
 * Start consuming messages from the queue
 */
async function startConsumer() {
  const queueName = process.env.QUEUE_NAME || 'notification.fcm';
  const channel = getChannel();

  logger.info({ queueName }, 'Starting queue consumer');

  await channel.consume(queueName, async (msg) => {
    if (msg) {
      await processMessage(msg, channel);
    }
  });

  logger.info({ queueName }, 'Queue consumer started successfully');
}

module.exports = {
  startConsumer,
  processMessage,
};
