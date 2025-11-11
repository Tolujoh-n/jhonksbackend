const mongoose = require("mongoose");

const agentPhoneVerificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    otpHash: String,
    otpExpiresAt: Date,
    otpAttempts: {
      type: Number,
      default: 0,
    },
    verificationTokenHash: String,
    verificationTokenExpiresAt: Date,
    verifiedAt: Date,
  },
  {
    timestamps: true,
  }
);

agentPhoneVerificationSchema.index(
  { otpExpiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { otpExpiresAt: { $exists: true } },
  }
);

agentPhoneVerificationSchema.index(
  { verificationTokenExpiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: {
      verificationTokenExpiresAt: { $exists: true },
    },
  }
);

module.exports = mongoose.model(
  "AgentPhoneVerification",
  agentPhoneVerificationSchema
);

