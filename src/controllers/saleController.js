const Sale = require("../models/Sale");
const Bin = require("../models/Bin");
const Bank = require("../models/Bank");
const { updateReferralStatus } = require("./referralController");
const { NotificationService } = require("./notificationController");
const { closeChat, clearChatMessages } = require("./chatController");

exports.createSale = async (req, res) => {
  try {
    const { binId, bankId } = req.body;

    const bin = await Bin.findOne({ _id: binId, user: req.user.id }).populate(
      "materials.material"
    );

    if (!bin) {
      return res.status(404).json({
        status: "fail",
        message: "No bin found",
      });
    }

    bin.sold = true;
    bin.saleConfirmed = true;
    await bin.save();

    if (!bin.validationStatus) {
      return res.status(400).json({
        status: "fail",
        message: "Bin must be validated by an agent first",
      });
    }

    const bankDetails = await Bank.findOne({ _id: bankId, user: req.user.id });
    if (!bankDetails) {
      return res.status(404).json({
        status: "fail",
        message: "No bank details found",
      });
    }

    // Ensure totalPrice is calculated correctly
    let calculatedTotalPrice = bin.totalPrice;
    if (!calculatedTotalPrice || calculatedTotalPrice === 0) {
      calculatedTotalPrice = bin.materials.reduce((sum, item) => {
        const quantity = item.quantity || 0;
        const pricePerKg = item.material?.pricePerKg || 0;
        return sum + (quantity * pricePerKg);
      }, 0);
    }

    const sale = await Sale.create({
      user: req.user.id,
      bin: binId,
      materials: bin.materials,
      totalQuantity: bin.totalQuantity,
      totalPrice: calculatedTotalPrice,
      bankDetails: {
        bankName: bankDetails.bankName,
        accountNumber: bankDetails.accountNumber,
        accountName: bankDetails.accountName,
      },
    });

    // Update referral status and create notifications
    await updateReferralStatus(req.user.id);
    await NotificationService.createSaleCompletedNotification(req.user.id, sale.totalPrice);
    
    // Clear chat messages when sale is confirmed
    await clearChatMessages(binId);

    // Delete the bin after successful sale
    // await Bin.findByIdAndDelete(binId);

    res.status(201).json({
      status: "success",
      data: {
        sale,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.getMySales = async (req, res) => {
  try {
    const sales = await Sale.find({ user: req.user.id })
      .populate("materials.material")
      .sort("-createdAt");

    res.status(200).json({
      status: "success",
      results: sales.length,
      data: {
        sales,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.getAllSales = async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate("user", "username email firstName lastName")
      .populate("materials.material")
      .sort("-createdAt");

    res.status(200).json({
      status: "success",
      results: sales.length,
      data: {
        sales,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.updateSaleStatus = async (req, res) => {
  try {
    const sale = await Sale.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!sale) {
      return res.status(404).json({
        status: "fail",
        message: "No sale found with that ID",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        sale,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id).populate(
      "materials.material"
    );
    if (!sale) {
      return res.status(404).json({
        status: "fail",
        message: "No sale found with that ID",
      });
    }
    // Only allow access if the user owns the sale
    if (sale.user.toString() !== req.user.id) {
      return res.status(403).json({
        status: "fail",
        message: "Not authorized to view this sale",
      });
    }
    res.status(200).json({
      status: "success",
      data: { sale },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};
