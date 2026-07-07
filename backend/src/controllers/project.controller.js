import Project from "../models/Project.js";
import ProjectUpdate from "../models/ProjectUpdate.js";

// Only these fields are ever settable by the creator directly — counts
// (followersCount/updatesCount/impressionsCount), isDeleted, and creator
// itself must never come from the request body.
const EDITABLE_PROJECT_FIELDS = [
  "title",
  "description",
  "coverImage",
  "category",
  "stage",
  "techStack",
  "tags",
  "websiteUrl",
  "githubUrl",
  "isPublic",
];

const pickEditableProjectFields = (body = {}) => {
  const picked = {};
  for (const key of EDITABLE_PROJECT_FIELDS) {
    if (body[key] !== undefined) picked[key] = body[key];
  }
  return picked;
};

export const createProject = async (req, res) => {
  try {
    const project = await Project.create({
      creator: req.user._id,
      ...pickEditableProjectFields(req.body),
    });

    res.status(201).json({
      success: true,
      project,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      isDeleted: false,
      isPublic: true,
    })
      .populate("creator", "fullName name avatar headline")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const getSingleProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId).populate(
      "creator",
      "fullName name avatar headline"
    );

    if (!project || project.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const updates = await ProjectUpdate.find({
      project: project._id,
      isDeleted: false,
    })
      .populate("creator", "fullName name avatar headline")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      project,
      updates,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const getMyProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      creator: req.user._id,
      isDeleted: false,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const updateProject = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.projectId,
      creator: req.user._id,
      isDeleted: false,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or not authorized",
      });
    }

    Object.assign(project, pickEditableProjectFields(req.body));
    await project.save();

    res.status(200).json({
      success: true,
      project,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.projectId,
      creator: req.user._id,
      isDeleted: false,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or not authorized",
      });
    }

    project.isDeleted = true;
    await project.save();

    res.status(200).json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export const addProjectUpdate = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.projectId,
      creator: req.user._id,
      isDeleted: false,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or not authorized",
      });
    }

    const update = await ProjectUpdate.create({
      project: project._id,
      creator: req.user._id,
      ...req.body,
    });

    project.updatesCount += 1;
    await project.save();

    res.status(201).json({
      success: true,
      update,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};