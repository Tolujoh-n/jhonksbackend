const Chat = require("../models/Chat");
const User = require("../models/User");
const Sale = require("../models/Sale");
const Notification = require("../models/Notification");

// Get or create chat for a sale
const getOrCreateChat = async (req, res) => {
  try {
    const { saleId } = req.params;
    const userId = req.user.id;

    // Verify sale exists and user is participant
    const sale = await Sale.findById(saleId).populate("user");
    if (!sale) {
      return res.status(404).json({
        status: "error",
        message: "Sale not found",
      });
    }

    // Check if user is seller or agent
    const isSeller = sale.user._id.toString() === userId;
    const isAgent = sale.agent && sale.agent.toString() === userId;

    if (!isSeller && !isAgent) {
      return res.status(403).json({
        status: "error",
        message: "You don't have access to this chat",
      });
    }

    // Find existing chat
    let chat = await Chat.findOne({ sale: saleId });

    if (!chat) {
      // Create new chat
      const participants = [sale.user._id];
      if (sale.agent) {
        participants.push(sale.agent);
      }

      chat = new Chat({
        participants,
        sale: saleId,
        messages: [],
      });

      await chat.save();
    }

    // Populate participants and messages
    await chat.populate([
      { path: "participants", select: "firstName lastName" },
      { path: "messages.sender", select: "firstName lastName" },
    ]);

    res.status(200).json({
      status: "success",
      data: chat,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error getting chat",
      error: error.message,
    });
  }
};

// Send message
const sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        status: "error",
        message: "Chat not found",
      });
    }

    // Check if user is participant
    const isParticipant = chat.participants.some(
      p => p.toString() === userId
    );

    if (!isParticipant) {
      return res.status(403).json({
        status: "error",
        message: "You don't have access to this chat",
      });
    }

    // Add message
    const newMessage = {
      sender: userId,
      message,
      timestamp: new Date(),
      readBy: [{ user: userId, readAt: new Date() }],
    };

    chat.messages.push(newMessage);
    chat.lastMessageAt = new Date();
    await chat.save();

    // Populate sender info
    await chat.populate("messages.sender", "firstName lastName");

    // Get the last message
    const lastMessage = chat.messages[chat.messages.length - 1];

    // Create notification for other participants
    const otherParticipants = chat.participants.filter(p => p.toString() !== userId);
    for (const participantId of otherParticipants) {
      await Notification.create({
        user: participantId,
        type: "agent_validation", // Reusing existing type for chat messages
        title: "New Message",
        message: `You have a new message in your chat`,
        data: { chatId: chat._id, saleId: chat.sale },
      });
    }

    res.status(200).json({
      status: "success",
      data: lastMessage,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error sending message",
      error: error.message,
    });
  }
};

// Mark messages as read
const markAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        status: "error",
        message: "Chat not found",
      });
    }

    // Check if user is participant
    const isParticipant = chat.participants.some(
      p => p.toString() === userId
    );

    if (!isParticipant) {
      return res.status(403).json({
        status: "error",
        message: "You don't have access to this chat",
      });
    }

    // Mark all messages as read for this user
    chat.messages.forEach(message => {
      const alreadyRead = message.readBy.some(
        read => read.user.toString() === userId
      );
      if (!alreadyRead) {
        message.readBy.push({
          user: userId,
          readAt: new Date(),
        });
      }
    });

    await chat.save();

    res.status(200).json({
      status: "success",
      message: "Messages marked as read",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error marking messages as read",
      error: error.message,
    });
  }
};

// Get user's chats
const getUserChats = async (req, res) => {
  try {
    const userId = req.user.id;

    const chats = await Chat.find({
      participants: userId,
      isActive: true,
    })
      .populate("participants", "firstName lastName")
      .populate("sale", "totalPrice totalQuantity status")
      .sort({ lastMessageAt: -1 });

    res.status(200).json({
      status: "success",
      data: chats,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error fetching chats",
      error: error.message,
    });
  }
};

// Close chat (when sale is completed)
const closeChat = async (saleId) => {
  try {
    await Chat.findOneAndUpdate(
      { sale: saleId },
      { isActive: false }
    );
  } catch (error) {
    console.error("Error closing chat:", error);
  }
};

module.exports = {
  getOrCreateChat,
  sendMessage,
  markAsRead,
  getUserChats,
  closeChat,
};
