const express = require("express");
const router = express.Router();
const { protect, restrictTo } = require("../middleware/auth");
const {
  registerAsAgent,
  getPendingValidations,
  validateBin,
  getValidationHistory,
  createDelivery,
  getDeliveryHistory,
  getAllAgentsPublic,
  getAgentByIdPublic,
  confirmSale,
} = require("../controllers/agentController");

//Authenticated routes
router.use(protect);

router.get("/list", getAllAgentsPublic);
router.post("/register", registerAsAgent);
router.get("/:id([0-9a-fA-F]{24})", getAgentByIdPublic);

// 🔐 Agent-only routes

router.use(restrictTo("agent"));
router.get("/pending-validations", getPendingValidations);
router.get("/validation-history", getValidationHistory);
router.post("/validate/:binId", validateBin);
router.post("/delivery", createDelivery);
router.get("/delivery-history", getDeliveryHistory);
router.post("/confirm-sale/:binId", confirmSale);

module.exports = router;
