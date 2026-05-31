const express = require('express');
const router = express.Router();
const { getSuggestions, syncSuggestions } = require('../controllers/suggestionController');
const { protect } = require('../middleware/authMiddleware');

router.get('/dish/:dishId', getSuggestions);
router.put('/sync/:dishId', protect, syncSuggestions);

module.exports = router;
