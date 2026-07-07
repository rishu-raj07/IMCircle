import express from "express";

import {
  createProject,
  getProjects,
  getSingleProject,
  getMyProjects,
  updateProject,
  deleteProject,
  addProjectUpdate,
} from "../controllers/project.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

import {
  createProjectValidator,
  createProjectUpdateValidator,
} from "../validators/project.validator.js";

const router = express.Router();

router.post("/", protect, createProjectValidator, validate, createProject);

router.get("/", protect, getProjects);

router.get("/my", protect, getMyProjects);

router.get("/:projectId", protect, getSingleProject);

router.patch("/:projectId", protect, updateProject);

router.delete("/:projectId", protect, deleteProject);

router.post(
  "/:projectId/updates",
  protect,
  createProjectUpdateValidator,
  validate,
  addProjectUpdate
);

export default router;