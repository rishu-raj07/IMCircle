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

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
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

    website: {
      type: String,
      trim: true,
      default: "",
    },

    domain: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
      index: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    industry: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    companySize: {
      type: String,
      enum: [
        "",
        "1-10",
        "11-50",
        "51-200",
        "201-500",
        "501-1000",
        "1001-5000",
        "5001-10000",
        "10000+",
      ],
      default: "",
    },

    type: {
      type: String,
      enum: [
        "Startup",
        "Company",
        "Agency",
        "Small Business",
        "NGO",
        "Government",
        "Self Employed",
        "Other",
      ],
      default: "Company",
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
      employeesCount: { type: Number, default: 0 },
      postsCount: { type: Number, default: 0 },
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

companySchema.pre("save", function () {
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
    this.domain,
    this.website,
    this.email,
    this.industry,
    this.type,
    locationText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .trim();
});

companySchema.index({ name: "text", searchText: "text" });

const Company = mongoose.model("Company", companySchema);

export default Company;