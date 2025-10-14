const User = require("../models/User");
const { checkReferralOnRegistration } = require("./referralController");
const { NotificationService } = require("./notificationController");

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

    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
    }).select("+password");

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
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
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
    res.status(400).json({
      status: "fail",
      message: error.message,
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
