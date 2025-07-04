const Bank = require("../models/Bank");

exports.addBankDetails = async (req, res) => {
  try {
    const bankDetails = await Bank.create({
      user: req.user.id,
      ...req.body,
    });

    res.status(201).json({
      status: "success",
      data: {
        bankDetails,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.getMyBankDetails = async (req, res) => {
  try {
    const bankDetails = await Bank.find({ user: req.user.id });
    res.status(200).json({
      status: "success",
      results: bankDetails.length,
      data: {
        bankDetails,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.deleteBankDetails = async (req, res) => {
  try {
    const bankDetails = await Bank.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!bankDetails) {
      return res.status(404).json({
        status: "fail",
        message: "No bank details found with that ID",
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
