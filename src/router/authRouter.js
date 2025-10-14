const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { register, login, getMe, updateProfile, updateAgentDetails, changePassword } = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.put("/agent-details", protect, updateAgentDetails);
router.put("/change-password", protect, changePassword);

module.exports = router;
