const pool = require('../config/db');

// Helper to get restaurant_id from user_id
const getRestaurantId = async (userId) => {
  const [restaurants] = await pool.query('SELECT id FROM restaurants WHERE user_id = ?', [userId]);
  return restaurants.length > 0 ? restaurants[0].id : null;
};

// @desc    Place a new table order
// @route   POST /api/orders
// @access  Public
const placeOrder = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { restaurant_id, table_number, customer_mobile, customer_note, items } = req.body;

    if (!restaurant_id || !table_number || !customer_mobile || !items || items.length === 0) {
      return res.status(400).json({ message: 'Missing required order fields.' });
    }

    await connection.beginTransaction();

    // Create order record
    const [orderResult] = await connection.query(
      `INSERT INTO orders (restaurant_id, table_number, customer_mobile, customer_note, order_status) 
       VALUES (?, ?, ?, ?, 'pending')`,
      [restaurant_id, table_number, customer_mobile, customer_note || null]
    );
    const orderId = orderResult.insertId;

    // Insert order items
    const itemValues = items.map(item => [
      orderId,
      item.dish_id,
      item.quantity,
      item.plate_type,
      item.item_price,
      item.item_note || null
    ]);

    await connection.query(
      `INSERT INTO order_items (order_id, dish_id, quantity, plate_type, item_price, item_note) VALUES ?`,
      [itemValues]
    );

    await connection.commit();

    // Fetch complete order details to emit via socket
    const [newOrderRows] = await pool.query(`SELECT * FROM orders WHERE id = ?`, [orderId]);
    const newOrder = newOrderRows[0];
    
    // Attach items to the order object for the dashboard
    for(let i=0; i<items.length; i++) {
        const [dishRow] = await pool.query('SELECT name FROM dishes WHERE id = ?', [items[i].dish_id]);
        items[i].dish_name = dishRow[0] ? dishRow[0].name : 'Unknown Dish';
    }
    newOrder.items = items;

    // Emit event to restaurant dashboard room
    const io = req.app.get('io');
    if (io) {
      io.to(`restaurant_${restaurant_id}`).emit('new_order', newOrder);
    }

    res.status(201).json({ message: 'Order placed successfully', orderId });
  } catch (error) {
    await connection.rollback();
    console.error('Error placing order:', error);
    res.status(500).json({ message: 'Server error while placing order.' });
  } finally {
    connection.release();
  }
};

// @desc    Get all orders for a restaurant (allows date filtering)
// @route   GET /api/orders/restaurant/:id
// @access  Private
const getOrders = async (req, res) => {
  try {
    const restaurantIdFromToken = await getRestaurantId(req.user.id);
    if (!restaurantIdFromToken || restaurantIdFromToken.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Unauthorized access to orders.' });
    }

    const { date, filter } = req.query; 
    let dateCondition = "";
    const params = [restaurantIdFromToken];

    if (filter === 'today') {
      dateCondition = "AND DATE(created_at) = CURDATE()";
    } else if (filter === 'yesterday') {
      dateCondition = "AND DATE(created_at) = CURDATE() - INTERVAL 1 DAY";
    } else if (filter === 'prev5') {
      dateCondition = "AND DATE(created_at) >= CURDATE() - INTERVAL 5 DAY";
    } else if (date) {
      dateCondition = "AND DATE(created_at) = ?";
      params.push(date);
    }

    const [orders] = await pool.query(
      `SELECT * FROM orders WHERE restaurant_id = ? ${dateCondition} ORDER BY created_at DESC`,
      params
    );

    // Fetch items for each order
    for (let order of orders) {
      const [items] = await pool.query(
        `SELECT oi.*, d.name as dish_name FROM order_items oi 
         JOIN dishes d ON oi.dish_id = d.id 
         WHERE oi.order_id = ?`,
        [order.id]
      );
      order.items = items;
    }

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;
    const restaurantIdFromToken = await getRestaurantId(req.user.id);

    // Verify ownership
    const [orderRows] = await pool.query('SELECT restaurant_id FROM orders WHERE id = ?', [orderId]);
    if (orderRows.length === 0) return res.status(404).json({ message: 'Order not found' });
    
    const restaurantId = orderRows[0].restaurant_id;
    if (restaurantId !== restaurantIdFromToken) {
      return res.status(403).json({ message: 'Unauthorized to update this order.' });
    }

    let query = 'UPDATE orders SET order_status = ?';
    let params = [status];

    if (status === 'delivered') {
      query += ', delivered_at = CURRENT_TIMESTAMP';
    }

    query += ' WHERE id = ?';
    params.push(orderId);

    await pool.query(query, params);

    // Emit event
    const io = req.app.get('io');
    if (io) {
      io.to(`restaurant_${restaurantId}`).emit('order_status_update', { order_id: orderId, status });
    }

    res.json({ message: 'Order status updated' });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  placeOrder,
  getOrders,
  updateOrderStatus
};
