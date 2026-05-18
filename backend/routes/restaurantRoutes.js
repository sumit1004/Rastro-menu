const express = require('express');
const router = express.Router();
const { getMyProfile, getRestaurantBySlug, upsertProfile } = require('../controllers/restaurantController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/slug/:slug', getRestaurantBySlug);
router.get('/my-profile', protect, getMyProfile);

// Handle multiple fields
const uploadFields = upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'banner', maxCount: 1 }
]);

router.post('/', protect, uploadFields, upsertProfile);

module.exports = router;
