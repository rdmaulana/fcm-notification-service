require('dotenv').config();

const express = require('express');
const logger = require('./utils/logger');
const { initDatabase, closeDatabase } = require('./config/database');
const { initRabbitMQ, closeRabbitMQ } = require('./config/rabbitmq');
const { initFirebase } = require('./config/firebase');
const { startConsumer } = require('./services/queueConsumer');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use('/', healthRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'FCM Notification Service',
    version: '1.0.0',
    endpoints: {
      health: '/health'
    },
  });
});

/**
 * Initialize all services
 */
async function initializeServices() {
  logger.info('Initializing services...');

  // 1. Initialize Firebase (can work without DB/RabbitMQ)
  try {
    initFirebase();
  } catch (error) {
    logger.error({ error: error.message }, 'Firebase initialization failed');
    throw error;
  }

  // 2. Initialize Database
  try {
    await initDatabase();
  } catch (error) {
    logger.error({ error: error.message }, 'Database initialization failed');
    throw error;
  }

  // 3. Initialize RabbitMQ
  try {
    await initRabbitMQ();
  } catch (error) {
    logger.error({ error: error.message }, 'RabbitMQ initialization failed');
    throw error;
  }

  // 4. Start queue consumer
  try {
    await startConsumer();
  } catch (error) {
    logger.error({ error: error.message }, 'Queue consumer failed to start');
    throw error;
  }

  logger.info('All services initialized successfully');
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal) {
  logger.info({ signal }, 'Received shutdown signal, closing connections...');

  try {
    await closeRabbitMQ();
    await closeDatabase();
    logger.info('All connections closed. Exiting.');
    process.exit(0);
  } catch (error) {
    logger.error({ error: error.message }, 'Error during shutdown');
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error({ error: error.message, stack: error.stack }, 'Uncaught exception');
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled rejection');
});

/**
 * Start the application
 */
async function start() {
  try {
    await initializeServices();

    app.listen(PORT, () => {
      logger.info({ port: PORT }, 'HTTP server started');
      logger.info('FCM Notification Service is ready to process messages');
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to start application');
    process.exit(1);
  }
}

start();
