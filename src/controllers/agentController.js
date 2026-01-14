const crypto = require("crypto");
const User = require("../models/User");
const Bin = require("../models/Bin");
const Delivery = require("../models/Delivery");
const AgentFee = require("../models/AgentFee");
const AgentPhoneVerification = require("../models/AgentPhoneVerification");
const { NotificationService } = require("./notificationController");
const { sendPhoneVerificationOtp } = require("../utils/sms");
const { hashValue, generateOtp, normalizePhoneNumber } = require("../utils/phone");

// Helper function to get current agent fee
const getCurrentAgentFee = async () => {
  const currentFee = await AgentFee.findOne({ 
    isActive: true,
    effectiveTo: null 
  }).sort({ effectiveFrom: -1 });

  return currentFee ? currentFee.feePerKg : 20; // Default to 20 if no fee found
};

const AGENT_PHONE_OTP_EXPIRY_MINUTES = 10;
const AGENT_PHONE_VERIFICATION_TOKEN_EXPIRY_MINUTES = 30;
const AGENT_MAX_PHONE_OTP_ATTEMPTS = 5;

exports.requestAgentPhoneVerificationOtp = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        status: "fail",
        message: "Phone number is required.",
      });
    }

    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

    if (!normalizedPhoneNumber) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide a valid Nigerian phone number.",
      });
    }

    const existingUserWithPhone = await User.findOne({
      phoneNumber: normalizedPhoneNumber,
      _id: { $ne: req.user.id },
    });

    if (existingUserWithPhone) {
      return res.status(409).json({
        status: "fail",
        code: "PHONE_NUMBER_IN_USE",
        message:
          "This phone number is linked to another account. Please use a different number.",
      });
    }

    const otp = generateOtp();
    const otpExpiresAt = new Date(
      Date.now() + AGENT_PHONE_OTP_EXPIRY_MINUTES * 60 * 1000
    );

    await AgentPhoneVerification.findOneAndUpdate(
      { phoneNumber: normalizedPhoneNumber },
      {
        user: req.user.id,
        phoneNumber: normalizedPhoneNumber,
        otpHash: hashValue(otp),
        otpExpiresAt,
        otpAttempts: 0,
        verificationTokenHash: undefined,
        verificationTokenExpiresAt: undefined,
        verifiedAt: undefined,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await sendPhoneVerificationOtp({
      phoneNumber: normalizedPhoneNumber,
      otp,
    });

    res.status(200).json({
      status: "success",
      message: "We sent a verification code to your phone.",
      data: {
        phoneNumber: normalizedPhoneNumber,
      },
    });
  } catch (error) {
    console.error("Agent phone verification OTP request error:", error);
    res.status(500).json({
      status: "error",
      message:
        "We could not send the verification code right now. Please try again shortly.",
    });
  }
};

