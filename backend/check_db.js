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

    const [libraryRows] = await pool.query('SELECT id, dish_name, glb_url FROM ar_model_library WHERE id = 8');
    console.log("AR MODEL IN LIBRARY:", libraryRows);

    const [dishRows] = await pool.query('SELECT id, name, ar_model_id FROM dishes WHERE ar_model_id = 8');
    console.log("DISHES WITH THIS ID:", dishRows);

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

testDB();
