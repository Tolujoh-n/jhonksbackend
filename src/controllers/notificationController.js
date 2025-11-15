const Notification = require("../models/Notification");
const User = require("../models/User");
const { Expo } = require("expo-server-sdk");

const expoClient = new Expo();
const PUSH_NOTIFICATION_CHUNK_SIZE = 100;
const INVALID_TOKEN_ERRORS = new Set(["DeviceNotRegistered", "InvalidCredentials"]);

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

const registerPushToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        status: "error",
        message: "Push token is required.",
      });
    }

    if (!Expo.isExpoPushToken(token)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid Expo push token format.",
      });
    }

    await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { pushTokens: token } },
      { new: true }
    );

    res.status(200).json({
      status: "success",
      message: "Push token registered successfully.",
    });
  } catch (error) {
    console.error("Error registering push token:", error);
    res.status(500).json({
      status: "error",
      message: "Error registering push token.",
      error: error.message,
    });
  }
};

const removePushToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        status: "error",
        message: "Push token is required.",
      });
    }

    await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { pushTokens: token } },
      { new: true }
    );

    res.status(200).json({
      status: "success",
      message: "Push token removed successfully.",
    });
  } catch (error) {
    console.error("Error removing push token:", error);
    res.status(500).json({
      status: "error",
      message: "Error removing push token.",
      error: error.message,
    });
  }
};

const removeInvalidPushTokens = async (userId, tokens) => {
  if (!tokens?.length) {
    return;
  }

  try {
    await User.updateOne(
      { _id: userId },
      { $pull: { pushTokens: { $in: tokens } } }
    );
  } catch (error) {
    console.error("Error removing invalid push tokens:", error);
  }
};

const sendPushNotification = async (userId, notification) => {
  try {
    const user = await User.findById(userId).select("pushTokens");
    if (!user || !user.pushTokens?.length) {
      return;
    }

    const validTokens = [];
    const malformedTokens = [];

    for (const token of user.pushTokens) {
      if (Expo.isExpoPushToken(token)) {
        validTokens.push(token);
      } else {
        malformedTokens.push(token);
      }
    }

    if (malformedTokens.length) {
      await removeInvalidPushTokens(userId, malformedTokens);
    }

    if (!validTokens.length) {
      return;
    }

    const messages = validTokens.map((token) => ({
      to: token,
      sound: "default",
      title: notification.title,
      body: notification.message,
      data: {
        notificationId: notification._id?.toString?.() ?? notification._id,
        type: notification.type,
        ...notification.data,
      },
    }));

    const invalidTokens = new Set();

    for (let i = 0; i < messages.length; i += PUSH_NOTIFICATION_CHUNK_SIZE) {
      const messageChunk = messages.slice(i, i + PUSH_NOTIFICATION_CHUNK_SIZE);
      const tokenChunk = validTokens.slice(i, i + PUSH_NOTIFICATION_CHUNK_SIZE);

      try {
        const ticketChunk = await expoClient.sendPushNotificationsAsync(
          messageChunk
        );

        ticketChunk.forEach((ticket, index) => {
          if (ticket.status === "error") {
            const errorCode =
              ticket.details?.error || ticket.message || ticket.details;

            if (errorCode && INVALID_TOKEN_ERRORS.has(errorCode)) {
              invalidTokens.add(tokenChunk[index]);
            }

            console.warn(
              "Expo push ticket error:",
              JSON.stringify(ticket, null, 2)
            );
          }
        });
      } catch (error) {
        console.error("Error sending push notification chunk:", error);
      }
    }

    if (invalidTokens.size) {
      await removeInvalidPushTokens(userId, Array.from(invalidTokens));
    }
  } catch (error) {
    console.error("Error preparing push notifications:", error);
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
    sendPushNotification(userId, notification).catch((error) =>
      console.error("Failed to send push notification:", error)
    );
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
  registerPushToken,
  removePushToken,
  createNotification,
  NotificationService,
};
