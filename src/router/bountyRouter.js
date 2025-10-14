const express = require("express");
const router = express.Router();
const { protect, restrictTo } = require("../middleware/auth");
const {
  getAllBounties,
  getActiveBounties,
  createBounty,
  updateBounty,
  deleteBounty,
  getUserRewardStats,
  getUserAvailableRewards,
  getUserClaimedRewards,
  claimReward,
  getAllUserRewards,
  updateRewardStatus,
} = require("../controllers/bountyController");

// Admin routes
router.get("/admin/all", protect, restrictTo("admin"), getAllBounties);
router.post("/admin/create", protect, restrictTo("admin"), createBounty);
router.put("/admin/:id", protect, restrictTo("admin"), updateBounty);
router.delete("/admin/:id", protect, restrictTo("admin"), deleteBounty);

// User reward management (admin)
router.get("/admin/rewards", protect, restrictTo("admin"), getAllUserRewards);
router.put("/admin/rewards/status", protect, restrictTo("admin"), updateRewardStatus);

// Public routes
router.get("/active", getActiveBounties);

// User routes
router.get("/user/stats", protect, getUserRewardStats);
router.get("/user/available", protect, getUserAvailableRewards);
router.get("/user/claimed", protect, getUserClaimedRewards);
router.post("/user/claim/:bountyId", protect, claimReward);

module.exports = router;
