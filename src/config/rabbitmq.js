const amqp = require('amqplib');
const logger = require('../utils/logger');

let connection = null;
let channel = null;

/**
 * Sleep helper for retry logic
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Connect to RabbitMQ with retry logic
 */
async function connectWithRetry(maxRetries = 5, baseDelay = 5000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
      connection = await amqp.connect(url);
      channel = await connection.createChannel();

      // Set prefetch count for load balancing
      const prefetch = parseInt(process.env.RABBITMQ_PREFETCH_COUNT, 10) || 10;
      await channel.prefetch(prefetch);

      logger.info({ prefetch }, 'RabbitMQ connection established');

      // Handle connection close
      connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        connection = null;
        channel = null;
      });

      connection.on('error', (error) => {
        logger.error({ error: error.message }, 'RabbitMQ connection error');
      });

      return { connection, channel };
    } catch (error) {
      const delay = baseDelay * attempt;
      logger.warn(
        { attempt, maxRetries, delay, error: error.message },
        'RabbitMQ connection attempt failed, retrying...'
      );

      if (attempt === maxRetries) {
        logger.error('Max retries reached. Failed to connect to RabbitMQ.');
        throw error;
      }

      await sleep(delay);
    }
  }
}

/**
 * Initialize RabbitMQ connection and setup queue/exchange
 */
async function initRabbitMQ() {
  const { channel } = await connectWithRetry();

  const queueName = process.env.QUEUE_NAME || 'notification.fcm';
  const topicName = process.env.TOPIC_NAME || 'notification.done';

  // Assert queue exists
  await channel.assertQueue(queueName, { durable: true });

  // Assert topic exchange for publishing results
  await channel.assertExchange(topicName, 'fanout', { durable: true });

  logger.info({ queueName, topicName }, 'RabbitMQ queue and exchange configured');

  return channel;
}

/**
 * Get the RabbitMQ channel
 */
function getChannel() {
  if (!channel) {
    throw new Error('RabbitMQ not initialized. Call initRabbitMQ() first.');
  }
  return channel;
}

/**
 * Check RabbitMQ health
 */
async function checkHealth() {
  try {
    if (connection && channel) {
      return { status: 'connected' };
    }
    return { status: 'disconnected' };
  } catch (error) {
    return { status: 'disconnected', error: error.message };
  }
}

/**
 * Close RabbitMQ connections
 */
async function closeRabbitMQ() {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
    logger.info('RabbitMQ connections closed');
  } catch (error) {
    logger.error({ error: error.message }, 'Error closing RabbitMQ connections');
  }
}

module.exports = {
  initRabbitMQ,
  getChannel,
  checkHealth,
  closeRabbitMQ,
};
