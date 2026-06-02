const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDB() {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });

    const [dishes] = await pool.query(
      `SELECT d.id, d.name, d.enable_3d_ar, d.ar_model_id, a.glb_url as library_glb_url
       FROM dishes d
       LEFT JOIN ar_model_library a ON d.ar_model_id = a.id
       WHERE d.ar_model_id IS NOT NULL LIMIT 5`
    );

    console.log("DISHES WITH AR MODEL ID:", JSON.stringify(dishes, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

testDB();
