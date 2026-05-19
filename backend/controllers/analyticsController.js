const sessionTracker = require('../analytics/sessionTracker');
const dishTracker = require('../analytics/dishTracker');
const searchTracker = require('../analytics/searchTracker');
const analyticsAggregator = require('../analytics/analyticsAggregator');

exports.trackSession = async (req, res) => {
  try {
    const { restaurantId, sessionId, deviceType, browser, visitSource } = req.body;
    await sessionTracker.trackSession(restaurantId, sessionId, deviceType, browser, visitSource);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to track session' });
  }
};

exports.trackDishView = async (req, res) => {
  try {
    const { dishId, restaurantId, sessionId, viewDuration, clicked } = req.body;
    await dishTracker.trackDishView(dishId, restaurantId, sessionId, viewDuration, clicked);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to track dish view' });
  }
};

exports.trackSearch = async (req, res) => {
  try {
    const { restaurantId, sessionId, searchQuery, resultsCount } = req.body;
    await searchTracker.trackSearch(restaurantId, sessionId, searchQuery, resultsCount);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to track search' });
  }
};

exports.getDashboardMetrics = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { timeFilter } = req.query;
    
    // Optional: simple authorization check
    if (req.user && req.user.role !== 'admin') {
      const db = require('../config/db');
      const [restaurants] = await db.execute('SELECT id FROM restaurants WHERE user_id = ? AND id = ?', [req.user.id, restaurantId]);
      if (restaurants.length === 0) {
        return res.status(403).json({ error: 'Unauthorized to view these metrics' });
      }
    }

    const metrics = await analyticsAggregator.getDashboardMetrics(restaurantId, timeFilter);
    res.status(200).json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
};

exports.getTrendingDishes = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const trending = await analyticsAggregator.getTrendingDishes(restaurantId);
    res.status(200).json(trending);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trending dishes' });
  }
};
