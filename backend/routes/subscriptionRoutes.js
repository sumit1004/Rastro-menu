const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getSubscriptionDetails } = require('../controllers/subscriptionController');

router.get('/details', protect, getSubscriptionDetails);
router.get('/current', protect, getSubscriptionDetails);

module.exports = router;
