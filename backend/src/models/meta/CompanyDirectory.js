// backend/src/models/meta/CompanyDirectory.js

import mongoose from "mongoose";

const companyDirectorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    slug: {
      type: String,
      unique: true,
      index: true,
    },

    website: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    logo: {
      url: { type: String, default: "" },
      public_id: { type: String, default: "" },
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

function makeSlug(value = "") {
  return value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

companyDirectorySchema.pre("save", function () {
  if (!this.slug && this.name) {
    this.slug = makeSlug(this.name);
  }
});

export default mongoose.model("CompanyDirectory", companyDirectorySchema);