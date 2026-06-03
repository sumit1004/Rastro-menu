const pool = require('../config/db');
const { optimizeGlb } = require('../utils/glbOptimizer');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const fs = require('fs');

// @desc    Upload a new AR model to the central library
// @route   POST /api/admin/ar-models
// @access  Private/Admin
const uploadArModel = async (req, res) => {
  try {
    const { 
      dish_name, 
      category, 
      tags,
      normalized_rotation_x,
      normalized_rotation_y,
      normalized_rotation_z,
      normalized_scale,
      normalized_height_offset 
    } = req.body;
    
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

    // Upload unoptimized GLB first
    const originalGlbPath = req.files['glb_model'][0].path;
    glbUrl = await uploadToCloudinary(originalGlbPath, 'models/glb');

    // Upload USDZ if present
    if (req.files['usdz_model']) {
      usdzUrl = await uploadToCloudinary(req.files['usdz_model'][0].path, 'models/usdz');
      try { fs.unlinkSync(req.files['usdz_model'][0].path); } catch (e) {}
    }

    // Determine sizes if possible, here just basic stats or defaults
    const file_size_mb = (req.files['glb_model'][0].size / (1024 * 1024)).toFixed(2);

    const rotX = parseFloat(normalized_rotation_x) || 0.0000;
    const rotY = parseFloat(normalized_rotation_y) || 0.0000;
    const rotZ = parseFloat(normalized_rotation_z) || 0.0000;
    const scale = parseFloat(normalized_scale) || 1.0000;
    const heightOffset = parseFloat(normalized_height_offset) || 0.0000;

    const [result] = await pool.query(
      `INSERT INTO ar_model_library 
       (dish_name, dish_slug, category, tags, glb_url, usdz_url, file_size_mb, 
        normalized_rotation_x, normalized_rotation_y, normalized_rotation_z, 
        normalized_scale, normalized_height_offset) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dish_name, dish_slug, category || null, tags || null, glbUrl, usdzUrl, file_size_mb,
        rotX, rotY, rotZ, scale, heightOffset
      ]
    );

    res.status(201).json({ message: 'Model uploaded successfully', id: result.insertId });

    // Background Optimization Pipeline
    (async () => {
      try {
        const optimizedPath = await optimizeGlb(originalGlbPath);
        if (optimizedPath !== originalGlbPath) {
          const newGlbUrl = await uploadToCloudinary(optimizedPath, 'models/glb');
          await pool.query('UPDATE ar_model_library SET glb_url = ? WHERE id = ?', [newGlbUrl, result.insertId]);
          // Propagate to dishes table if any dishes use this ar_model_id
          await pool.query('UPDATE dishes SET glb_model_url = ? WHERE ar_model_id = ?', [newGlbUrl, result.insertId]);
          try { fs.unlinkSync(optimizedPath); } catch (e) {}
        }
      } catch (e) {
        console.warn('Background optimization failed (keeping original):', e);
      } finally {
        try { fs.unlinkSync(originalGlbPath); } catch (e) {}
      }
    })();
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

// @desc    Modify an existing AR model's metadata/orientation
// @route   PUT /api/admin/ar-models/:id
// @access  Private/Admin
const modifyArModel = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      dish_name, 
      category, 
      tags, 
      normalized_rotation_x, 
      normalized_rotation_y, 
      normalized_rotation_z, 
      normalized_scale, 
      normalized_height_offset 
    } = req.body;

    const [existing] = await pool.query('SELECT * FROM ar_model_library WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ message: 'Model not found' });

    let dish_slug = existing[0].dish_slug;
    if (dish_name && dish_name !== existing[0].dish_name) {
      dish_slug = dish_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const [slugCheck] = await pool.query('SELECT id FROM ar_model_library WHERE dish_slug = ? AND id != ?', [dish_slug, id]);
      if (slugCheck.length > 0) {
        dish_slug = `${dish_slug}-${Date.now()}`;
      }
    }

    const name = dish_name || existing[0].dish_name;
    const cat = category !== undefined ? category : existing[0].category;
    const tg = tags !== undefined ? tags : existing[0].tags;
    const rotX = normalized_rotation_x !== undefined ? parseFloat(normalized_rotation_x) : existing[0].normalized_rotation_x;
    const rotY = normalized_rotation_y !== undefined ? parseFloat(normalized_rotation_y) : existing[0].normalized_rotation_y;
    const rotZ = normalized_rotation_z !== undefined ? parseFloat(normalized_rotation_z) : existing[0].normalized_rotation_z;
    const scale = normalized_scale !== undefined ? parseFloat(normalized_scale) : existing[0].normalized_scale;
    const heightOffset = normalized_height_offset !== undefined ? parseFloat(normalized_height_offset) : existing[0].normalized_height_offset;

    await pool.query(
      `UPDATE ar_model_library SET 
       dish_name = ?, dish_slug = ?, category = ?, tags = ?, 
       normalized_rotation_x = ?, normalized_rotation_y = ?, normalized_rotation_z = ?, 
       normalized_scale = ?, normalized_height_offset = ?
       WHERE id = ?`,
      [name, dish_slug, cat, tg, rotX, rotY, rotZ, scale, heightOffset, id]
    );

    res.json({ message: 'Model updated successfully' });
  } catch (error) {
    console.error('Error modifying AR model:', error);
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

// @desc    Bulk upload multiple AR models to the central library
// @route   POST /api/admin/ar-models/bulk
// @access  Private/Admin
const bulkUploadArModels = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No GLB models provided' });
    }

    const metadataStr = req.body.models_metadata;
    let metadataArray = [];
    if (metadataStr) {
      try {
        metadataArray = JSON.parse(metadataStr);
      } catch (e) {
        return res.status(400).json({ message: 'Invalid metadata format' });
      }
    }

    const results = [];
    const errors = [];
    const backgroundTasks = [];

    // Parallelize Cloudinary uploads, max 5 at a time
    let idx = 0;
    const processUploadWorker = async () => {
      while (idx < req.files.length) {
        const i = idx++;
        const file = req.files[i];
        const originalPath = file.path;
        
        let meta = metadataArray.find(m => m.filename === file.originalname) || metadataArray[i] || {};
        
        const dish_name = meta.dish_name || file.originalname.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase());
        const category = meta.category || null;
        const tags = meta.tags || null;
        const rotX = parseFloat(meta.normalized_rotation_x) || 0.0000;
        const rotY = parseFloat(meta.normalized_rotation_y) || 0.0000;
        const rotZ = parseFloat(meta.normalized_rotation_z) || 0.0000;
        const scale = parseFloat(meta.normalized_scale) || 1.0000;
        const heightOffset = parseFloat(meta.normalized_height_offset) || 0.0000;

        let dish_slug = dish_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        try {
          let [existing] = await pool.query('SELECT id FROM ar_model_library WHERE dish_slug = ?', [dish_slug]);
          if (existing.length > 0) dish_slug = `${dish_slug}-${Date.now()}`;

          // Upload original GLB
          const glbUrl = await uploadToCloudinary(originalPath, 'models/glb');
          const file_size_mb = (file.size / (1024 * 1024)).toFixed(2);

          const [insertResult] = await pool.query(
            `INSERT INTO ar_model_library 
             (dish_name, dish_slug, category, tags, glb_url, file_size_mb, 
              normalized_rotation_x, normalized_rotation_y, normalized_rotation_z, 
              normalized_scale, normalized_height_offset) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [dish_name, dish_slug, category, tags, glbUrl, file_size_mb, rotX, rotY, rotZ, scale, heightOffset]
          );

          results.push({ id: insertResult.insertId, dish_name, status: 'success' });
          backgroundTasks.push({ originalPath, insertId: insertResult.insertId });
        } catch (err) {
          console.error(`Error processing file ${file.originalname}:`, err);
          try { fs.unlinkSync(originalPath); } catch (e) {}
          errors.push({ filename: file.originalname, dish_name, error: err.message || 'Processing failed' });
        }
      }
    };
    
    // Max 5 concurrent uploads
    const uploadWorkers = Array(Math.min(5, req.files.length)).fill(0).map(() => processUploadWorker());
    await Promise.all(uploadWorkers);

    res.status(201).json({ 
      message: 'Bulk upload completed', 
      results,
      errors
    });

    // Start background optimizations (max 5 concurrent)
    (async () => {
      let bIdx = 0;
      const optimizeWorker = async () => {
        while (bIdx < backgroundTasks.length) {
          const task = backgroundTasks[bIdx++];
          try {
            const optimizedPath = await optimizeGlb(task.originalPath);
            if (optimizedPath !== task.originalPath) {
              const newGlbUrl = await uploadToCloudinary(optimizedPath, 'models/glb');
              await pool.query('UPDATE ar_model_library SET glb_url = ? WHERE id = ?', [newGlbUrl, task.insertId]);
              await pool.query('UPDATE dishes SET glb_model_url = ? WHERE ar_model_id = ?', [newGlbUrl, task.insertId]);
              try { fs.unlinkSync(optimizedPath); } catch (e) {}
            }
          } catch (err) {
            console.warn('Background optimization failed for bulk (keeping original):', err);
          } finally {
            try { fs.unlinkSync(task.originalPath); } catch (e) {}
          }
        }
      };
      const optWorkers = Array(Math.min(5, backgroundTasks.length)).fill(0).map(() => optimizeWorker());
      await Promise.all(optWorkers);
    })();
  } catch (error) {
    console.error('Error in bulk AR upload:', error);
    res.status(500).json({ message: 'Server error during bulk upload' });
  }
};

module.exports = {
  uploadArModel,
  getArModels,
  modifyArModel,
  deleteArModel,
  bulkUploadArModels
};
