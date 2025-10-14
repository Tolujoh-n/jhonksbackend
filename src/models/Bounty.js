const mongoose = require("mongoose");

const bountySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Bounty title is required"],
    trim: true,
  },
  description: {
    type: String,
    required: [true, "Bounty description is required"],
    trim: true,
  },
  image: {
    type: String,
    default: "",
  },
  type: {
    type: String,
    enum: ["sale", "referral"],
    required: [true, "Bounty type is required"],
  },
  requirement: {
    value: {
      type: Number,
      required: [true, "Requirement value is required"],
      min: [1, "Requirement value must be at least 1"],
    },
    unit: {
      type: String,
      enum: ["kg", "people", "referrals"],
      required: [true, "Requirement unit is required"],
    },
  },
  reward: {
    type: {
      type: String,
      enum: ["cash", "product", "service"],
      required: [true, "Reward type is required"],
    },
    value: {
      type: String,
      required: [true, "Reward value is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Reward description is required"],
      trim: true,
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
bountySchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
bountySchema.index({ type: 1, isActive: 1 });
bountySchema.index({ createdAt: -1 });

module.exports = mongoose.model("Bounty", bountySchema);
