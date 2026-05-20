const crypto = require('crypto');
const razorpay = require('../config/razorpay');

/**
 * Creates an order on Razorpay
 */
const createRazorpayOrder = async (amount, currency = 'INR', receipt) => {
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }

  const options = {
    amount: amount * 100, // Razorpay works in paise
    currency,
    receipt,
  };

  return new Promise((resolve, reject) => {
    razorpay.orders.create(options, (err, order) => {
      if (err) {
        return reject(err);
      }
      resolve(order);
    });
  });
};

/**
 * Verifies the Razorpay signature securely
 */
const verifyRazorpaySignature = (orderId, paymentId, signature) => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    throw new Error('RAZORPAY_KEY_SECRET is missing');
  }

  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return generatedSignature === signature;
};

module.exports = {
  createRazorpayOrder,
  verifyRazorpaySignature
};
