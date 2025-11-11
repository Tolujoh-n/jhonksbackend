const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../config.env") });

const User = require("../src/models/User");
const PhoneVerification = require("../src/models/PhoneVerification");
const AgentPhoneVerification = require("../src/models/AgentPhoneVerification");


// usage example: node scripts/clearPhone.js 8148444929
const normalizePhoneNumber = (value = "") => {
  const digitsOnly = value.toString().replace(/\D/g, "");

  if (!digitsOnly) {
    return "";
  }

  if (digitsOnly.startsWith("234")) {
    return digitsOnly;
  }

  if (digitsOnly.startsWith("0")) {
    return `234${digitsOnly.slice(1)}`;
  }

  if (digitsOnly.length === 10 || digitsOnly.length === 11) {
    return `234${digitsOnly.startsWith("0") ? digitsOnly.slice(1) : digitsOnly}`;
  }

  return digitsOnly;
};

const [, , rawPhone] = process.argv;

if (!rawPhone) {
  console.error("❌  Please provide the phone number to remove. Example:");
  console.error("    node scripts/clearPhone.js 8148444929");
  process.exit(1);
}

const normalizedPhone = normalizePhoneNumber(rawPhone);

if (!normalizedPhone) {
  console.error("❌  Unable to normalize the phone number provided.");
  process.exit(1);
}

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const [userResult, phoneVerificationResult, agentPhoneVerificationResult] =
      await Promise.all([
      User.deleteMany({ phoneNumber: normalizedPhone }),
      PhoneVerification.deleteMany({ phoneNumber: normalizedPhone }),
      AgentPhoneVerification.deleteMany({ phoneNumber: normalizedPhone }),
    ]);

    console.log("✅ Cleanup complete.");
    console.log(
      `   Removed ${userResult.deletedCount} user record(s), ${phoneVerificationResult.deletedCount} user phone verification record(s), and ${agentPhoneVerificationResult.deletedCount} agent phone verification record(s) for ${normalizedPhone}.`
    );
  } catch (error) {
    console.error("❌  Cleanup failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
};

run();

