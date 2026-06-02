const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getSaaSMetrics, getAllRestaurants, updateRestaurantPlan } = require('../controllers/adminController');
const { uploadArModel, getArModels, deleteArModel } = require('../controllers/adminArController');
const upload = require('../middleware/uploadMiddleware');

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

// AR Model Library Routes
router.post('/ar-models', protect, requireAdmin, upload.fields([
  { name: 'glb_model', maxCount: 1 },
  { name: 'usdz_model', maxCount: 1 }
]), uploadArModel);
router.get('/ar-models', protect, requireAdmin, getArModels);
router.delete('/ar-models/:id', protect, requireAdmin, deleteArModel);

module.exports = router;
