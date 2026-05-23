const pool = require('./config/db');

async function migrate() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log("Starting Phase 7 Migration...");

    // 1. Modify Dishes Table
    console.log("Checking if plate configuration columns exist in dishes...");
    const [columns] = await connection.query(`SHOW COLUMNS FROM dishes LIKE 'has_full_plate'`);
    if (columns.length === 0) {
      console.log("Adding plate configuration columns to dishes table...");
      await connection.query(`ALTER TABLE dishes 
        ADD COLUMN has_full_plate BOOLEAN DEFAULT TRUE,
        ADD COLUMN has_half_plate BOOLEAN DEFAULT FALSE,
        ADD COLUMN full_plate_price DECIMAL(10, 2) DEFAULT 0,
        ADD COLUMN half_plate_price DECIMAL(10, 2) DEFAULT 0
      `);
      console.log("Initializing full_plate_price with existing price...");
      await connection.query(`UPDATE dishes SET full_plate_price = price`);
      console.log("Dishes table updated.");
    } else {
      console.log("Plate configuration columns already exist.");
    }

    // 2. Create Orders Table
    console.log("Creating orders table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        restaurant_id INT NOT NULL,
        table_number VARCHAR(50) NOT NULL,
        customer_mobile VARCHAR(20) NOT NULL,
        customer_note TEXT,
        order_status ENUM('pending', 'delivered') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        delivered_at TIMESTAMP NULL DEFAULT NULL,
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
      )
    `);
    console.log("Orders table created/verified.");

    // 3. Create Order Items Table
    console.log("Creating order_items table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        dish_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        plate_type ENUM('full', 'half') DEFAULT 'full',
        item_price DECIMAL(10, 2) NOT NULL,
        item_note VARCHAR(255),
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE
      )
    `);
    console.log("Order items table created/verified.");

    console.log("Phase 7 Migration completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    if (connection) connection.release();
    process.exit();
  }
}

migrate();
