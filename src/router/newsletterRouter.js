const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  subscribeNewsletter,
  unsubscribeNewsletter,
  getAllSubscribers,
  getNewsletterStats,
  deleteSubscriber,
} = require('../controllers/newsletterController');

// Public routes
router.post('/subscribe', subscribeNewsletter);
router.post('/unsubscribe', unsubscribeNewsletter);

// Admin routes
router.get('/admin/subscribers', protect, restrictTo('admin'), getAllSubscribers);
router.get('/admin/stats', protect, restrictTo('admin'), getNewsletterStats);
router.delete('/admin/subscriber/:id', protect, restrictTo('admin'), deleteSubscriber);

module.exports = router;
