const Chat = require("../models/Chat");
const User = require("../models/User");
const Sale = require("../models/Sale");
const Notification = require("../models/Notification");

// Get or create chat for a bin
const getOrCreateChat = async (req, res) => {
  try {
    const { binId } = req.params;
    const userId = req.user.id;

    // Verify bin exists and get bin details
    const Bin = require("../models/Bin");
    const bin = await Bin.findById(binId).populate("user").populate("selectedAgent");
    
    if (!bin) {
      return res.status(404).json({
        status: "error",
        message: "Bin not found",
      });
    }

    // Check if user is seller or assigned agent
    const isSeller = bin.user._id.toString() === userId;
    const isAgent = bin.selectedAgent && bin.selectedAgent._id.toString() === userId;

    if (!isSeller && !isAgent) {
      return res.status(403).json({
        status: "error",
        message: "You don't have access to this chat",
      });
    }

    // Find existing chat for this bin
    let chat = await Chat.findOne({ bin: binId });

    if (!chat) {
      // Create new chat
      const participants = [bin.user._id];
      if (bin.selectedAgent) {
        participants.push(bin.selectedAgent._id);
      }

      chat = new Chat({
        participants,
        bin: binId,
        messages: [],
      });

      await chat.save();
    }

    // Populate participants and messages
    await chat.populate([
      { path: "participants", select: "firstName lastName" },
      { path: "messages.sender", select: "firstName lastName" },
    ]);

    // Add bin information for display
    const chatData = chat.toObject();
    chatData.bin = {
      _id: bin._id,
      totalPrice: bin.totalPrice,
      totalQuantity: bin.totalQuantity
    };

    res.status(200).json({
      status: "success",
      data: chatData,
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

// Clear chat messages (when sale is confirmed)
const clearChatMessages = async (binId) => {
  try {
    await Chat.findOneAndUpdate(
      { bin: binId },
      { 
        messages: [],
        lastMessageAt: new Date()
      }
    );
  } catch (error) {
    console.error("Error clearing chat messages:", error);
  }
};

// API endpoint to clear chat messages
const clearChatMessagesAPI = async (req, res) => {
  try {
    const { binId } = req.params;
    
    await Chat.findOneAndUpdate(
      { bin: binId },
      { 
        messages: [],
        lastMessageAt: new Date()
      }
    );

    res.status(200).json({
      status: "success",
      message: "Chat messages cleared successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error clearing chat messages",
      error: error.message,
    });
  }
};

module.exports = {
  getOrCreateChat,
  sendMessage,
  markAsRead,
  getUserChats,
  closeChat,
  clearChatMessages,
  clearChatMessagesAPI,
};
