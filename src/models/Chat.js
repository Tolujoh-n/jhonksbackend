const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  }],
  bin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Bin",
  },
  sale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Sale",
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
chatSchema.index({ bin: 1 });
chatSchema.index({ sale: 1 });
chatSchema.index({ lastMessageAt: -1 });

// Validation: either bin or sale must be provided
chatSchema.pre('validate', function(next) {
  if (!this.bin && !this.sale) {
    next(new Error('Either bin or sale must be specified'));
  } else {
    next();
  }
});

module.exports = mongoose.model("Chat", chatSchema);
