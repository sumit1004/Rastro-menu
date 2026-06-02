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
    console.log('Creating ar_model_library table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ar_model_library (
        id INT PRIMARY KEY AUTO_INCREMENT,
        dish_name VARCHAR(255) NOT NULL,
        dish_slug VARCHAR(255) UNIQUE NOT NULL,
        category VARCHAR(255),
        glb_url TEXT NOT NULL,
        usdz_url TEXT NULL,
        thumbnail_url TEXT NULL,
        preview_image TEXT NULL,
        tags TEXT NULL,
        optimized BOOLEAN DEFAULT TRUE,
        polygon_count INT NULL,
        file_size_mb DECIMAL(10,2) NULL,
        normalized_rotation_x DECIMAL(10,4) DEFAULT 0.0000,
        normalized_rotation_y DECIMAL(10,4) DEFAULT 0.0000,
        normalized_rotation_z DECIMAL(10,4) DEFAULT 0.0000,
        normalized_scale DECIMAL(10,4) DEFAULT 1.0000,
        normalized_height_offset DECIMAL(10,4) DEFAULT 0.0000,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('ar_model_library table created successfully.');

    console.log('Adding ar_model_id to dishes table...');
    await pool.query(`
      ALTER TABLE dishes
      ADD COLUMN IF NOT EXISTS ar_model_id INT NULL
    `);
    console.log('ar_model_id column added successfully.');

    console.log('Adding foreign key constraint...');
    try {
      await pool.query(`
        ALTER TABLE dishes
        ADD CONSTRAINT fk_dishes_ar_model_library
        FOREIGN KEY (ar_model_id)
        REFERENCES ar_model_library(id)
        ON DELETE SET NULL
      `);
      console.log('Foreign key constraint added successfully.');
    } catch (fkError) {
      if (fkError.code === 'ER_DUP_KEYNAME' || fkError.errno === 1061 || fkError.errno === 1022) {
        console.log('Foreign key constraint already exists.');
      } else {
        throw fkError;
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
