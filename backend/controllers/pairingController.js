const pool = require('../config/db');

const getRestaurantId = async (userId) => {
  const [restaurants] = await pool.query('SELECT id FROM restaurants WHERE user_id = ?', [userId]);
  return restaurants.length > 0 ? restaurants[0].id : null;
};

// @desc    Get Pairings for a dish
// @route   GET /api/pairings/dish/:dishId
// @access  Public
const getPairings = async (req, res) => {
  try {
    const { dishId } = req.params;
    const [pairings] = await pool.query(`
      SELECT dp.id as pairing_id, dp.priority, d.* 
      FROM dish_pairings dp
      JOIN dishes d ON dp.paired_dish_id = d.id
      WHERE dp.dish_id = ? AND d.is_available = TRUE
      ORDER BY dp.priority ASC
    `, [dishId]);
    
    res.json(pairings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching pairings' });
  }
};

// @desc    Add a pairing
// @route   POST /api/pairings
// @access  Private
const addPairing = async (req, res) => {
  try {
    const restaurantId = await getRestaurantId(req.user.id);
    if (!restaurantId) return res.status(403).json({ message: 'Unauthorized' });

    const { dish_id, paired_dish_id, priority = 0 } = req.body;

    // Verify both dishes belong to the restaurant
    const [dishes] = await pool.query('SELECT id FROM dishes WHERE id IN (?, ?) AND restaurant_id = ?', [dish_id, paired_dish_id, restaurantId]);
    if (dishes.length !== 2 && dish_id !== paired_dish_id) {
        return res.status(400).json({ message: 'Invalid dishes or unauthorized' });
    }

    // Check limit (max 5)
    const [existing] = await pool.query('SELECT COUNT(*) as count FROM dish_pairings WHERE dish_id = ?', [dish_id]);
    if (existing[0].count >= 5) {
        return res.status(400).json({ message: 'Maximum 5 pairings allowed per dish' });
    }

    const [result] = await pool.query(
      'INSERT INTO dish_pairings (restaurant_id, dish_id, paired_dish_id, priority) VALUES (?, ?, ?, ?)',
      [restaurantId, dish_id, paired_dish_id, priority]
    );

    res.status(201).json({ message: 'Pairing added', id: result.insertId });
  } catch (error) {
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ message: 'Pairing already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Remove a pairing
// @route   DELETE /api/pairings/:id
// @access  Private
const removePairing = async (req, res) => {
  try {
    const restaurantId = await getRestaurantId(req.user.id);
    if (!restaurantId) return res.status(403).json({ message: 'Unauthorized' });

    const pairingId = req.params.id;
    
    const [existing] = await pool.query('SELECT id FROM dish_pairings WHERE id = ? AND restaurant_id = ?', [pairingId, restaurantId]);
    if (existing.length === 0) return res.status(404).json({ message: 'Pairing not found or unauthorized' });

    await pool.query('DELETE FROM dish_pairings WHERE id = ?', [pairingId]);
    res.json({ message: 'Pairing removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update Priority
// @route   PUT /api/pairings/priority
// @access  Private
const updatePriority = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const restaurantId = await getRestaurantId(req.user.id);
    if (!restaurantId) return res.status(403).json({ message: 'Unauthorized' });

    const { updates } = req.body; // Array of { id, priority }
    
    await connection.beginTransaction();
    
    for (const update of updates) {
        await connection.query(
            'UPDATE dish_pairings SET priority = ? WHERE id = ? AND restaurant_id = ?',
            [update.priority, update.id, restaurantId]
        );
    }
    
    await connection.commit();
    res.json({ message: 'Priorities updated' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

// @desc    Smart Fallback Recommendations
// @route   GET /api/pairings/fallback/:dishId
// @access  Public
const getSmartFallback = async (req, res) => {
  try {
    const { dishId } = req.params;
    
    const [dishInfo] = await pool.query('SELECT restaurant_id, category, ai_category, dish_role, cuisine_type, meal_type FROM dishes WHERE id = ?', [dishId]);
    if (dishInfo.length === 0) return res.status(404).json({ message: 'Dish not found' });
    
    const { restaurant_id, dish_role, cuisine_type, meal_type, category, ai_category } = dishInfo[0];
    
    const targetCuisine = cuisine_type || '';
    const targetMeal = meal_type || '';
    
    let fallbackQuery = `
      SELECT * FROM dishes 
      WHERE restaurant_id = ? AND is_available = TRUE AND id != ?
    `;
    const queryParams = [restaurant_id, dishId];

    // Enforce cuisine and meal type matching if they exist (excluding beverages/desserts which are universal)
    fallbackQuery += `
      AND (
        cuisine_type = ? OR cuisine_type IS NULL OR cuisine_type = '' OR dish_role IN ('beverage', 'dessert')
      )
    `;
    queryParams.push(targetCuisine);
    
    if (targetMeal) {
      fallbackQuery += `
        AND (
          meal_type = ? OR meal_type IS NULL OR meal_type = '' OR dish_role IN ('beverage')
        )
      `;
      queryParams.push(targetMeal);
    }
    
    // Exclude other mains if current is main
    if (dish_role === 'main' || category?.toLowerCase().includes('main')) {
      fallbackQuery += ` AND (dish_role != 'main' OR dish_role IS NULL) `;
    }

    // Sort logic to prioritize complements: Beverages -> Sides -> Bread/Accompaniment -> Dessert -> Others
    fallbackQuery += `
      ORDER BY 
        CASE 
          WHEN dish_role = 'beverage' THEN 1
          WHEN dish_role = 'side' THEN 2
          WHEN dish_role = 'bread' THEN 3
          WHEN dish_role = 'accompaniment' THEN 4
          WHEN dish_role = 'dip' THEN 5
          WHEN dish_role = 'dessert' THEN 6
          WHEN (category LIKE '%beverage%' OR ai_category LIKE '%beverage%' OR category LIKE '%drink%') THEN 1 
          WHEN (category LIKE '%side%') THEN 2
          WHEN (category LIKE '%dessert%') THEN 6
          ELSE 99
        END ASC,
        is_featured DESC, average_rating DESC
      LIMIT 3
    `;

    const [recommendations] = await pool.query(fallbackQuery, queryParams);
    
    // Return them with a fake pairing_id to keep frontend schema consistent
    const formatted = recommendations.map((r, i) => ({
      pairing_id: 'fallback-' + r.id,
      priority: i,
      ...r
    }));
    
    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Sync Pairings
// @route   PUT /api/pairings/sync/:dishId
// @access  Private
const syncPairings = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const restaurantId = await getRestaurantId(req.user.id);
    if (!restaurantId) return res.status(403).json({ message: 'Unauthorized' });

    const dishId = req.params.dishId;
    const { paired_dish_ids } = req.body; // Array of ids in order

    // verify dish belongs to restaurant
    const [dishCheck] = await connection.query('SELECT id FROM dishes WHERE id = ? AND restaurant_id = ?', [dishId, restaurantId]);
    if (dishCheck.length === 0) {
        return res.status(404).json({ message: 'Dish not found or unauthorized' });
    }

    if (paired_dish_ids.length > 5) {
        return res.status(400).json({ message: 'Maximum 5 pairings allowed' });
    }

    await connection.beginTransaction();

    // delete existing
    await connection.query('DELETE FROM dish_pairings WHERE dish_id = ?', [dishId]);

    // insert new
    for (let i = 0; i < paired_dish_ids.length; i++) {
        await connection.query(
            'INSERT INTO dish_pairings (restaurant_id, dish_id, paired_dish_id, priority) VALUES (?, ?, ?, ?)',
            [restaurantId, dishId, paired_dish_ids[i], i]
        );
    }

    await connection.commit();
    res.json({ message: 'Pairings synced' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

module.exports = {
  getPairings,
  addPairing,
  removePairing,
  updatePriority,
  getSmartFallback,
  syncPairings
};
