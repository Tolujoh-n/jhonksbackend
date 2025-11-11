const axios = require("axios");

const getTermiiConfig = () => {
  const { TERMII_API_KEY, TERMII_SENDER_ID } = process.env;

  if (!TERMII_API_KEY) {
    throw new Error("TERMII_API_KEY is missing. Please add your Termii API key to config.env.");
  }

  const senderId = (TERMII_SENDER_ID || "").trim();

  if (!senderId) {
    throw new Error(
      "TERMII_SENDER_ID is missing. Termii requires a registered sender name or phone number. Please set TERMII_SENDER_ID in config.env."
    );
  }

  return {
    apiKey: TERMII_API_KEY,
    senderId,
    channel: process.env.TERMII_SMS_CHANNEL || "generic",
    smsUrl:
      process.env.TERMII_SMS_URL ||
      "https://v3.api.termii.com/api/sms/send",
  };
};

const sendTermiiSms = async ({ smsUrl, payload }) => {
  await axios.post(smsUrl, payload, {
    headers: {
      "Content-Type": "application/json",
    },
    timeout: 10000,
  });
};

exports.sendPhoneVerificationOtp = async ({ phoneNumber, otp }) => {
  const { apiKey, senderId, channel, smsUrl } = getTermiiConfig();

  const message = `Your Jhonks verification code is ${otp}. It expires in 10 minutes, Jhonks LTD.`;

  const payload = {
    api_key: apiKey,
    to: phoneNumber,
    sms: message,
    type: "plain",
    channel,
    from: senderId,
  };

  try {
    await sendTermiiSms({ smsUrl, payload });
  } catch (error) {
    const messageDetails =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.response?.data?.errors?.join(", ") ||
      error.message;

    console.error("Termii SMS error:", messageDetails);
    throw new Error(
      "We could not send the verification code right now. Please try again shortly."
    );
  }
};


