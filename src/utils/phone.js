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

// Format phone number for display (2348071813757 -> 08071813757)
const formatPhoneNumberForDisplay = (phoneNumber = "") => {
  if (!phoneNumber) return "";
  
  const digitsOnly = phoneNumber.toString().replace(/\D/g, "");
  
  if (digitsOnly.startsWith("234")) {
    return `0${digitsOnly.slice(3)}`;
  }
  
  if (digitsOnly.startsWith("0")) {
    return digitsOnly;
  }
  
  if (digitsOnly.length === 10) {
    return `0${digitsOnly}`;
  }
  
  return phoneNumber;
};

module.exports = {
  hashValue,
  generateOtp,
  normalizePhoneNumber,
  formatPhoneNumberForDisplay,
};

