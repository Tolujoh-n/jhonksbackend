const express = require("express");
const {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  registerPushToken,
  removePushToken,
} = require("../controllers/notificationController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(protect);

// Register Expo push token
router.post("/push-token", registerPushToken);
router.delete("/push-token", removePushToken);

// Get user notifications
router.get("/", getUserNotifications);

// Mark notification as read
router.put("/:notificationId/read", markAsRead);

// Mark all notifications as read
router.put("/read-all", markAllAsRead);

// Delete notification
router.delete("/:notificationId", deleteNotification);

module.exports = router;
