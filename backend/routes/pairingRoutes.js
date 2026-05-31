const express = require('express');
const router = express.Router();
const { getPairings, addPairing, removePairing, updatePriority, getSmartFallback, syncPairings } = require('../controllers/pairingController');
const { protect } = require('../middleware/authMiddleware');

router.get('/dish/:dishId', getPairings);
router.get('/fallback/:dishId', getSmartFallback);

router.post('/', protect, addPairing);
router.delete('/:id', protect, removePairing);
router.put('/priority', protect, updatePriority);
router.put('/sync/:dishId', protect, syncPairings);

module.exports = router;
