const express = require("express");
const {
  getReferralStats,
  getReferralList,
  generateReferralLink,
  processReferralSignup,
} = require("../controllers/referralController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Process referral signup (public route - no auth required)
router.post("/signup", processReferralSignup);

// Protected routes
router.use(protect);

// Get referral stats
router.get("/stats", getReferralStats);

// Get referral list
router.get("/list", getReferralList);

// Generate referral link
router.get("/link", generateReferralLink);

module.exports = router;
