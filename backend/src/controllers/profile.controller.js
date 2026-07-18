import User from "../models/User.js";
import { getSignupRankBadge } from "../utils/badges.js";
import { hideContentForDeletedAccount } from "../utils/accountDeletion.js";
import { repairMissingProfileMedia } from "../utils/profileMediaRepair.js";

const USER_PUBLIC_FIELDS =
  "fullName name username headline bio avatar profileImage profilePicture picture photo location field role gender verification stats";

const cleanString = (value, max = 120) => {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, max);
};

const cleanCoordinates = (location) => {
  const lat = Number(location?.lat ?? location?.coordinates?.lat);
  const lng = Number(location?.lng ?? location?.coordinates?.lng);

  const validLat = Number.isFinite(lat) && lat >= -90 && lat <= 90;
  const validLng = Number.isFinite(lng) && lng >= -180 && lng <= 180;

  if (!validLat || !validLng) return { lat: null, lng: null };

  return { lat, lng };
};

const cleanLocation = (location) => {
  if (!location) {
    return { city: "", state: "", country: "India", coordinates: { lat: null, lng: null } };
  }

  if (typeof location === "string") {
    const parts = location.split(",").map((item) => item.trim());

    return {
      city: parts[0] || "",
      state: parts[1] || "",
      country: parts[2] || "India",
      coordinates: { lat: null, lng: null },
    };
  }

  return {
    city: cleanString(location.city || location.name || "", 80),
    state: cleanString(location.state || "", 80),
    country: cleanString(location.country || "India", 80),
    coordinates: cleanCoordinates(location),
  };
};

const cleanSkills = (skills) => {
  if (!Array.isArray(skills)) return [];

  return skills
    .map((item) => {
      if (typeof item === "string") {
        return {
          name: cleanString(item, 40),
          level: 50,
        };
      }

      if (typeof item === "object" && item !== null) {
        return {
          name: cleanString(item.name || item.title || item.skill || "", 40),
          level: Math.min(Math.max(Number(item.level) || 50, 1), 100),
        };
      }

      return null;
    })
    .filter((item) => item && item.name && item.name !== "[object Object]")
    .slice(0, 50);
};

const normalizeArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "object") return [value];
  return [];
};

const hasArrayData = (value) => {
  return Array.isArray(value) && value.length > 0;
};

// Profile photo and tagline are optional to SUBMIT profile setup (see
// ProfileSetup.jsx — you can save without them), but they DO count toward
// reaching 100%. Weighting (confirmed with product):
//   Required onboarding fields (name/username/DOB/gender/city/category): 50%
//   Profile photo: 10%    Tagline: 10%    Skills: 10%
//   Student category:      Education 20%, no Experience item at all
//   Everyone else:          Education 10%, Experience 10%
// "Student" is decided ONLY by the primaryInterest category chip the person
// picked on "What are you here to explore?" — NOT the `role` field. `role`
// defaults to "Student" on every brand-new account (see User.js schema
// default) and is unrelated to this onboarding category, so checking it
// here was wrongly exempting every user from Experience regardless of what
// they actually picked.
const isStudentUser = (user) => {
  return String(user.primaryInterest || "").trim().toLowerCase() === "student";
};

// Location and DOB are intentionally NOT part of this check. Location was
// made fully optional in Issue 3 (never required to finish onboarding,
// never blocks 100% profile completion, no validation error when blank).
// DOB is labeled "(optional)" in BasicInfo.jsx's own form UI, but used to
// still be required here — meaning a user who trusted that label and left
// it blank could save successfully but would NEVER pass this check, so
// ProtectedRoute (frontend) kept redirecting them back to /profile-setup
// forever with no way out. Removed to actually match the "(optional)"
// label.
const hasRequiredBasics = (user) => {
  return Boolean(
    user.fullName &&
      user.fullName !== "BN User" &&
      user.username &&
      user.gender &&
      user.primaryInterest
  );
};

const getProfileCompletion = (user) => {
  return {
    basicInfo: hasRequiredBasics(user),
    skills: hasArrayData(user.skills),
    education: hasArrayData(user.education),
    experience: isStudentUser(user) || hasArrayData(user.experience),
    portfolio: hasArrayData(user.portfolio),
    verification: Boolean(user.verification?.mobile || user.verification?.email),
  };
};

const getProfileCompletionPercent = (user) => {
  let percent = 0;
  const student = isStudentUser(user);

  if (hasRequiredBasics(user)) {
    percent += 50;
  }

  if (user.avatar) percent += 10;
  if (user.headline) percent += 10;

  if (hasArrayData(user.education)) {
    percent += student ? 20 : 10;
  }

  if (!student && hasArrayData(user.experience)) {
    percent += 10;
  }

  if (hasArrayData(user.skills)) {
    percent += 10;
  }

  return Math.min(percent, 100);
};

