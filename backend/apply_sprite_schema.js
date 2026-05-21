const pool = require('./config/db');

async function migrate() {
  try {
    console.log("Checking if ar_sprite_config exists...");
    const [columns] = await pool.query(`SHOW COLUMNS FROM dishes LIKE 'ar_sprite_config'`);
    if (columns.length === 0) {
      console.log("Adding ar_sprite_config column to dishes table...");
      await pool.query(`ALTER TABLE dishes ADD COLUMN ar_sprite_config JSON`);
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
