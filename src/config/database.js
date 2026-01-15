const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

let pool = null;

/**
 * Initialize MySQL connection pool
 */
async function initDatabase() {
  if (pool) {
    return pool;
  }

  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'notification_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });

  try {
    const connection = await pool.getConnection();
    logger.info('MySQL connection established successfully');
    connection.release();
    return pool;
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to connect to MySQL');
    throw error;
  }
}

/**
 * Get the database pool
 */
function getPool() {
  if (!pool) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return pool;
}

/**
 * Check database health
 */
async function checkHealth() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return { status: 'connected' };
  } catch (error) {
    return { status: 'disconnected', error: error.message };
  }
}

/**
 * Close all database connections
 */
async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('MySQL connections closed');
  }
}

module.exports = {
  initDatabase,
  getPool,
  checkHealth,
  closeDatabase,
};
