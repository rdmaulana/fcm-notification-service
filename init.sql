-- FCM Notification Service Database Initialization
-- This script runs automatically when the MySQL container first starts

USE notification_db;

-- Create fcm_job table
CREATE TABLE IF NOT EXISTS fcm_job (
  id INT AUTO_INCREMENT PRIMARY KEY,
  identifier VARCHAR(255) UNIQUE NOT NULL,
  deliverAt TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_identifier (identifier),
  INDEX idx_deliverAt (deliverAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Grant permissions (for development)
GRANT ALL PRIVILEGES ON notification_db.* TO 'root'@'%';
FLUSH PRIVILEGES;
