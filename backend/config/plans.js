const PLANS = {
  FREE: 'free',
  PRO: 'pro',
  PREMIUM: 'premium'
};

const PLAN_LIMITS = {
  [PLANS.FREE]: {
    maxDishes: 10,
    analyticsAccess: 'basic',
    customBranding: false,
    prioritySupport: false
  },
  [PLANS.PRO]: {
    maxDishes: Infinity,
    analyticsAccess: 'advanced',
    customBranding: false,
    prioritySupport: false
  },
  [PLANS.PREMIUM]: {
    maxDishes: Infinity,
    analyticsAccess: 'advanced',
    customBranding: true,
    prioritySupport: true
  }
};

const TRIAL_DAYS = 7;

const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  TRIAL: 'trial',
  SUSPENDED: 'suspended'
};

module.exports = {
  PLANS,
  PLAN_LIMITS,
  TRIAL_DAYS,
  SUBSCRIPTION_STATUS
};
