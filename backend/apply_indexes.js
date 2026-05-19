const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function applyIndexes() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'rastro_db',
      multipleStatements: true
    });

    console.log('Applying indexes...');
    
    // Ignore errors if indexes already exist
    const queries = [
      "CREATE INDEX idx_menu_sessions_rest_created ON menu_sessions (restaurant_id, created_at);",
      "CREATE INDEX idx_menu_sessions_session ON menu_sessions (session_id);",
      "CREATE INDEX idx_dish_views_dish_rest ON dish_views (dish_id, restaurant_id);",
      "CREATE INDEX idx_dish_views_created ON dish_views (created_at);",
      "CREATE INDEX idx_search_logs_rest_created ON search_logs (restaurant_id, created_at);",
      "CREATE INDEX idx_search_logs_query ON search_logs (search_query);"
    ];

    for (let q of queries) {
        try {
            await connection.query(q);
            console.log('Applied:', q);
        } catch (e) {
            // Error code for duplicate key name
            if (e.code === 'ER_DUP_KEYNAME') {
                console.log('Index already exists, skipping:', q);
            } else {
                console.error('Error applying index:', e.message);
            }
        }
    }

    console.log('Indexes applied successfully.');
    await connection.end();
  } catch (error) {
    console.error('Error connecting to DB:', error);
  }
}

applyIndexes();
