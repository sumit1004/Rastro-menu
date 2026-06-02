const pool = require('../config/db');
const { optimizeGlb } = require('../utils/glbOptimizer');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const fs = require('fs');

// @desc    Upload a new AR model to the central library
// @route   POST /api/admin/ar-models
// @access  Private/Admin
const uploadArModel = async (req, res) => {
  try {
    const { dish_name, category, tags } = req.body;
    if (!dish_name) return res.status(400).json({ message: 'Dish name is required' });

    let dish_slug = dish_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    // Check slug uniqueness
    let [existing] = await pool.query('SELECT id FROM ar_model_library WHERE dish_slug = ?', [dish_slug]);
    if (existing.length > 0) {
      dish_slug = `${dish_slug}-${Date.now()}`;
    }

    let glbUrl = null;
    let usdzUrl = null;

    if (!req.files || !req.files['glb_model']) {
      return res.status(400).json({ message: 'GLB model is required' });
    }

    // Optimize and Upload GLB
    const originalGlbPath = req.files['glb_model'][0].path;
    const optimizedGlbPath = await optimizeGlb(originalGlbPath);
    glbUrl = await uploadToCloudinary(optimizedGlbPath, 'models/glb');
    
    try { fs.unlinkSync(originalGlbPath); } catch (e) {}
    if (optimizedGlbPath !== originalGlbPath) {
      try { fs.unlinkSync(optimizedGlbPath); } catch (e) {}
    }

    // Upload USDZ if present
    if (req.files['usdz_model']) {
      usdzUrl = await uploadToCloudinary(req.files['usdz_model'][0].path, 'models/usdz');
      try { fs.unlinkSync(req.files['usdz_model'][0].path); } catch (e) {}
    }

    // Determine sizes if possible, here just basic stats or defaults
    const file_size_mb = (req.files['glb_model'][0].size / (1024 * 1024)).toFixed(2);

    const [result] = await pool.query(
      `INSERT INTO ar_model_library 
       (dish_name, dish_slug, category, tags, glb_url, usdz_url, file_size_mb) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [dish_name, dish_slug, category || null, tags || null, glbUrl, usdzUrl, file_size_mb]
    );

    res.status(201).json({ message: 'Model uploaded successfully', id: result.insertId });
  } catch (error) {
    console.error('Error uploading AR model:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all AR models from the central library
// @route   GET /api/admin/ar-models
// @access  Private/Admin
const getArModels = async (req, res) => {
  try {
    const [models] = await pool.query('SELECT * FROM ar_model_library ORDER BY created_at DESC');
    res.json(models);
  } catch (error) {
    console.error('Error fetching AR models:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete an AR model from the central library
// @route   DELETE /api/admin/ar-models/:id
// @access  Private/Admin
const deleteArModel = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT * FROM ar_model_library WHERE id = ?', [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Model not found' });
    }

    const model = existing[0];
    
    if (model.glb_url) await deleteFromCloudinary(model.glb_url);
    if (model.usdz_url) await deleteFromCloudinary(model.usdz_url);

    await pool.query('DELETE FROM ar_model_library WHERE id = ?', [id]);
    
    res.json({ message: 'Model deleted successfully' });
  } catch (error) {
    console.error('Error deleting AR model:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  uploadArModel,
  getArModels,
  deleteArModel
};
