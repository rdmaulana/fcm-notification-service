const { getPool } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Convert ISO datetime to MySQL TIMESTAMP format
 * @param {string} isoString - ISO 8601 datetime string
 * @returns {string} MySQL-compatible datetime string
 */
function toMySQLDateTime(isoString) {
  const date = new Date(isoString);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Save FCM job record to database
 * @param {string} identifier - Unique message identifier
 * @param {string} deliverAt - ISO 8601 timestamp
 * @returns {Promise<{ success: boolean, isDuplicate?: boolean, error?: string }>}
 */
async function saveFcmJob(identifier, deliverAt) {
  const pool = getPool();
  const mysqlDateTime = toMySQLDateTime(deliverAt);

  try {
    const [result] = await pool.execute(
      'INSERT INTO fcm_job (identifier, deliverAt) VALUES (?, ?)',
      [identifier, mysqlDateTime]
    );

    logger.info(
      { identifier, insertId: result.insertId },
      'FCM job saved to database'
    );

    return { success: true, insertId: result.insertId };
  } catch (error) {
    // Check for duplicate entry
    if (error.code === 'ER_DUP_ENTRY') {
      logger.warn({ identifier }, 'Duplicate identifier - already processed');
      return { success: true, isDuplicate: true };
    }

    logger.error(
      { identifier, error: error.message },
      'Failed to save FCM job'
    );
    throw error;
  }
}

/**
 * Find FCM job by identifier
 * @param {string} identifier
 */
async function findByIdentifier(identifier) {
  const pool = getPool();

  const [rows] = await pool.execute(
    'SELECT * FROM fcm_job WHERE identifier = ?',
    [identifier]
  );

  return rows[0] || null;
}

module.exports = {
  saveFcmJob,
  findByIdentifier,
};
