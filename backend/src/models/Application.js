import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    opportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Opportunity",
      required: true,
    },

    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    coverLetter: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    resumeUrl: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["pending", "shortlisted", "rejected", "accepted"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

applicationSchema.index(
  {
    opportunity: 1,
    applicant: 1,
  },
  {
    unique: true,
  }
);

const Application = mongoose.model("Application", applicationSchema);

export default Application;