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