const User = require("../models/User");
const Sale = require("../models/Sale");
const Delivery = require("../models/Delivery");
const Material = require("../models/Material");
const Bin = require("../models/Bin");
const AgentFee = require("../models/AgentFee");
const Bank = require("../models/Bank");

// Test Bank model import
console.log("Bank model imported:", !!Bank);
console.log("Bank model name:", Bank.modelName);
const { NotificationService } = require("./notificationController");

// Helper function to get current agent fee
const getCurrentAgentFee = async () => {
  const currentFee = await AgentFee.findOne({ 
    isActive: true,
    effectiveTo: null 
  }).sort({ effectiveFrom: -1 });

  return currentFee ? currentFee.feePerKg : 20; // Default to 20 if no fee found
};

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
      .populate("user", "username email firstName lastName phoneNumber homeAddress")
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

// Get pending validations (bins that are assigned to agents but not yet validated)
exports.getPendingValidations = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, state, agent } = req.query;
    const skip = (page - 1) * limit;

    let query = {
      selectedAgent: { $exists: true, $ne: null },
      validationStatus: false
    };

    if (state) {
      query['user.state'] = state;
    }

    if (agent) {
      query.selectedAgent = agent;
    }

    // First get the data with population
    let validations = await Bin.find(query)
      .populate('user', 'firstName lastName phoneNumber state homeAddress')
      .populate('selectedAgent', 'firstName lastName phoneNumber agentDetails')
      .populate('materials.material', 'name category pricePerKg')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    // Apply search filter after population
    if (search) {
      validations = validations.filter(validation => {
        const user = validation.user;
        const selectedAgent = validation.selectedAgent;
        const searchLower = search.toLowerCase();
        
        return (
          (user?.firstName?.toLowerCase().includes(searchLower)) ||
          (user?.lastName?.toLowerCase().includes(searchLower)) ||
          (user?.phoneNumber?.includes(search)) ||
          (selectedAgent?.firstName?.toLowerCase().includes(searchLower)) ||
          (selectedAgent?.lastName?.toLowerCase().includes(searchLower)) ||
          (selectedAgent?.phoneNumber?.includes(search))
        );
      });
    }

    const total = await Bin.countDocuments(query);

    // Calculate stats
    const stats = await Bin.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData'
        }
      },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$totalQuantity' },
          totalBins: { $sum: 1 },
          uniqueAgents: { $addToSet: '$selectedAgent' },
          uniqueStates: { $addToSet: { $arrayElemAt: ['$userData.state', 0] } }
        }
      }
    ]);

    const quantityByState = await Bin.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData'
        }
      },
      {
        $group: {
          _id: { $arrayElemAt: ['$userData.state', 0] },
          quantity: { $sum: '$totalQuantity' }
        }
      },
      { $sort: { quantity: -1 } }
    ]);

    res.status(200).json({
      status: "success",
      data: {
        validations,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        stats: {
          totalQuantity: stats[0]?.totalQuantity || 0,
          totalBins: stats[0]?.totalBins || 0,
          totalAgents: stats[0]?.uniqueAgents?.length || 0,
          totalStates: stats[0]?.uniqueStates?.length || 0,
          quantityByState
        }
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Get validation history (bins that have been validated by agents)
exports.getValidationHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, state, agent, status, date } = req.query;
    const skip = (page - 1) * limit;

    let query = {
      validationStatus: true,
      selectedAgent: { $exists: true, $ne: null },
      deliveryStatus: false  // Only show items that haven't been delivered
    };

    if (state) {
      query['user.state'] = state;
    }

    if (agent) {
      query.selectedAgent = agent;
    }

    if (status) {
      query.sold = status === 'completed';
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.createdAt = { $gte: startDate, $lt: endDate };
    }

    // First get the data with population
    let history = await Bin.find(query)
      .populate('user', 'firstName lastName phoneNumber state homeAddress')
      .populate('selectedAgent', 'firstName lastName phoneNumber agentDetails')
      .populate('materials.material', 'name category pricePerKg')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    // Apply search filter after population
    if (search) {
      history = history.filter(validation => {
        const user = validation.user;
        const selectedAgent = validation.selectedAgent;
        const searchLower = search.toLowerCase();
        
        return (
          (user?.firstName?.toLowerCase().includes(searchLower)) ||
          (user?.lastName?.toLowerCase().includes(searchLower)) ||
          (user?.phoneNumber?.includes(search)) ||
          (selectedAgent?.firstName?.toLowerCase().includes(searchLower)) ||
          (selectedAgent?.lastName?.toLowerCase().includes(searchLower)) ||
          (selectedAgent?.phoneNumber?.includes(search))
        );
      });
    }

    const total = await Bin.countDocuments(query);

    // Calculate stats
    const stats = await Bin.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData'
        }
      },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$totalQuantity' },
          totalBins: { $sum: 1 },
          uniqueAgents: { $addToSet: '$selectedAgent' },
          uniqueStates: { $addToSet: { $arrayElemAt: ['$userData.state', 0] } },
          completedToday: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$sold', true] },
                    {
                      $gte: ['$createdAt', new Date(new Date().setHours(0, 0, 0, 0))]
                    }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const quantityByState = await Bin.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData'
        }
      },
      {
        $group: {
          _id: { $arrayElemAt: ['$userData.state', 0] },
          quantity: { $sum: '$totalQuantity' }
        }
      },
      { $sort: { quantity: -1 } }
    ]);

    res.status(200).json({
      status: "success",
      data: {
        history,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        stats: {
          totalQuantity: stats[0]?.totalQuantity || 0,
          totalBins: stats[0]?.totalBins || 0,
          totalAgents: stats[0]?.uniqueAgents?.length || 0,
          totalStates: stats[0]?.uniqueStates?.length || 0,
          completedToday: stats[0]?.completedToday || 0,
          quantityByState
        }
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Enhanced getAllSales with pagination and stats
exports.getAllSalesEnhanced = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, date } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    // Add search filters
    if (search) {
      query.$or = [
        { 'user.firstName': { $regex: search, $options: 'i' } },
        { 'user.lastName': { $regex: search, $options: 'i' } },
        { 'user.phoneNumber': { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.status = status;
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.createdAt = { $gte: startDate, $lt: endDate };
    }

    const sales = await Sale.find(query)
      .populate("user", "username email firstName lastName phoneNumber homeAddress")
      .populate("materials.material", "name category pricePerKg")
      .sort("-createdAt")
      .skip(skip)
      .limit(parseInt(limit));

    // Ensure totalPrice is calculated correctly for each sale
    sales.forEach(sale => {
      if (!sale.totalPrice || sale.totalPrice === 0) {
        sale.totalPrice = sale.materials.reduce((sum, item) => {
          const quantity = item.quantity || 0;
          const pricePerKg = item.material?.pricePerKg || 0;
          return sum + (quantity * pricePerKg);
        }, 0);
      }
    });

    const total = await Sale.countDocuments(query);

    // Calculate stats using the corrected sales data
    const stats = [{
      totalRevenue: sales.reduce((sum, sale) => sum + (sale.totalPrice || 0), 0),
      totalSales: sales.length,
      paidSales: sales.filter(sale => sale.status === 'paid').length,
      processingSales: sales.filter(sale => sale.status === 'processing').length,
      paidAmount: sales.filter(sale => sale.status === 'paid').reduce((sum, sale) => sum + (sale.totalPrice || 0), 0),
      processingAmount: sales.filter(sale => sale.status === 'processing').reduce((sum, sale) => sum + (sale.totalPrice || 0), 0)
    }];

    res.status(200).json({
      status: "success",
      data: {
        sales,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        stats: stats[0] || {
          totalRevenue: 0,
          totalSales: 0,
          paidSales: 0,
          processingSales: 0,
          paidAmount: 0,
          processingAmount: 0
        }
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Enhanced getAllDeliveries with pagination and stats
exports.getAllDeliveriesEnhanced = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, paymentStatus, date } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    // Add search filters
    if (search) {
      query.$or = [
        { 'agent.firstName': { $regex: search, $options: 'i' } },
        { 'agent.lastName': { $regex: search, $options: 'i' } },
        { 'agent.phoneNumber': { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.pickupStatus = status;
    }

    if (paymentStatus) {
      query.agentPaymentStatus = paymentStatus;
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.createdAt = { $gte: startDate, $lt: endDate };
    }

    const deliveries = await Delivery.find(query)
      .populate("agent", "username email firstName lastName phoneNumber agentDetails")
      .populate("materials.material", "name category pricePerKg")
      .sort("-createdAt")
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Delivery.countDocuments(query);

    // Calculate stats
    const stats = await Delivery.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalDeliveries: { $sum: 1 },
          delivered: {
            $sum: { $cond: [{ $eq: ['$pickupStatus', 'Delivered'] }, 1, 0] }
          },
          inStore: {
            $sum: { $cond: [{ $eq: ['$pickupStatus', 'In-Store'] }, 1, 0] }
          },
          totalFee: { $sum: '$totalProfit' },
          inStoreFee: {
            $sum: { $cond: [{ $eq: ['$pickupStatus', 'In-Store'] }, '$totalProfit', 0] }
          },
          deliveredFee: {
            $sum: { $cond: [{ $eq: ['$pickupStatus', 'Delivered'] }, '$totalProfit', 0] }
          },
          totalKg: { $sum: '$totalQuantity' }
        }
      }
    ]);

    res.status(200).json({
      status: "success",
      data: {
        deliveries,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        stats: stats[0] || {
          totalDeliveries: 0,
          delivered: 0,
          inStore: 0,
          totalFee: 0,
          inStoreFee: 0,
          deliveredFee: 0,
          totalKg: 0
        }
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Update payment status for deliveries
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    const delivery = await Delivery.findByIdAndUpdate(
      id,
      { agentPaymentStatus: paymentStatus },
      { new: true, runValidators: true }
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

// Agent fee management
exports.getAgentFee = async (req, res) => {
  try {
    // Get the current active fee
    const currentFee = await AgentFee.findOne({ 
      isActive: true,
      effectiveTo: null 
    }).sort({ effectiveFrom: -1 });

    // If no fee exists, create a default one
    if (!currentFee) {
      const defaultFee = await AgentFee.create({
        feePerKg: 20,
        isActive: true,
        setBy: req.user.id,
        effectiveFrom: new Date(),
      });

      return res.status(200).json({
        status: "success",
        data: {
          feePerKg: defaultFee.feePerKg,
        },
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        feePerKg: currentFee.feePerKg,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.setAgentFee = async (req, res) => {
  try {
    const { feePerKg } = req.body;

    if (!feePerKg || feePerKg < 0) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide a valid fee per kg",
      });
    }

    // Deactivate the current active fee
    await AgentFee.updateMany(
      { isActive: true, effectiveTo: null },
      { 
        isActive: false,
        effectiveTo: new Date()
      }
    );

    // Create new fee
    const newFee = await AgentFee.create({
      feePerKg,
      isActive: true,
      setBy: req.user.id,
      effectiveFrom: new Date(),
    });

    res.status(200).json({
      status: "success",
      data: {
        feePerKg: newFee.feePerKg,
        message: "Agent fee updated successfully",
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Move completed validation to delivery history
exports.moveToDeliveryHistory = async (req, res) => {
  try {
    const { binId } = req.params;

    const bin = await Bin.findById(binId)
      .populate('user', 'firstName lastName phoneNumber state homeAddress')
      .populate('selectedAgent', 'firstName lastName phoneNumber agentDetails')
      .populate('materials.material', 'name category pricePerKg');

    if (!bin) {
      return res.status(404).json({
        status: "fail",
        message: "Bin not found",
      });
    }

    if (!bin.validationStatus) {
      return res.status(400).json({
        status: "fail",
        message: "Bin must be validated before moving to delivery history",
      });
    }

    if (bin.deliveryStatus) {
      return res.status(400).json({
        status: "fail",
        message: "Bin is already in delivery history",
      });
    }

    // Get current agent fee for this validation
    const currentFee = await getCurrentAgentFee();

    // Create delivery record
    const materials = bin.materials.map((item) => ({
      material: item.material._id,
      quantity: item.quantity,
      profit: item.quantity * currentFee,
    }));

    const delivery = await Delivery.create({
      agent: bin.selectedAgent._id,
      materials,
      totalQuantity: bin.totalQuantity,
      totalProfit: bin.totalQuantity * currentFee,
      pickupStatus: "In-Store",
      agentPaymentStatus: "processing",
    });

    // Update bin delivery status
    bin.deliveryStatus = true;
    await bin.save();

    res.status(200).json({
      status: "success",
      data: {
        delivery,
        message: "Bin moved to delivery history successfully",
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Get all deliveries (admin)
exports.getAllDeliveries = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, agent, status, date } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    if (agent) {
      query.agent = agent;
    }

    if (status) {
      query.pickupStatus = status;
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.createdAt = { $gte: startDate, $lt: endDate };
    }

    // Get deliveries with basic population first
    let deliveries = await Delivery.find(query)
      .populate('agent', 'firstName lastName phoneNumber homeAddress agentDetails')
      .populate('materials.material', 'name category pricePerKg')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    // Debug: Check what we have before population
    console.log("Before population - First delivery selectedPaymentBank:", deliveries[0]?.selectedPaymentBank);
    console.log("Type:", typeof deliveries[0]?.selectedPaymentBank);
    
    // Test Bank model functionality
    if (deliveries.length > 0 && deliveries[0]?.selectedPaymentBank) {
      console.log("Testing Bank model with ID:", deliveries[0].selectedPaymentBank);
      try {
        const testBank = await Bank.findById(deliveries[0].selectedPaymentBank);
        console.log("Test bank query result:", testBank);
      } catch (error) {
        console.error("Test bank query error:", error);
      }
    }

    // Convert agent objects to plain objects for proper serialization
    deliveries.forEach(delivery => {
      if (delivery.agent) {
        delivery.agent = delivery.agent.toObject();
      }
    });

    // Always manually populate selectedPaymentBank for all deliveries
    for (let delivery of deliveries) {
      if (delivery.selectedPaymentBank) {
        try {
          console.log(`=== DELIVERY ${delivery._id} ===`);
          console.log(`Original selectedPaymentBank:`, delivery.selectedPaymentBank);
          console.log(`Type:`, typeof delivery.selectedPaymentBank);
          
          // Test if the bank ID is valid ObjectId
          const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(delivery.selectedPaymentBank);
          console.log(`Is valid ObjectId:`, isValidObjectId);
          
          const bankDetails = await Bank.findById(delivery.selectedPaymentBank);
          console.log(`Bank query result:`, bankDetails);
          console.log(`Bank exists:`, !!bankDetails);
          console.log(`Bank ID searched:`, delivery.selectedPaymentBank);
          
          if (bankDetails) {
            console.log(`Raw bank details from DB:`, bankDetails);
            console.log(`Bank name:`, bankDetails.bankName);
            console.log(`Account number:`, bankDetails.accountNumber);
            console.log(`Account name:`, bankDetails.accountName);
            
            // Convert to plain object and assign
            const bankObject = bankDetails.toObject();
            delivery.selectedPaymentBank = bankObject;
            
            console.log(`After assignment:`, delivery.selectedPaymentBank);
            console.log(`Final bank name:`, delivery.selectedPaymentBank.bankName);
            console.log(`Final type:`, typeof delivery.selectedPaymentBank);
            console.log(`=== END DELIVERY ${delivery._id} ===`);
          } else {
            console.log(`Bank not found for ID: ${delivery.selectedPaymentBank}`);
            // Try to find any bank with similar ID
            const allBanks = await Bank.find({});
            console.log(`All banks in DB:`, allBanks.map(b => ({ id: b._id, name: b.bankName })));
            delivery.selectedPaymentBank = null;
          }
        } catch (error) {
          console.error(`Error fetching bank for delivery ${delivery._id}:`, error);
          delivery.selectedPaymentBank = null;
        }
      } else {
        console.log(`Delivery ${delivery._id} has no selectedPaymentBank`);
      }
    }

    // Apply search filter after population
    if (search) {
      deliveries = deliveries.filter(delivery => {
        const agent = delivery.agent;
        const searchLower = search.toLowerCase();
        
        return (
          (agent?.firstName?.toLowerCase().includes(searchLower)) ||
          (agent?.lastName?.toLowerCase().includes(searchLower)) ||
          (agent?.phoneNumber?.includes(search))
        );
      });
    }

    const total = await Delivery.countDocuments(query);

    // Calculate stats
    const stats = await Delivery.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'users',
          localField: 'agent',
          foreignField: '_id',
          as: 'agentData'
        }
      },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$totalQuantity' },
          totalDeliveries: { $sum: 1 },
          totalProfit: { $sum: '$totalProfit' },
          uniqueAgents: { $addToSet: '$agent' },
          uniqueStates: { $addToSet: { $arrayElemAt: ['$agentData.agentDetails.localGovernmentAddress', 0] } },
          completedToday: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$pickupStatus', 'Delivered'] },
                    {
                      $gte: ['$createdAt', new Date(new Date().setHours(0, 0, 0, 0))]
                    }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const quantityByState = await Delivery.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'users',
          localField: 'agent',
          foreignField: '_id',
          as: 'agentData'
        }
      },
      {
        $group: {
          _id: { $arrayElemAt: ['$agentData.agentDetails.localGovernmentAddress', 0] },
          quantity: { $sum: '$totalQuantity' }
        }
      },
      { $sort: { quantity: -1 } }
    ]);

    // Debug: Log first delivery to check selectedPaymentBank
    if (deliveries.length > 0) {
      console.log("=== FINAL RESULT ===");
      console.log("First delivery selectedPaymentBank:", deliveries[0].selectedPaymentBank);
      console.log("Type:", typeof deliveries[0].selectedPaymentBank);
      console.log("Is object:", typeof deliveries[0].selectedPaymentBank === 'object');
      if (deliveries[0].selectedPaymentBank && typeof deliveries[0].selectedPaymentBank === 'object') {
        console.log("Bank name:", deliveries[0].selectedPaymentBank.bankName);
        console.log("Account number:", deliveries[0].selectedPaymentBank.accountNumber);
        console.log("Account name:", deliveries[0].selectedPaymentBank.accountName);
      }
      console.log("=== END FINAL RESULT ===");
    }

    res.status(200).json({
      status: "success",
      data: {
        deliveries,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        stats: {
          totalQuantity: stats[0]?.totalQuantity || 0,
          totalDeliveries: stats[0]?.totalDeliveries || 0,
          totalProfit: stats[0]?.totalProfit || 0,
          totalAgents: stats[0]?.uniqueAgents?.length || 0,
          totalStates: stats[0]?.uniqueStates?.length || 0,
          completedToday: stats[0]?.completedToday || 0,
          quantityByState
        }
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};
