const Referral = require("../models/Referral");
const User = require("../models/User");
const Sale = require("../models/Sale");
const Notification = require("../models/Notification");

// Get referral stats for a user
const getReferralStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const totalReferrals = await Referral.countDocuments({ referrer: userId });
    const pendingReferrals = await Referral.countDocuments({ 
      referrer: userId, 
      status: "pending" 
    });
    const approvedReferrals = await Referral.countDocuments({ 
      referrer: userId, 
      status: "approved" 
    });
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
        pendingReferrals,
        approvedReferrals,
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
      .populate("referredUser", "firstName lastName phoneNumber")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

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

// Generate referral link
const generateReferralLink = async (req, res) => {
  try {
    const userId = req.user.id;
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const referralLink = `${baseUrl}/referral/${userId}`;

    res.status(200).json({
      status: "success",
      data: {
        referralLink,
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
const checkReferralOnRegistration = async (userId, phoneNumber) => {
  try {
    const referral = await Referral.findOne({
      referredPhoneNumber: phoneNumber,
      referredUser: null,
    });

    if (referral) {
      referral.referredUser = userId;
      referral.registered = true;
      await referral.save();

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

    // Calculate total sales for this user
    const sales = await Sale.find({ user: userId, status: "paid" });
    const totalSales = sales.reduce((sum, sale) => sum + (sale.totalQuantity || 0), 0);

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

// Get referrer by ID (public endpoint)
const getReferrerById = async (req, res) => {
  try {
    const { referralId } = req.params;
    
    const referrer = await User.findById(referralId).select('firstName lastName');
    
    if (!referrer) {
      return res.status(404).json({
        status: "error",
        message: "Referrer not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        referrer,
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

    // Check if phone number already exists as referral
    const existingReferral = await Referral.findOne({
      referredPhoneNumber: phoneNumber,
      referrer: referralId,
    });

    if (existingReferral) {
      return res.status(200).json({
        status: "success",
        message: "Phone number already tracked",
        data: { referral: existingReferral },
      });
    }

    // Create referral record
    const referral = new Referral({
      referrer: referralId,
      referredPhoneNumber: phoneNumber,
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
