const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  register,
  login,
  getMe,
  updateProfile,
  updateAgentDetails,
  changePassword,
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPassword,
  requestPhoneVerificationOtp,
  verifyPhoneVerificationOtp,
} = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.put("/agent-details", protect, updateAgentDetails);
router.put("/change-password", protect, changePassword);
router.post("/forgot-password", requestPasswordReset);
router.post("/verify-reset-otp", verifyPasswordResetOtp);
router.post("/reset-password", resetPassword);
router.post("/phone/request-otp", requestPhoneVerificationOtp);
router.post("/phone/verify-otp", verifyPhoneVerificationOtp);

module.exports = router;
