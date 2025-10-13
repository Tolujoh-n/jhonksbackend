const express = require("express");
const {
  getOrCreateChat,
  sendMessage,
  markAsRead,
  getUserChats,
  clearChatMessages,
  clearChatMessagesAPI,
} = require("../controllers/chatController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get or create chat for a bin
router.get("/bin/:binId", getOrCreateChat);

// Get user's chats
router.get("/user", getUserChats);

// Send message
router.post("/:chatId/message", sendMessage);

// Mark messages as read
router.put("/:chatId/read", markAsRead);

// Clear chat messages (admin only or when sale is confirmed)
router.delete("/bin/:binId/messages", clearChatMessagesAPI);

module.exports = router;
