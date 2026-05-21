const pool = require('./config/db');

async function migrate() {
  try {
    console.log("Starting DB migration for Phase 5 (AR Features)...");

    const addColumn = async (table, columnDef) => {
      try {
        await pool.query(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`);
        console.log(`Added column ${columnDef} successfully.`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`Column ${columnDef} already exists. Skipping.`);
        } else {
          console.error(`Error adding column ${columnDef}:`, err.message);
        }
      }
    };

    // Add AR columns to dishes table
    await addColumn('dishes', 'ar_enabled BOOLEAN DEFAULT FALSE');
    await addColumn('dishes', 'ar_image_url VARCHAR(500)');
    await addColumn('dishes', 'ar_asset_type VARCHAR(100) DEFAULT \'pseudo-3d\'');

    // Create tracking table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ar_interactions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          restaurant_id INT NOT NULL,
          dish_id INT NOT NULL,
          event_type ENUM('open', 'duration_tracked'),
          duration_seconds INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_ar_restaurant_id (restaurant_id),
          INDEX idx_ar_dish_id (dish_id)
        )
      `);
      console.log('Created ar_interactions table successfully.');
    } catch (err) {
      console.error('Error creating ar_interactions table:', err.message);
    }

    console.log("Phase 5 Migration completed.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
