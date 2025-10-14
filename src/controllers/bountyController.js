const Bounty = require("../models/Bounty");
const UserReward = require("../models/UserReward");
const Sale = require("../models/Sale");
const Referral = require("../models/Referral");

// Get all bounties (admin)
exports.getAllBounties = async (req, res) => {
  try {
    const bounties = await Bounty.find()
      .populate("createdBy", "firstName lastName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      data: bounties,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error fetching bounties",
      error: error.message,
    });
  }
};

// Get active bounties (users)
exports.getActiveBounties = async (req, res) => {
  try {
    const bounties = await Bounty.find({ isActive: true })
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      data: bounties,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error fetching active bounties",
      error: error.message,
    });
  }
};

// Create bounty (admin)
exports.createBounty = async (req, res) => {
  try {
    const bountyData = {
      ...req.body,
      createdBy: req.user.id,
    };

    const bounty = new Bounty(bountyData);
    await bounty.save();

    await bounty.populate("createdBy", "firstName lastName");

    res.status(201).json({
      status: "success",
      data: bounty,
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: "Error creating bounty",
      error: error.message,
    });
  }
};

// Update bounty (admin)
exports.updateBounty = async (req, res) => {
  try {
    const bounty = await Bounty.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate("createdBy", "firstName lastName");

    if (!bounty) {
      return res.status(404).json({
        status: "error",
        message: "Bounty not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: bounty,
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: "Error updating bounty",
      error: error.message,
    });
  }
};

// Delete bounty (admin)
exports.deleteBounty = async (req, res) => {
  try {
    const bounty = await Bounty.findByIdAndDelete(req.params.id);

    if (!bounty) {
      return res.status(404).json({
        status: "error",
        message: "Bounty not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Bounty deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error deleting bounty",
      error: error.message,
    });
  }
};

// Get user's reward stats
exports.getUserRewardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get total kg sold
    const sales = await Sale.find({ user: userId });
    const totalKgSold = sales.reduce((sum, sale) => sum + sale.totalQuantity, 0);

    // Get total approved referrals
    const approvedReferrals = await Referral.countDocuments({
      referrer: userId,
      status: "approved",
    });

    // Get total referrals (including pending)
    const totalReferrals = await Referral.countDocuments({
      referrer: userId,
    });

    res.status(200).json({
      status: "success",
      data: {
        totalKgSold,
        approvedReferrals,
        totalReferrals,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error fetching user reward stats",
      error: error.message,
    });
  }
};

// Get user's available rewards
exports.getUserAvailableRewards = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user stats
    const sales = await Sale.find({ user: userId });
    const totalKgSold = sales.reduce((sum, sale) => sum + sale.totalQuantity, 0);

    const approvedReferrals = await Referral.countDocuments({
      referrer: userId,
      status: "approved",
    });

    // Get all active bounties
    const bounties = await Bounty.find({ isActive: true });

    // Get user's claimed rewards
    const claimedRewards = await UserReward.find({ user: userId }).select("bounty");

    const claimedBountyIds = claimedRewards.map(reward => reward.bounty.toString());

    // Process bounties to check eligibility
    const availableRewards = bounties.map(bounty => {
      const isClaimed = claimedBountyIds.includes(bounty._id.toString());
      let isEligible = false;

      if (bounty.type === "sale") {
        isEligible = totalKgSold >= bounty.requirement.value;
      } else if (bounty.type === "referral") {
        isEligible = approvedReferrals >= bounty.requirement.value;
      }

      return {
        ...bounty.toObject(),
        isEligible: isEligible && !isClaimed,
        isClaimed,
        userStats: {
          totalKgSold,
          approvedReferrals,
        },
      };
    });

    res.status(200).json({
      status: "success",
      data: availableRewards,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error fetching available rewards",
      error: error.message,
    });
  }
};

// Get user's claimed rewards
exports.getUserClaimedRewards = async (req, res) => {
  try {
    const userId = req.user.id;

    const claimedRewards = await UserReward.find({ user: userId })
      .populate("bounty")
      .sort({ claimedAt: -1 });

    res.status(200).json({
      status: "success",
      data: claimedRewards,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error fetching claimed rewards",
      error: error.message,
    });
  }
};

