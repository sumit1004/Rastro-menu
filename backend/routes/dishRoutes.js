const express = require('express');
const router = express.Router();
const { getDishesByRestaurant, getDishById, addDish, updateDish, deleteDish } = require('../controllers/dishController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { checkLimit } = require('../middleware/planMiddleware');
const { getDishCount } = require('../utils/usageHelper');

router.get('/restaurant/:restaurantId', getDishesByRestaurant);
router.get('/:id', getDishById);

router.post('/', protect, checkLimit('maxDishes', getDishCount), upload.fields([{ name: 'image', maxCount: 1 }, { name: 'ar_image', maxCount: 1 }]), addDish);
router.put('/:id', protect, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'ar_image', maxCount: 1 }]), updateDish);
router.delete('/:id', protect, deleteDish);

module.exports = router;
