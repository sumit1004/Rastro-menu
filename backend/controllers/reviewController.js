const pool = require('../config/db');

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

module.exports = {
  addReview,
  getReviewsByDish
};
