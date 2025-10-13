const User = require("../models/User");
const Sale = require("../models/Sale");
const Delivery = require("../models/Delivery");
const Material = require("../models/Material");
const { NotificationService } = require("./notificationController");

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json({
      status: "success",
      results: users.length,
      data: {
        users,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.getAllAgents = async (req, res) => {
  try {
    const agents = await User.find({ role: "agent" })
      .select("-password")
      .populate("agentDetails");
    res.status(200).json({
      status: "success",
      results: agents.length,
      data: {
        agents,
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

exports.getAllDeliveries = async (req, res) => {
  try {
    const deliveries = await Delivery.find()
      .populate("agent", "username email firstName lastName")
      .populate("materials.material")
      .sort("-createdAt");

    res.status(200).json({
      status: "success",
      results: deliveries.length,
      data: {
        deliveries,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.updateDeliveryStatus = async (req, res) => {
  try {
    const delivery = await Delivery.findByIdAndUpdate(
      req.params.id,
      {
        pickupStatus: req.body.pickupStatus,
        agentPaymentStatus: req.body.agentPaymentStatus,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!delivery) {
      return res.status(404).json({
        status: "fail",
        message: "No delivery found with that ID",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        delivery,
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
    const { saleId } = req.params;
    const { status } = req.body;

    const sale = await Sale.findById(saleId);
    if (!sale) {
      return res.status(404).json({
        status: "fail",
        message: "Sale not found",
      });
    }

    sale.status = status;
    await sale.save();

    // Create notification for payment received
    if (status === 'paid') {
      await NotificationService.createPaymentReceivedNotification(sale.user, sale.totalPrice);
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

exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalAgents = await User.countDocuments({ role: "agent" });
    const totalSales = await Sale.countDocuments();
    const totalDeliveries = await Delivery.countDocuments();
    const totalMaterials = await Material.countDocuments();

    const totalSalesAmount = await Sale.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$totalPrice" },
        },
      },
    ]);

    const totalAgentPayments = await Delivery.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$totalProfit" },
        },
      },
    ]);

    res.status(200).json({
      status: "success",
      data: {
        stats: {
          totalUsers,
          totalAgents,
          totalSales,
          totalDeliveries,
          totalMaterials,
          totalSalesAmount: totalSalesAmount[0]?.total || 0,
          totalAgentPayments: totalAgentPayments[0]?.total || 0,
        },
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};
