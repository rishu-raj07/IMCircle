import CompanyDirectory from "../models/meta/CompanyDirectory.js";
import CollegeDirectory from "../models/meta/CollegeDirectory.js";
import LocationDirectory from "../models/meta/LocationDirectory.js";
import SkillDirectory from "../models/meta/SkillDirectory.js";
import DegreeDirectory from "../models/meta/DegreeDirectory.js";
import IndustryDirectory from "../models/meta/IndustryDirectory.js";

const escapeRegex = (value = "") => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const getQuery = (req) => {
  return String(req.query.q || "").trim();
};

const searchDirectory = async ({
  req,
  res,
  Model,
  responseKey,
  selectFields,
}) => {
  try {
    const q = getQuery(req);

    if (q.length < 2) {
      return res.status(200).json({
        success: true,
        [responseKey]: [],
      });
    }

    const limit = Math.min(Number(req.query.limit) || 25, 50);
    const regex = new RegExp(escapeRegex(q), "i");

    const items = await Model.find({
      isActive: { $ne: false },
      $or: [{ name: regex }, { searchText: regex }],
    })
      .select(selectFields)
      .sort({ priority: -1, name: 1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      [responseKey]: items,
    });
  } catch (error) {
    console.error(`${responseKey} search error:`, error);

    return res.status(500).json({
      success: false,
      message: `${responseKey} search failed`,
    });
  }
};

export const searchCompanies = (req, res) => {
  return searchDirectory({
    req,
    res,
    Model: CompanyDirectory,
    responseKey: "companies",
    selectFields: "name industry type website logoUrl",
  });
};

export const searchColleges = (req, res) => {
  return searchDirectory({
    req,
    res,
    Model: CollegeDirectory,
    responseKey: "colleges",
    selectFields: "name city state type website",
  });
};

export const searchLocations = (req, res) => {
  return searchDirectory({
    req,
    res,
    Model: LocationDirectory,
    responseKey: "locations",
    selectFields: "name district state country type",
  });
};

export const searchSkills = (req, res) => {
  return searchDirectory({
    req,
    res,
    Model: SkillDirectory,
    responseKey: "skills",
    selectFields: "name category",
  });
};

export const searchDegrees = (req, res) => {
  return searchDirectory({
    req,
    res,
    Model: DegreeDirectory,
    responseKey: "degrees",
    selectFields: "name type",
  });
};

export const searchIndustries = (req, res) => {
  return searchDirectory({
    req,
    res,
    Model: IndustryDirectory,
    responseKey: "industries",
    selectFields: "name category",
  });
};

export const createCompany = async (req, res) => {
  try {
    const { name, domain, email, logoUrl } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Company name is required",
      });
    }

    const cleanName = name.trim();

    let company = await CompanyDirectory.findOne({
      name: { $regex: new RegExp(`^${cleanName}$`, "i") },
    });

    if (company) {
      return res.status(200).json({
        success: true,
        message: "Company already exists",
        company,
      });
    }

    company = await CompanyDirectory.create({
      name: cleanName,
      website: domain?.trim() || "",
      email: email?.trim() || "",
      logoUrl: logoUrl || "",
      type: "Company",
      priority: 1,
      isActive: true,
      searchText: `${cleanName} ${domain || ""} ${email || ""}`.toLowerCase(),
    });

    return res.status(201).json({
      success: true,
      message: "Company added successfully",
      company,
    });
  } catch (error) {
    console.error("Create company error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add company",
    });
  }
};