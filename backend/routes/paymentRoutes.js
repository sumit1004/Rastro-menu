const express = require('express');
const router = express.Router();
const { 
  createOrder, 
  verifyPayment, 
  getPaymentHistory,
  handlePaymentFailure
} = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/create-order', authMiddleware.protect, authMiddleware.restrictTo('restaurant'), createOrder);
router.post('/verify', authMiddleware.protect, authMiddleware.restrictTo('restaurant'), verifyPayment);
router.post('/failure', authMiddleware.protect, authMiddleware.restrictTo('restaurant'), handlePaymentFailure);
router.get('/history', authMiddleware.protect, authMiddleware.restrictTo('restaurant'), getPaymentHistory);

module.exports = router;
