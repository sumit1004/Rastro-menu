const pool = require('../config/db');

const getDishCount = async (restaurantId, poolInstance = pool) => {
  const [rows] = await poolInstance.query('SELECT COUNT(*) as count FROM dishes WHERE restaurant_id = ?', [restaurantId]);
  return rows[0].count;
};

module.exports = {
  getDishCount
};
