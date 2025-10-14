const express = require("express");
const {
  getReferralStats,
  getReferralList,
  generateReferralLink,
  processReferralSignup,
  getReferrerById,
  trackReferralClick,
  getAllUsers,
} = require("../controllers/referralController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Public routes (no auth required)
router.post("/signup", processReferralSignup);
router.get("/referrer/:referralId", getReferrerById);
router.post("/track", trackReferralClick);

// Protected routes
router.use(protect);

// Get referral stats
router.get("/stats", getReferralStats);

// Get referral list
router.get("/list", getReferralList);

// Generate referral link
router.get("/link", generateReferralLink);

// Get all users (admin only)
router.get("/users", getAllUsers);

module.exports = router;
