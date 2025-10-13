const mongoose = require("mongoose");

const rewardSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  rewardType: {
    type: String,
    enum: [
      "dustbin_5kg",
      "streetbroom_10kg", 
      "cash_50kg",
      "vacuum_100kg",
      "cash_5_referrals",
      "cash_10_referrals",
      "vacuum_20_referrals",
      "cash_per_referral"
    ],
    required: true,
  },
  rewardName: {
    type: String,
    required: true,
  },
  claimed: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ["pending", "delivered"],
    default: "pending",
  },
  claimedAt: {
    type: Date,
    default: null,
  },
  deliveredAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient queries
rewardSchema.index({ user: 1, rewardType: 1 });
rewardSchema.index({ status: 1 });

module.exports = mongoose.model("Reward", rewardSchema);
