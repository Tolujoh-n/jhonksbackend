const mongoose = require("mongoose");

const phoneVerificationSchema = new mongoose.Schema(
  {
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

phoneVerificationSchema.index(
  { otpExpiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { otpExpiresAt: { $exists: true } },
  }
);

phoneVerificationSchema.index(
  { verificationTokenExpiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: {
      verificationTokenExpiresAt: { $exists: true },
    },
  }
);

module.exports = mongoose.model("PhoneVerification", phoneVerificationSchema);


