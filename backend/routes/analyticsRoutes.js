const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const analyticsController = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

// Rate Limiter for public tracking to prevent spam/DDOS
const trackingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 tracking requests per `window` (per minute)
  message: 'Too many tracking requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Public tracking routes (No auth required)
router.post('/track-session', trackingLimiter, analyticsController.trackSession);
router.post('/track-view', trackingLimiter, analyticsController.trackDishView);
router.post('/track-search', trackingLimiter, analyticsController.trackSearch);
router.get('/trending/:restaurantId', analyticsController.getTrendingDishes);

// Protected dashboard routes
router.get('/dashboard/:restaurantId', protect, analyticsController.getDashboardMetrics);

module.exports = router;
