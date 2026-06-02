const db = require('../config/db');

class DishTracker {
  async trackDishView(dishId, restaurantId, sessionId, viewDuration, clicked) {
    try {
      const query = `
        INSERT INTO dish_views (dish_id, restaurant_id, session_id, view_duration, clicked)
        VALUES (?, ?, ?, ?, ?)
      `;
      await db.execute(query, [dishId, restaurantId, sessionId, viewDuration || 0, clicked ? 1 : 0]);
      return { success: true };
    } catch (error) {
      if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.errno === 1452) {
        console.warn(`Attempted to track view for non-existent dish ${dishId}, ignoring.`);
        return { success: false, reason: 'Dish not found' };
      }
      console.error('Error tracking dish view:', error);
      throw error;
    }
  }
}

module.exports = new DishTracker();
