const express = require("express");
const router = express.Router();
const { protect, restrictTo } = require("../middleware/auth");
const {
  createMaterial,
  getAllMaterials,
  getMaterialByCategory,
  getMaterial,
  updateMaterial,
  deleteMaterial,
} = require("../controllers/materialController");

// Public routes - no authentication required
router.get("/", getAllMaterials);
router.get("/category/:category", getMaterialByCategory);
router.get("/:id", getMaterial);

// Protected routes - admin only
router.use(protect, restrictTo("admin"));
router.post("/", createMaterial);
router.patch("/:id", updateMaterial);
router.delete("/:id", deleteMaterial);

module.exports = router;
