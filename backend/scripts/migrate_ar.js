/**
 * Migration: Add normalized columns to ar_model_library if missing
 * Run once on the production database to fix the AR pipeline.
 */
const pool = require('../config/db');

const migrate = async () => {
  console.log('Starting AR pipeline migration...');
  
  try {
    // Check if columns already exist
    const [cols] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'ar_model_library'
        AND COLUMN_NAME IN ('normalized_rotation_x', 'normalized_rotation_y', 'normalized_rotation_z', 'normalized_scale', 'normalized_height_offset')
    `);
    
    const existingCols = cols.map(c => c.COLUMN_NAME);
    console.log('Existing normalized columns:', existingCols);
    
    const migrations = [];
    
    if (!existingCols.includes('normalized_rotation_x')) {
      migrations.push(`ALTER TABLE ar_model_library ADD COLUMN normalized_rotation_x DECIMAL(10,4) DEFAULT 0.0000`);
    }
    if (!existingCols.includes('normalized_rotation_y')) {
      migrations.push(`ALTER TABLE ar_model_library ADD COLUMN normalized_rotation_y DECIMAL(10,4) DEFAULT 0.0000`);
    }
    if (!existingCols.includes('normalized_rotation_z')) {
      migrations.push(`ALTER TABLE ar_model_library ADD COLUMN normalized_rotation_z DECIMAL(10,4) DEFAULT 0.0000`);
    }
    if (!existingCols.includes('normalized_scale')) {
      migrations.push(`ALTER TABLE ar_model_library ADD COLUMN normalized_scale DECIMAL(10,4) DEFAULT 1.0000`);
    }
    if (!existingCols.includes('normalized_height_offset')) {
      migrations.push(`ALTER TABLE ar_model_library ADD COLUMN normalized_height_offset DECIMAL(10,4) DEFAULT 0.0000`);
    }

    if (migrations.length === 0) {
      console.log('✅ All columns already exist. No migration needed.');
    } else {
      for (const sql of migrations) {
        console.log('Running:', sql);
        await pool.query(sql);
        console.log('✅ Done.');
      }
      console.log('✅ Migration complete!');
    }

    // Diagnostic: Show current dishes with AR data
    console.log('\n=== DISHES WITH AR DATA ===');
    const [dishes] = await pool.query(`
      SELECT d.id, d.name, d.ar_model_id, d.enable_3d_ar, 
             arm.id AS lib_id, arm.glb_url, arm.dish_name AS lib_name
      FROM dishes d
      LEFT JOIN ar_model_library arm ON d.ar_model_id = arm.id
      ORDER BY d.id DESC
      LIMIT 20
    `);
    
    console.log(`Found ${dishes.length} dishes:`);
    dishes.forEach(d => {
      const hasAr = d.ar_model_id && d.glb_url;
      console.log(`  id=${d.id} "${d.name}" ar_model_id=${d.ar_model_id} enable_3d_ar=${d.enable_3d_ar} lib_id=${d.lib_id} glb_url=${d.glb_url ? d.glb_url.substring(0, 60) + '...' : 'NULL'} [AR:${hasAr ? 'YES ✅' : 'NO ❌'}]`);
    });

    console.log('\n=== ar_model_library RECORDS ===');
    const [models] = await pool.query('SELECT id, dish_name, glb_url FROM ar_model_library');
    console.log(`Found ${models.length} library models:`);
    models.forEach(m => {
      console.log(`  id=${m.id} "${m.dish_name}" glb_url=${m.glb_url ? m.glb_url.substring(0, 60) + '...' : 'NULL'}`);
    });

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
};

migrate();
