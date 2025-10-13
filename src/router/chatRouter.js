const express = require("express");
const {
  getOrCreateChat,
  sendMessage,
  markAsRead,
  getUserChats,
} = require("../controllers/chatController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get or create chat for a sale
router.get("/sale/:saleId", getOrCreateChat);

// Get user's chats
router.get("/user", getUserChats);

// Send message
router.post("/:chatId/message", sendMessage);

// Mark messages as read
router.put("/:chatId/read", markAsRead);

module.exports = router;
