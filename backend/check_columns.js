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

    const [rows] = await pool.query('DESCRIBE dishes');
    console.log(rows.map(r => r.Field));

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

testDB();
