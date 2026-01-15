const Referral = require("../models/Referral");
const User = require("../models/User");
const Sale = require("../models/Sale");
const Notification = require("../models/Notification");

// Get referral stats for a user
const getReferralStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all referrals for this user
    const allReferrals = await Referral.find({ referrer: userId }).populate("referredUser", "totalSales");
    
    // Update referral statuses based on current sales
    let approvedCount = 0;
    let pendingCount = 0;
    
    for (const referral of allReferrals) {
      if (referral.referredUser && referral.status === "pending") {
        const userSales = await Sale.find({ user: referral.referredUser._id, status: "paid" });
        const totalSales = userSales.reduce((sum, sale) => sum + (sale.totalQuantity || 0), 0);
        
        if (totalSales >= 5) {
          referral.status = "approved";
          referral.approvedAt = new Date();
          referral.totalSales = totalSales;
          await referral.save();
          approvedCount++;
        } else {
          pendingCount++;
        }
      } else if (referral.status === "approved") {
        approvedCount++;
      } else {
        pendingCount++;
      }
    }

    const totalReferrals = allReferrals.length;
    const phoneNumbersTracked = await Referral.countDocuments({ 
      referrer: userId, 
      clickTracked: true 
    });
    const registeredReferrals = await Referral.countDocuments({ 
      referrer: userId, 
      registered: true 
    });

    res.status(200).json({
      status: "success",
      data: {
        totalReferrals,
        pendingReferrals: pendingCount,
        approvedReferrals: approvedCount,
        phoneNumbersTracked,
        registeredReferrals,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error fetching referral stats",
      error: error.message,
    });
  }
};

// Get referral list for a user
const getReferralList = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;

    const query = { referrer: userId };
    if (status && status !== "all") {
      query.status = status;
    }

    const referrals = await Referral.find(query)
      .populate("referredUser", "firstName lastName phoneNumber totalSales")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Update referral statuses based on current sales before returning
    for (const referral of referrals) {
      if (referral.referredUser && referral.status === "pending") {
        const userSales = await Sale.find({ user: referral.referredUser._id, status: "paid" });
        const totalSales = userSales.reduce((sum, sale) => sum + (sale.totalQuantity || 0), 0);
        
        if (totalSales >= 5) {
          referral.status = "approved";
          referral.approvedAt = new Date();
          referral.totalSales = totalSales;
          await referral.save();
        }
      }
    }

    const total = await Referral.countDocuments(query);

    res.status(200).json({
      status: "success",
      data: {
        referrals,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error fetching referral list",
      error: error.message,
    });
  }
};

// Generate referral link and code
const generateReferralLink = async (req, res) => {
  try {
    const userId = req.user.id;
    let user = await User.findById(userId).select('referralCode');
    
    // Generate referral code if user doesn't have one (for existing users)
    if (!user.referralCode) {
      let code;
      let isUnique = false;
      while (!isUnique) {
        // Generate 6-character alphanumeric code
        code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const existingUser = await User.findOne({ referralCode: code });
        if (!existingUser) {
          isUnique = true;
        }
      }
      user.referralCode = code;
      await user.save();
    }
    
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const referralLink = `${baseUrl}/referral/${userId}`;

    res.status(200).json({
      status: "success",
      data: {
        referralLink,
        referralCode: user.referralCode,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error generating referral link",
      error: error.message,
    });
  }
};

// Process referral signup
const processReferralSignup = async (req, res) => {
  try {
    const { phoneNumber, referrerId } = req.body;

    // Check if phone number already exists as referral
    const existingReferral = await Referral.findOne({
      referredPhoneNumber: phoneNumber,
    });

    if (existingReferral) {
      return res.status(400).json({
        status: "error",
        message: "This phone number has already been referred",
      });
    }

    // Create referral record
    const referral = new Referral({
      referrer: referrerId,
      referredPhoneNumber: phoneNumber,
    });

    await referral.save();

    res.status(201).json({
      status: "success",
      message: "Referral recorded successfully",
      data: referral,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error processing referral signup",
      error: error.message,
    });
  }
};

// Check and update referral status when user registers
const checkReferralOnRegistration = async (userId, phoneNumber, referralCode = null) => {
  try {
    const normalizedPhone = phoneNumber.replace(/\D/g, "");
    const normalizedPhoneWithCode = normalizedPhone.startsWith("234") 
      ? normalizedPhone 
      : `234${normalizedPhone.slice(-10)}`;

    let referral = null;

    // If referral code is provided, use it
    if (referralCode) {
      const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
      if (referrer) {
        // Check if referral already exists
        referral = await Referral.findOne({
          referredPhoneNumber: normalizedPhoneWithCode,
          referrer: referrer._id,
        });

        if (!referral) {
          // Create new referral record
          referral = new Referral({
            referrer: referrer._id,
            referredPhoneNumber: normalizedPhoneWithCode,
            referredUser: userId,
            status: "pending",
            registered: true,
            clickTracked: false,
          });
          await referral.save();
        } else {
          // Update existing referral
          referral.referredUser = userId;
          referral.registered = true;
          await referral.save();
        }
      }
    } else {
      // Fallback to phone number lookup
      referral = await Referral.findOne({
        referredPhoneNumber: normalizedPhoneWithCode,
        referredUser: null,
      });

      if (referral) {
        referral.referredUser = userId;
        referral.registered = true;
        await referral.save();
      }
    }

    if (referral) {
      // Create notification for referrer
      await Notification.create({
        user: referral.referrer,
        type: "referral_registered",
        title: "New Referral Registered",
        message: `Someone you referred has registered on Jhonks!`,
        data: { referralId: referral._id },
      });
    }
  } catch (error) {
    console.error("Error checking referral on registration:", error);
  }
};

// Update referral status based on sales
const updateReferralStatus = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    // Find pending referrals for this user
    const pendingReferrals = await Referral.find({
      referredUser: userId,
      status: "pending",
    });

    if (pendingReferrals.length === 0) return;

    // Calculate total sales for this user from their sale history
    const sales = await Sale.find({ user: userId, status: "paid" });
    const totalSales = sales.reduce((sum, sale) => sum + (sale.totalQuantity || 0), 0);

    // Update user's totalSales for future reference
    await User.findByIdAndUpdate(userId, { totalSales });

    for (const referral of pendingReferrals) {
      if (totalSales >= 5) {
        referral.status = "approved";
        referral.approvedAt = new Date();
        referral.totalSales = totalSales;
        await referral.save();

        // Create notification for referrer
        await Notification.create({
          user: referral.referrer,
          type: "referral_approved",
          title: "Referral Approved!",
          message: `Your referral has sold ${totalSales}kg and is now approved!`,
          data: { referralId: referral._id, totalSales },
        });
      }
    }
  } catch (error) {
    console.error("Error updating referral status:", error);
  }
};

