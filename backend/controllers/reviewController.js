const pool = require('../config/db');

// Helper to get restaurant_id from user_id
const getRestaurantId = async (userId) => {
  const [restaurants] = await pool.query('SELECT id FROM restaurants WHERE user_id = ?', [userId]);
  return restaurants.length > 0 ? restaurants[0].id : null;
};

// @desc    Add a review
// @route   POST /api/reviews
// @access  Public
const addReview = async (req, res) => {
  const { dish_id, rating, review } = req.body;

  try {
    if (!dish_id || !rating) {
      return res.status(400).json({ message: 'Dish ID and Rating are required' });
    }

    // Insert review
    await pool.query(
      'INSERT INTO reviews (dish_id, rating, review) VALUES (?, ?, ?)',
      [dish_id, rating, review]
    );

    // Update dish average rating and total reviews
    const [stats] = await pool.query(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews FROM reviews WHERE dish_id = ?',
      [dish_id]
    );

    const newAvg = stats[0].avg_rating || 0;
    const newTotal = stats[0].total_reviews || 0;

    await pool.query(
      'UPDATE dishes SET average_rating = ?, total_reviews = ? WHERE id = ?',
      [newAvg, newTotal, dish_id]
    );

    res.status(201).json({ message: 'Review added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get reviews for a dish
// @route   GET /api/reviews/dish/:dishId
// @access  Public
const getReviewsByDish = async (req, res) => {
  try {
    const { dishId } = req.params;
    const [reviews] = await pool.query(
      'SELECT * FROM reviews WHERE dish_id = ? ORDER BY created_at DESC',
      [dishId]
    );
    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all reviews for a restaurant
// @route   GET /api/reviews/restaurant
// @access  Private
const getReviewsByRestaurant = async (req, res) => {
  try {
    const restaurantId = await getRestaurantId(req.user.id);
    if (!restaurantId) return res.status(400).json({ message: 'Restaurant not found' });

    const [reviews] = await pool.query(
      `SELECT r.*, d.name as dish_name, d.thumbnail_url as dish_image 
       FROM reviews r 
       JOIN dishes d ON r.dish_id = d.id 
       WHERE d.restaurant_id = ? 
       ORDER BY r.created_at DESC`,
      [restaurantId]
    );
    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private
const deleteReview = async (req, res) => {
  try {
    const restaurantId = await getRestaurantId(req.user.id);
    const reviewId = req.params.id;

    const [existing] = await pool.query(
      `SELECT r.*, d.id as dish_id FROM reviews r 
       JOIN dishes d ON r.dish_id = d.id 
       WHERE r.id = ? AND d.restaurant_id = ?`,
      [reviewId, restaurantId]
    );

    if (existing.length === 0) return res.status(404).json({ message: 'Review not found or unauthorized' });

    const dishId = existing[0].dish_id;
    await pool.query('DELETE FROM reviews WHERE id = ?', [reviewId]);

    const [stats] = await pool.query(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews FROM reviews WHERE dish_id = ?',
      [dishId]
    );
    
    const newAvg = stats[0].avg_rating || 0;
    const newTotal = stats[0].total_reviews || 0;

    await pool.query(
      'UPDATE dishes SET average_rating = ?, total_reviews = ? WHERE id = ?',
      [newAvg, newTotal, dishId]
    );

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  addReview,
  getReviewsByDish,
  getReviewsByRestaurant,
  deleteReview
};
