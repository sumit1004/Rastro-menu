require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
  });

  try {
    console.log('Connecting to database...');
    
    // Using IF NOT EXISTS conceptually by catching Duplicate column name error
    const queries = [
      "ALTER TABLE dishes ADD COLUMN glb_model_url VARCHAR(255) NULL;",
      "ALTER TABLE dishes ADD COLUMN usdz_model_url VARCHAR(255) NULL;",
      "ALTER TABLE dishes ADD COLUMN enable_3d_ar BOOLEAN DEFAULT FALSE;",
      "ALTER TABLE dishes ADD COLUMN model_scale VARCHAR(50) NULL;",
      "ALTER TABLE dishes ADD COLUMN model_rotation VARCHAR(50) NULL;",
      "ALTER TABLE dishes ADD COLUMN model_height_offset VARCHAR(50) NULL;"
    ];

    for (const q of queries) {
      try {
        await pool.query(q);
        console.log(`Executed: ${q}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`Column already exists, skipping: ${q}`);
        } else {
          throw err;
        }
      }
    }
    
    console.log('Migration successful.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrate();
