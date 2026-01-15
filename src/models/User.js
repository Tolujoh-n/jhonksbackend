const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Please provide a username"],
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Please provide an email"],
    unique: true,
    lowercase: true,
    trim: true,
  },
  firstName: {
    type: String,
    required: [true, "Please provide your first name"],
    trim: true,
  },
  lastName: {
    type: String,
    required: [true, "Please provide your last name"],
    trim: true,
  },
  homeAddress: {
    type: String,
    required: [true, "Please provide your home address"],
  },
  state: {
    type: String,
    required: [true, "Please provide your state"],
  },
  phoneNumber: {
    type: String,
    required: [true, "Please provide your phone number"],
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: 6,
    select: false,
  },
  phoneVerified: {
    type: Boolean,
    default: false,
  },
  profileImage: {
    type: String,
    default: "",
  },
  passwordResetOtp: String,
  passwordResetOtpExpires: Date,
  passwordResetToken: String,
  passwordResetTokenExpires: Date,
  role: {
    type: String,
    enum: ["user", "agent", "admin"],
    default: "user",
  },
  pushTokens: {
    type: [String],
    default: [],
  },
  isAgent: {
    type: Boolean,
    default: false,
  },
  agentDetails: {
    verificationMethod: {
      type: String,
      enum: ["NIN", "Voters card"],
    },
    verificationNumber: String,
    agentImage: String,
    agent_name: String,
    phone_number: String,
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    phoneVerifiedAt: Date,
    localGovernmentAddress: String,
    streetAddress: String,
    openHours: {
      monday: { open: String, close: String },
      tuesday: { open: String, close: String },
      wednesday: { open: String, close: String },
      thursday: { open: String, close: String },
      friday: { open: String, close: String },
      saturday: { open: String, close: String },
      sunday: { open: String, close: String },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  selectedPaymentBank: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Bank",
    default: null,
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Generate unique referral code before saving (if new user)
userSchema.pre("save", async function (next) {
  if (this.isNew && !this.referralCode) {
    let code;
    let isUnique = false;
    while (!isUnique) {
      // Generate 6-character alphanumeric code
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const existingUser = await mongoose.model("User").findOne({ referralCode: code });
      if (!existingUser) {
        isUnique = true;
      }
    }
    this.referralCode = code;
  }
  next();
});

// Generate unique referral code before saving (if new user)
userSchema.pre("save", async function (next) {
  if (this.isNew && !this.referralCode) {
    let code;
    let isUnique = false;
    while (!isUnique) {
      // Generate 6-character alphanumeric code
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const existingUser = await mongoose.model("User").findOne({ referralCode: code });
      if (!existingUser) {
        isUnique = true;
      }
    }
    this.referralCode = code;
  }
  next();
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Generate JWT token
userSchema.methods.generateAuthToken = function () {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Index for referral code lookups
userSchema.index({ referralCode: 1 });

module.exports = mongoose.model("User", userSchema);
