import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [80, "Name cannot exceed 80 characters"],
      default: "BN User",
    },

    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },

    usernameLastChangedAt: {
      type: Date,
      default: null,
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },

    mobile: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    password: {
      type: String,
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },

    avatar: {
      type: String,
      default: "",
    },

    coverImage: {
      type: String,
      default: "",
    },

    // Internal one-time validation cache for media referenced by restored
    // accounts. This never appears in the public profile response.
    profileMediaValidation: {
      avatarUrl: {
        type: String,
        default: "",
      },
      coverImageUrl: {
        type: String,
        default: "",
      },
      checkedAt: {
        type: Date,
        default: null,
      },
    },

    headline: {
      type: String,
      maxlength: 320,
      default: "",
    },

    dob: {
      type: Date,
      default: null,
    },

    // Free text on purpose: the onboarding "What are you here to explore?"
    // screen offers fixed chips (Startup, Career, Student, AI & Tech, ...)
    // plus an "Other" chip that opens a custom text input — whatever the
    // person types becomes the saved category verbatim, so this can't be a
    // strict enum. Length-capped and trimmed in profile.controller.js.
    primaryInterest: {
      type: String,
      maxlength: 60,
      default: "",
    },

    onboardingCompleted: {
      type: Boolean,
      default: false,
    },

    bio: {
      type: String,
      maxlength: 500,
      default: "",
    },

    field: {
      type: String,
      enum: [
        "Tech",
        "Fitness",
        "Beauty",
        "Design",
        "Creators",
        "Hospitality",
        "Business",
        "Education",
        "Healthcare",
        "Other",
      ],
      default: "Other",
    },

    role: {
      type: String,
      enum: [
        "Student",
        "Professional",
        "Freelancer",
        "Founder",
        "Creator",
        "Business Owner",
        "Worker",
      ],
      default: "Student",
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other", "Prefer not to say", ""],
      default: "",
    },

    location: {
      city: {
        type: String,
        default: "",
      },
      state: {
        type: String,
        default: "",
      },
      country: {
        type: String,
        default: "India",
      },
      coordinates: {
        lat: {
          type: Number,
          default: null,
        },
        lng: {
          type: Number,
          default: null,
        },
      },
    },

    experience: [
      {
        title: {
          type: String,
          trim: true,
          default: "",
        },

        company: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Company",
          default: null,
        },

        organisation: {
          type: String,
          trim: true,
          default: "",
        },

        companyLogo: {
          type: String,
          default: "",
        },

        companyDomain: {
          type: String,
          default: "",
        },

        companyEmail: {
          type: String,
          default: "",
        },

        employmentType: {
          type: String,
          enum: [
            "",
            "Full-time",
            "Part-time",
            "Self-employed",
            "Freelance",
            "Internship",
            "Trainee",
            "Contract",
            "Founder",
          ],
          default: "",
        },

        location: {
          type: String,
          trim: true,
          default: "",
        },

        locationType: {
          type: String,
          enum: ["", "On-site", "Hybrid", "Remote"],
          default: "",
        },

        startDate: {
          type: Date,
          default: null,
        },

        endDate: {
          type: Date,
          default: null,
        },

        current: {
          type: Boolean,
          default: true,
        },

        summary: {
          type: String,
          maxlength: 2000,
          default: "",
        },

        highlights: [
          {
            type: String,
            trim: true,
          },
        ],

        skills: [
          {
            type: String,
            trim: true,
          },
        ],

        media: [
          {
            url: {
              type: String,
              default: "",
            },
            type: {
              type: String,
              enum: ["image", "video", "file", "link"],
              default: "link",
            },
            title: {
              type: String,
              default: "",
            },
            publicId: {
              type: String,
              default: "",
            },
          },
        ],
      },
    ],

    education: [
      {
        college: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "College",
          default: null,
        },

        collegeName: {
          type: String,
          trim: true,
          default: "",
        },

        collegeLogo: {
          type: String,
          default: "",
        },

        degree: {
          type: String,
          trim: true,
          default: "",
        },

        stream: {
          type: String,
          trim: true,
          default: "",
        },

        collegeCity: {
          type: String,
          default: "",
        },

        collegeState: {
          type: String,
          default: "",
        },

        startDate: {
          type: Date,
          default: null,
        },

        endDate: {
          type: Date,
          default: null,
        },

        current: {
          type: Boolean,
          default: true,
        },

        grade: {
          type: String,
          default: "",
        },

        activities: {
          type: String,
          maxlength: 1000,
          default: "",
        },

        description: {
          type: String,
          maxlength: 2000,
          default: "",
        },

        achievements: [
          {
            type: String,
            trim: true,
          },
        ],

        skills: [
          {
            type: String,
            trim: true,
          },
        ],

        media: [
          {
            url: {
              type: String,
              default: "",
            },
            type: {
              type: String,
              enum: ["image", "video", "file", "link"],
              default: "link",
            },
            title: {
              type: String,
              default: "",
            },
            publicId: {
              type: String,
              default: "",
            },
          },
        ],
      },
    ],

    socialLinks: {
      linkedin: {
        type: String,
        default: "",
      },
      instagram: {
        type: String,
        default: "",
      },
      twitter: {
        type: String,
        default: "",
      },
      facebook: {
        type: String,
        default: "",
      },
      youtube: {
        type: String,
        default: "",
      },
      website: {
        type: String,
        default: "",
      },
    },

    skills: [
      {
        name: {
          type: String,
          trim: true,
          required: true,
        },
        level: {
          type: Number,
          min: 1,
          max: 100,
          default: 50,
        },
        verifiedBy: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        ],
        endorsedBy: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        ],
      },
    ],

    portfolio: [
      {
        title: {
          type: String,
          trim: true,
          default: "",
        },
        description: {
          type: String,
          trim: true,
          default: "",
        },
        image: {
          type: String,
          default: "",
        },
        website: {
          type: String,
          default: "",
        },
        github: {
          type: String,
          default: "",
        },
        type: {
          type: String,
          default: "Project",
        },
      },
    ],

    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    circle: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Growth OS referral engine — set once, at account-creation time, from
    // the `ref` (referrer's username) carried through signup by
    // frontend/src/utils/referral.js. Never changes after creation. Kept
    // as a plain ObjectId ref (not a denormalized count) so "Referred N
    // Builders" on a profile is always a live, accurate
    // User.countDocuments({ referredBy: theirId }) rather than a counter
    // that can drift.
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    builderScore: {
      total: {
        type: Number,
        default: 0,
      },
      consistency: {
        type: Number,
        default: 0,
      },
      projects: {
        type: Number,
        default: 0,
      },
      learning: {
        type: Number,
        default: 0,
      },
      network: {
        type: Number,
        default: 0,
      },
      activity: {
        type: Number,
        default: 0,
      },
    },

    stats: {
      followersCount: {
        type: Number,
        default: 0,
      },
      followingCount: {
        type: Number,
        default: 0,
      },
      connectionsCount: {
        type: Number,
        default: 0,
      },
      circleCount: {
        type: Number,
        default: 0,
      },
      profileViews: {
        type: Number,
        default: 0,
      },
      profileClicks: {
        type: Number,
        default: 0,
      },
      savedCount: {
        type: Number,
        default: 0,
      },
      portfolioCount: {
        type: Number,
        default: 0,
      },
      journeyCount: {
        type: Number,
        default: 0,
      },
      businessCount: {
        type: Number,
        default: 0,
      },
      postsCount: {
        type: Number,
        default: 0,
      },
      last24hProfileViews: {
        type: Number,
        default: 0,
      },
    },

    journeyStats: {
      active: {
        type: Number,
        default: 0,
      },
      days: {
        type: Number,
        default: 0,
      },
      wins: {
        type: Number,
        default: 0,
      },
    },

    profileCompletion: {
      basicInfo: {
        type: Boolean,
        default: false,
      },
      skills: {
        type: Boolean,
        default: false,
      },
      education: {
        type: Boolean,
        default: false,
      },
      experience: {
        type: Boolean,
        default: false,
      },
      portfolio: {
        type: Boolean,
        default: false,
      },
      verification: {
        type: Boolean,
        default: false,
      },
    },

    profileCompletionPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    preferences: {
      openToWork: {
        type: Boolean,
        default: false,
      },
      openToFreelance: {
        type: Boolean,
        default: false,
      },
      openToCollab: {
        type: Boolean,
        default: true,
      },
      openToHiring: {
        type: Boolean,
        default: false,
      },
    },

    verification: {
      email: {
        type: Boolean,
        default: false,
      },
      mobile: {
        type: Boolean,
        default: false,
      },
      aadhaar: {
        type: Boolean,
        default: false,
      },
      business: {
        type: Boolean,
        default: false,
      },
      professional: {
        type: Boolean,
        default: false,
      },
    },

    otp: {
      code: {
        type: String,
        select: false,
      },
      expiresAt: {
        type: Date,
        select: false,
      },
    },

    refreshToken: {
      type: String,
      select: false,
    },

    loginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    lockUntil: {
      type: Date,
      select: false,
    },

    lastActiveAt: {
      type: Date,
      default: Date.now,
    },

    isProfileCompleted: {
      type: Boolean,
      default: false,
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    // Set on the single reserved account created via the Google Play
    // review OTP bypass (see auth.controller.js). Purely informational —
    // does not change permissions or app behavior — kept so this account
    // is easy to identify/filter out of analytics and admin user lists.
    isReviewAccount: {
      type: Boolean,
      default: false,
    },

    // Users this account has blocked. Enforced both ways in follow/circle
    // requests, messaging, and feed reads — see userController's blockUser.
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // FCM registration tokens for this user's native app installs — a
    // person can be logged in on more than one device, so this is a list,
    // not a single value. Populated by POST /users/me/push-token (native
    // app only, see frontend/src/utils/pushNotifications.js). Read by
    // push.service.js every time a notification is created (see
    // socket.js's emitNotification) to also fire a native push alongside
    // the existing socket event. Tokens Firebase reports as
    // unregistered/invalid are pruned from this array automatically.
    pushTokens: [
      {
        type: String,
      },
    ],

    reports: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        reason: {
          type: String,
          trim: true,
          maxlength: 500,
          default: "Inappropriate behavior",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Partial unique index: only enforces uniqueness when `email` is an actual
// string (excludes both missing AND explicit-null values). A plain
// `sparse: true` field-level index would only exclude documents where
// `email` is completely absent, not documents where it's present-but-null,
// which is what caused duplicate-key errors for `email: null` in production.
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: "string" } } }
);

userSchema.index({ createdAt: 1 });
userSchema.index({ "location.city": 1 });
userSchema.index({ field: 1 });
userSchema.index({ role: 1 });
userSchema.index({ gender: 1 });
userSchema.index({ isDeleted: 1 });
userSchema.index({ followers: 1 });
userSchema.index({ following: 1 });
userSchema.index({ circle: 1 });
userSchema.index({ blockedUsers: 1 });
userSchema.index({ "skills.name": 1 });
userSchema.index({ "experience.company": 1 });
userSchema.index({ "experience.organisation": 1 });
userSchema.index({ "education.college": 1 });
userSchema.index({ "education.collegeName": 1 });

userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.password) return false;
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.isAccountLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

const User = mongoose.model("User", userSchema);

export default User;
