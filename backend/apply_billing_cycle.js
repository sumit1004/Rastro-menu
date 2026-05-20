const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const applyBillingCycleToRestaurants = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    console.log('Adding billing_cycle to restaurants table...');
    await connection.execute(`
      ALTER TABLE restaurants 
      ADD COLUMN billing_cycle ENUM('monthly', 'yearly') NULL AFTER subscription_plan
    `);
    console.log('✔ Column billing_cycle added successfully!');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('✔ Column billing_cycle already exists.');
    } else {
      console.error('Error:', error);
    }
  } finally {
    await connection.end();
  }
};

applyBillingCycleToRestaurants();
