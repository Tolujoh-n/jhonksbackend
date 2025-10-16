const express = require("express");
const router = express.Router();
const { protect, restrictTo } = require("../middleware/auth");
const {
  getAllUsers,
  getAllAgents,
  getAllSales,
  getAllDeliveries,
  updateDeliveryStatus,
  updateSaleStatus,
  getDashboardStats,
  getPendingValidations,
  getValidationHistory,
  getAllSalesEnhanced,
  getAllDeliveriesEnhanced,
  updatePaymentStatus,
  getAgentFee,
  setAgentFee,
} = require("../controllers/adminController");

router.use(protect);
router.use(restrictTo("admin"));

router.get("/users", getAllUsers);
router.get("/agents", getAllAgents);
router.get("/sales", getAllSales);
router.get("/deliveries", getAllDeliveries);
router.patch("/deliveries/:id/status", updateDeliveryStatus);
router.patch("/sales/:saleId/status", updateSaleStatus);
router.get("/dashboard-stats", getDashboardStats);

// New admin endpoints
router.get("/pending-validations", getPendingValidations);
router.get("/validation-history", getValidationHistory);
router.get("/sales-enhanced", getAllSalesEnhanced);
router.get("/deliveries-enhanced", getAllDeliveriesEnhanced);
router.patch("/deliveries/:id/payment", updatePaymentStatus);
router.get("/agent-fee", getAgentFee);
router.post("/agent-fee", setAgentFee);

module.exports = router;
