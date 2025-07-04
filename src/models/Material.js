const mongoose = require("mongoose");

const materialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide material name"],
    trim: true,
  },
  image: {
    type: String,
    required: [true, "Please provide material image"],
  },
  pricePerKg: {
    type: Number,
    required: [true, "Please provide price per kg"],
  },
  category: {
    type: String,
    enum: ["household_wastes", "industrial_waste", "raw_materials"],
    required: [true, "Please provide material category"],
  },
  description: {
    type: String,
    required: [true, "Please provide material description"],
  },
  excemptions: [
    {
      type: String,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Material", materialSchema);
