const Material = require("../models/Material");

exports.createMaterial = async (req, res) => {
  try {
    const material = await Material.create(req.body);
    res.status(201).json({
      status: "success",
      data: {
        material,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.getAllMaterials = async (req, res) => {
  try {
    const materials = await Material.find();
    res.status(200).json({
      status: "success",
      results: materials.length,
      data: {
        materials,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.getMaterialByCategory = async (req, res) => {
  try {
    const materials = await Material.find({ category: req.params.category });
    res.status(200).json({
      status: "success",
      results: materials.length,
      data: {
        materials,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.getMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({
        status: "fail",
        message: "No material found with that ID",
      });
    }
    res.status(200).json({
      status: "success",
      data: {
        material,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.updateMaterial = async (req, res) => {
  try {
    const material = await Material.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!material) {
      return res.status(404).json({
        status: "fail",
        message: "No material found with that ID",
      });
    }
    res.status(200).json({
      status: "success",
      data: {
        material,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.deleteMaterial = async (req, res) => {
  try {
    const material = await Material.findByIdAndDelete(req.params.id);
    if (!material) {
      return res.status(404).json({
        status: "fail",
        message: "No material found with that ID",
      });
    }
    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};
