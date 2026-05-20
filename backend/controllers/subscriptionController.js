const pool = require('../config/db');
const { PLAN_LIMITS } = require('../config/plans');
const { getDishCount, getAiUsageCount } = require('../utils/usageHelper');

// Helper: sanitize Infinity to null so JSON.stringify doesn't drop the field
const sanitizeLimits = (limits) => {
  const out = {};
  for (const [key, val] of Object.entries(limits)) {
    out[key] = val === Infinity ? null : val;
  }
  return out;
};

// Helper: derive boolean feature flags from limits
const deriveFeatures = (plan) => {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS['free'];
  return {
    unlimitedDishes: limits.maxDishes === Infinity || limits.maxDishes === null,
    aiAccess: (limits.aiGenerationsPerMonth > 0),
    unlimitedAi: limits.aiGenerationsPerMonth === Infinity || limits.aiGenerationsPerMonth === null,
    advancedAnalytics: limits.analyticsAccess === 'advanced',
    customBranding: !!limits.customBranding,
    prioritySupport: !!limits.prioritySupport,
    qrMenuDownload: true, // available to all
    reviewManagement: true,
    multipleCategories: plan !== 'free',
  };
};

const getSubscriptionDetails = async (req, res) => {
  try {
    if (!req.restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    const {
      id: restaurantId,
      subscription_plan,
      subscription_status,
      billing_cycle,
      trial_start_date,
      trial_end_date,
      plan_expiry,
      created_at,
    } = req.restaurant;

    const dishCount = await getDishCount(restaurantId, pool);
    const aiUsage = await getAiUsageCount(restaurantId, pool);

    const plan = subscription_plan || 'free';
    const rawLimits = PLAN_LIMITS[plan] || PLAN_LIMITS['free'];
    const limits = sanitizeLimits(rawLimits);
    const features = deriveFeatures(plan);

    // Trial dates logic: if null in DB, fallback to 7 days starting from restaurant created_at
    const resolvedStartDate = trial_start_date || created_at || new Date();
    const resolvedEndDate = trial_end_date || new Date(new Date(resolvedStartDate).getTime() + 7 * 24 * 60 * 60 * 1000);
    const trialDaysLeft = Math.max(0, Math.ceil((new Date(resolvedEndDate) - new Date()) / (1000 * 60 * 60 * 24)));
    const isTrialActive = subscription_status === 'trial' && trialDaysLeft > 0;

    res.json({
      plan,
      status: subscription_status || 'free',
      billingCycle: billing_cycle || null,
      limits,
      features,
      usage: {
        dishes: dishCount,
        aiGenerations: aiUsage,
      },
      trial: {
        startDate: resolvedStartDate,
        endDate: resolvedEndDate,
        daysLeft: trialDaysLeft,
        isActive: isTrialActive,
      },
      planExpiry: plan_expiry || null,
    });
  } catch (error) {
    console.error('Error fetching subscription details:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { getSubscriptionDetails };
