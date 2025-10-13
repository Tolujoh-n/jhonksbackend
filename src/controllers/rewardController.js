const Reward = require("../models/Reward");
const User = require("../models/User");
const Sale = require("../models/Sale");
const Referral = require("../models/Referral");
const Notification = require("../models/Notification");

// Get available rewards for a user
const getAvailableRewards = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's sales data
    const sales = await Sale.find({ user: userId, status: "paid" });
    const totalSales = sales.reduce((sum, sale) => sum + (sale.totalQuantity || 0), 0);

    // Get user's referral data
    const referrals = await Referral.find({ referrer: userId });
    const totalReferrals = referrals.length;
    const approvedReferrals = referrals.filter(r => r.status === "approved").length;

    // Define reward criteria
    const rewardCriteria = [
      {
        type: "dustbin_5kg",
        name: "Get free DustBin",
        description: "Sell 5kg products",
        required: 5,
        current: totalSales,
        achieved: totalSales >= 5,
      },
      {
        type: "streetbroom_10kg",
        name: "Get free StreetBroom",
        description: "Sell 10kg products",
        required: 10,
        current: totalSales,
        achieved: totalSales >= 10,
      },
      {
        type: "cash_50kg",
        name: "Get #10k cash gift",
        description: "Sell 50kg products",
        required: 50,
        current: totalSales,
        achieved: totalSales >= 50,
      },
      {
        type: "vacuum_100kg",
        name: "Get a vacuum cleaner",
        description: "Sell 100kg products",
        required: 100,
        current: totalSales,
        achieved: totalSales >= 100,
      },
      {
        type: "cash_5_referrals",
        name: "Get #2k cash gift",
        description: "Refer 5 people",
        required: 5,
        current: totalReferrals,
        achieved: totalReferrals >= 5,
      },
      {
        type: "cash_10_referrals",
        name: "Get #5k cash gift",
        description: "Refer 10 people",
        required: 10,
        current: totalReferrals,
        achieved: totalReferrals >= 10,
      },
      {
        type: "vacuum_20_referrals",
        name: "Get a vacuum cleaner",
        description: "Refer 20 people",
        required: 20,
        current: totalReferrals,
        achieved: totalReferrals >= 20,
      },
    ];

    // Get existing rewards for this user
    const existingRewards = await Reward.find({ user: userId });
    const claimedRewards = existingRewards.reduce((acc, reward) => {
      acc[reward.rewardType] = {
        claimed: reward.claimed,
        status: reward.status,
        claimedAt: reward.claimedAt,
      };
      return acc;
    }, {});

    // Add per-referral cash gift for approved referrals
    const perReferralRewards = approvedReferrals.map((_, index) => ({
      type: `cash_per_referral_${index + 1}`,
      name: "Get #1k cash gift",
      description: "Per Referral (On sale of 5kg)",
      required: 1,
      current: 1,
      achieved: true,
    }));

    const allRewards = [...rewardCriteria, ...perReferralRewards];

    // Merge with existing rewards data
    const rewardsWithStatus = allRewards.map(reward => ({
      ...reward,
      ...claimedRewards[reward.type],
    }));

    res.status(200).json({
      status: "success",
      data: {
        rewards: rewardsWithStatus,
        stats: {
          totalSales,
          totalReferrals,
          approvedReferrals,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error fetching available rewards",
      error: error.message,
    });
  }
};

// Claim a reward
const claimReward = async (req, res) => {
  try {
    const userId = req.user.id;
    const { rewardType } = req.body;

    // Check if reward already claimed
    const existingReward = await Reward.findOne({
      user: userId,
      rewardType,
    });

    if (existingReward && existingReward.claimed) {
      return res.status(400).json({
        status: "error",
        message: "Reward already claimed",
      });
    }

    // Verify user meets criteria
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // Get user's sales and referral data
    const sales = await Sale.find({ user: userId, status: "paid" });
    const totalSales = sales.reduce((sum, sale) => sum + (sale.totalQuantity || 0), 0);
    const referrals = await Referral.find({ referrer: userId });
    const totalReferrals = referrals.length;
    const approvedReferrals = referrals.filter(r => r.status === "approved").length;

    // Check if user meets criteria for this reward type
    let meetsCriteria = false;
    let rewardName = "";

    switch (rewardType) {
      case "dustbin_5kg":
        meetsCriteria = totalSales >= 5;
        rewardName = "Get free DustBin";
        break;
      case "streetbroom_10kg":
        meetsCriteria = totalSales >= 10;
        rewardName = "Get free StreetBroom";
        break;
      case "cash_50kg":
        meetsCriteria = totalSales >= 50;
        rewardName = "Get #10k cash gift";
        break;
      case "vacuum_100kg":
        meetsCriteria = totalSales >= 100;
        rewardName = "Get a vacuum cleaner";
        break;
      case "cash_5_referrals":
        meetsCriteria = totalReferrals >= 5;
        rewardName = "Get #2k cash gift";
        break;
      case "cash_10_referrals":
        meetsCriteria = totalReferrals >= 10;
        rewardName = "Get #5k cash gift";
        break;
      case "vacuum_20_referrals":
        meetsCriteria = totalReferrals >= 20;
        rewardName = "Get a vacuum cleaner";
        break;
      case "cash_per_referral":
        meetsCriteria = approvedReferrals > 0;
        rewardName = "Get #1k cash gift";
        break;
      default:
        return res.status(400).json({
          status: "error",
          message: "Invalid reward type",
        });
    }

    if (!meetsCriteria) {
      return res.status(400).json({
        status: "error",
        message: "You don't meet the criteria for this reward",
      });
    }

    // Create or update reward
    const reward = existingReward || new Reward({
      user: userId,
      rewardType,
      rewardName,
    });

    reward.claimed = true;
    reward.claimedAt = new Date();
    await reward.save();

    res.status(200).json({
      status: "success",
      message: "Reward claimed successfully",
      data: reward,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error claiming reward",
      error: error.message,
    });
  }
};

// Get admin rewards list
const getAdminRewards = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = { claimed: true };
    if (status && status !== "all") {
      query.status = status;
    }

    const rewards = await Reward.find(query)
      .populate("user", "firstName lastName phoneNumber state homeAddress")
      .sort({ claimedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Reward.countDocuments(query);

    res.status(200).json({
      status: "success",
      data: {
        rewards,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error fetching admin rewards",
      error: error.message,
    });
  }
};

// Update reward status (admin only)
const updateRewardStatus = async (req, res) => {
  try {
    const { rewardId } = req.params;
    const { status } = req.body;

    const reward = await Reward.findById(rewardId);
    if (!reward) {
      return res.status(404).json({
        status: "error",
        message: "Reward not found",
      });
    }

    reward.status = status;
    if (status === "delivered") {
      reward.deliveredAt = new Date();
    }

    await reward.save();

    // Create notification for user
    await Notification.create({
      user: reward.user,
      type: "reward_delivered",
      title: "Reward Delivered!",
      message: `Your ${reward.rewardName} has been delivered!`,
      data: { rewardId: reward._id },
    });

    res.status(200).json({
      status: "success",
      message: "Reward status updated successfully",
      data: reward,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error updating reward status",
      error: error.message,
    });
  }
};

module.exports = {
  getAvailableRewards,
  claimReward,
  getAdminRewards,
  updateRewardStatus,
};
