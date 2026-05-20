const pool = require('../config/db');

// @desc    Get key metrics for SaaS Admin Dashboard
// @route   GET /api/admin/metrics
// @access  Private/Admin
const getSaaSMetrics = async (req, res) => {
  try {
    const [restaurantCountResult] = await pool.query('SELECT COUNT(*) as count FROM restaurants');
    const totalRestaurants = restaurantCountResult[0].count;

    const [planDistribution] = await pool.query(
      'SELECT subscription_plan, COUNT(*) as count FROM restaurants GROUP BY subscription_plan'
    );

    const [aiUsageResult] = await pool.query(
      "SELECT SUM(usage_count) as total_ai FROM usage_tracking WHERE feature_name = ?",
      ['ai_generations']
    );
    const totalAiGenerations = aiUsageResult[0]?.total_ai || 0;

    const [activeTrialsResult] = await pool.query(
      "SELECT COUNT(*) as count FROM restaurants WHERE subscription_status = ?",
      ['trial']
    );
    const activeTrials = activeTrialsResult[0].count;

    const [totalDishesResult] = await pool.query('SELECT COUNT(*) as count FROM dishes');
    const totalDishes = totalDishesResult[0].count;

    const [totalReviewsResult] = await pool.query('SELECT COUNT(*) as count FROM reviews');
    const totalReviews = totalReviewsResult[0].count;

    const [totalMenuViewsResult] = await pool.query('SELECT COUNT(*) as count FROM menu_sessions');
    const totalMenuViews = totalMenuViewsResult[0].count;

    res.json({
      totalRestaurants,
      planDistribution: planDistribution || [],
      totalAiGenerations,
      activeTrials,
      totalDishes,
      totalReviews,
      totalMenuViews,
    });
  } catch (error) {
    console.error('Error fetching admin metrics:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all restaurants with full CRM data
// @route   GET /api/admin/restaurants
// @access  Private/Admin
const getAllRestaurants = async (req, res) => {
  try {
    const [restaurants] = await pool.query(`
      SELECT 
        r.id,
        r.restaurant_name,
        r.slug,
        r.cuisine_type,
        r.subscription_plan,
        r.billing_cycle,
        r.subscription_status,
        r.plan_expiry,
        r.created_at,
        u.name AS owner_name,
        u.email AS owner_email,
        COUNT(DISTINCT d.id) AS total_dishes,
        COUNT(DISTINCT rev.id) AS total_reviews,
        COUNT(DISTINCT ms.id) AS total_menu_views
      FROM restaurants r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN dishes d ON d.restaurant_id = r.id
      LEFT JOIN reviews rev ON rev.dish_id = d.id
      LEFT JOIN menu_sessions ms ON ms.restaurant_id = r.id
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `);

    res.json(restaurants);
  } catch (error) {
    console.error('Error fetching all restaurants:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Manually update a restaurant's subscription plan
// @route   PUT /api/admin/restaurants/:id/plan
// @access  Private/Admin
const updateRestaurantPlan = async (req, res) => {
  const { id } = req.params;
  const { plan, billing_cycle } = req.body;

  const validPlans = ['free', 'pro', 'premium'];
  const validCycles = ['monthly', 'yearly'];

  if (!validPlans.includes(plan)) {
    return res.status(400).json({ message: 'Invalid plan.' });
  }

  if (plan !== 'free' && !validCycles.includes(billing_cycle)) {
    return res.status(400).json({ message: 'Invalid billing cycle.' });
  }

  try {
    let plan_expiry = null;
    let subscription_status = 'active';

    if (plan === 'free') {
      plan_expiry = null;
      subscription_status = 'free';
    } else {
      const now = new Date();
      if (billing_cycle === 'monthly') {
        now.setMonth(now.getMonth() + 1);
      } else {
        now.setFullYear(now.getFullYear() + 1);
      }
      plan_expiry = now.toISOString().slice(0, 19).replace('T', ' ');
    }

    await pool.query(
      `UPDATE restaurants 
       SET subscription_plan = ?, billing_cycle = ?, subscription_status = ?, plan_expiry = ?
       WHERE id = ?`,
      [plan, plan === 'free' ? null : billing_cycle, subscription_status, plan_expiry, id]
    );

    res.json({ message: `Plan updated to ${plan} successfully.`, plan_expiry });
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getSaaSMetrics,
  getAllRestaurants,
  updateRestaurantPlan,
};
