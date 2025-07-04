const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  addBankDetails,
  getMyBankDetails,
  deleteBankDetails,
} = require("../controllers/bankController");

router.use(protect);

router.route("/").get(getMyBankDetails).post(addBankDetails);

router.delete("/:id", deleteBankDetails);

module.exports = router;
