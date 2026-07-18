import mongoose from "mongoose";
import crypto from "crypto";

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    refreshTokenHash: {
      type: String,
      required: true,
      index: true,
    },

    // Refresh-token-reuse grace period (see refreshToken() in
    // auth.controller.js). Rotation happens on every refresh, so two
    // requests that both start with the same (still-valid) refresh token —
    // e.g. two tabs, or a background push-token-registration call racing
    // the main app's own refresh right when the 15-minute access token
    // expires — will have the SECOND one arrive with a token that's already
    // been rotated away by the FIRST. Without tracking one generation back,
    // that legitimate race looks identical to actual token theft and gets
    // the whole session revoked, forcing a real logout for no real reason.
    previousRefreshTokenHash: {
      type: String,
      default: null,
    },

    rotatedAt: Date,

    deviceId: {
      type: String,
      required: true,
      index: true,
    },

    deviceName: {
      type: String,
      default: "Unknown Device",
    },

    ipAddress: {
      type: String,
      default: "",
    },

    userAgent: {
      type: String,
      default: "",
    },

    location: {
      country: String,
      city: String,
      region: String,
    },

    isTrusted: {
      type: Boolean,
      default: false,
    },

    isRevoked: {
      type: Boolean,
      default: false,
    },

    revokedAt: Date,

    lastUsedAt: {
      type: Date,
      default: Date.now,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

sessionSchema.statics.hashToken = function (token) {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const Session = mongoose.model("Session", sessionSchema);

export default Session;