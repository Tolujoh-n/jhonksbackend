const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema({
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  materials: [
    {
      material: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Material",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      profit: {
        type: Number,
        required: true,
      },
    },
  ],
  totalQuantity: {
    type: Number,
    required: true,
  },
  totalProfit: {
    type: Number,
    required: true,
  },
  pickupStatus: {
    type: String,
    enum: ["In-Store", "Delivered"],
    default: "In-Store",
  },
  agentPaymentStatus: {
    type: String,
    enum: ["processing", "paid"],
    default: "processing",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Delivery", deliverySchema);