// Mirrors the percent math above as a named checklist so the frontend can
// show exactly what's left ("Profile photo", "Tagline", "Education", ...)
// instead of a bare number.
const getMissingProfileItems = (user) => {
  const missing = [];

  if (!user.avatar) missing.push("Profile photo");
  if (!user.headline) missing.push("Tagline");
  if (!hasArrayData(user.education)) missing.push("Education");
  if (!isStudentUser(user) && !hasArrayData(user.experience)) missing.push("Experience");
  if (!hasArrayData(user.skills)) missing.push("Skills");

  return missing;
};

const getSafeField = (field) => {
  const allowedFields = [
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
  ];

  return allowedFields.includes(field) ? field : "Other";
};

// The fixed onboarding chips (Startup, Career, Student, AI & Tech, ...) are
// just suggestions from the frontend — "Other" opens a custom text field and
// whatever the person types is the real category, so this intentionally
// accepts any cleaned, length-capped string rather than only the fixed list.
const getSafeInterest = (value) => cleanString(value, 60);

const isValidDob = (value) => {
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  if (date > new Date()) return false;

  const ageYears = (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return ageYears >= 13 && ageYears <= 120;
};

const DIACRITIC_MARKS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");

const slugifyUsername = (name) => {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITIC_MARKS_REGEX, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .join("")
    .slice(0, 20);
};

const buildUsernameCandidates = (base) => {
  const safeBase = base || "builder";
  const candidates = new Set([safeBase]);

  for (let i = 0; i < 5; i += 1) {
    const suffix = Math.floor(10 + Math.random() * 890);
    candidates.add(`${safeBase}${suffix}`);
  }

  candidates.add(`${safeBase}_${Math.floor(Math.random() * 99)}`);

  return Array.from(candidates).slice(0, 8);
};

const isValidUsernameFormat = (value) => /^[a-z0-9_]{3,30}$/.test(value);

const buildUserQuery = (userId) => {
  let query = User.findById(userId).select("-password -refreshToken");

  if (User.schema.path("followers")) {
    query = query.populate("followers", USER_PUBLIC_FIELDS);
  }

  if (User.schema.path("following")) {
    query = query.populate("following", USER_PUBLIC_FIELDS);
  }

  if (User.schema.path("circle")) {
    query = query.populate("circle", USER_PUBLIC_FIELDS);
  }

  if (User.schema.path("circles")) {
    query = query.populate("circles", USER_PUBLIC_FIELDS);
  }

  if (User.schema.path("circleUsers")) {
    query = query.populate("circleUsers", USER_PUBLIC_FIELDS);
  }

  return query;
};

export const getProfile = async (req, res) => {
  try {
    const user = await buildUserQuery(req.user._id);

    if (!user || user.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await repairMissingProfileMedia(user);

    // Legacy accounts can already have a username without the timestamp
    // introduced for the 30-day username cooldown. Using account creation
    // time made old accounts appear immediately eligible, so the Change
    // action showed before a real cooldown date existed. Seed the timestamp
    // once and return it in this same response; subsequent requests use the
    // normal persisted 30-day calculation.
    if (user.username && !user.usernameLastChangedAt) {
      const cooldownStartedAt = new Date();
      await User.updateOne(
        { _id: user._id, usernameLastChangedAt: null },
        { $set: { usernameLastChangedAt: cooldownStartedAt } }
      );
      user.usernameLastChangedAt = cooldownStartedAt;
    }

    // Followers/following/circle are raw ObjectId refs, and some can go
    // dangling (the referenced account was deleted). Populate silently
    // turns those into `null` entries at the same array position, which
    // used to render as blank "User" rows with a broken profile link.
    // Prune the dangling ids from the stored arrays here so this self-heals
    // on the next profile load, and drop the nulls from what we return now.
    const rawUser = await User.findById(req.user._id)
      .select("followers following circle")
      .lean();

    const pruneDangling = async (field) => {
      const populated = user[field] || [];
      const raw = rawUser?.[field] || [];

      const danglingIds = populated
        .map((doc, index) => (doc ? null : raw[index]))
        .filter(Boolean);

      if (danglingIds.length > 0) {
        await User.updateOne(
          { _id: user._id },
          { $pull: { [field]: { $in: danglingIds } } }
        );
      }

      user[field] = populated.filter(Boolean);
    };

    await Promise.all(
      ["followers", "following", "circle"].map((field) => pruneDangling(field))
    );

    // Self-heal cached stats counters against the real arrays — a bad
    // decrement (or old data) can leave `stats.xCount` out of sync with the
    // actual followers/following/circle arrays, which are the ground truth
    // since the list pages read straight from them.
    const correctCounts = {
      followersCount: Array.isArray(user.followers) ? user.followers.length : null,
      followingCount: Array.isArray(user.following) ? user.following.length : null,
      circleCount: Array.isArray(user.circle) ? user.circle.length : null,
    };

    const statsUpdate = {};

    for (const [key, correctValue] of Object.entries(correctCounts)) {
      if (correctValue === null) continue;
      if (!user.stats) user.stats = {};
      if (user.stats[key] !== correctValue) {
        user.stats[key] = correctValue;
        statsUpdate[`stats.${key}`] = correctValue;
      }
    }

    if (Object.keys(statsUpdate).length > 0) {
      await User.updateOne({ _id: user._id }, { $set: statsUpdate });
    }

    const { signupRank, rankBadge } = await getSignupRankBadge(user.createdAt);

    const responseUser = user.toObject();
    delete responseUser.profileMediaValidation;

    return res.status(200).json({
      success: true,
      user: responseUser,
      signupRank,
      rankBadge,
      profileCompletionPercent: getProfileCompletionPercent(user),
      missingProfileItems: getMissingProfileItems(user),
    });
  } catch (error) {
    console.error("GET PROFILE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const suggestUsername = async (req, res) => {
  try {
    const rawName = req.query.name || req.user.fullName || "builder";
    const base = slugifyUsername(rawName) || "builder";
    const candidates = buildUsernameCandidates(base);

    const takenDocs = await User.find({
      username: { $in: candidates },
    }).select("username");

    const takenSet = new Set(takenDocs.map((doc) => doc.username));
    let available = candidates.filter((candidate) => !takenSet.has(candidate));

    let attempts = 0;
    while (available.length < 3 && attempts < 10) {
      const suffix = Math.floor(100 + Math.random() * 8900);
      const candidate = `${base}${suffix}`;

      if (!takenSet.has(candidate)) {
        // eslint-disable-next-line no-await-in-loop
        const exists = await User.exists({ username: candidate });

        if (!exists) {
          available.push(candidate);
          takenSet.add(candidate);
        }
      }

      attempts += 1;
    }

    const suggestions = available.slice(0, 5);

    return res.status(200).json({
      success: true,
      suggestions,
      recommended: suggestions[0] || `${base}${Date.now().toString().slice(-4)}`,
    });
  } catch (error) {
    console.error("SUGGEST USERNAME ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to suggest a username",
    });
  }
};

export const checkUsername = async (req, res) => {
  try {
    const username = String(req.query.username || "").trim().toLowerCase();

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }

    if (!isValidUsernameFormat(username)) {
      return res.status(200).json({
        success: true,
        available: false,
        message: "Use 3-30 letters, numbers or underscore only",
      });
    }

    const existingUser = await User.findOne({
      username,
      _id: { $ne: req.user._id },
    });

    return res.status(200).json({
      success: true,
      available: !existingUser,
      message: existingUser
        ? "This username is already registered"
        : "Username is available",
    });
  } catch (error) {
    console.error("CHECK USERNAME ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to check username",
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const updates = {};

    if (req.body.fullName !== undefined) {
      updates.fullName = cleanString(req.body.fullName, 80);
    }

    const USERNAME_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

    if (req.body.username !== undefined) {
      const candidateUsername = cleanString(req.body.username, 30).toLowerCase();

      if (candidateUsername) {
        if (!isValidUsernameFormat(candidateUsername)) {
          return res.status(400).json({
            success: false,
            message: "Username must be 3-30 characters: letters, numbers or underscore only",
          });
        }

        const currentUsername = (req.user.username || "").toLowerCase();
        const isChangingUsername = candidateUsername !== currentUsername;

        if (isChangingUsername) {
          if (currentUsername && req.body.usernameChangeConfirmed !== true) {
            return res.status(400).json({
              success: false,
              message: "Press Change before updating your username.",
            });
          }

          const lastUsernameChangeAt = req.user.usernameLastChangedAt || req.user.createdAt;

          if (currentUsername && lastUsernameChangeAt) {
            const nextAllowedAt = new Date(
              new Date(lastUsernameChangeAt).getTime() +
                USERNAME_COOLDOWN_MS
            );

            if (nextAllowedAt > new Date()) {
              return res.status(400).json({
                success: false,
                message: `Username can only be changed once every 30 days. Try again on ${nextAllowedAt.toDateString()}.`,
                nextUsernameChangeAt: nextAllowedAt,
              });
            }
          }

          updates.usernameLastChangedAt = new Date();
        }

        updates.username = candidateUsername;
      }
    }

    if (req.body.headline !== undefined) {
      updates.headline = cleanString(req.body.headline, 320);
    }

    if (req.body.bio !== undefined) {
      updates.bio = cleanString(req.body.bio, 500);
    }

    if (req.body.dob !== undefined) {
      if (req.body.dob && !isValidDob(req.body.dob)) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid date of birth (you must be at least 13 years old)",
        });
      }

      updates.dob = req.body.dob ? new Date(req.body.dob) : null;
    }

    if (req.body.primaryInterest !== undefined) {
      updates.primaryInterest = getSafeInterest(
        cleanString(req.body.primaryInterest, 40)
      );
    }

    if (req.body.field !== undefined) {
      updates.field = getSafeField(cleanString(req.body.field, 120));
    }

    if (req.body.role !== undefined) {
      updates.role = cleanString(req.body.role, 60);
    }

    if (req.body.gender !== undefined) {
      updates.gender = cleanString(req.body.gender, 30);
    }

    if (req.body.location !== undefined) {
      updates.location = cleanLocation(req.body.location);
    }

    if (req.body.avatar !== undefined) {
      updates.avatar = cleanString(req.body.avatar, 500);
    }

    if (req.body.profileImage !== undefined) {
      updates.avatar = cleanString(req.body.profileImage, 500);
    }

    if (req.body.coverImage !== undefined) {
      updates.coverImage = cleanString(req.body.coverImage, 500);
    }

    if (req.body.skills !== undefined) {
      updates.skills = cleanSkills(req.body.skills);
    }

    if (req.body.experience !== undefined) {
      updates.experience = normalizeArray(req.body.experience);
    }

    if (req.body.education !== undefined) {
      updates.education = normalizeArray(req.body.education);
    }

    if (req.body.socialLinks !== undefined) {
      updates.socialLinks =
        typeof req.body.socialLinks === "object" && req.body.socialLinks !== null
          ? req.body.socialLinks
          : {};
    }

    if (req.body.portfolio !== undefined) {
      updates.portfolio = Array.isArray(req.body.portfolio)
        ? req.body.portfolio
        : [];
    }

    if (req.body.preferences !== undefined) {
      updates.preferences =
        typeof req.body.preferences === "object" && req.body.preferences !== null
          ? req.body.preferences
          : {};
    }

    if (updates.username) {
      const existingUser = await User.findOne({
        username: updates.username,
        _id: { $ne: req.user._id },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Username already taken",
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser || updatedUser.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const profileCompletion = getProfileCompletion(updatedUser);
    const profileCompletionPercent = getProfileCompletionPercent(updatedUser);

    // Profile photo and tagline are optional (Task: "Keep profile image and
    // tagline optional") — onboarding is done once the fields that are still
    // actually required are filled in. Missing photo/tagline no longer blocks
    // a person from finishing setup or from reaching 100% completion.
    const onboardingCompleted = hasRequiredBasics(updatedUser);

    await User.findByIdAndUpdate(
      req.user._id,
      {
        profileCompletion,
        profileCompletionPercent,
        isProfileCompleted: profileCompletionPercent === 100,
        field: getSafeField(updatedUser.field),
        onboardingCompleted:
          onboardingCompleted || Boolean(updatedUser.onboardingCompleted),
      },
      {
        new: true,
        runValidators: false,
      }
    );

    const freshUser = await buildUserQuery(req.user._id);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: freshUser,
      profileCompletionPercent,
      missingProfileItems: getMissingProfileItems(updatedUser),
    });
  } catch (error) {
    console.error("UPDATE PROFILE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const updateOpenToWork = async (req, res) => {
  try {
    const { openToWork } = req.body;

    await User.findByIdAndUpdate(
      req.user._id,
      {
        "preferences.openToWork": Boolean(openToWork),
      },
      { new: true }
    );

    const freshUser = await buildUserQuery(req.user._id);

    return res.status(200).json({
      success: true,
      message: "Open To Work updated",
      user: freshUser,
    });
  } catch (error) {
    console.error("OPEN TO WORK ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const updateOpenToHiring = async (req, res) => {
  try {
    const { openToHiring } = req.body;

    await User.findByIdAndUpdate(
      req.user._id,
      {
        "preferences.openToHiring": Boolean(openToHiring),
      },
      { new: true }
    );

    const freshUser = await buildUserQuery(req.user._id);

    return res.status(200).json({
      success: true,
      message: "Open To Hiring updated",
      user: freshUser,
    });
  } catch (error) {
    console.error("OPEN TO HIRING ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const deleteProfile = async (req, res) => {
  try {
    await hideContentForDeletedAccount(req.user._id);

    await User.findByIdAndUpdate(req.user._id, {
      isDeleted: true,
    });

    return res.status(200).json({
      success: true,
      message: "Account and related content deleted successfully",
    });
  } catch (error) {
    console.error("DELETE PROFILE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};
