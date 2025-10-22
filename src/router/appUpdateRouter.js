const express = require('express');
const router = express.Router();
const appUpdateController = require('../controllers/appUpdateController');
const { protect } = require('../middleware/auth');

// Public route for mobile app to check update status
router.get('/status', appUpdateController.getAppUpdateStatus);

// Admin routes
router.get('/', protect, appUpdateController.getAllAppUpdates);
router.post('/', protect, appUpdateController.createAppUpdate);
router.put('/:id', protect, appUpdateController.updateAppUpdate);
router.delete('/:id', protect, appUpdateController.deleteAppUpdate);
router.patch('/:id/toggle', protect, appUpdateController.toggleAppUpdateStatus);

module.exports = router;
