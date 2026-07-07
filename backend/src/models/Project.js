import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },

    coverImage: {
      type: String,
      default: "",
    },

    category: {
      type: String,
      trim: true,
      default: "",
    },

    stage: {
      type: String,
      enum: ["idea", "building", "launched", "growing", "paused"],
      default: "idea",
    },

    techStack: [String],
    tags: [String],

    websiteUrl: {
      type: String,
      default: "",
    },

    githubUrl: {
      type: String,
      default: "",
    },

    followersCount: {
      type: Number,
      default: 0,
    },

    updatesCount: {
      type: Number,
      default: 0,
    },

    isPublic: {
      type: Boolean,
      default: true,
    },
impressionsCount: {
  type: Number,
  default: 0,
},
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

projectSchema.index({
  title: "text",
  description: "text",
  tags: "text",
  techStack: "text",
});


projectSchema.index({ createdAt: -1 });

export default mongoose.model("Project", projectSchema);