const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  addBankDetails,
  getMyBankDetails,
  deleteBankDetails,
  setSelectedPaymentBank,
  getSelectedPaymentBank,
  getBankById,
} = require("../controllers/bankController");

router.use(protect);

router.route("/").get(getMyBankDetails).post(addBankDetails);

router.get("/:id", getBankById);
router.delete("/:id", deleteBankDetails);

// Agent payment bank selection routes
router.post("/select-payment", setSelectedPaymentBank);
router.get("/selected-payment", getSelectedPaymentBank);

module.exports = router;
