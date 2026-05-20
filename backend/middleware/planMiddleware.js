const { PLAN_LIMITS } = require('../config/plans');
const pool = require('../config/db');

// Require a minimum plan or specific plan access
const requirePlan = (allowedPlans) => {
  return (req, res, next) => {
    if (!req.restaurant) {
      return res.status(403).json({ message: 'No restaurant context found' });
    }

    const { subscription_plan, subscription_status } = req.restaurant;

    // Optional: check if status is active or trial
    if (subscription_status !== 'active' && subscription_status !== 'trial') {
      return res.status(403).json({ message: 'Subscription is not active' });
    }

    if (!allowedPlans.includes(subscription_plan)) {
      return res.status(403).json({ 
        message: `This feature requires one of the following plans: ${allowedPlans.join(', ')}`,
        code: 'UPGRADE_REQUIRED'
      });
    }

    next();
  };
};

// Check if a specific feature limit has been reached
const checkLimit = (featureKey, getCurrentUsage) => {
  return async (req, res, next) => {
    if (!req.restaurant) {
      return res.status(403).json({ message: 'No restaurant context found' });
    }

    const { subscription_plan, id: restaurantId } = req.restaurant;
    const limit = PLAN_LIMITS[subscription_plan]?.[featureKey];

    if (limit === Infinity) {
      return next();
    }

    try {
      const currentUsage = await getCurrentUsage(restaurantId, pool);
      
      if (currentUsage >= limit) {
        return res.status(403).json({
          message: `You have reached your limit for ${featureKey}. Please upgrade your plan.`,
          code: 'LIMIT_REACHED',
          limit,
          currentUsage
        });
      }
      
      // Soft limit warning could be attached to req or handled here if needed, 
      // but usually backend enforces hard limits and frontend shows soft limit warnings.
      if (currentUsage >= limit * 0.8) {
        req.limitWarning = true;
      }

      next();
    } catch (error) {
      console.error(`Error checking limit for ${featureKey}:`, error);
      res.status(500).json({ message: 'Server error while checking limits' });
    }
  };
};

module.exports = {
  requirePlan,
  checkLimit
};
