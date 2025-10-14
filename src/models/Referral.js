const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema({
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  referredPhoneNumber: {
    type: String,
    required: true,
  },
  referredUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  status: {
    type: String,
    enum: ["pending", "approved"],
    default: "pending",
  },
  totalSales: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  approvedAt: {
    type: Date,
    default: null,
  },
  clickTracked: {
    type: Boolean,
    default: false,
  },
  registered: {
    type: Boolean,
    default: false,
  },
});

// Index for efficient queries
referralSchema.index({ referrer: 1, referredPhoneNumber: 1 });
referralSchema.index({ referredUser: 1 });

module.exports = mongoose.model("Referral", referralSchema);