// Get referrer by ID or referral code (public endpoint)
const getReferrerById = async (req, res) => {
  try {
    const { referralId } = req.params;
    
    // Try to find by ID first, then by referral code
    let referrer = await User.findById(referralId).select('firstName lastName referralCode');
    
    if (!referrer) {
      // Try finding by referral code
      referrer = await User.findOne({ referralCode: referralId.toUpperCase() }).select('firstName lastName referralCode');
    }
    
    if (!referrer) {
      return res.status(404).json({
        status: "error",
        message: "Referrer not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        referrer: {
          _id: referrer._id,
          firstName: referrer.firstName,
          lastName: referrer.lastName,
          referralCode: referrer.referralCode,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error fetching referrer",
      error: error.message,
    });
  }
};

// Track referral click with phone number
const trackReferralClick = async (req, res) => {
  try {
    const { referralId, phoneNumber } = req.body;
    
    // Validate referrer exists
    const referrer = await User.findById(referralId);
    if (!referrer) {
      return res.status(404).json({
        status: "error",
        message: "Invalid referral link",
      });
    }

    // Normalize phone number
    const normalizedPhone = phoneNumber.replace(/\D/g, "");
    const normalizedPhoneWithCode = normalizedPhone.startsWith("234") 
      ? normalizedPhone 
      : `234${normalizedPhone.slice(-10)}`;

    // Check if phone number is already registered as a user
    const registeredUser = await User.findOne({
      phoneNumber: normalizedPhoneWithCode,
    });

    if (registeredUser) {
      return res.status(400).json({
        status: "error",
        code: "PHONE_REGISTERED",
        message: "This phone number is already registered",
      });
    }

    // Check if phone number already exists as referral for this referrer
    const existingReferral = await Referral.findOne({
      referredPhoneNumber: normalizedPhoneWithCode,
      referrer: referralId,
    });

    if (existingReferral) {
      return res.status(200).json({
        status: "success",
        message: "Phone number already tracked",
        data: { referral: existingReferral },
      });
    }

    // Check if phone number exists in another person's pending referral
    const existingPendingReferral = await Referral.findOne({
      referredPhoneNumber: normalizedPhoneWithCode,
      referrer: { $ne: referralId },
      registered: false, // Only migrate if not registered
    });

    if (existingPendingReferral) {
      // Migrate the referral to the new referrer
      existingPendingReferral.referrer = referralId;
      existingPendingReferral.clickTracked = true;
      await existingPendingReferral.save();

      return res.status(200).json({
        status: "success",
        message: "Referral migrated successfully",
        data: { referral: existingPendingReferral, migrated: true },
      });
    }

    // Create new referral record
    const referral = new Referral({
      referrer: referralId,
      referredPhoneNumber: normalizedPhoneWithCode,
      status: "pending",
      clickTracked: true,
    });

    await referral.save();

    res.status(201).json({
      status: "success",
      message: "Referral tracked successfully",
      data: { referral },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error tracking referral",
      error: error.message,
    });
  }
};

// Get all users (for referral validation)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('phoneNumber totalSales');
    
    res.status(200).json({
      status: "success",
      data: {
        users,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error fetching users",
      error: error.message,
    });
  }
};

module.exports = {
  getReferralStats,
  getReferralList,
  generateReferralLink,
  processReferralSignup,
  checkReferralOnRegistration,
  updateReferralStatus,
  getReferrerById,
  trackReferralClick,
  getAllUsers,
};
