const express = require("express");
const router = express.Router();
const { protect, restrictTo } = require("../middleware/auth");
const {
  createSale,
  getMySales,
  getAllSales,
  updateSaleStatus,
  getSaleById,
} = require("../controllers/saleController");

router.use(protect);

router.route("/").get(getMySales).post(createSale);
router.get("/:id", getSaleById);

// Admin routes
router.use(restrictTo("admin"));
router.get("/all", getAllSales);
router.patch("/:id/status", updateSaleStatus);

module.exports = router;
