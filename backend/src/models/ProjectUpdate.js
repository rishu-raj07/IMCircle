import mongoose from "mongoose";

const projectUpdateSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

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
      maxlength: 150,
    },

    content: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },

    type: {
      type: String,
      enum: ["update", "launch", "milestone", "problem", "learning"],
      default: "update",
    },

    media: [
      {
        url: String,
        type: {
          type: String,
          enum: ["image", "video", "file"],
        },
        publicId: String,
      },
    ],

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

projectUpdateSchema.index({ project: 1, createdAt: -1 });

export default mongoose.model("ProjectUpdate", projectUpdateSchema);