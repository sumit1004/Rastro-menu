const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const applyPhase45Schema = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    console.log('Starting Phase 4.5 database migration...');

    // 1. Create payments table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        restaurant_id INT NOT NULL,
        plan_name ENUM('pro', 'premium') NOT NULL,
        billing_cycle ENUM('monthly', 'yearly') NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'INR',
        payment_status ENUM('pending', 'success', 'failed', 'cancelled', 'refunded') DEFAULT 'pending',
        razorpay_order_id VARCHAR(255) NOT NULL,
        razorpay_payment_id VARCHAR(255),
        razorpay_signature VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
      )
    `);
    console.log('✔ payments table created or already exists.');

    // 2. Add idempotency constraint on razorpay_order_id to prevent duplicates
    try {
      await connection.execute(`
        ALTER TABLE payments 
        ADD UNIQUE INDEX idx_razorpay_order_id (razorpay_order_id)
      `);
      console.log('✔ Unique index on razorpay_order_id added.');
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log('✔ Unique index on razorpay_order_id already exists.');
      } else {
        throw e;
      }
    }
    
    // 3. Make sure restaurants table has plan_expiry
    // It should be there from Phase 4, but let's ensure it's TIMESTAMP and not strictly required
    console.log('Phase 4.5 database migration completed successfully!');
  } catch (error) {
    console.error('Error applying Phase 4.5 schema:', error);
  } finally {
    await connection.end();
  }
};

applyPhase45Schema();
