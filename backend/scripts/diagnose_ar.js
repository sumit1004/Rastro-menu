/**
 * AR Pipeline Diagnostic Script
 * Run: npx --yes dotenv -e .env -- node scripts/diagnose_ar.js
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 2
  });

  try {
    console.log('\n=== 1. ar_model_library COLUMNS ===');
    const [cols] = await pool.query('SHOW COLUMNS FROM ar_model_library');
    cols.forEach(c => console.log(c.Field, '|', c.Type, '| NULL:', c.Null));

    console.log('\n=== 2. DISHES with ar_model_id ===');
    const [dishes] = await pool.query(
      'SELECT id, name, ar_model_id, enable_3d_ar, glb_model_url FROM dishes ORDER BY id DESC LIMIT 15'
    );
    dishes.forEach(d => console.log(`id=${d.id} name="${d.name}" ar_model_id=${d.ar_model_id} enable_3d_ar=${d.enable_3d_ar} glb_model_url=${d.glb_model_url}`));

    console.log('\n=== 3. JOIN dishes + ar_model_library ===');
    const [joined] = await pool.query(`
      SELECT d.id, d.name, d.ar_model_id, d.enable_3d_ar, arm.id AS lib_id, arm.glb_url
      FROM dishes d
      LEFT JOIN ar_model_library arm ON d.ar_model_id = arm.id
      ORDER BY d.id DESC LIMIT 15
    `);
    joined.forEach(j => console.log(`dish=${j.id} "${j.name}" ar_model_id=${j.ar_model_id} lib_id=${j.lib_id} glb_url=${j.glb_url}`));

    console.log('\n=== 4. ar_model_library RECORDS ===');
    const [models] = await pool.query('SELECT id, dish_name, glb_url FROM ar_model_library LIMIT 10');
    models.forEach(m => console.log(`id=${m.id} dish="${m.dish_name}" glb_url=${m.glb_url}`));

  } catch(e) {
    console.error('ERROR:', e.message);
    console.error(e.stack);
  } finally {
    await pool.end();
    process.exit(0);
  }
})();
