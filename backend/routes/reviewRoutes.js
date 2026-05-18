const express = require('express');
const router = express.Router();
const { addReview, getReviewsByDish } = require('../controllers/reviewController');

router.post('/', addReview);
router.get('/dish/:dishId', getReviewsByDish);

module.exports = router;
