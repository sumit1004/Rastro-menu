const express = require('express');
const router = express.Router();
const { getDishesByRestaurant, getDishById, addDish, bulkAddDishes, bulkValidateDishes, updateDish, deleteDish, updateDishAvailability, searchArModels } = require('../controllers/dishController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { checkLimit } = require('../middleware/planMiddleware');
const { getDishCount } = require('../utils/usageHelper');

router.get('/ar-models/search', protect, searchArModels);
router.get('/restaurant/:restaurantId', getDishesByRestaurant);
router.get('/:id', getDishById);

router.post('/bulk-validate', protect, bulkValidateDishes);
router.post('/bulk', protect, bulkAddDishes);
router.post('/', protect, checkLimit('maxDishes', getDishCount), upload.fields([{ name: 'image', maxCount: 1 }, { name: 'ar_image', maxCount: 1 }, { name: 'glb_model', maxCount: 1 }, { name: 'usdz_model', maxCount: 1 }]), addDish);
router.put('/:id', protect, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'ar_image', maxCount: 1 }, { name: 'glb_model', maxCount: 1 }, { name: 'usdz_model', maxCount: 1 }]), updateDish);
router.patch('/:id/availability', protect, updateDishAvailability);
router.delete('/:id', protect, deleteDish);

module.exports = router;
