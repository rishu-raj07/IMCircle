import College from "../models/College.js";
import CollegeDirectory from "../models/meta/CollegeDirectory.js";

function makeSlug(value = "") {
  return value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "College name is required",
      });
    }

    const slug = makeSlug(name);

    let college = await College.findOne({
      $or: [{ slug }, { name: new RegExp(`^${name.trim()}$`, "i") }],
      isDeleted: false,
    });

    if (college) {
      return res.status(200).json({ success: true, college });
    }

    college = await College.create({
      name: name.trim(),
      slug,
      type,
      website,
      email,
      location,
      description,
      logo,
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