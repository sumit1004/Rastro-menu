const pool = require('../config/db');

const getRestaurantId = async (userId) => {
  const [restaurants] = await pool.query('SELECT id FROM restaurants WHERE user_id = ?', [userId]);
  return restaurants.length > 0 ? restaurants[0].id : null;
};

// @desc    Get Suggestions for a dish
// @route   GET /api/suggestions/dish/:dishId
// @access  Public
const getSuggestions = async (req, res) => {
  try {
    const { dishId } = req.params;
    const [suggestions] = await pool.query(`
      SELECT ds.id as suggestion_id, d.* 
      FROM dish_suggestions ds
      JOIN dishes d ON ds.suggested_dish_id = d.id
      WHERE ds.dish_id = ? AND d.is_available = TRUE
      ORDER BY ds.id ASC
    `, [dishId]);
    
    res.json(suggestions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching suggestions' });
  }
};

// @desc    Sync Suggestions
// @route   PUT /api/suggestions/sync/:dishId
// @access  Private
const syncSuggestions = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const restaurantId = await getRestaurantId(req.user.id);
    if (!restaurantId) return res.status(403).json({ message: 'Unauthorized' });

    const dishId = req.params.dishId;
    const { suggested_dish_ids } = req.body; // Array of ids

    // verify dish belongs to restaurant
    const [dishCheck] = await connection.query('SELECT id FROM dishes WHERE id = ? AND restaurant_id = ?', [dishId, restaurantId]);
    if (dishCheck.length === 0) {
        return res.status(404).json({ message: 'Dish not found or unauthorized' });
    }

    await connection.beginTransaction();

    // delete existing
    await connection.query('DELETE FROM dish_suggestions WHERE dish_id = ?', [dishId]);

    // insert new
    for (const suggestedId of suggested_dish_ids) {
        // avoid self suggestion
        if (suggestedId === parseInt(dishId)) continue;
        
        try {
            await connection.query(
                'INSERT INTO dish_suggestions (restaurant_id, dish_id, suggested_dish_id) VALUES (?, ?, ?)',
                [restaurantId, dishId, suggestedId]
            );
        } catch (err) {
            if (err.code !== 'ER_DUP_ENTRY') {
                throw err;
            }
        }
    }

    await connection.commit();
    res.json({ message: 'Suggestions synced' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

module.exports = {
  getSuggestions,
  syncSuggestions
};
