const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  createBin,
  getMyBin,
  addToBin,
  deleteBin,
  removeFromBin,
  selectAgent,
  updateBinItemQuantity,
} = require("../controllers/binController");

router.use(protect);

router.route("/").get(getMyBin).post(createBin);

router.delete("/", deleteBin);
router.post("/add", addToBin);
router.post("/select-agent", selectAgent);
router.put("/update", updateBinItemQuantity);
router.delete("/remove/:materialId", removeFromBin);

module.exports = router;
