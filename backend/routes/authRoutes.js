const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  getMe,
  forgotPassword,
  verifyResetToken,
  resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const {
  forgotPasswordLimiter,
  resetPasswordLimiter,
} = require('../middleware/passwordResetRateLimit');

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', protect, getMe);

router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.get('/reset-password/verify/:token', resetPasswordLimiter, verifyResetToken);
router.post('/reset-password', resetPasswordLimiter, resetPassword);

module.exports = router;
