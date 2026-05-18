const pool = require('./config/db');

async function migrate() {
  try {
    console.log("Starting DB migration for Phase 2...");

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

    // Add new columns one by one
    await addColumn('dishes', 'ai_description TEXT');
    await addColumn('dishes', 'taste_tags JSON');
    await addColumn('dishes', 'search_keywords TEXT');
    await addColumn('dishes', 'ai_category VARCHAR(255)');
    await addColumn('dishes', 'ai_enhanced_image VARCHAR(500)');

    // Add indexes. Use try/catch individually since they might already exist
    const addIndex = async (table, indexName, columns) => {
      try {
        await pool.query(`CREATE INDEX ${indexName} ON ${table}(${columns})`);
        console.log(`Created index ${indexName} successfully.`);
      } catch (err) {
        if (err.code === 'ER_DUP_KEYNAME') {
          console.log(`Index ${indexName} already exists. Skipping.`);
        } else {
          console.error(`Error creating index ${indexName}:`, err.message);
        }
      }
    };

    await addIndex('dishes', 'idx_dishes_name', 'name');
    await addIndex('dishes', 'idx_dishes_category', 'category');
    await addIndex('dishes', 'idx_dishes_ai_category', 'ai_category');

    console.log("Migration completed.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
