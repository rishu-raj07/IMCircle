import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["owner"],
      default: "owner",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    otp: {
      attempts: {
        type: Number,
        default: 0,
        select: false,
      },
      lastSentAt: {
        type: Date,
        default: null,
        select: false,
      },
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    lastLoginIp: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Admin", adminSchema);
