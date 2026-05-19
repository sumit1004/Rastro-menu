const db = require('../config/db');

class SearchTracker {
  async trackSearch(restaurantId, sessionId, searchQuery, resultsCount) {
    try {
      const query = `
        INSERT INTO search_logs (restaurant_id, session_id, search_query, result_count)
        VALUES (?, ?, ?, ?)
      `;
      await db.execute(query, [restaurantId, sessionId, searchQuery, resultsCount || 0]);
      return { success: true };
    } catch (error) {
      console.error('Error tracking search:', error);
      throw error;
    }
  }
}

module.exports = new SearchTracker();
