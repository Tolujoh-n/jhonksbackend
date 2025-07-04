const express = require("express");
const router = express.Router();
const { protect, restrictTo } = require("../middleware/auth");
const {
  getAllUsers,
  getAllAgents,
  getAllSales,
  getAllDeliveries,
  updateDeliveryStatus,
  getDashboardStats,
} = require("../controllers/adminController");

router.use(protect);
router.use(restrictTo("admin"));

router.get("/users", getAllUsers);
router.get("/agents", getAllAgents);
router.get("/sales", getAllSales);
router.get("/deliveries", getAllDeliveries);
router.patch("/deliveries/:id/status", updateDeliveryStatus);
router.get("/dashboard-stats", getDashboardStats);

module.exports = router;
