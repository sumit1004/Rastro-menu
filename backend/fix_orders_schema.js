const pool = require('./config/db');
async function fix() {
  let conn;
  try {
    conn = await pool.getConnection();
    // Expand enum
    await conn.query(`ALTER TABLE orders MODIFY COLUMN order_status ENUM('pending','accepted','ready','completed','cancelled','delivered') DEFAULT 'pending'`);
    console.log('order_status ENUM expanded');
    // Add total_amount if missing
    const [cols] = await conn.query(`SHOW COLUMNS FROM orders LIKE 'total_amount'`);
    if (cols.length === 0) {
      await conn.query(`ALTER TABLE orders ADD COLUMN total_amount DECIMAL(10,2) DEFAULT 0`);
      console.log('total_amount column added');
    } else {
      console.log('total_amount already exists');
    }
    // Optionally recalc total_amount for existing orders
    const [orders] = await conn.query('SELECT id FROM orders');
    for (const o of orders) {
      const [items] = await conn.query('SELECT SUM(item_price * quantity) AS total FROM order_items WHERE order_id = ?', [o.id]);
      const total = items[0].total || 0;
      await conn.query('UPDATE orders SET total_amount = ? WHERE id = ?', [total, o.id]);
    }
    console.log('Recalculated total_amount for existing orders');
  } catch (e) {
    console.error('Fix error:', e.message);
  } finally {
    if (conn) conn.release();
    process.exit();
  }
}
fix();
