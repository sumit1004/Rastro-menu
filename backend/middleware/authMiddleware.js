const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const pool = require('../config/db');
      
      // We will attach the user data to req.user
      req.user = decoded;
      
      // If the user is a restaurant, fetch and cache restaurant data + subscription plan
      if (req.user.role === 'restaurant') {
        const [restRows] = await pool.execute(
          `SELECT * FROM restaurants WHERE user_id = ?`,
          [req.user.id]
        );
        if (restRows.length > 0) {
          let restaurant = restRows[0];

          // --- PLAN EXPIRY LOGIC (Phase 4.5) ---
          // If the plan has expired, downgrade to free
          if (restaurant.plan_expiry && new Date(restaurant.plan_expiry) < new Date() && restaurant.subscription_plan !== 'free') {
            await pool.execute(
              `UPDATE restaurants SET subscription_plan = 'free', subscription_status = 'expired' WHERE id = ?`,
              [restaurant.id]
            );
            restaurant.subscription_plan = 'free';
            restaurant.subscription_status = 'expired';
            // Keep plan_expiry as it was for historical reference, or clear it
          }

          req.restaurant = restaurant;
        }
      }
      
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    next();
  };
};

module.exports = { protect, restrictTo };
