const fs = require('fs');
const path = require('path');
const db = require('./config/db');

async function applyPhase4Schema() {
  try {
    console.log('Applying Phase 4 Schema Updates...');

    // Add subscription fields to restaurants table
    const alterRestaurantsQuery = `
      ALTER TABLE restaurants
      ADD COLUMN subscription_plan ENUM('free', 'pro', 'premium') DEFAULT 'free',
      ADD COLUMN subscription_status ENUM('active', 'expired', 'cancelled', 'trial', 'suspended') DEFAULT 'trial',
      ADD COLUMN trial_start_date TIMESTAMP NULL,
      ADD COLUMN trial_end_date TIMESTAMP NULL,
      ADD COLUMN plan_expiry TIMESTAMP NULL,
      ADD COLUMN is_trial_used BOOLEAN DEFAULT FALSE;
    `;
    await db.query(alterRestaurantsQuery);
    console.log('Added subscription fields to restaurants table.');

    // Create usage_tracking table
    const createUsageTrackingQuery = `
      CREATE TABLE IF NOT EXISTS usage_tracking (
          id INT AUTO_INCREMENT PRIMARY KEY,
          restaurant_id INT NOT NULL,
          feature_name VARCHAR(100) NOT NULL,
          usage_count INT DEFAULT 0,
          last_reset_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
          UNIQUE KEY unique_restaurant_feature (restaurant_id, feature_name)
      );
    `;
    await db.query(createUsageTrackingQuery);
    console.log('Created usage_tracking table.');

    console.log('Phase 4 Schema applied successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error applying Phase 4 schema:', error);
    process.exit(1);
  }
}

applyPhase4Schema();
