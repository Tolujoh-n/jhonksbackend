const Notification = require("../models/Notification");
const User = require("../models/User");

// Get user notifications
const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const query = { user: userId };
    if (unreadOnly === "true") {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ 
      user: userId, 
      read: false 
    });

    res.status(200).json({
      status: "success",
      data: {
        notifications,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total,
        unreadCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error fetching notifications",
      error: error.message,
    });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({
      _id: notificationId,
      user: userId,
    });

    if (!notification) {
      return res.status(404).json({
        status: "error",
        message: "Notification not found",
      });
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    res.status(200).json({
      status: "success",
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error marking notification as read",
      error: error.message,
    });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.updateMany(
      { user: userId, read: false },
      { 
        read: true, 
        readAt: new Date() 
      }
    );

    res.status(200).json({
      status: "success",
      message: "All notifications marked as read",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error marking all notifications as read",
      error: error.message,
    });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      user: userId,
    });

    if (!notification) {
      return res.status(404).json({
        status: "error",
        message: "Notification not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Notification deleted",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error deleting notification",
      error: error.message,
    });
  }
};

// Create notification helper function
const createNotification = async (userId, type, title, message, data = {}) => {
  try {
    const notification = new Notification({
      user: userId,
      type,
      title,
      message,
      data,
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

// Notification types and their creation functions
const NotificationService = {
  // Welcome notification for new users
  createWelcomeNotification: async (userId) => {
    return await createNotification(
      userId,
      "welcome",
      "Welcome to Jhonks!",
      "Thank you for joining Jhonks. Start selling your waste materials and earn money!",
      {}
    );
  },

  // Agent validation notification
  createAgentValidationNotification: async (userId, agentName, binId) => {
    return await createNotification(
      userId,
      "agent_validation",
      "Materials Validated",
      `Your materials have been validated by ${agentName}`,
      { binId, agentName }
    );
  },

  // Order cancelled notification
  createOrderCancelledNotification: async (userId, agentName, binId) => {
    return await createNotification(
      userId,
      "order_cancelled",
      "Order Cancelled",
      `Your order has been cancelled by agent ${agentName}. You can create a new order anytime.`,
      { binId, agentName }
    );
  },

  // Agent selected notification
  createAgentSelectedNotification: async (userId, agentName) => {
    return await createNotification(
      userId,
      "agent_selected",
      "Agent Selected",
      `You have selected ${agentName} to validate your materials`,
      { agentName }
    );
  },

  // Payment received notification
  createPaymentReceivedNotification: async (userId, amount) => {
    return await createNotification(
      userId,
      "payment_received",
      "Payment Received",
      `You have received ₦${amount.toLocaleString()} for your materials`,
      { amount }
    );
  },

  // Reward available notification
  createRewardAvailableNotification: async (userId, rewardName) => {
    return await createNotification(
      userId,
      "reward_available",
      "Reward Available",
      `You have earned a new reward: ${rewardName}`,
      { rewardName }
    );
  },

  // Reward delivered notification
  createRewardDeliveredNotification: async (userId, rewardName) => {
    return await createNotification(
      userId,
      "reward_delivered",
      "Reward Delivered",
      `Your ${rewardName} has been delivered!`,
      { rewardName }
    );
  },

  // Referral approved notification
  createReferralApprovedNotification: async (userId, referralName) => {
    return await createNotification(
      userId,
      "referral_approved",
      "Referral Approved",
      `Your referral ${referralName} has been approved!`,
      { referralName }
    );
  },

  // Sale completed notification
  createSaleCompletedNotification: async (userId, amount) => {
    return await createNotification(
      userId,
      "sale_completed",
      "Sale Completed",
      `Your sale of ₦${amount.toLocaleString()} has been completed`,
      { amount }
    );
  },
};

module.exports = {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  NotificationService,
};
