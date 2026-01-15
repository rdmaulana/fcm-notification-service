const express = require('express');
const { checkHealth: checkDbHealth } = require('../config/database');
const { checkHealth: checkRabbitMQHealth } = require('../config/rabbitmq');
const { checkHealth: checkFirebaseHealth } = require('../config/firebase');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Health check endpoint
 * Returns status of all service dependencies
 */
router.get('/health', async (req, res) => {
  try {
    const [dbHealth, rabbitHealth, firebaseHealth] = await Promise.all([
      checkDbHealth(),
      checkRabbitMQHealth(),
      checkFirebaseHealth(),
    ]);

    const allHealthy =
      dbHealth.status === 'connected' &&
      rabbitHealth.status === 'connected' &&
      firebaseHealth.status === 'initialized';

    const response = {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        mysql: dbHealth.status,
        rabbitmq: rabbitHealth.status,
        fcm: firebaseHealth.status,
      },
    };

    // Add error details if unhealthy
    if (!allHealthy) {
      response.details = {};
      if (dbHealth.error) response.details.mysql = dbHealth.error;
      if (rabbitHealth.error) response.details.rabbitmq = rabbitHealth.error;
      if (firebaseHealth.error) response.details.fcm = firebaseHealth.error;
    }

    const statusCode = allHealthy ? 200 : 503;
    res.status(statusCode).json(response);
  } catch (error) {
    logger.error({ error: error.message }, 'Health check failed');
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

module.exports = router;
