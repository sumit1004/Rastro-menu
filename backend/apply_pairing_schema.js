const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function applyPairingSchema() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'rastro_db'
    });

    console.log('Applying pairing schema...');

    const createTableSql = `
      CREATE TABLE IF NOT EXISTS dish_pairings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          restaurant_id INT NOT NULL,
          dish_id INT NOT NULL,
          paired_dish_id INT NOT NULL,
          priority INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
          FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
          FOREIGN KEY (paired_dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
          UNIQUE KEY unique_pairing (dish_id, paired_dish_id)
      );
    `;

    await connection.query(createTableSql);
    console.log('dish_pairings table created successfully.');

    // Add indexes for fast lookup
    await connection.query(`CREATE INDEX IF NOT EXISTS idx_dish_pairings_dish_id ON dish_pairings(dish_id);`);
    await connection.query(`CREATE INDEX IF NOT EXISTS idx_dish_pairings_restaurant_id ON dish_pairings(restaurant_id);`);

    console.log('Indexes created successfully.');
    
    await connection.end();
  } catch (error) {
    console.error('Error applying pairing schema:', error);
  }
}

applyPairingSchema();
