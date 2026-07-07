import axios from "axios";

// MSG91 keys are backend-only and must never be sent to or read by the
// frontend. See launch/docs/msg91-otp-setup.md for exactly where
// MSG91_AUTH_KEY / MSG91_TEMPLATE_ID / MSG91_SENDER_ID come from in the
// MSG91 dashboard, and which env file to paste them into
// (backend/.env or backend/.env.production).
const MSG91_BASE_URL = "https://control.msg91.com/api/v5/otp";

const getMsg91Config = () => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;

  if (!authKey || !templateId) {
    throw new Error("MSG91_AUTH_KEY or MSG91_TEMPLATE_ID missing in .env");
  }

  return {
    authKey,
    templateId,
    // Optional — only needed if your MSG91 template requires an approved
    // sender ID (some transactional SMS routes do, promotional/OTP routes
    // often don't).
    senderId: process.env.MSG91_SENDER_ID || undefined,
    otpLength: Number(process.env.MSG91_OTP_LENGTH) || 6,
    // MSG91_OTP_EXPIRY_MINUTES is the preferred name; MSG91_OTP_EXPIRY (no
    // "_MINUTES") is still read as a fallback for existing deployments.
    otpExpiry:
      Number(process.env.MSG91_OTP_EXPIRY_MINUTES) ||
      Number(process.env.MSG91_OTP_EXPIRY) ||
      5,
  };
};

export const sendOtpSms = async (mobile) => {
  const { authKey, templateId, senderId, otpLength, otpExpiry } = getMsg91Config();

  const response = await axios.post(
    MSG91_BASE_URL,
    {
      template_id: templateId,
      mobile: `91${mobile}`,
      otp_length: otpLength,
      otp_expiry: otpExpiry,
      ...(senderId ? { sender: senderId } : {}),
    },
    {
      headers: {
        authkey: authKey,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
};

export const verifyOtpSms = async (mobile, otp) => {
  const { authKey } = getMsg91Config();

  const response = await axios.get(`${MSG91_BASE_URL}/verify`, {
    params: {
      mobile: `91${mobile}`,
      otp,
    },
    headers: {
      authkey: authKey,
    },
  });

  return response.data;
};