const Bank = require("../models/Bank");
const User = require("../models/User");

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

// Set selected payment bank for agent
exports.setSelectedPaymentBank = async (req, res) => {
  try {
    const { bankId } = req.body;

    // Verify the bank belongs to the user
    const bank = await Bank.findOne({
      _id: bankId,
      user: req.user.id,
    });

    if (!bank) {
      return res.status(404).json({
        status: "fail",
        message: "Bank account not found or does not belong to you",
      });
    }

    // Update user's selected payment bank
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { selectedPaymentBank: bankId },
      { new: true }
    );

    res.status(200).json({
      status: "success",
      data: {
        message: "Payment bank selected successfully",
        selectedBank: bank,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Get selected payment bank for agent
exports.getSelectedPaymentBank = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('selectedPaymentBank');
    
    res.status(200).json({
      status: "success",
      data: {
        selectedBank: user.selectedPaymentBank,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Get bank by ID (for admin to fetch bank details)
exports.getBankById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("=== GET BANK BY ID ===");
    console.log("Bank ID requested:", id);
    console.log("User making request:", req.user.id);
    
    const bank = await Bank.findById(id);
    console.log("Bank found:", bank);
    
    if (!bank) {
      console.log("Bank not found for ID:", id);
      return res.status(404).json({
        status: "fail",
        message: "Bank not found",
      });
    }
    
    console.log("Returning bank data:", {
      id: bank._id,
      bankName: bank.bankName,
      accountNumber: bank.accountNumber,
      accountName: bank.accountName
    });
    
    res.status(200).json({
      status: "success",
      data: bank,
    });
  } catch (error) {
    console.error("Error in getBankById:", error);
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};
