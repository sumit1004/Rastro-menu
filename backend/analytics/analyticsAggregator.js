const db = require('../config/db');

// Lightweight in-memory cache
const metricsCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

class AnalyticsAggregator {
  
  generateInsights(overview, topDishes, topSearches) {
    const insights = [];
    
    if (overview.totalViews > 0) {
      insights.push(`You have had ${overview.uniqueVisitors} unique visitors exploring your menu.`);
    }

    if (topDishes && topDishes.length > 0) {
      insights.push(`"${topDishes[0].name}" is currently your most engaging dish with ${topDishes[0].viewCount} views.`);
    }

    if (topSearches && topSearches.length > 0) {
      insights.push(`Customers are frequently searching for "${topSearches[0].search_query}", consider highlighting it.`);
    }

    if (insights.length === 0) {
      insights.push("Not enough data to generate insights yet. Check back soon!");
    }

    return insights;
  }

  async getDashboardMetrics(restaurantId, timeFilter = 'all') {
    const cacheKey = `${restaurantId}_${timeFilter}`;
    const cached = metricsCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return cached.data;
    }

    try {
      let timeCondition = '';
      if (timeFilter === 'today') {
        timeCondition = '>= CURDATE()';
      } else if (timeFilter === '7days') {
        timeCondition = '>= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
      } else if (timeFilter === '30days') {
        timeCondition = '>= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
      }

      const tcDefault = timeCondition ? `AND created_at ${timeCondition}` : '';
      const tcDv = timeCondition ? `AND dv.created_at ${timeCondition}` : '';

      // Total Menu Views
      const [sessions] = await db.execute(`
        SELECT COUNT(id) as totalViews, COUNT(DISTINCT session_id) as uniqueVisitors
        FROM menu_sessions 
        WHERE restaurant_id = ? ${tcDefault}
      `, [restaurantId]);

      // Most Viewed Dishes
      const [topDishes] = await db.execute(`
        SELECT d.id, d.name, COUNT(dv.id) as viewCount
        FROM dish_views dv
        JOIN dishes d ON dv.dish_id = d.id
        WHERE dv.restaurant_id = ? ${tcDv}
        GROUP BY dv.dish_id
        ORDER BY viewCount DESC
        LIMIT 5
      `, [restaurantId]);

      // Top Searches
      const [topSearches] = await db.execute(`
        SELECT search_query, COUNT(id) as searchCount
        FROM search_logs
        WHERE restaurant_id = ? ${tcDefault}
        GROUP BY search_query
        ORDER BY searchCount DESC
        LIMIT 5
      `, [restaurantId]);

      // View counts per day for chart (Last 7 days)
      const [dailyViews] = await db.execute(`
        SELECT DATE(created_at) as date, COUNT(id) as views
        FROM menu_sessions
        WHERE restaurant_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC
      `, [restaurantId]);

      const overview = {
        totalViews: sessions[0].totalViews || 0,
        uniqueVisitors: sessions[0].uniqueVisitors || 0,
      };

      const result = {
        overview,
        topDishes,
        topSearches,
        dailyViews,
        insights: this.generateInsights(overview, topDishes, topSearches)
      };

      // Set cache
      metricsCache.set(cacheKey, { timestamp: Date.now(), data: result });

      return result;
    } catch (error) {
      console.error('Error aggregating metrics:', error);
      throw error;
    }
  }

  async getTrendingDishes(restaurantId) {
    try {
      // Rule based: Most views in the last 7 days + high rating
      const [dishes] = await db.execute(`
        SELECT d.*, COUNT(dv.id) as recent_views
        FROM dishes d
        LEFT JOIN dish_views dv ON d.id = dv.dish_id AND dv.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        WHERE d.restaurant_id = ? AND d.is_available = TRUE
        GROUP BY d.id
        ORDER BY recent_views DESC, d.average_rating DESC
        LIMIT 6
      `, [restaurantId]);
      
      return dishes;
    } catch (error) {
       console.error('Error getting trending dishes:', error);
       throw error;
    }
  }
}

module.exports = new AnalyticsAggregator();
