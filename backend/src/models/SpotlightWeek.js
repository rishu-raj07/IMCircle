import mongoose from "mongoose";

// One document per ISO week (e.g. "2026-W29"). `status` starts "draft" the
// moment generation runs so an admin can review/edit winners before the
// week goes live — public GET /spotlight/current and the archive list only
// ever return status: "published" weeks.
const spotlightWeekSchema = new mongoose.Schema(
  {
    weekKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    weekNumber: {
      type: Number,
      required: true,
    },

    year: {
      type: Number,
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },

    generatedAt: {
      type: Date,
      default: null,
    },

    publishedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

spotlightWeekSchema.index({ status: 1, startDate: -1 });

export default mongoose.model("SpotlightWeek", spotlightWeekSchema);
