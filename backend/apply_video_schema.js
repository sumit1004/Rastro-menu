const pool = require('./config/db');

async function migrate() {
  try {
    console.log("Checking if ar_video_url exists...");
    const [columns] = await pool.query(`SHOW COLUMNS FROM dishes LIKE 'ar_video_url'`);
    if (columns.length === 0) {
      console.log("Adding ar_video_url column to dishes table...");
      await pool.query(`ALTER TABLE dishes ADD COLUMN ar_video_url VARCHAR(500) DEFAULT NULL`);
      console.log("Column added successfully.");
    } else {
      console.log("Column already exists.");
    }
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit();
  }
}

migrate();
