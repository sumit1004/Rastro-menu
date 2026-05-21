const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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

module.exports = {
  signup,
  login,
  getMe,
};
