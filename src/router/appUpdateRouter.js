const express = require('express');
const router = express.Router();
const {
  getAppUpdateStatus,
  getAllAppUpdates,
  createAppUpdate,
  updateAppUpdate,
  deleteAppUpdate,
  toggleAppUpdateStatus
} = require('../controllers/appUpdateController');
const auth = require('../middleware/auth');

// Public route for mobile app to check update status
router.get('/status', getAppUpdateStatus);

// Admin routes
router.get('/', auth, getAllAppUpdates);
router.post('/', auth, createAppUpdate);
router.put('/:id', auth, updateAppUpdate);
router.delete('/:id', auth, deleteAppUpdate);
router.patch('/:id/toggle', auth, toggleAppUpdateStatus);

module.exports = router;
