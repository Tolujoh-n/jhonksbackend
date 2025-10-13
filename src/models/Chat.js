const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  }],
  sale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Sale",
    required: true,
  },
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    readBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      readAt: {
        type: Date,
        default: Date.now,
      },
    }],
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient queries
chatSchema.index({ participants: 1 });
chatSchema.index({ sale: 1 });
chatSchema.index({ lastMessageAt: -1 });

module.exports = mongoose.model("Chat", chatSchema);
