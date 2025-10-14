const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  submitContact,
  getAllContacts,
  getContactById,
  updateContactStatus,
  deleteContact,
  getContactStats,
} = require('../controllers/contactController');

// Public routes
router.post('/submit', submitContact);

// Admin routes
router.get('/admin/all', protect, restrictTo('admin'), getAllContacts);
router.get('/admin/stats', protect, restrictTo('admin'), getContactStats);
router.get('/admin/:id', protect, restrictTo('admin'), getContactById);
router.put('/admin/:id/status', protect, restrictTo('admin'), updateContactStatus);
router.delete('/admin/:id', protect, restrictTo('admin'), deleteContact);

module.exports = router;
