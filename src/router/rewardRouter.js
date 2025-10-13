const express = require("express");
const {
  getAvailableRewards,
  claimReward,
  getAdminRewards,
  updateRewardStatus,
} = require("../controllers/rewardController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Get available rewards for user
router.get("/available", protect, getAvailableRewards);

// Claim a reward
router.post("/claim", protect, claimReward);

// Admin routes
router.get("/admin/list", protect, getAdminRewards);
router.put("/admin/:rewardId/status", protect, updateRewardStatus);

module.exports = router;
