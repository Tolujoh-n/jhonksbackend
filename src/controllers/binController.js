const Bin = require("../models/Bin");
const Material = require("../models/Material");

exports.createBin = async (req, res) => {
  try {
    const bin = await Bin.create({
      user: req.user.id,
      materials: [],
    });
    res.status(201).json({
      status: "success",
      data: {
        bin,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.getMyBin = async (req, res) => {
  try {
    const bin = await Bin.findOne({
      user: req.user.id,
      sold: false,
      // $or: [
      //   { validationStatus: false },
      //   { validationStatus: { $exists: false } },
      // ],
    })
      .populate("materials.material")
      .populate(
        "selectedAgent",
        "username firstName lastName phoneNumber state"
      );

    if (!bin) {
      return res.status(404).json({
        status: "fail",
        message: "No bin found",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        bin,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.addToBin = async (req, res) => {
  try {
    const { userId, materialId, quantity } = req.body;
    const material = await Material.findById(materialId);

    if (!material) {
      return res.status(404).json({
        status: "fail",
        message: "No material found with that ID",
      });
    }

    const targetUserId = userId || req.user.id;

    let bin = await Bin.findOne({
      user: targetUserId,
      $or: [
        { validationStatus: false },
        { validationStatus: { $exists: false } },
      ],
    });

    if (!bin) {
      bin = await Bin.create({
        user: req.user.id,
        materials: [],
      });
    }

    const existingMaterial = bin.materials.find(
      (item) => item.material.toString() === materialId
    );

    if (existingMaterial) {
      existingMaterial.quantity += quantity;
      existingMaterial.price = existingMaterial.quantity * material.pricePerKg;
    } else {
      bin.materials.push({
        material: materialId,
        quantity,
        price: quantity * material.pricePerKg,
      });
    }

    await bin.save();

    res.status(200).json({
      status: "success",
      data: {
        bin,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.removeFromBin = async (req, res) => {
  try {
    const bin = await Bin.findOne({ user: req.user.id });
    if (!bin) {
      return res.status(404).json({
        status: "fail",
        message: "No bin found",
      });
    }

    bin.materials = bin.materials.filter(
      (item) => item.material.toString() !== req.params.materialId
    );

    await bin.save();

    res.status(200).json({
      status: "success",
      data: {
        bin,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.updateBinItemQuantity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId, newQuantity } = req.body;

    if (newQuantity < 0) {
      return res
        .status(400)
        .json({ status: "fail", message: "Quantity cannot be negative" });
    }

    const bin = await Bin.findOne({ user: userId }).populate(
      "materials.material"
    );

    if (!bin) {
      return res
        .status(404)
        .json({ status: "fail", message: "Bin not found for user" });
    }

    const materialEntry = bin.materials.id(itemId);

    if (!materialEntry) {
      return res
        .status(404)
        .json({ status: "fail", message: "Material not found in bin" });
    }

    materialEntry.quantity = newQuantity;
    materialEntry.price = newQuantity * materialEntry.material.pricePerKg;

    if (newQuantity === 0) {
      materialEntry.remove();
    }

    bin.totalQuantity = bin.materials.reduce((sum, m) => sum + m.quantity, 0);
    bin.totalPrice = bin.materials.reduce((sum, m) => sum + m.price, 0);

    await bin.save();

    res.status(200).json({
      status: "success",
      data: {
        bin,
      },
    });
  } catch (error) {
    res.status(400).json({ status: "fail", message: error.message });
  }
};

exports.deleteBin = async (req, res) => {
  try {
    const userId = req.user.id;

    const deletedBin = await Bin.findOneAndDelete({ user: userId });

    if (!deletedBin) {
      return res.status(404).json({
        status: "fail",
        message: "Bin not found for user",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Bin deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.selectAgent = async (req, res) => {
  try {
    const bin = await Bin.findOne({
      user: req.user.id,
      validationStatus: false,
    });
    if (!bin) {
      return res.status(404).json({
        status: "fail",
        message: "No bin found",
      });
    }

    bin.selectedAgent = req.body.agentId;
    await bin.save();

    res.status(200).json({
      status: "success",
      data: {
        bin,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};
