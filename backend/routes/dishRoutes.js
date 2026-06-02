const express = require('express');
const router = express.Router();
const { getDishesByRestaurant, getDishById, addDish, bulkAddDishes, bulkValidateDishes, updateDish, deleteDish, updateDishAvailability, searchArModels } = require('../controllers/dishController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { checkLimit } = require('../middleware/planMiddleware');
const { getDishCount } = require('../utils/usageHelper');

router.get('/ar-models/search', protect, searchArModels);
router.get('/restaurant/:restaurantId/ar-debug', async (req, res) => {
  // Quick diagnostic endpoint — shows AR state of all dishes for a restaurant
  try {
    const pool = require('../config/db');
    const [rows] = await pool.query(
      `SELECT d.id, d.name, d.ar_model_id, d.enable_3d_ar,
              d.glb_model_url,
              a.id AS lib_id, a.glb_url AS lib_glb_url, a.dish_name AS lib_name
       FROM dishes d
       LEFT JOIN ar_model_library a ON d.ar_model_id = a.id
       WHERE d.restaurant_id = ?
       ORDER BY d.id`,
      [req.params.restaurantId]
    );
    res.json({
      restaurant_id: req.params.restaurantId,
      total_dishes: rows.length,
      dishes_with_ar: rows.filter(r => r.lib_glb_url || r.glb_model_url).length,
      dishes: rows.map(r => ({
        id: r.id,
        name: r.name,
        ar_model_id: r.ar_model_id,
        enable_3d_ar: r.enable_3d_ar,
        ar_library_linked: !!r.lib_id,
        ar_library_glb_url: r.lib_glb_url || null,
        ar_library_name: r.lib_name || null,
        glb_model_url_direct: r.glb_model_url || null,
        ar_status: r.lib_glb_url ? '✅ READY (library)' : (r.glb_model_url ? '✅ READY (direct)' : '❌ NO AR')
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/restaurant/:restaurantId', getDishesByRestaurant);

router.get('/:id', getDishById);

router.post('/bulk-validate', protect, bulkValidateDishes);
router.post('/bulk', protect, bulkAddDishes);
router.post('/', protect, checkLimit('maxDishes', getDishCount), upload.fields([{ name: 'image', maxCount: 1 }, { name: 'ar_image', maxCount: 1 }, { name: 'glb_model', maxCount: 1 }, { name: 'usdz_model', maxCount: 1 }]), addDish);
router.put('/:id', protect, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'ar_image', maxCount: 1 }, { name: 'glb_model', maxCount: 1 }, { name: 'usdz_model', maxCount: 1 }]), updateDish);
router.patch('/:id/availability', protect, updateDishAvailability);
router.delete('/:id', protect, deleteDish);

module.exports = router;
