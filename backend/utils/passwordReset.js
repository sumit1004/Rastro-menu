const crypto = require('crypto');

const RESET_TOKEN_BYTES = 32;
const RESET_EXPIRY_MINUTES = 15;

const generateResetToken = () => {
  const raw = crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
  const hash = hashResetToken(raw);
  const expires = new Date(Date.now() + RESET_EXPIRY_MINUTES * 60 * 1000);
  return { raw, hash, expires };
};

const hashResetToken = (rawToken) => {
  if (!rawToken || typeof rawToken !== 'string') return null;
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
};

const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) && normalized.length <= 255;
};

const normalizeEmail = (email) => email.trim().toLowerCase();

const validateNewPassword = (password) => {
  if (!password || typeof password !== 'string') {
    return 'Password is required.';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (password.length > 128) {
    return 'Password must be 128 characters or fewer.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must include at least one lowercase letter.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must include at least one uppercase letter.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must include at least one number.';
  }
  return null;
};

module.exports = {
  RESET_EXPIRY_MINUTES,
  generateResetToken,
  hashResetToken,
  isValidEmail,
  normalizeEmail,
  validateNewPassword,
};
