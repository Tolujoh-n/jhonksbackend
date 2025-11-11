const crypto = require("crypto");
const User = require("../models/User");
const { checkReferralOnRegistration } = require("./referralController");
const { NotificationService } = require("./notificationController");
const { retryDatabaseOperation } = require("../utils/dbRetry");
const { sendPasswordResetOtp } = require("../utils/email");

exports.register = async (req, res) => {
  try {
    const {
      username,
      email,
      firstName,
      lastName,
      homeAddress,
      state,
      phoneNumber,
      password,
      confirmPassword,
    } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({
        status: "fail",
        message: "Passwords do not match",
      });
    }

    const user = await User.create({
      username,
      email,
      firstName,
      lastName,
      homeAddress,
      state,
      phoneNumber,
      password,
    });

    const token = user.generateAuthToken();

    // Check for referral and create welcome notification
    await checkReferralOnRegistration(user._id, phoneNumber);
    await NotificationService.createWelcomeNotification(user._id);

    res.status(201).json({
      status: "success",
      token,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    const user = await retryDatabaseOperation(async () => {
      return await User.findOne({
        $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
      }).select("+password");
    });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        status: "fail",
        message: "Incorrect email/username or password",
      });
    }

    const token = user.generateAuthToken();

    res.status(200).json({
      status: "success",
      token,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isAgent: user.isAgent,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    
    // Handle specific database timeout errors
    if (error.message?.includes('buffering timed out') || 
        error.message?.includes('timeout') ||
        error.code === 'ETIMEDOUT') {
      return res.status(503).json({
        status: "fail",
        message: "Database connection timeout. Please try again in a moment.",
        retryAfter: 5, // seconds
      });
    }
    
    res.status(400).json({
      status: "fail",
      message: error.message || "An error occurred during login",
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await retryDatabaseOperation(async () => {
      return await User.findById(req.user.id);
    });
    res.status(200).json({
      status: "success",
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          homeAddress: user.homeAddress,
          state: user.state,
          role: user.role,
          isAgent: user.isAgent,
          agentDetails: user.agentDetails,
          profileImage: user.profileImage,
        },
      },
    });
  } catch (error) {
    console.error('GetMe error:', error);
    
    // Handle specific database timeout errors
    if (error.message?.includes('buffering timed out') || 
        error.message?.includes('timeout') ||
        error.code === 'ETIMEDOUT') {
      return res.status(503).json({
        status: "fail",
        message: "Database connection timeout. Please try again in a moment.",
        retryAfter: 5,
      });
    }
    
    res.status(400).json({
      status: "fail",
      message: error.message || "An error occurred while fetching user data",
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, homeAddress, state, username, profileImage } = req.body;
    
    // Check if email or username is being changed and if it already exists
    if (email) {
      const existingEmail = await User.findOne({ email, _id: { $ne: req.user.id } });
      if (existingEmail) {
        return res.status(400).json({
          status: "fail",
          message: "Email already exists",
        });
      }
    }
    
    if (username) {
      const existingUsername = await User.findOne({ username, _id: { $ne: req.user.id } });
      if (existingUsername) {
        return res.status(400).json({
          status: "fail",
          message: "Username already exists",
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        firstName,
        lastName,
        email,
        phoneNumber,
        homeAddress,
        state,
        username,
        profileImage,
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: "success",
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          homeAddress: user.homeAddress,
          state: user.state,
          role: user.role,
          isAgent: user.isAgent,
          profileImage: user.profileImage,
        },
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Update agent details
exports.updateAgentDetails = async (req, res) => {
  try {
    const { agentImage, agent_name, phone_number, localGovernmentAddress, streetAddress, verificationMethod, verificationNumber, openHours } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        "agentDetails.agentImage": agentImage,
        "agentDetails.agent_name": agent_name,
        "agentDetails.phone_number": phone_number,
        "agentDetails.localGovernmentAddress": localGovernmentAddress,
        "agentDetails.streetAddress": streetAddress,
        "agentDetails.verificationMethod": verificationMethod,
        "agentDetails.verificationNumber": verificationNumber,
        "agentDetails.openHours": openHours,
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: "success",
      data: {
        user: {
          id: user._id,
          agentDetails: user.agentDetails,
        },
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.id).select("+password");
    
    // Check current password
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(400).json({
        status: "fail",
        message: "Current password is incorrect",
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.status(200).json({
      status: "success",
      message: "Password changed successfully",
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

const hashValue = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: "fail",
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "We could not find an account with that email address.",
      });
    }

    const otp = generateOtp();
    user.passwordResetOtp = hashValue(otp);
    user.passwordResetOtpExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;

    await user.save({ validateBeforeSave: false });
    await sendPasswordResetOtp({
      email: user.email,
      firstName: user.firstName,
      otp,
    });

    res.status(200).json({
      status: "success",
      message:
        "A one-time password has been emailed to you. Please check your inbox.",
    });
  } catch (error) {
    console.error("Password reset request error:", error);
    res.status(500).json({
      status: "error",
      message:
        "We were unable to process your request at this time. Please try again shortly.",
    });
  }
};

exports.verifyPasswordResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        status: "fail",
        message: "Email and OTP are required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (
      !user ||
      !user.passwordResetOtp ||
      !user.passwordResetOtpExpires ||
      user.passwordResetOtpExpires < Date.now()
    ) {
      return res.status(400).json({
        status: "fail",
        message: "This OTP is invalid or has expired. Please request a new one.",
      });
    }

    if (hashValue(otp) !== user.passwordResetOtp) {
      return res.status(400).json({
        status: "fail",
        message: "The OTP you entered is incorrect.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = hashValue(resetToken);
    user.passwordResetTokenExpires = user.passwordResetOtpExpires;

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      status: "success",
      message: "OTP verified successfully.",
      data: {
        resetToken,
      },
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({
      status: "error",
      message:
        "We were unable to verify the OTP at this time. Please try again shortly.",
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, resetToken, newPassword, confirmPassword } = req.body;

    if (!email || !resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({
        status: "fail",
        message:
          "Email, reset token, new password, and password confirmation are required.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        status: "fail",
        message: "New password and confirmation do not match.",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password"
    );

    if (
      !user ||
      !user.passwordResetToken ||
      !user.passwordResetTokenExpires ||
      user.passwordResetTokenExpires < Date.now()
    ) {
      return res.status(400).json({
        status: "fail",
        message:
          "This reset token is invalid or has expired. Please request a new password reset.",
      });
    }

    if (hashValue(resetToken) !== user.passwordResetToken) {
      return res.status(400).json({
        status: "fail",
        message: "The reset token provided is invalid.",
      });
    }

    user.password = newPassword;
    user.passwordResetOtp = undefined;
    user.passwordResetOtpExpires = undefined;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;

    await user.save();

    res.status(200).json({
      status: "success",
      message:
        "Your password has been updated successfully. You can now sign in with your new credentials.",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({
      status: "error",
      message:
        "We were unable to reset your password at this time. Please try again shortly.",
    });
  }
};
