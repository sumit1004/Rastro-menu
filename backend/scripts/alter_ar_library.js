const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

async function migrate() {
  try {
    console.log('Adding normalized orientation columns to ar_model_library table...');
    
    const columns = [
      'normalized_rotation_x DECIMAL(10,4) DEFAULT 0.0000',
      'normalized_rotation_y DECIMAL(10,4) DEFAULT 0.0000',
      'normalized_rotation_z DECIMAL(10,4) DEFAULT 0.0000',
      'normalized_scale DECIMAL(10,4) DEFAULT 1.0000',
      'normalized_height_offset DECIMAL(10,4) DEFAULT 0.0000'
    ];

    for (const col of columns) {
      try {
        const colName = col.split(' ')[0];
        console.log(`Adding ${colName}...`);
        await pool.query(`ALTER TABLE ar_model_library ADD COLUMN ${col}`);
        console.log(`${colName} added successfully.`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`Column already exists, skipping.`);
        } else {
          throw err;
        }
      }
    }

    console.log('Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