exports.verifyAgentPhoneVerificationOtp = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({
        status: "fail",
        message: "Phone number and OTP are required.",
      });
    }

    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

    const verificationRecord = await AgentPhoneVerification.findOne({
      phoneNumber: normalizedPhoneNumber,
      user: req.user.id,
    });

    if (
      !verificationRecord ||
      !verificationRecord.otpHash ||
      !verificationRecord.otpExpiresAt
    ) {
      return res.status(400).json({
        status: "fail",
        message:
          "We couldn't find an active verification request for this phone number.",
      });
    }

    if (verificationRecord.otpExpiresAt < Date.now()) {
      return res.status(400).json({
        status: "fail",
        message: "This verification code has expired. Please request a new one.",
      });
    }

    if (verificationRecord.otpAttempts >= AGENT_MAX_PHONE_OTP_ATTEMPTS) {
      return res.status(429).json({
        status: "fail",
        message:
          "Too many incorrect attempts. Please request a new verification code.",
      });
    }

    if (hashValue(otp) !== verificationRecord.otpHash) {
      verificationRecord.otpAttempts += 1;
      await verificationRecord.save({ validateBeforeSave: false });

      return res.status(400).json({
        status: "fail",
        message: "The verification code you entered is incorrect.",
      });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");

    verificationRecord.verificationTokenHash = hashValue(verificationToken);
    verificationRecord.verificationTokenExpiresAt = new Date(
      Date.now() +
        AGENT_PHONE_VERIFICATION_TOKEN_EXPIRY_MINUTES * 60 * 1000
    );
    verificationRecord.verifiedAt = new Date();
    verificationRecord.otpHash = undefined;
    verificationRecord.otpExpiresAt = undefined;
    verificationRecord.otpAttempts = 0;

    await verificationRecord.save({ validateBeforeSave: false });

    res.status(200).json({
      status: "success",
      message: "Phone number verified successfully.",
      data: {
        verificationToken,
        phoneNumber: normalizedPhoneNumber,
        phoneVerified: true,
        verifiedAt: verificationRecord.verifiedAt,
      },
    });
  } catch (error) {
    console.error("Agent phone verification OTP validation error:", error);
    res.status(500).json({
      status: "error",
      message:
        "We could not verify the code right now. Please try again shortly.",
    });
  }
};

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
      agentPhoneVerificationToken,
    } = req.body;

    if (confirmationCode !== "123456") {
      return res.status(400).json({
        status: "fail",
        message: "Invalid confirmation code",
      });
    }

    const normalizedPhoneNumber = normalizePhoneNumber(phone_number);

    if (!normalizedPhoneNumber) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide a valid Nigerian phone number.",
      });
    }

    if (!agentPhoneVerificationToken) {
      return res.status(400).json({
        status: "fail",
        message: "Please verify your phone number before completing registration.",
      });
    }

    const verificationRecord = await AgentPhoneVerification.findOne({
      phoneNumber: normalizedPhoneNumber,
      user: req.user.id,
    });

    if (
      !verificationRecord ||
      !verificationRecord.verificationTokenHash ||
      !verificationRecord.verificationTokenExpiresAt ||
      !verificationRecord.verifiedAt ||
      verificationRecord.verificationTokenExpiresAt < Date.now() ||
      hashValue(agentPhoneVerificationToken || "") !==
        verificationRecord.verificationTokenHash
    ) {
      return res.status(400).json({
        status: "fail",
        message:
          "Please verify your phone number before completing registration.",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        isAgent: true,
        role: "agent",
        phoneNumber: normalizedPhoneNumber,
        agentDetails: {
          verificationMethod,
          verificationNumber,
          agentImage,
          agent_name,
          phone_number: normalizedPhoneNumber,
          localGovernmentAddress,
          streetAddress,
          openHours,
          isVerified: true,
          phoneVerified: true,
          phoneVerifiedAt: verificationRecord.verifiedAt,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    await AgentPhoneVerification.deleteOne({
      phoneNumber: normalizedPhoneNumber,
      user: req.user.id,
    });

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

// Update bin item quantity during validation (for agents)
exports.updateBinItemQuantity = async (req, res) => {
  try {
    const { binId, itemId, newQuantity } = req.body;

    if (newQuantity < 1) {
      return res.status(400).json({
        status: "fail",
        message: "Quantity cannot be less than 1",
      });
    }

    const bin = await Bin.findOne({
      _id: binId,
      selectedAgent: req.user.id,
      validationStatus: false, // Only allow updates before validation
    }).populate("materials.material");

    if (!bin) {
      return res.status(404).json({
        status: "fail",
        message: "Bin not found or already validated",
      });
    }

    const materialEntry = bin.materials.id(itemId);

    if (!materialEntry) {
      return res.status(404).json({
        status: "fail",
        message: "Material not found in bin",
      });
    }

    // Update quantity
    materialEntry.quantity = newQuantity;
    materialEntry.price = newQuantity * materialEntry.material.pricePerKg;

    // Recalculate totals
    bin.totalQuantity = bin.materials.reduce((sum, m) => sum + m.quantity, 0);
    bin.totalPrice = bin.materials.reduce((sum, m) => sum + m.price, 0);

    await bin.save();

    res.status(200).json({
      status: "success",
      data: {
        bin,
        message: "Quantity updated successfully",
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Delete bin item during validation (for agents)
exports.deleteBinItem = async (req, res) => {
  try {
    const { binId, itemId } = req.body;

    const bin = await Bin.findOne({
      _id: binId,
      selectedAgent: req.user.id,
      validationStatus: false, // Only allow updates before validation
    }).populate("materials.material");

    if (!bin) {
      return res.status(404).json({
        status: "fail",
        message: "Bin not found or already validated",
      });
    }

    const materialEntry = bin.materials.id(itemId);

    if (!materialEntry) {
      return res.status(404).json({
        status: "fail",
        message: "Material not found in bin",
      });
    }

    // Check if this is the last material
    if (bin.materials.length === 1) {
      return res.status(400).json({
        status: "fail",
        message: "Cannot delete the last material. This would cancel the seller's order.",
      });
    }

    // Remove the material from the array
    bin.materials.pull(itemId);

    // Recalculate totals
    bin.totalQuantity = bin.materials.reduce((sum, m) => sum + m.quantity, 0);
    bin.totalPrice = bin.materials.reduce((sum, m) => sum + m.price, 0);

    await bin.save();

    res.status(200).json({
      status: "success",
      data: {
        bin,
        message: "Material deleted successfully",
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Cancel seller order (for agents)
exports.cancelSellerOrder = async (req, res) => {
  try {
    const { binId } = req.body;

    const bin = await Bin.findOne({
      _id: binId,
      selectedAgent: req.user.id,
      validationStatus: false, // Only allow cancellation before validation
    });

    if (!bin) {
      return res.status(404).json({
        status: "fail",
        message: "Bin not found or already validated",
      });
    }

    // Delete the bin to cancel the order
    await Bin.findByIdAndDelete(binId);

    // Create notification for the seller about order cancellation
    const agent = await User.findById(req.user.id);
    await NotificationService.createOrderCancelledNotification(
      bin.user, 
      agent.firstName + ' ' + agent.lastName, 
      binId
    );

    res.status(200).json({
      status: "success",
      data: {
        message: "Seller order cancelled successfully",
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.validateBin = async (req, res) => {
  try {
    const { binId } = req.params;
    const { materials } = req.body;

    const bin = await Bin.findOne({
      _id: binId,
      selectedAgent: req.user.id,
    });

    if (!bin) {
      return res.status(404).json({
        status: "fail",
        message: "No bin found",
      });
    }

    // Update materials if provided
    if (materials && materials.length > 0) {
      bin.materials = materials.map(item => ({
        material: item.material_id,
        quantity: item.quantity,
        price: item.quantity * (bin.materials.find(m => m._id.toString() === item.material_id)?.material?.pricePerKg || 0)
      }));
      
      // Recalculate totals
      bin.totalQuantity = bin.materials.reduce((sum, m) => sum + m.quantity, 0);
      bin.totalPrice = bin.materials.reduce((sum, m) => sum + m.price, 0);
    }

    bin.validationStatus = true;
    await bin.save();

    // Create notification for the seller
    const agent = await User.findById(req.user.id);
    await NotificationService.createAgentValidationNotification(
      bin.user, 
      agent.firstName + ' ' + agent.lastName, 
      binId
    );

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

// Redirect order to another agent
exports.redirectOrder = async (req, res) => {
  try {
    const { binId } = req.params;
    const { newAgentId } = req.body;

    if (!newAgentId) {
      return res.status(400).json({
        status: "fail",
        message: "New agent ID is required",
      });
    }

    // Find the bin and verify current agent is assigned
    const bin = await Bin.findOne({
      _id: binId,
      selectedAgent: req.user.id,
      validationStatus: false,
    }).populate("user", "firstName lastName");

    if (!bin) {
      return res.status(404).json({
        status: "fail",
        message: "Bin not found or you are not assigned to this order",
      });
    }

    // Verify new agent exists and is an agent
    const newAgent = await User.findOne({
      _id: newAgentId,
      role: "agent",
      isAgent: true,
    });

    if (!newAgent) {
      return res.status(404).json({
        status: "fail",
        message: "New agent not found or is not a valid agent",
      });
    }

    // Prevent redirecting to the same agent
    if (newAgentId === req.user.id.toString()) {
      return res.status(400).json({
        status: "fail",
        message: "Cannot redirect order to yourself",
      });
    }

    // Get current agent info for notification
    const currentAgent = await User.findById(req.user.id);

    // Update bin with new agent
    bin.selectedAgent = newAgentId;
    await bin.save();

    // Create notification for seller
    await NotificationService.createAgentRedirectNotification(
      bin.user._id,
      currentAgent.firstName + " " + currentAgent.lastName,
      newAgent.firstName + " " + newAgent.lastName,
      binId
    );

    res.status(200).json({
      status: "success",
      message: "Order redirected successfully",
      data: {
        bin,
        newAgent: {
          id: newAgent._id,
          name: newAgent.firstName + " " + newAgent.lastName,
        },
      },
    });
  } catch (error) {
    console.error("Error redirecting order:", error);
    res.status(400).json({
      status: "fail",
      message: error.message || "Error redirecting order",
    });
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

    // Get current agent fee
    const currentFee = await getCurrentAgentFee();

    const binsWithProfit = bins.map((bin) => {
      const materialsWithProfit = bin.materials.map((item) => ({
        ...item.toObject(),
        agentProfit: item.quantity * currentFee,
      }));

      return {
        ...bin.toObject(),
        materials: materialsWithProfit,
        totalProfit: materialsWithProfit.reduce(
          (sum, item) => sum + item.agentProfit,
          0
        ),
        currentFeePerKg: currentFee,
      };
    });

    // Calculate total earnings
    const totalEarnings = binsWithProfit.reduce(
      (sum, bin) => sum + bin.totalProfit,
      0
    );

    res.status(200).json({
      status: "success",
      results: binsWithProfit.length,
      data: {
        bins: binsWithProfit,
        totalEarnings,
        currentFeePerKg: currentFee,
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
    const { binIds, selectedPaymentBank } = req.body;

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

    // Get current agent fee
    const currentFee = await getCurrentAgentFee();

    const materials = [];
    let totalQuantity = 0;
    let totalProfit = 0;

    bins.forEach((bin) => {
      bin.materials.forEach((item) => {
        const profit = item.quantity * currentFee;
        materials.push({
          material: item.material._id,
          quantity: item.quantity,
          profit,
        });
        totalQuantity += item.quantity;
        totalProfit += profit;
      });
    });

    console.log("Creating delivery with selectedPaymentBank:", selectedPaymentBank);
    console.log("SelectedPaymentBank type:", typeof selectedPaymentBank);
    
    const delivery = await Delivery.create({
      agent: req.user.id,
      materials,
      totalQuantity,
      totalProfit,
      selectedPaymentBank: selectedPaymentBank || null,
    });
    
    console.log("Delivery created with ID:", delivery._id);
    console.log("Delivery selectedPaymentBank:", delivery.selectedPaymentBank);

    // Update bins delivery status
    await Bin.updateMany({ _id: { $in: binIds } }, { deliveryStatus: true });

    res.status(201).json({
      status: "success",
      data: {
        delivery,
        currentFeePerKg: currentFee,
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

    // Calculate total earnings
    const totalEarnings = deliveries.reduce(
      (sum, delivery) => sum + delivery.totalProfit,
      0
    );

    // Calculate total quantity delivered
    const totalQuantityDelivered = deliveries.reduce(
      (sum, delivery) => sum + delivery.totalQuantity,
      0
    );

    res.status(200).json({
      status: "success",
      results: deliveries.length,
      data: {
        deliveries,
        totalEarnings,
        totalQuantityDelivered,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Confirm sale for a bin
exports.confirmSale = async (req, res) => {
  try {
    const { binId } = req.params;

    const bin = await Bin.findOne({
      _id: binId,
      selectedAgent: req.user.id,
      validationStatus: true,
    });

    if (!bin) {
      return res.status(404).json({
        status: "fail",
        message: "Bin not found or not validated by you",
      });
    }

    bin.saleConfirmed = true;
    await bin.save();

    res.status(200).json({
      status: "success",
      data: {
        bin,
        message: "Sale confirmed successfully",
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};
