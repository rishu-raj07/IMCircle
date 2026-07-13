import College from "../models/College.js";
import CollegeDirectory from "../models/meta/CollegeDirectory.js";
import { verifyPublicWebsite } from "../utils/websiteVerification.js";

function makeSlug(value = "") {
  return value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const COLLEGE_TYPES = ["School", "College", "University", "Institute", "Other"];

function normalizeWebsite(value = "") {
  const text = String(value || "").trim();
  if (!text) return "";

  const withProtocol = /^https?:\/\//i.test(text) ? text : `https://${text}`;

  try {
    const url = new URL(withProtocol);
    return `${url.protocol}//${url.hostname.replace(/^www\./i, "")}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    return "";
  }
}

function normalizeEmail(value = "") {
  const text = String(value || "").trim().toLowerCase();
  if (!text || !/^\S+@\S+\.\S+$/.test(text)) return "";
  return text;
}

export const searchColleges = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();

    if (q.length < 2) {
      return res.status(200).json({ success: true, colleges: [] });
    }

    const regex = new RegExp(q, "i");

    const [colleges, directory] = await Promise.all([
      College.find({
        isDeleted: false,
        isActive: true,
        $or: [
          { name: regex },
          { searchText: regex },
          { type: regex },
          { website: regex },
          { "location.city": regex },
          { "location.state": regex },
        ],
      })
        .select("name slug logo type website location isVerified")
        .limit(10),

      CollegeDirectory.find({
        isActive: true,
        $or: [
          { name: regex },
          { searchText: regex },
          { city: regex },
          { state: regex },
          { type: regex },
        ],
      })
        .select("name city state type website")
        .limit(10),
    ]);

    const normalizedDirectory = directory.map((item) => ({
      _id: item._id,
      name: item.name,
      type: item.type,
      website: item.website,
      location: {
        city: item.city || "",
        state: item.state || "",
        country: "India",
      },
      source: "directory",
    }));

    res.status(200).json({
      success: true,
      colleges: [...colleges, ...normalizedDirectory],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const createCollege = async (req, res) => {
  try {
    const {
      name,
      type = "College",
      website = "",
      email = "",
      location = {},
      description = "",
      logo = {},
    } = req.body;

    // Only name is truly required — type/website/email/logo/city/state are
    // all optional per the "Add school/college" flow spec.
    if (!name?.trim() || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "School / college name is required",
      });
    }

    const safeType = COLLEGE_TYPES.includes(type) ? type : "College";
    const safeWebsite = normalizeWebsite(website);
    const safeEmail = normalizeEmail(email);
    const trimmedName = name.trim().slice(0, 150);
    const slug = makeSlug(trimmedName);

    // Case-insensitive dedupe by name (and slug, which is itself a
    // normalized/lowercased form of the name) so "IIT Delhi", "iit delhi"
    // and "IIT   Delhi" all resolve to the same college instead of creating
    // duplicates the next person can't find.
    let college = await College.findOne({
      $or: [{ slug }, { name: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }],
      isDeleted: false,
    });

    if (college) {
      return res.status(200).json({ success: true, college });
    }

    college = await College.create({
      name: trimmedName,
      slug,
      type: safeType,
      website: safeWebsite,
      email: safeEmail,
      location: {
        city: String(location?.city || "").trim().slice(0, 80),
        state: String(location?.state || "").trim().slice(0, 80),
        country: String(location?.country || "India").trim().slice(0, 80) || "India",
      },
      description: String(description || "").trim().slice(0, 1000),
      logo: {
        url: logo?.url || "",
        publicId: logo?.publicId || "",
      },
      createdBy: req.user?._id || null,
      admins: req.user?._id ? [req.user._id] : [],
      isClaimed: Boolean(req.user?._id),
    });

    res.status(201).json({ success: true, college });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const getCollegeBySlug = async (req, res) => {
  try {
    const college = await College.findOne({
      slug: req.params.slug,
      isDeleted: false,
    }).populate("createdBy", "fullName username avatar headline");

    if (!college) {
      return res.status(404).json({
        success: false,
        message: "College not found",
      });
    }

    res.status(200).json({ success: true, college });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const verifyCollegeWebsite = async (req, res) => {
  try {
    const verification = await verifyPublicWebsite(req.body?.website);
    res.status(200).json({ success: true, verification });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error?.message || "This website could not be verified.",
    });
  }
};
