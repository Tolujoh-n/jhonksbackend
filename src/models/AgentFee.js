const mongoose = require("mongoose");

const agentFeeSchema = new mongoose.Schema({
  feePerKg: {
    type: Number,
    required: true,
    min: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  setBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  effectiveFrom: {
    type: Date,
    default: Date.now,
  },
  effectiveTo: {
    type: Date,
    default: null, // null means it's the current active fee
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("AgentFee", agentFeeSchema);
