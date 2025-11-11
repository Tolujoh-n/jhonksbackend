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
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: 6,
    select: false,
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
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

module.exports = mongoose.model("User", userSchema);
