const pool = require('../config/db');
const { optimizeImage } = require('../utils/imageOptimizer');

// @desc    Get current user's restaurant profile
// @route   GET /api/restaurants/my-profile
// @access  Private
const getMyProfile = async (req, res) => {
  try {
    const [restaurants] = await pool.query('SELECT * FROM restaurants WHERE user_id = ?', [req.user.id]);
    
    if (restaurants.length === 0) {
      return res.status(404).json({ message: 'Restaurant profile not found' });
    }
    
    res.json(restaurants[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get restaurant by slug (Public)
// @route   GET /api/restaurants/slug/:slug
// @access  Public
const getRestaurantBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const [restaurants] = await pool.query('SELECT * FROM restaurants WHERE slug = ?', [slug]);
    
    if (restaurants.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    
    res.json(restaurants[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create or update restaurant profile
// @route   POST /api/restaurants
// @access  Private
const upsertProfile = async (req, res) => {
  const { 
    restaurant_name, slug, description, address, phone, 
    cuisine_type, instagram_link, website_link, opening_hours 
  } = req.body;

  try {
    // Check if slug is taken by another restaurant
    const [slugCheck] = await pool.query('SELECT id FROM restaurants WHERE slug = ? AND user_id != ?', [slug, req.user.id]);
    if (slugCheck.length > 0) {
      return res.status(400).json({ message: 'URL Slug is already taken' });
    }

    const [existing] = await pool.query('SELECT * FROM restaurants WHERE user_id = ?', [req.user.id]);

    let logoPath = existing.length > 0 ? existing[0].logo : null;
    let bannerPath = existing.length > 0 ? existing[0].banner : null;

    if (req.files) {
      if (req.files.logo && req.files.logo[0]) {
        logoPath = await optimizeImage(req.files.logo[0].buffer, `logo-${req.user.id}`, 'logos');
      }
      if (req.files.banner && req.files.banner[0]) {
        bannerPath = await optimizeImage(req.files.banner[0].buffer, `banner-${req.user.id}`, 'banners');
      }
    }

    if (existing.length === 0) {
      // Create
      const [result] = await pool.query(
        `INSERT INTO restaurants (user_id, restaurant_name, slug, logo, banner, description, address, phone, cuisine_type, instagram_link, website_link, opening_hours) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, restaurant_name, slug, logoPath, bannerPath, description, address, phone, cuisine_type, instagram_link, website_link, opening_hours]
      );
      res.status(201).json({ message: 'Profile created', id: result.insertId });
    } else {
      // Update
      await pool.query(
        `UPDATE restaurants SET 
         restaurant_name = ?, slug = ?, logo = ?, banner = ?, description = ?, address = ?, 
         phone = ?, cuisine_type = ?, instagram_link = ?, website_link = ?, opening_hours = ?
         WHERE user_id = ?`,
        [restaurant_name, slug, logoPath, bannerPath, description, address, phone, cuisine_type, instagram_link, website_link, opening_hours, req.user.id]
      );
      res.json({ message: 'Profile updated' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getMyProfile,
  getRestaurantBySlug,
  upsertProfile
};
