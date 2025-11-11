const crypto = require("crypto");

const hashValue = (value = "") =>
  crypto.createHash("sha256").update(value).digest("hex");

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const normalizePhoneNumber = (value = "") => {
  if (!value) return "";

  const digitsOnly = value.toString().replace(/\D/g, "");

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

module.exports = {
  hashValue,
  generateOtp,
  normalizePhoneNumber,
};

