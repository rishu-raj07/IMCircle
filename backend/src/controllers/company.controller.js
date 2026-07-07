import Company from "../models/Company.js";
import CompanyDirectory from "../models/meta/CompanyDirectory.js";

function makeSlug(value = "") {
  return value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const searchCompanies = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();

    if (q.length < 2) {
      return res.status(200).json({ success: true, companies: [] });
    }

    const regex = new RegExp(q, "i");

    const [companies, directory] = await Promise.all([
      Company.find({
        isDeleted: false,
        isActive: true,
        $or: [
          { name: regex },
          { searchText: regex },
          { domain: regex },
          { website: regex },
          { industry: regex },
        ],
      })
        .select("name slug logo website domain email industry type location isVerified")
        .limit(10),

      CompanyDirectory.find({
        $or: [{ name: regex }, { website: regex }, { email: regex }],
      })
        .select("name slug logo website email")
        .limit(10),
    ]);

    const normalizedDirectory = directory.map((item) => ({
      _id: item._id,
      name: item.name,
      slug: item.slug,
      logo: item.logo,
      website: item.website,
      email: item.email,
      source: "directory",
    }));

    res.status(200).json({
      success: true,
      companies: [...companies, ...normalizedDirectory],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const createCompany = async (req, res) => {
  try {
    const {
      name,
      website = "",
      domain = "",
      email = "",
      industry = "",
      companySize = "",
      type = "Company",
      location = {},
      description = "",
      logo = {},
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Company name is required",
      });
    }

    const slug = makeSlug(name);

    let company = await Company.findOne({
      $or: [{ slug }, { name: new RegExp(`^${name.trim()}$`, "i") }],
      isDeleted: false,
    });

    if (company) {
      return res.status(200).json({ success: true, company });
    }

    company = await Company.create({
      name: name.trim(),
      slug,
      website,
      domain,
      email,
      industry,
      companySize,
      type,
      location,
      description,
      logo,
      createdBy: req.user?._id || null,
      admins: req.user?._id ? [req.user._id] : [],
      isClaimed: Boolean(req.user?._id),
    });

    res.status(201).json({ success: true, company });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const getCompanyBySlug = async (req, res) => {
  try {
    const company = await Company.findOne({
      slug: req.params.slug,
      isDeleted: false,
    }).populate("createdBy", "fullName username avatar headline");

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    res.status(200).json({ success: true, company });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};