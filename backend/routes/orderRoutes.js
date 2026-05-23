const express = require('express');
const router = express.Router();
const { placeOrder, getOrders, updateOrderStatus } = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

// Public route to place an order from table
router.post('/', placeOrder);

// Private routes for dashboard
router.get('/restaurant/:id', protect, getOrders);
router.put('/:id/status', protect, updateOrderStatus);

module.exports = router;
