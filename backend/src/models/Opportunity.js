import mongoose from "mongoose";

const opportunitySchema = new mongoose.Schema(
  {
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    description: {
      type: String,
      required: true,
      maxlength: 5000,
    },

    type: {
      type: String,
      enum: ["job", "freelance", "internship", "founder-hiring"],
      required: true,
    },

    companyName: {
      type: String,
      trim: true,
      default: "",
    },

    location: {
      type: String,
      trim: true,
      default: "Remote",
    },

    workMode: {
      type: String,
      enum: ["remote", "hybrid", "onsite"],
      default: "remote",
    },

    experienceLevel: {
      type: String,
      enum: ["fresher", "junior", "mid", "senior"],
      default: "fresher",
    },

    skills: [String],

    salaryMin: {
      type: Number,
      default: 0,
    },

    salaryMax: {
      type: Number,
      default: 0,
    },

    applicationDeadline: Date,

    applicationsCount: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
    impressionsCount: {
  type: Number,
  default: 0,
},
  },
  {
    timestamps: true,
  }
);

opportunitySchema.index({ title: "text", description: "text" });
opportunitySchema.index({ type: 1 });
opportunitySchema.index({ creator: 1 });

const Opportunity = mongoose.model("Opportunity", opportunitySchema);

export default Opportunity;