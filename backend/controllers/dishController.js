const pool = require('../config/db');
const { optimizeArImage } = require('../utils/arImageOptimizer');
const { roundMoney } = require('../utils/money');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const { optimizeGlb } = require('../utils/glbOptimizer');
const fs = require('fs');

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
    
    // Use IFNULL for optional normalized columns to prevent query failure if columns don't exist yet
    // Primary query with full normalized data
    let dishes;
    try {
      [dishes] = await pool.query(
        `SELECT d.*,
                a.glb_url        AS library_glb_url,
                a.usdz_url       AS library_usdz_url,
                a.thumbnail_url  AS library_thumbnail_url,
                a.dish_name      AS library_dish_name,
                IFNULL(a.normalized_rotation_x, 0)    AS normalized_rotation_x,
                IFNULL(a.normalized_rotation_y, 0)    AS normalized_rotation_y,
                IFNULL(a.normalized_rotation_z, 0)    AS normalized_rotation_z,
                IFNULL(a.normalized_scale, 1.0)       AS normalized_scale,
                IFNULL(a.normalized_height_offset, 0) AS normalized_height_offset
         FROM dishes d
         LEFT JOIN ar_model_library a ON d.ar_model_id = a.id
         WHERE d.restaurant_id = ?
         ORDER BY d.created_at DESC`,
        [restaurantId]
      );
    } catch (queryErr) {
      // Fallback: normalized columns may not exist yet in the DB — use basic join
      console.warn('Full AR query failed, falling back to basic join:', queryErr.message);
      [dishes] = await pool.query(
        `SELECT d.*,
                a.glb_url       AS library_glb_url,
                a.usdz_url      AS library_usdz_url,
                a.thumbnail_url AS library_thumbnail_url,
                a.dish_name     AS library_dish_name,
                0               AS normalized_rotation_x,
                0               AS normalized_rotation_y,
                0               AS normalized_rotation_z,
                1.0             AS normalized_scale,
                0               AS normalized_height_offset
         FROM dishes d
         LEFT JOIN ar_model_library a ON d.ar_model_id = a.id
         WHERE d.restaurant_id = ?
         ORDER BY d.created_at DESC`,
        [restaurantId]
      );
    }

    const formattedDishes = dishes.map(dish => {
      let ar_model = null;

      // Build ar_model from library JOIN (preferred) or legacy direct upload fields
      if (dish.ar_model_id && dish.library_glb_url) {
        // Centralized AR library model
        ar_model = {
          id: dish.ar_model_id,
          glb_url: dish.library_glb_url,
          usdz_url: dish.library_usdz_url || null,
          thumbnail_url: dish.library_thumbnail_url || null,
          dish_name: dish.library_dish_name || null,
          normalized_rotation_x: dish.normalized_rotation_x || 0,
          normalized_rotation_y: dish.normalized_rotation_y || 0,
          normalized_rotation_z: dish.normalized_rotation_z || 0,
          normalized_scale: dish.normalized_scale || 1.0,
          normalized_height_offset: dish.normalized_height_offset || 0
        };
      } else if (dish.ar_model_id && dish.glb_model_url) {
        // ar_model_id set but library JOIN returned no glb_url — use dish's own glb_model_url
        ar_model = {
          id: dish.ar_model_id,
          glb_url: dish.glb_model_url,
          usdz_url: dish.usdz_model_url || null,
          thumbnail_url: null,
          dish_name: null,
          normalized_rotation_x: 0,
          normalized_rotation_y: 0,
          normalized_rotation_z: 0,
          normalized_scale: 1.0,
          normalized_height_offset: 0
        };
      } else if (!dish.ar_model_id && dish.glb_model_url) {
        // Legacy: no library model, just a directly-uploaded GLB
        ar_model = {
          glb_url: dish.glb_model_url,
          usdz_url: dish.usdz_model_url || null
        };
      }

      // Remove flat JOIN fields from response to keep it clean
      const {
        library_glb_url, library_usdz_url, library_thumbnail_url, library_dish_name,
        normalized_rotation_x, normalized_rotation_y, normalized_rotation_z,
        normalized_scale, normalized_height_offset,
        ...cleanDish
      } = dish;

      // Force enable_3d_ar true whenever an ar_model is available
      if (ar_model && ar_model.glb_url) {
        cleanDish.enable_3d_ar = true;
      }

      return {
        ...cleanDish,
        ar_model
      };
    });

    res.json(formattedDishes);
  } catch (error) {
    console.error('getDishesByRestaurant error:', error);
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

    const name = req.body.name;
    const short_description = req.body.short_description || null;
    const description = req.body.description || null;
    const ingredients = req.body.ingredients || null;
    const category = req.body.category || null;
    const price = roundMoney(req.body.price || 0);
    const has_full_plate = req.body.has_full_plate === 'true' || req.body.has_full_plate === true || req.body.has_full_plate === '1' || req.body.has_full_plate === 1;
    const has_half_plate = req.body.has_half_plate === 'true' || req.body.has_half_plate === true || req.body.has_half_plate === '1' || req.body.has_half_plate === 1;
    const full_plate_price = roundMoney(req.body.full_plate_price || price);
    const half_plate_price = roundMoney(req.body.half_plate_price || 0);
    const spice_level = req.body.spice_level || 0;
    const calories = req.body.calories || null;
    const preparation_time = req.body.preparation_time || null;
    const is_available = req.body.is_available === 'true' || req.body.is_available === true;
    const is_featured = req.body.is_featured === 'true' || req.body.is_featured === true;
    const ai_description = req.body.ai_description || null;
    const taste_tags = req.body.taste_tags;
    const ai_category = req.body.ai_category || null;
    
    const dish_role = req.body.dish_role || null;
    const cuisine_type = req.body.cuisine_type || null;
    const meal_type = req.body.meal_type || null;
    const ar_enabled = req.body.ar_enabled === 'true' || req.body.ar_enabled === true;
    let ar_image_url = null;
    
    const ar_model_id = Array.isArray(req.body.ar_model_id) ? req.body.ar_model_id[0] : (req.body.ar_model_id || null);
    const enable_3d_ar = ar_model_id ? true : (req.body.enable_3d_ar === 'true' || req.body.enable_3d_ar === true);

    let imageUrl = null;
    let thumbnailUrl = null;
    let aiEnhancedImage = null;
    let glbModelUrl = null;
    let usdzModelUrl = null;

    if (req.files && req.files['image']) {
      // Use the path generated by multer's diskStorage and format it for web serving
      imageUrl = '/' + req.files['image'][0].path.replace(/\\/g, '/');
      thumbnailUrl = imageUrl; 
    }

    if (req.files && req.files['ar_image']) {
      const optimizedPath = await optimizeArImage(req.files['ar_image'][0].path, `ar-${Date.now()}`);
      ar_image_url = optimizedPath;
    }

    if (req.files && req.files['glb_model']) {
      const originalPath = req.files['glb_model'][0].path;
      const optimizedPath = await optimizeGlb(originalPath);
      glbModelUrl = await uploadToCloudinary(optimizedPath, 'models/glb');
      try { fs.unlinkSync(originalPath); } catch (e) {}
      if (optimizedPath !== originalPath) {
        try { fs.unlinkSync(optimizedPath); } catch (e) {}
      }
    }

    if (req.files && req.files['usdz_model']) {
      usdzModelUrl = await uploadToCloudinary(req.files['usdz_model'][0].path, 'models/usdz');
      try { fs.unlinkSync(req.files['usdz_model'][0].path); } catch (e) {}
    }

    const [result] = await pool.query(
      `INSERT INTO dishes 
      (restaurant_id, name, short_description, description, ingredients, category, price, spice_level, calories, preparation_time, image_url, thumbnail_url, is_available, is_featured, ai_description, taste_tags, ai_category, ar_enabled, ar_image_url, has_full_plate, has_half_plate, full_plate_price, half_plate_price, dish_role, cuisine_type, meal_type, glb_model_url, usdz_model_url, enable_3d_ar, ar_model_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [restaurantId, name, short_description, description, ingredients, category, price, spice_level, calories, preparation_time, imageUrl, thumbnailUrl, is_available, is_featured, ai_description, taste_tags ? (typeof taste_tags === 'string' ? taste_tags : JSON.stringify(taste_tags)) : null, ai_category, ar_enabled, ar_image_url, has_full_plate, has_half_plate, full_plate_price, half_plate_price, dish_role, cuisine_type, meal_type, glbModelUrl, usdzModelUrl, enable_3d_ar, ar_model_id]
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

    const oldDish = existing[0];
    const name = req.body.name;
    const short_description = req.body.short_description || null;
    const description = req.body.description || null;
    const ingredients = req.body.ingredients || null;
    const category = req.body.category || null;
    const price = roundMoney(req.body.price || 0);
    const has_full_plate = req.body.has_full_plate === 'true' || req.body.has_full_plate === true || req.body.has_full_plate === '1' || req.body.has_full_plate === 1;
    const has_half_plate = req.body.has_half_plate === 'true' || req.body.has_half_plate === true || req.body.has_half_plate === '1' || req.body.has_half_plate === 1;
    let full_plate_price = roundMoney(req.body.full_plate_price || price);
    const half_plate_price = roundMoney(req.body.half_plate_price || 0);

    const oldFull = roundMoney(oldDish.full_plate_price);
    const oldPrice = roundMoney(oldDish.price);
    if (oldFull === oldPrice || oldFull === 0) {
      full_plate_price = price;
    }
    const spice_level = req.body.spice_level || 0;
    const calories = req.body.calories || null;
    const preparation_time = req.body.preparation_time || null;
    const is_available = req.body.is_available === 'true' || req.body.is_available === true;
    const is_featured = req.body.is_featured === 'true' || req.body.is_featured === true;
    const ai_description = req.body.ai_description || null;
    const taste_tags = req.body.taste_tags;
    const ai_category = req.body.ai_category || null;
    
    const dish_role = req.body.dish_role || null;
    const cuisine_type = req.body.cuisine_type || null;
    const meal_type = req.body.meal_type || null;
    const ar_enabled = req.body.ar_enabled === 'true' || req.body.ar_enabled === true;
    let ar_image_url = existing[0].ar_image_url;

    const ar_model_id = Array.isArray(req.body.ar_model_id) ? req.body.ar_model_id[0] : (req.body.ar_model_id || null);
    const enable_3d_ar = ar_model_id ? true : (req.body.enable_3d_ar === 'true' || req.body.enable_3d_ar === true);

    let imageUrl = existing[0].image_url;
    let thumbnailUrl = existing[0].thumbnail_url;
    let aiEnhancedImage = existing[0].ai_enhanced_image;
    let glbModelUrl = existing[0].glb_model_url;
    let usdzModelUrl = existing[0].usdz_model_url;

    if (req.body.remove_image === 'true') {
      imageUrl = null;
      thumbnailUrl = null;
      aiEnhancedImage = null;
    } else if (req.files && req.files['image']) {
      imageUrl = '/' + req.files['image'][0].path.replace(/\\/g, '/');
      thumbnailUrl = imageUrl;
    }

    if (req.body.remove_ar_image === 'true') {
      ar_image_url = null;
    } else if (req.files && req.files['ar_image']) {
      const optimizedPath = await optimizeArImage(req.files['ar_image'][0].path, `ar-${Date.now()}`);
      ar_image_url = optimizedPath;
    }

    if (req.body.remove_glb_model === 'true') {
      if (glbModelUrl) await deleteFromCloudinary(glbModelUrl);
      glbModelUrl = null;
    } else if (req.files && req.files['glb_model']) {
      const originalPath = req.files['glb_model'][0].path;
      const optimizedPath = await optimizeGlb(originalPath);
      glbModelUrl = await uploadToCloudinary(optimizedPath, 'models/glb');
      try { fs.unlinkSync(originalPath); } catch (e) {}
      if (optimizedPath !== originalPath) {
        try { fs.unlinkSync(optimizedPath); } catch (e) {}
      }
    }

    if (req.body.remove_usdz_model === 'true') {
      if (usdzModelUrl) await deleteFromCloudinary(usdzModelUrl);
      usdzModelUrl = null;
    } else if (req.files && req.files['usdz_model']) {
      usdzModelUrl = await uploadToCloudinary(req.files['usdz_model'][0].path, 'models/usdz');
      try { fs.unlinkSync(req.files['usdz_model'][0].path); } catch (e) {}
    }

    await pool.query(
      `UPDATE dishes SET 
      name=?, short_description=?, description=?, ingredients=?, category=?, price=?, spice_level=?, calories=?, preparation_time=?, image_url=?, thumbnail_url=?, is_available=?, is_featured=?, ai_description=?, taste_tags=?, ai_category=?, ai_enhanced_image=?, ar_enabled=?, ar_image_url=?, has_full_plate=?, has_half_plate=?, full_plate_price=?, half_plate_price=?, dish_role=?, cuisine_type=?, meal_type=?, glb_model_url=?, usdz_model_url=?, enable_3d_ar=?, ar_model_id=?
      WHERE id=? AND restaurant_id=?`,
      [name, short_description, description, ingredients, category, price, spice_level, calories, preparation_time, imageUrl, thumbnailUrl, is_available, is_featured, ai_description, taste_tags ? (typeof taste_tags === 'string' ? taste_tags : JSON.stringify(taste_tags)) : null, ai_category, aiEnhancedImage, ar_enabled, ar_image_url, has_full_plate, has_half_plate, full_plate_price, half_plate_price, dish_role, cuisine_type, meal_type, glbModelUrl, usdzModelUrl, enable_3d_ar, ar_model_id, dishId, restaurantId]
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

    const dish = existing[0];
    if (dish.glb_model_url) await deleteFromCloudinary(dish.glb_model_url);
    if (dish.usdz_model_url) await deleteFromCloudinary(dish.usdz_model_url);

    await pool.query('DELETE FROM dishes WHERE id = ?', [dishId]);
    res.json({ message: 'Dish deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update dish availability
// @route   PATCH /api/dishes/:id/availability
// @access  Private
const updateDishAvailability = async (req, res) => {
  try {
    const restaurantId = await getRestaurantId(req.user.id);
    const dishId = req.params.id;
    const { is_available } = req.body;

    const [existing] = await pool.query('SELECT * FROM dishes WHERE id = ? AND restaurant_id = ?', [dishId, restaurantId]);
    if (existing.length === 0) return res.status(404).json({ message: 'Dish not found or unauthorized' });

    await pool.query('UPDATE dishes SET is_available = ? WHERE id = ?', [is_available, dishId]);
    res.json({ message: 'Dish availability updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Search AR models in central library
// @route   GET /api/dishes/ar-models/search
// @access  Private
const searchArModels = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json([]);
    const searchTerm = `%${query}%`;
    const [models] = await pool.query(
      'SELECT id, dish_name, category, thumbnail_url, preview_image, glb_url FROM ar_model_library WHERE dish_name LIKE ? OR category LIKE ? OR tags LIKE ? LIMIT 10',
      [searchTerm, searchTerm, searchTerm]
    );
    res.json(models);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Bulk Add Dishes
// @route   POST /api/dishes/bulk
// @access  Private
// Helper to normalize strings for slug creation
const makeSlug = (str) => {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

// @desc    Validate bulk dishes and perform AR model auto-matching
// @route   POST /api/dishes/bulk-validate
// @access  Private
const bulkValidateDishes = async (req, res) => {
  try {
    const { dishes } = req.body;
    if (!dishes || !Array.isArray(dishes)) {
      return res.status(400).json({ message: 'No dishes provided' });
    }

    if (dishes.length > 200) {
      return res.status(400).json({ message: 'Bulk validation limit exceeded. Maximum 200 dishes allowed per import.' });
    }

    const restaurantId = await getRestaurantId(req.user.id);
    if (!restaurantId) return res.status(400).json({ message: 'Please create a restaurant profile first' });

    // Fetch existing dishes to check duplicates
    const [existingDishes] = await pool.query('SELECT name FROM dishes WHERE restaurant_id = ?', [restaurantId]);
    const existingNames = new Set(existingDishes.map(d => d.name.toLowerCase()));

    // Fetch all library models to perform efficient matching in memory
    const [libraryModels] = await pool.query('SELECT * FROM ar_model_library');

    const validatedDishes = [];
    const importErrors = [];

    dishes.forEach((dish, index) => {
      const rowNum = index + 2; // Assuming 1-based index + header row
      const name = dish.name ? String(dish.name).trim() : '';
      const category = dish.category ? String(dish.category).trim() : '';

      if (!name) {
        importErrors.push({ row: rowNum, error: 'Dish name is required' });
        return;
      }
      if (!category) {
        importErrors.push({ row: rowNum, error: 'Category is required' });
        return;
      }

      // Check duplicates
      const isDuplicate = existingNames.has(name.toLowerCase());

      // Auto-matching logic
      const dishSlug = makeSlug(name);
      const categorySlug = makeSlug(category);

      let ar_status = 'none';
      let match_confidence = 0;
      let ar_model_id = null;
      let matched_model = null;
      let potential_matches = [];

      // 1. Try Exact Slug Match
      const exactMatch = libraryModels.find(m => m.dish_slug === dishSlug);
      if (exactMatch) {
        ar_status = 'linked';
        match_confidence = 100;
        ar_model_id = exactMatch.id;
        matched_model = exactMatch;
      } else {
        // 2. Fuzzy Token & Category Matching
        const dishTokens = dishSlug.split('-').filter(t => t.length >= 3 && !['with', 'and', 'the', 'for', 'hot', 'cold', 'spicy'].includes(t));
        
        libraryModels.forEach(model => {
          let score = 0;
          const modelSlug = model.dish_slug;
          const modelNameTokens = modelSlug.split('-');
          
          if (dishTokens.length > 0) {
            let matchedTokenCount = 0;
            dishTokens.forEach(t => {
              if (modelNameTokens.includes(t)) matchedTokenCount++;
            });
            const tokenMatchRatio = matchedTokenCount / dishTokens.length;
            score += Math.round(tokenMatchRatio * 75); // up to 75 points for name token matching
          }

          if (model.category && makeSlug(model.category) === categorySlug) {
            score += 25; // 25 points for category matching
          }

          if (score > 30) {
            potential_matches.push({
              id: model.id,
              dish_name: model.dish_name,
              category: model.category,
              glb_url: model.glb_url,
              thumbnail_url: model.thumbnail_url,
              preview_image: model.preview_image,
              confidence: score
            });
          }
        });

        // Sort potential matches by confidence descending
        potential_matches.sort((a, b) => b.confidence - a.confidence);

        // If we have a single very high confidence match (e.g. >= 80) or top match is significantly higher than second
        if (potential_matches.length > 0) {
          const topMatch = potential_matches[0];
          if (topMatch.confidence >= 80 && (potential_matches.length === 1 || topMatch.confidence - potential_matches[1].confidence >= 20)) {
            ar_status = 'linked';
            match_confidence = topMatch.confidence;
            ar_model_id = topMatch.id;
            matched_model = libraryModels.find(m => m.id === topMatch.id);
          } else {
            ar_status = 'needs_selection';
            match_confidence = topMatch.confidence;
          }
        }
      }

      validatedDishes.push({
        ...dish,
        is_duplicate: isDuplicate,
        ar_status,
        match_confidence,
        ar_model_id,
        matched_model,
        potential_matches: potential_matches.slice(0, 5) // Return top 5 candidates
      });
    });

    res.json({
      dishes: validatedDishes,
      errors: importErrors
    });
  } catch (error) {
    console.error('Bulk validation error:', error);
    res.status(500).json({ message: 'Server error during bulk validation' });
  }
};

const bulkAddDishes = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const restaurantId = await getRestaurantId(req.user.id);
    if (!restaurantId) return res.status(400).json({ message: 'Please create a restaurant profile first' });

    const { dishes } = req.body;
    if (!dishes || !Array.isArray(dishes) || dishes.length === 0) {
      return res.status(400).json({ message: 'No dishes provided for bulk import' });
    }

    if (dishes.length > 200) {
      return res.status(400).json({ message: 'Bulk import limit exceeded. Maximum 200 dishes allowed per import.' });
    }

    await connection.beginTransaction();

    let importedCount = 0;
    let failedCount = 0;
    const errors = [];

    const [existingDishes] = await connection.query('SELECT name FROM dishes WHERE restaurant_id = ?', [restaurantId]);
    const existingNames = new Set(existingDishes.map(d => d.name.toLowerCase()));

    for (const [index, dish] of dishes.entries()) {
      try {
        const name = dish.name;
        if (!name) {
          failedCount++;
          errors.push(`Row ${index + 1}: Name is required`);
          continue;
        }

        const duplicateAction = req.body.duplicate_action || 'skip'; 
        if (existingNames.has(name.toLowerCase())) {
          if (duplicateAction === 'skip') {
            failedCount++;
            errors.push(`Row ${index + 1}: Dish '${name}' already exists (skipped)`);
            continue;
          } else if (duplicateAction === 'replace') {
            await connection.query('DELETE FROM dishes WHERE name = ? AND restaurant_id = ?', [name, restaurantId]);
          }
        }

        const price = roundMoney(dish.price || 0);
        const category = dish.category || 'Uncategorized';
        
        const has_full_plate = dish.has_full_plate === 'true' || dish.has_full_plate === true || dish.has_full_plate === '1' || dish.has_full_plate === 1 || dish.has_full_plate === 'Yes';
        const has_half_plate = dish.has_half_plate === 'true' || dish.has_half_plate === true || dish.has_half_plate === '1' || dish.has_half_plate === 1 || dish.has_half_plate === 'Yes';
        const full_plate_price = roundMoney(dish.full_plate_price || price);
        const half_plate_price = roundMoney(dish.half_plate_price || 0);

        const short_description = dish.description || null;
        const description = dish.description || null;
        const ingredients = dish.ingredients || null;
        const preparation_time = parseInt(dish.preparation_time) || null;
        const spice_level = parseInt(dish.spice_level) || 0;
        
        let is_available = true;
        if (dish.is_available !== undefined && dish.is_available !== null) {
          const availStr = String(dish.is_available).toLowerCase().trim();
          if (availStr === 'false' || availStr === 'no' || availStr === '0') {
            is_available = false;
          }
        }
        const is_featured = dish.is_featured === 'true' || dish.is_featured === true || dish.is_featured === '1' || dish.is_featured === 1 || dish.is_featured === 'Yes';

        let imageUrl = dish.image_url || null;
        let thumbnailUrl = dish.image_url || null;
        
        const ar_model_id = dish.ar_model_id || null;
        const enable_3d_ar = ar_model_id ? true : (dish.enable_3d_ar === 'true' || dish.enable_3d_ar === true || dish.enable_3d_ar === 'Yes' || dish.enable_3d_ar === 1);
        
        const ar_enabled = ar_model_id ? true : (dish.ar_enabled === 'true' || dish.ar_enabled === true || dish.ar_enabled === '1' || dish.ar_enabled === 1 || dish.ar_enabled === 'Yes');
        let ar_image_url = dish.ar_asset_url || null;

        const dish_role = dish.dish_role || null;
        const cuisine_type = dish.cuisine_type || null;
        const meal_type = dish.meal_type || null;

        await connection.query(
          `INSERT INTO dishes 
          (restaurant_id, name, short_description, description, ingredients, category, price, spice_level, preparation_time, image_url, thumbnail_url, is_available, is_featured, ar_enabled, ar_image_url, has_full_plate, has_half_plate, full_plate_price, half_plate_price, dish_role, cuisine_type, meal_type, ar_model_id, enable_3d_ar) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [restaurantId, name, short_description, description, ingredients, category, price, spice_level, preparation_time, imageUrl, thumbnailUrl, is_available, is_featured, ar_enabled, ar_image_url, has_full_plate, has_half_plate, full_plate_price, half_plate_price, dish_role, cuisine_type, meal_type, ar_model_id, enable_3d_ar]
        );
        importedCount++;
      } catch (err) {
        console.error('Row import error:', err);
        failedCount++;
        errors.push(`Row ${index + 1}: Server error during import`);
      }
    }

    await connection.commit();

    res.status(200).json({ 
      message: 'Bulk import completed',
      imported: importedCount,
      failed: failedCount,
      errors: errors
    });

  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Server error during bulk import' });
  } finally {
    connection.release();
  }
};

module.exports = {
  getDishesByRestaurant,
  getDishById,
  addDish,
  bulkAddDishes,
  bulkValidateDishes,
  updateDish,
  deleteDish,
  updateDishAvailability,
  searchArModels
};