// Claim reward
exports.claimReward = async (req, res) => {
  try {
    const { bountyId } = req.params;
    const userId = req.user.id;

    // Check if bounty exists and is active
    const bounty = await Bounty.findById(bountyId);
    if (!bounty || !bounty.isActive) {
      return res.status(404).json({
        status: "error",
        message: "Bounty not found or inactive",
      });
    }

    // Check if already claimed
    const existingClaim = await UserReward.findOne({
      user: userId,
      bounty: bountyId,
    });

    if (existingClaim) {
      return res.status(400).json({
        status: "error",
        message: "Reward already claimed",
      });
    }

    // Check eligibility
    const sales = await Sale.find({ user: userId });
    const totalKgSold = sales.reduce((sum, sale) => sum + sale.totalQuantity, 0);

    const approvedReferrals = await Referral.countDocuments({
      referrer: userId,
      status: "approved",
    });

    let isEligible = false;
    if (bounty.type === "sale") {
      isEligible = totalKgSold >= bounty.requirement.value;
    } else if (bounty.type === "referral") {
      isEligible = approvedReferrals >= bounty.requirement.value;
    }

    if (!isEligible) {
      return res.status(400).json({
        status: "error",
        message: "You don't meet the requirements for this reward",
      });
    }

    // Create user reward
    const userReward = new UserReward({
      user: userId,
      bounty: bountyId,
      claimedRequirement: bounty.requirement,
      claimedReward: bounty.reward,
    });

    await userReward.save();

    await userReward.populate([
      { path: "user", select: "firstName lastName email phoneNumber" },
      { path: "bounty" },
    ]);

    res.status(201).json({
      status: "success",
      data: userReward,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error claiming reward",
      error: error.message,
    });
  }
};

// Get all user rewards (admin)
exports.getAllUserRewards = async (req, res) => {
  try {
    const { status, state, search, page = 1, limit = 10 } = req.query;
    
    const filter = {};
    if (status) {
      filter.status = status;
    }

    // Build aggregation pipeline for advanced filtering
    const pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user"
        }
      },
      {
        $lookup: {
          from: "bounties",
          localField: "bounty",
          foreignField: "_id",
          as: "bounty"
        }
      },
      {
        $lookup: {
          from: "banks",
          localField: "user._id",
          foreignField: "user",
          as: "bankDetails"
        }
      },
      {
        $unwind: "$user"
      },
      {
        $unwind: "$bounty"
      },
      {
        $addFields: {
          bankDetails: {
            $cond: {
              if: { $gt: [{ $size: "$bankDetails" }, 0] },
              then: { $arrayElemAt: ["$bankDetails", 0] },
              else: null
            }
          }
        }
      }
    ];

    // Add match conditions
    const matchConditions = {};
    if (status) {
      matchConditions.status = status;
    }
    if (state) {
      matchConditions["user.state"] = state;
    }
    if (search) {
      matchConditions.$or = [
        { "user.firstName": { $regex: search, $options: "i" } },
        { "user.lastName": { $regex: search, $options: "i" } },
        { "user.email": { $regex: search, $options: "i" } },
        { "user.phoneNumber": { $regex: search, $options: "i" } }
      ];
    }

    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // Add sorting and pagination
    pipeline.push(
      { $sort: { claimedAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: parseInt(limit) }
    );

    // Get total count for pagination
    const countPipeline = [...pipeline];
    countPipeline.pop(); // Remove limit
    countPipeline.pop(); // Remove skip
    countPipeline.push({ $count: "total" });

    const [userRewards, countResult] = await Promise.all([
      UserReward.aggregate(pipeline),
      UserReward.aggregate(countPipeline)
    ]);

    const total = countResult.length > 0 ? countResult[0].total : 0;

    res.status(200).json({
      status: "success",
      data: {
        userRewards,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error fetching user rewards",
      error: error.message,
    });
  }
};

// Update reward status (admin)
exports.updateRewardStatus = async (req, res) => {
  try {
    const { rewardIds, status } = req.body;

    if (!Array.isArray(rewardIds) || rewardIds.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Reward IDs are required",
      });
    }

    const updateData = { status };
    if (status === "delivered") {
      updateData.deliveredAt = new Date();
    }

    const result = await UserReward.updateMany(
      { _id: { $in: rewardIds } },
      updateData
    );

    res.status(200).json({
      status: "success",
      message: `${result.modifiedCount} rewards updated successfully`,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error updating reward status",
      error: error.message,
    });
  }
};
