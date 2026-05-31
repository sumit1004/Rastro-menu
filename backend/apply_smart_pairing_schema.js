const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function applySchema() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'rastro_db'
    });

    console.log('Applying smart pairing schema...');

    const columns = [
      'ADD COLUMN dish_role VARCHAR(50) DEFAULT NULL',
      'ADD COLUMN cuisine_type VARCHAR(50) DEFAULT NULL',
      'ADD COLUMN meal_type VARCHAR(50) DEFAULT NULL'
    ];

    for (const col of columns) {
      try {
        await connection.query(`ALTER TABLE dishes ${col}`);
        console.log(`Executed: ${col}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`Column already exists, skipping: ${col}`);
        } else {
          console.error(`Error adding column:`, err);
        }
      }
    }

    console.log('Smart pairing schema applied successfully.');
    await connection.end();
  } catch (error) {
    console.error('Error applying schema:', error);
  }
}

applySchema();
