/** Mirrors backend/config/pricing.js */
export const PRICING = {
  pro: {
    monthly: 499,
    yearly: 4999,
  },
  premium: {
    monthly: 999,
    yearly: 9999,
  },
};

export const TRIAL_DAYS = 7;

export const getPlanPrice = (plan, billingCycle) => {
  if (plan === 'free') return 0;
  return PRICING[plan][billingCycle];
};

export const getYearlySavings = (plan) =>
  PRICING[plan].monthly * 12 - PRICING[plan].yearly;
