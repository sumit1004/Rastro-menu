const pool = require('../config/db');
const { PRICING, DURATION_DAYS } = require('../config/pricing');
const paymentService = require('../services/paymentService');

/**
 * 1. Server-side only price calculation & Order Creation
 */
const createOrder = async (req, res) => {
  const { plan_name, billing_cycle } = req.body;
  const restaurantId = req.restaurant.id;

  try {
    // 1. Validate plan and billing cycle
    if (!['pro', 'premium'].includes(plan_name)) {
      return res.status(400).json({ message: 'Invalid plan selected' });
    }
    if (!['monthly', 'yearly'].includes(billing_cycle)) {
      return res.status(400).json({ message: 'Invalid billing cycle selected' });
    }

    // 2. Fetch official pricing from server config (Never trust frontend prices)
    const amount = PRICING[plan_name][billing_cycle];
    const currency = 'INR';

    // 3. Create order on Razorpay
    const receipt = `receipt_rest_${restaurantId}_${Date.now()}`;
    const order = await paymentService.createRazorpayOrder(amount, currency, receipt);

    // 4. Log pending payment attempt in DB (Audit Logic)
    await pool.execute(
      `INSERT INTO payments (restaurant_id, plan_name, billing_cycle, amount, currency, razorpay_order_id, payment_status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [restaurantId, plan_name, billing_cycle, amount, currency, order.id]
    );

    // 5. Send order details to frontend
    res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID // Only public key sent to frontend
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Failed to create payment order' });
  }
};

/**
 * 2. Verify Payment and Activate Subscription
 */
const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const restaurantId = req.restaurant.id;

  const connection = await pool.getConnection();

  try {
    // Start DB Transaction for Safety
    await connection.beginTransaction();

    // 1. Fetch the pending payment order (Payment Identity Validation)
    const [rows] = await connection.execute(
      `SELECT * FROM payments WHERE razorpay_order_id = ? FOR UPDATE`, 
      [razorpay_order_id]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Order not found' });
    }

    const paymentLog = rows[0];

    // Identity validation: Ensure order belongs to correct restaurant
    if (paymentLog.restaurant_id !== restaurantId) {
      await connection.rollback();
      return res.status(403).json({ message: 'Payment order does not belong to this account' });
    }

    // Idempotency Protection: If payment already processed, do not process again
    if (paymentLog.payment_status === 'success') {
      await connection.rollback();
      return res.status(200).json({ message: 'Payment already processed successfully', idempotency_hit: true });
    }
    if (paymentLog.payment_status !== 'pending') {
      await connection.rollback();
      return res.status(400).json({ message: `Cannot verify payment with status: ${paymentLog.payment_status}` });
    }

    // 2. Cryptographic Signature Validation
    const isSignatureValid = paymentService.verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isSignatureValid) {
      // Log verification failure
      await connection.execute(
        `UPDATE payments SET payment_status = 'failed' WHERE razorpay_order_id = ?`,
        [razorpay_order_id]
      );
      await connection.commit();
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // 3. Mark payment as successful
    await connection.execute(
      `UPDATE payments SET payment_status = 'success', razorpay_payment_id = ?, razorpay_signature = ? WHERE razorpay_order_id = ?`,
      [razorpay_payment_id, razorpay_signature, razorpay_order_id]
    );

    // 4. Subscription Extension Logic
    // Fetch current subscription state
    const [restRows] = await connection.execute(
      `SELECT subscription_plan, plan_expiry FROM restaurants WHERE id = ? FOR UPDATE`,
      [restaurantId]
    );
    const currentRest = restRows[0];
    
    const purchasedPlan = paymentLog.plan_name;
    const daysToAdd = DURATION_DAYS[paymentLog.billing_cycle];
    
    let newExpiryDate = new Date(); // default: calculate from today
    
    // If the user already has the SAME plan or is upgrading (e.g., pro -> premium), 
    // AND it hasn't expired yet, we extend from the existing expiry date.
    // If it's a downgrade or expired, we start from today.
    // But usually for SaaS, any upgrade takes effect immediately. For simplicity:
    // If renewing the SAME plan or upgrading, we ADD the time to the current expiry if it's in the future.
    if (currentRest.plan_expiry && new Date(currentRest.plan_expiry) > new Date()) {
      if (currentRest.subscription_plan === purchasedPlan || purchasedPlan === 'premium') {
        newExpiryDate = new Date(currentRest.plan_expiry);
      }
    }
    
    // Add days
    newExpiryDate.setDate(newExpiryDate.getDate() + daysToAdd);

    // Format for MySQL
    const formattedExpiry = newExpiryDate.toISOString().slice(0, 19).replace('T', ' ');

    // 5. Activate Subscription
    await connection.execute(
      `UPDATE restaurants 
       SET subscription_plan = ?, 
           billing_cycle = ?,
           subscription_status = 'active', 
           plan_expiry = ? 
       WHERE id = ?`,
      [purchasedPlan, paymentLog.billing_cycle, formattedExpiry, restaurantId]
    );

    // Commit Transaction
    await connection.commit();

    res.status(200).json({ 
      message: 'Payment verified and subscription activated successfully',
      new_plan: purchasedPlan,
      new_expiry: formattedExpiry
    });

  } catch (error) {
    // Rollback in case of any partial failure
    await connection.rollback();
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: 'Failed to verify payment' });
  } finally {
    connection.release();
  }
};

/**
 * Get payment history for a restaurant
 */
const getPaymentHistory = async (req, res) => {
  const restaurantId = req.restaurant.id;
  try {
    const [rows] = await pool.execute(
      `SELECT plan_name, billing_cycle, amount, currency, payment_status, created_at 
       FROM payments 
       WHERE restaurant_id = ? 
       ORDER BY created_at DESC`,
      [restaurantId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Handle payment failure (e.g. user closed popup)
 */
const handlePaymentFailure = async (req, res) => {
  const { razorpay_order_id, reason } = req.body;
  const restaurantId = req.restaurant.id;

  try {
    const [rows] = await pool.execute(
      `SELECT restaurant_id FROM payments WHERE razorpay_order_id = ?`,
      [razorpay_order_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (rows[0].restaurant_id !== restaurantId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await pool.execute(
      `UPDATE payments SET payment_status = 'cancelled' WHERE razorpay_order_id = ? AND payment_status = 'pending'`,
      [razorpay_order_id]
    );

    res.json({ message: 'Payment failure logged' });
  } catch (error) {
    console.error('Error logging payment failure:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentHistory,
  handlePaymentFailure
};
