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

const COMPANY_TYPES = [
  "Startup",
  "Company",
  "Agency",
  "Small Business",
  "NGO",
  "Government",
  "Self Employed",
  "Other",
];

const COMPANY_SIZES = [
  "",
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1001-5000",
  "5001-10000",
  "10000+",
];

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

function normalizeDomain(value = "", website = "") {
  const raw = String(value || "").trim().toLowerCase();

  if (raw) {
    try {
      const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      return new URL(withProtocol).hostname.replace(/^www\./i, "").toLowerCase();
    } catch {
      // fall through to website-based inference
    }
  }

  if (website) {
    try {
      const withProtocol = /^https?:\/\//i.test(website) ? website : `https://${website}`;
      return new URL(withProtocol).hostname.replace(/^www\./i, "").toLowerCase();
    } catch {
      return "";
    }
  }

  return "";
}

function normalizeEmail(value = "") {
  const text = String(value || "").trim().toLowerCase();
  if (!text || !/^\S+@\S+\.\S+$/.test(text)) return "";
  return text;
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

    // Only name is required — website/domain/email/industry/company size are
    // all optional. The email's domain is inferred by the frontend (from the
    // website, or the company name) and is never hand-typed, but we still
    // re-derive it here defensively in case the domain field is missing.
    if (!name?.trim() || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Company name is required",
      });
    }

    const trimmedName = name.trim().slice(0, 120);
    const safeWebsite = normalizeWebsite(website);
    const safeDomain = normalizeDomain(domain, safeWebsite);
    const safeEmail = normalizeEmail(email);
    const safeType = COMPANY_TYPES.includes(type) ? type : "Company";
    const safeCompanySize = COMPANY_SIZES.includes(companySize) ? companySize : "";
    const slug = makeSlug(trimmedName);

    // Avoid duplicates by normalized name OR domain — "IMCircle" and
    // "imcircle" (or two pages that both resolve to imcircle.com) should
    // collapse into the same company page instead of forking.
    const dedupeConditions = [
      { slug },
      { name: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    ];

    if (safeDomain) {
      dedupeConditions.push({ domain: safeDomain });
    }

    let company = await Company.findOne({
      $or: dedupeConditions,
      isDeleted: false,
    });

    if (company) {
      return res.status(200).json({ success: true, company });
    }

    company = await Company.create({
      name: trimmedName,
      slug,
      website: safeWebsite,
      domain: safeDomain,
      email: safeEmail,
      industry: String(industry || "").trim().slice(0, 80),
      companySize: safeCompanySize,
      type: safeType,
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