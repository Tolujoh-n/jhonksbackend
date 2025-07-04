const mongoose = require("mongoose");

const bankSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  bankName: {
    type: String,
    required: [true, "Please provide bank name"],
  },
  accountNumber: {
    type: String,
    required: [true, "Please provide account number"],
  },
  accountName: {
    type: String,
    required: [true, "Please provide account name"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Bank", bankSchema);
