import Opportunity from "../models/Opportunity.js";
import Application from "../models/Application.js";
import { addBuilderScore } from "../services/builderScore.service.js";

// Only these fields are ever settable by the poster directly — counts
// (applicationsCount/impressionsCount), isActive/isDeleted, and creator
// itself must never come from the request body.
const EDITABLE_OPPORTUNITY_FIELDS = [
  "title",
  "description",
  "type",
  "companyName",
  "location",
  "workMode",
  "experienceLevel",
  "skills",
  "salaryMin",
  "salaryMax",
  "applicationDeadline",
];

const pickEditableOpportunityFields = (body = {}) => {
  const picked = {};
  for (const key of EDITABLE_OPPORTUNITY_FIELDS) {
    if (body[key] !== undefined) picked[key] = body[key];
  }
  return picked;
};

export const createOpportunity = async (req, res) => {
  try {
    const opportunity = await Opportunity.create({
      ...pickEditableOpportunityFields(req.body),
      creator: req.user._id,
    });

    await addBuilderScore({
      userId: req.user._id,
      type: "OPPORTUNITY_POSTED",
      referenceId: opportunity._id,
      referenceModel: "Opportunity",
    });

    res.status(201).json({
      success: true,
      opportunity,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const getOpportunities = async (req, res) => {
  try {
    const { type, search, workMode, page = 1, limit = 10 } = req.query;

    const query = { isDeleted: false, isActive: true };

    if (type) query.type = type;
    if (workMode) query.workMode = workMode;
    if (search) query.$text = { $search: search };

    const opportunities = await Opportunity.find(query)
      .populate("creator", "fullName username avatar headline")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Opportunity.countDocuments(query);

    res.status(200).json({
      success: true,
      count: opportunities.length,
      total,
      opportunities,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const getSingleOpportunity = async (req, res) => {
  try {
    const opportunity = await Opportunity.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).populate("creator", "fullName username avatar headline");

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: "Opportunity not found",
      });
    }

    res.status(200).json({
      success: true,
      opportunity,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const updateOpportunity = async (req, res) => {
  try {
    const opportunity = await Opportunity.findOne({
      _id: req.params.id,
      creator: req.user._id,
      isDeleted: false,
    });

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: "Opportunity not found or not authorized",
      });
    }

    Object.assign(opportunity, pickEditableOpportunityFields(req.body));
    await opportunity.save();

    res.status(200).json({
      success: true,
      opportunity,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const deleteOpportunity = async (req, res) => {
  try {
    const opportunity = await Opportunity.findOne({
      _id: req.params.id,
      creator: req.user._id,
      isDeleted: false,
    });

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: "Opportunity not found or not authorized",
      });
    }

    opportunity.isDeleted = true;
    opportunity.isActive = false;
    await opportunity.save();

    res.status(200).json({
      success: true,
      message: "Opportunity deleted",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const applyOpportunity = async (req, res) => {
  try {
    const opportunity = await Opportunity.findOne({
      _id: req.params.id,
      isDeleted: false,
      isActive: true,
    });

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: "Opportunity not found",
      });
    }

    if (opportunity.creator.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot apply to your own opportunity",
      });
    }

    const application = await Application.create({
      opportunity: opportunity._id,
      applicant: req.user._id,
      coverLetter: req.body.coverLetter || "",
      resumeUrl: req.body.resumeUrl || "",
    });

    opportunity.applicationsCount += 1;
    await opportunity.save();

    await addBuilderScore({
      userId: req.user._id,
      type: "OPPORTUNITY_APPLIED",
      referenceId: application._id,
      referenceModel: "Application",
    });

    res.status(201).json({
      success: true,
      application,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You already applied to this opportunity",
      });
    }

    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const getMyOpportunities = async (req, res) => {
  try {
    const opportunities = await Opportunity.find({
      creator: req.user._id,
      isDeleted: false,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: opportunities.length,
      opportunities,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const getAppliedOpportunities = async (req, res) => {
  try {
    const applications = await Application.find({
      applicant: req.user._id,
    })
      .populate("opportunity")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};