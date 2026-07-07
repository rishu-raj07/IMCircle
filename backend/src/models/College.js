import mongoose from "mongoose";

function makeSlug(value = "") {
  return value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const collegeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
      index: true,
    },

    slug: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    logo: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },

    coverImage: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },

    type: {
      type: String,
      enum: ["School", "College", "University", "Institute", "Other"],
      default: "College",
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

    location: {
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      country: { type: String, default: "India" },
      fullAddress: { type: String, default: "" },
    },

    description: {
      type: String,
      maxlength: 1000,
      default: "",
    },

    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    stats: {
      followersCount: { type: Number, default: 0 },
      studentsCount: { type: Number, default: 0 },
      alumniCount: { type: Number, default: 0 },
      profileViews: { type: Number, default: 0 },
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    isClaimed: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    searchText: {
      type: String,
      index: true,
    },
  },
  { timestamps: true }
);

collegeSchema.pre("save", function () {
  if (!this.slug && this.name) {
    this.slug = makeSlug(this.name);
  }

  const locationText = [
    this.location?.city,
    this.location?.state,
    this.location?.country,
  ]
    .filter(Boolean)
    .join(" ");

  this.searchText = [
    this.name,
    this.type,
    this.website,
    this.email,
    locationText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .trim();
});

collegeSchema.index({ name: "text", searchText: "text" });

const College = mongoose.model("College", collegeSchema);

export default College;