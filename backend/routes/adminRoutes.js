const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getSaaSMetrics, getAllRestaurants, updateRestaurantPlan } = require('../controllers/adminController');

// Middleware to check for admin role
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

router.get('/metrics', protect, requireAdmin, getSaaSMetrics);
router.get('/restaurants', protect, requireAdmin, getAllRestaurants);
router.put('/restaurants/:id/plan', protect, requireAdmin, updateRestaurantPlan);

module.exports = router;
