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

    console.log('Applying suggestion schema...');

    // Drop old dish_pairings table if it exists
    await connection.query('DROP TABLE IF EXISTS dish_pairings');

    // Create new dish_suggestions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS dish_suggestions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          restaurant_id INT NOT NULL,
          dish_id INT NOT NULL,
          suggested_dish_id INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
          FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
          FOREIGN KEY (suggested_dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
          UNIQUE KEY unique_suggestion (dish_id, suggested_dish_id)
      )
    `);

    await connection.query(`CREATE INDEX IF NOT EXISTS idx_dish_suggestions_dish_id ON dish_suggestions(dish_id)`);
    await connection.query(`CREATE INDEX IF NOT EXISTS idx_dish_suggestions_restaurant_id ON dish_suggestions(restaurant_id)`);

    console.log('Suggestion schema applied successfully.');
    await connection.end();
  } catch (error) {
    console.error('Error applying schema:', error);
  }
}

applySchema();
