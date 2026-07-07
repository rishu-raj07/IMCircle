import jwt from "jsonwebtoken";
import User from "../models/User.js";

const getAccessSecret = () => {
  return process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
};

export const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Please login.",
      });
    }

    const accessSecret = getAccessSecret();

    if (!accessSecret) {
      return res.status(500).json({
        success: false,
        message: "JWT access secret is missing in .env",
      });
    }

    const decoded = jwt.verify(token, accessSecret);

    const user = await User.findById(decoded.id).select(
      "-password -refreshToken -otp.code -otp.expiresAt"
    );

    if (!user || user.isDeleted || user.isBlocked) {
      return res.status(401).json({
        success: false,
        message: "User not found or account unavailable.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    // Expired/invalid tokens are routine (every logged-out or stale
    // session hits this) — not worth logging per-request in production.
    // Never echo the raw jwt library message back to the client either.
    if (process.env.NODE_ENV !== "production") {
      console.error("JWT verify failed:", error.name, error.message);
    }

    return res.status(401).json({
      success: false,
      message: "Invalid or expired session. Please log in again.",
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Please login.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to access this route.",
      });
    }

    next();
  };
};