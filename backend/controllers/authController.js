const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {
  generateResetToken,
  hashResetToken,
  isValidEmail,
  normalizeEmail,
  validateNewPassword,
} = require('../utils/passwordReset');
const { sendPasswordResetEmail } = require('../services/emailService');

const GENERIC_RESET_MESSAGE =
  'If an account exists with that email, a reset link has been sent.';

const isDevMode = () =>
  process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEV_RESET_LINK === 'true';

const dispatchPasswordResetEmail = async (user) => {
  const { raw, hash, expires } = generateResetToken();

  await pool.query(
    `UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE id = ?`,
    [hash, expires, user.id]
  );

  const frontendBase = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const resetUrl = `${frontendBase}/reset-password/${raw}`;

  const mailResult = await sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    resetUrl,
  });

  if (!mailResult.sent) {
    console.error('[forgotPassword] Email not delivered:', mailResult.reason, mailResult.error || '');
    if (isDevMode()) {
      console.info('[forgotPassword] Dev reset URL (use if inbox empty):', resetUrl);
    }
  } else {
    console.info('[forgotPassword] Reset email sent to:', user.email.replace(/(.{2}).*(@.*)/, '$1***$2'));
  }

  return { resetUrl, mailResult };
};

// Generate JWT Token
const generateToken = (id, role) => {
  const secret = process.env.JWT_SECRET || 'development_fallback_secret_123!@#';
  if (!process.env.JWT_SECRET) {
    console.warn("WARNING: JWT_SECRET environment variable is missing. Using insecure fallback.");
  }
  return jwt.sign({ id, role }, secret, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user (restaurant owner)
// @route   POST /api/auth/signup
const signup = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please add all fields' });
    }

    // Check if user exists
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, 'restaurant']
    );

    const user = {
      id: result.insertId,
      name,
      email,
      role: 'restaurant'
    };

    res.status(201).json({
      ...user,
      token: generateToken(user.id, user.role),
    });
  } catch (error) {
    console.error("Signup error details:", error);
    res.status(500).json({ message: 'Server error during signup', error: error.message || error.code || 'Unknown error' });
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check for user email
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = users[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user.id, user.role),
      });
    } else {
      res.status(400).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error("Login error details:", error);
    res.status(500).json({ message: 'Server error during login', error: error.message || error.code || 'Unknown error' });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, name, email, role FROM users WHERE id = ?', [req.user.id]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Request password reset email
// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const email = normalizeEmail(String(req.body.email || ''));

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    const [users] = await pool.query(
      'SELECT id, name, email FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    const payload = { message: GENERIC_RESET_MESSAGE, success: true };

    if (users.length > 0) {
      const { resetUrl, mailResult } = await dispatchPasswordResetEmail(users[0]);
      if (isDevMode()) {
        payload.devResetUrl = resetUrl;
        payload.emailDispatched = Boolean(mailResult.sent);
      }
    } else if (isDevMode()) {
      console.info('[forgotPassword] No user found for email (response still generic).');
    }

    res.json(payload);
  } catch (error) {
    console.error('forgotPassword error:', error);
    res.status(500).json({ message: 'Unable to process request. Please try again later.' });
  }
};

// @desc    Verify reset token is valid
// @route   GET /api/auth/reset-password/verify/:token
const verifyResetToken = async (req, res) => {
  try {
    const rawToken = String(req.params.token || '').trim();
    if (!rawToken || rawToken.length < 32) {
      return res.status(400).json({ valid: false, message: 'Invalid or expired reset link.' });
    }

    const tokenHash = hashResetToken(rawToken);
    const [users] = await pool.query(
      `SELECT id FROM users
       WHERE reset_password_token = ?
       AND reset_password_expires IS NOT NULL
       AND reset_password_expires > NOW()
       LIMIT 1`,
      [tokenHash]
    );

    if (users.length === 0) {
      return res.status(400).json({ valid: false, message: 'Invalid or expired reset link.' });
    }

    res.json({ valid: true });
  } catch (error) {
    console.error('verifyResetToken error:', error);
    res.status(500).json({ valid: false, message: 'Unable to verify reset link.' });
  }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const rawToken = String(req.body.token || '').trim();
    const password = String(req.body.password || '');

    if (!rawToken || rawToken.length < 32) {
      return res.status(400).json({ message: 'Invalid or expired reset link.' });
    }

    const passwordError = validateNewPassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const tokenHash = hashResetToken(rawToken);
    const [users] = await pool.query(
      `SELECT id, reset_password_token, reset_password_expires
       FROM users
       WHERE reset_password_token = ?
       AND reset_password_expires IS NOT NULL
       AND reset_password_expires > NOW()
       LIMIT 1`,
      [tokenHash]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired reset link.' });
    }

    const user = users[0];
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await pool.query(
      `UPDATE users
       SET password = ?,
           reset_password_token = NULL,
           reset_password_expires = NULL
       WHERE id = ?`,
      [hashedPassword, user.id]
    );

    res.json({ message: 'Password updated successfully. You can now log in.' });
  } catch (error) {
    console.error('resetPassword error:', error);
    res.status(500).json({ message: 'Unable to reset password. Please try again.' });
  }
};

module.exports = {
  signup,
  login,
  getMe,
  forgotPassword,
  verifyResetToken,
  resetPassword,
};
