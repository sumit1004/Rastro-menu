const pool = require('../config/db');

const getDishCount = async (restaurantId, poolInstance = pool) => {
  const [rows] = await poolInstance.query('SELECT COUNT(*) as count FROM dishes WHERE restaurant_id = ?', [restaurantId]);
  return rows[0].count;
};

const getAiUsageCount = async (restaurantId, poolInstance = pool) => {
  const [rows] = await poolInstance.query('SELECT usage_count FROM usage_tracking WHERE restaurant_id = ? AND feature_name = ?', [restaurantId, 'ai_generations']);
  return rows.length > 0 ? rows[0].usage_count : 0;
};

const incrementAiUsage = async (restaurantId, poolInstance = pool) => {
  const query = `
    INSERT INTO usage_tracking (restaurant_id, feature_name, usage_count) 
    VALUES (?, ?, 1) 
    ON DUPLICATE KEY UPDATE usage_count = usage_count + 1
  `;
  await poolInstance.query(query, [restaurantId, 'ai_generations']);
};

module.exports = {
  getDishCount,
  getAiUsageCount,
  incrementAiUsage
};
