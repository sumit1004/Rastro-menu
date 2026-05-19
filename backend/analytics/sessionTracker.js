const db = require('../config/db');

class SessionTracker {
  async trackSession(restaurantId, sessionId, deviceType, browser, visitSource) {
    try {
      const query = `
        INSERT INTO menu_sessions (restaurant_id, session_id, device_type, browser, visit_source)
        VALUES (?, ?, ?, ?, ?)
      `;
      await db.execute(query, [restaurantId, sessionId, deviceType || null, browser || null, visitSource || null]);
      return { success: true };
    } catch (error) {
      console.error('Error tracking session:', error);
      throw error;
    }
  }
}

module.exports = new SessionTracker();
