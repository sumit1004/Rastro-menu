const pool = require('./config/db');

async function migrate() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('Applying password reset schema to users table...');

    const [cols] = await connection.query(
      `SHOW COLUMNS FROM users LIKE 'reset_password_token'`
    );
    if (cols.length === 0) {
      await connection.query(`
        ALTER TABLE users
        ADD COLUMN reset_password_token VARCHAR(255) NULL DEFAULT NULL,
        ADD COLUMN reset_password_expires DATETIME NULL DEFAULT NULL
      `);
      console.log('Added reset_password_token and reset_password_expires columns.');
    } else {
      console.log('Password reset columns already exist.');
    }

    console.log('Password reset migration completed.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    if (connection) connection.release();
    process.exit();
  }
}

migrate();
