const pool = require('../config/db');
const { optimizeImage } = require('../utils/imageOptimizer');

// Helper to get restaurant_id from user_id
const getRestaurantId = async (userId) => {
  const [restaurants] = await pool.query('SELECT id FROM restaurants WHERE user_id = ?', [userId]);
  return restaurants.length > 0 ? restaurants[0].id : null;
};

// @desc    Get all dishes for a restaurant (Public & Private)
// @route   GET /api/dishes/restaurant/:restaurantId
// @access  Public
const getDishesByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const [dishes] = await pool.query('SELECT * FROM dishes WHERE restaurant_id = ? ORDER BY created_at DESC', [restaurantId]);
    res.json(dishes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single dish
// @route   GET /api/dishes/:id
// @access  Public
const getDishById = async (req, res) => {
  try {
    const [dishes] = await pool.query('SELECT * FROM dishes WHERE id = ?', [req.params.id]);
    if (dishes.length === 0) return res.status(404).json({ message: 'Dish not found' });
    res.json(dishes[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add a dish
// @route   POST /api/dishes
// @access  Private
const addDish = async (req, res) => {
  try {
    const restaurantId = await getRestaurantId(req.user.id);
    if (!restaurantId) return res.status(400).json({ message: 'Please create a restaurant profile first' });

    const { 
      name, short_description, description, ingredients, category, 
      price, spice_level, calories, preparation_time, is_available, is_featured 
    } = req.body;

    let imageUrl = null;
    let thumbnailUrl = null;

    if (req.file) {
      imageUrl = await optimizeImage(req.file.buffer, `dish-${Date.now()}`, 'dishes');
      // For MVP, we can use the same image URL for thumbnail
      thumbnailUrl = imageUrl; 
    }

    const [result] = await pool.query(
      `INSERT INTO dishes 
      (restaurant_id, name, short_description, description, ingredients, category, price, spice_level, calories, preparation_time, image_url, thumbnail_url, is_available, is_featured) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [restaurantId, name, short_description, description, ingredients, category, price, spice_level, calories, preparation_time, imageUrl, thumbnailUrl, is_available === 'true' || is_available === true, is_featured === 'true' || is_featured === true]
    );

    res.status(201).json({ message: 'Dish added', id: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update a dish
// @route   PUT /api/dishes/:id
// @access  Private
const updateDish = async (req, res) => {
  try {
    const restaurantId = await getRestaurantId(req.user.id);
    const dishId = req.params.id;

    const [existing] = await pool.query('SELECT * FROM dishes WHERE id = ? AND restaurant_id = ?', [dishId, restaurantId]);
    if (existing.length === 0) return res.status(404).json({ message: 'Dish not found or unauthorized' });

    const { 
      name, short_description, description, ingredients, category, 
      price, spice_level, calories, preparation_time, is_available, is_featured 
    } = req.body;

    let imageUrl = existing[0].image_url;
    let thumbnailUrl = existing[0].thumbnail_url;

    if (req.file) {
      imageUrl = await optimizeImage(req.file.buffer, `dish-${Date.now()}`, 'dishes');
      thumbnailUrl = imageUrl;
    }

    await pool.query(
      `UPDATE dishes SET 
      name = ?, short_description = ?, description = ?, ingredients = ?, category = ?, 
      price = ?, spice_level = ?, calories = ?, preparation_time = ?, image_url = ?, thumbnail_url = ?, 
      is_available = ?, is_featured = ?
      WHERE id = ?`,
      [name, short_description, description, ingredients, category, price, spice_level, calories, preparation_time, imageUrl, thumbnailUrl, is_available === 'true' || is_available === true, is_featured === 'true' || is_featured === true, dishId]
    );

    res.json({ message: 'Dish updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a dish
// @route   DELETE /api/dishes/:id
// @access  Private
const deleteDish = async (req, res) => {
  try {
    const restaurantId = await getRestaurantId(req.user.id);
    const dishId = req.params.id;

    const [existing] = await pool.query('SELECT * FROM dishes WHERE id = ? AND restaurant_id = ?', [dishId, restaurantId]);
    if (existing.length === 0) return res.status(404).json({ message: 'Dish not found or unauthorized' });

    await pool.query('DELETE FROM dishes WHERE id = ?', [dishId]);
    res.json({ message: 'Dish deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getDishesByRestaurant,
  getDishById,
  addDish,
  updateDish,
  deleteDish
};
