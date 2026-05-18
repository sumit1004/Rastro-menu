const express = require('express');
const router = express.Router();
const { addReview, getReviewsByDish, getReviewsByRestaurant, deleteReview } = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', addReview);
router.get('/dish/:dishId', getReviewsByDish);
router.get('/restaurant', protect, getReviewsByRestaurant);
router.delete('/:id', protect, deleteReview);

module.exports = router;
