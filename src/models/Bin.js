const mongoose = require("mongoose");

const binSchema = new mongoose.Schema({
  user: {
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
        min: 0,
      },
      price: {
        type: Number,
        required: true,
      },
    },
  ],
  totalQuantity: {
    type: Number,
    default: 0,
  },
  totalPrice: {
    type: Number,
    default: 0,
  },
  selectedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  validationStatus: {
    type: Boolean,
    default: false,
  },
  deliveryStatus: {
    type: Boolean,
    default: false,
  },
  sold: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Calculate totals before saving
binSchema.pre("save", function (next) {
  this.totalQuantity = this.materials.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  this.totalPrice = this.materials.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );
  next();
});

module.exports = mongoose.model("Bin", binSchema);
