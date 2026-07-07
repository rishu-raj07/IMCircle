import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

const getAdminAccessSecret = () =>
  process.env.ADMIN_JWT_ACCESS_SECRET ||
  process.env.JWT_ACCESS_SECRET ||
  process.env.JWT_SECRET;

export const adminProtect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.adminAccessToken) {
      token = req.cookies.adminAccessToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Admin login required.",
      });
    }

    const secret = getAdminAccessSecret();
    if (!secret) {
      return res.status(500).json({
        success: false,
        message: "Admin JWT secret is missing.",
      });
    }

    const decoded = jwt.verify(token, secret);

    if (decoded.scope !== "admin") {
      return res.status(401).json({
        success: false,
        message: "Invalid admin token.",
      });
    }

    const admin = await Admin.findById(decoded.id).select("-otp.code -otp.expiresAt");

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: "Admin account unavailable.",
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired admin session. Please log in again.",
    });
  }
};
