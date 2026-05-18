const express = require('express');
const router = express.Router();
const { getDishesByRestaurant, getDishById, addDish, updateDish, deleteDish } = require('../controllers/dishController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/restaurant/:restaurantId', getDishesByRestaurant);
router.get('/:id', getDishById);

router.post('/', protect, upload.single('image'), addDish);
router.put('/:id', protect, upload.single('image'), updateDish);
router.delete('/:id', protect, deleteDish);

module.exports = router;
