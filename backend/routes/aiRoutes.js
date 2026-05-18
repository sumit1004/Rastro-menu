const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/authMiddleware');
const { generateAiDescription, generateAiTasteTags, generateAiCategory, autoFillDish } = require('../controllers/aiController');

// Rate Limiter for AI routes: max 15 requests per 10 minutes per IP
const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, 
  max: 15,
  message: 'Too many AI generation requests, please try again later.'
});

// Apply protection and rate limiting to all AI routes
router.use(protect);
router.use(aiLimiter);

router.post('/generate-description', generateAiDescription);
router.post('/generate-taste-tags', generateAiTasteTags);
router.post('/detect-category', generateAiCategory);
router.post('/auto-fill', autoFillDish);

module.exports = router;
