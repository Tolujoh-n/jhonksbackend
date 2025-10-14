const mongoose = require("mongoose");

const userRewardSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  bounty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Bounty",
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "delivered", "cancelled"],
    default: "pending",
  },
  claimedAt: {
    type: Date,
    default: Date.now,
  },
  deliveredAt: {
    type: Date,
  },
  adminNotes: {
    type: String,
    default: "",
  },
  // Track the actual values when claimed for historical accuracy
  claimedRequirement: {
    value: Number,
    unit: String,
  },
  claimedReward: {
    type: String,
    value: String,
    description: String,
  },
});

// Index for efficient queries
userRewardSchema.index({ user: 1, bounty: 1 });
userRewardSchema.index({ status: 1 });
userRewardSchema.index({ claimedAt: -1 });

// Prevent duplicate claims for the same bounty
userRewardSchema.index({ user: 1, bounty: 1 }, { unique: true });

module.exports = mongoose.model("UserReward", userRewardSchema);
