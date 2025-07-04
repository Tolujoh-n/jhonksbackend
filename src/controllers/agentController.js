const User = require("../models/User");
const Bin = require("../models/Bin");
const Delivery = require("../models/Delivery");

exports.registerAsAgent = async (req, res) => {
  try {
    const {
      verificationMethod,
      verificationNumber,
      agentImage,
      agent_name,
      phone_number,
      localGovernmentAddress,
      streetAddress,
      openHours,
      confirmationCode,
    } = req.body;

    if (confirmationCode !== "123456") {
      return res.status(400).json({
        status: "fail",
        message: "Invalid confirmation code",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        isAgent: true,
        role: "agent",
        phoneNumber: phone_number,
        agentDetails: {
          verificationMethod,
          verificationNumber,
          agentImage,
          agent_name,
          phone_number,
          localGovernmentAddress,
          streetAddress,
          openHours,
          isVerified: true,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      status: "success",
      data: { user },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.getPendingValidations = async (req, res) => {
  try {
    const bins = await Bin.find({
      selectedAgent: req.user.id,
      validationStatus: false,
    })
      .populate(
        "user",
        "username firstName lastName phoneNumber homeAddress state"
      )
      .populate("materials.material");

    res.status(200).json({
      status: "success",
      results: bins.length,
      data: {
        bins,
      },
    });
  } catch (error) {
    console.log("this is where the get pending valifation is failing", error);
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.validateBin = async (req, res) => {
  try {
    const { binId } = req.params;
    // const { materials } = req.body;

    const bin = await Bin.findOne({
      _id: binId,
      selectedAgent: req.user.id,
    });

    console.log("check this is the bin found", bin);

    if (!bin) {
      return res.status(404).json({
        status: "fail",
        message: "No bin found",
      });
    }

    // bin.materials = materials;
    bin.validationStatus = true;
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

exports.getAllAgentsPublic = async (req, res) => {
  try {
    const agents = await User.find({ role: "agent" })
      .select("-password")
      .populate("agentDetails");
    res.status(200).json({
      status: "success",
      results: agents.length,
      data: { agents },
    });
  } catch (error) {
    res.status(400).json({ status: "fail", message: error.message });
  }
};

exports.getAgentByIdPublic = async (req, res) => {
  try {
    const agent = await User.findOne({ _id: req.params.id, role: "agent" })
      .select("-password")
      .populate("agentDetails");
    if (!agent) {
      return res
        .status(404)
        .json({ status: "fail", message: "Agent not found" });
    }
    res.status(200).json({ status: "success", data: { agent } });
  } catch (error) {
    res.status(400).json({ status: "fail", message: error.message });
  }
};

exports.getValidationHistory = async (req, res) => {
  try {
    const bins = await Bin.find({
      selectedAgent: req.user.id,
      validationStatus: true,
      deliveryStatus: false,
    })
      .populate("user", "username firstName lastName")
      .populate("materials.material");

    const binsWithProfit = bins.map((bin) => {
      const materialsWithProfit = bin.materials.map((item) => ({
        ...item.toObject(),
        agentProfit: item.quantity * 20, // 20 is the agent_profit_per_kg
      }));

      return {
        ...bin.toObject(),
        materials: materialsWithProfit,
        totalProfit: materialsWithProfit.reduce(
          (sum, item) => sum + item.agentProfit,
          0
        ),
      };
    });

    res.status(200).json({
      status: "success",
      results: binsWithProfit.length,
      data: {
        bins: binsWithProfit,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.createDelivery = async (req, res) => {
  try {
    const { binIds } = req.body;

    const bins = await Bin.find({
      _id: { $in: binIds },
      selectedAgent: req.user.id,
      validationStatus: true,
      deliveryStatus: false,
    }).populate("materials.material");

    if (bins.length === 0) {
      return res.status(404).json({
        status: "fail",
        message: "No valid bins found",
      });
    }

    const materials = [];
    let totalQuantity = 0;
    let totalProfit = 0;

    bins.forEach((bin) => {
      bin.materials.forEach((item) => {
        const profit = item.quantity * 20; // 20 is the agent_profit_per_kg
        materials.push({
          material: item.material._id,
          quantity: item.quantity,
          profit,
        });
        totalQuantity += item.quantity;
        totalProfit += profit;
      });
    });

    const delivery = await Delivery.create({
      agent: req.user.id,
      materials,
      totalQuantity,
      totalProfit,
    });

    // Update bins delivery status
    await Bin.updateMany({ _id: { $in: binIds } }, { deliveryStatus: true });

    res.status(201).json({
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

exports.getDeliveryHistory = async (req, res) => {
  try {
    const deliveries = await Delivery.find({ agent: req.user.id })
      .populate("materials.material")
      .populate("agent", "firstName lastName email homeAddress")
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
