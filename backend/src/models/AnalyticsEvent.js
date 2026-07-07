import mongoose from "mongoose";

const analyticsEventSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    eventName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    entityType: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    device: {
      platform: String,
      browser: String,
      os: String,
      userAgent: String,
    },
    ip: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

analyticsEventSchema.index({ createdAt: -1 });
analyticsEventSchema.index({ eventName: 1, createdAt: -1 });
analyticsEventSchema.index({ sessionId: 1, createdAt: 1 });

export default mongoose.model("AnalyticsEvent", analyticsEventSchema);
