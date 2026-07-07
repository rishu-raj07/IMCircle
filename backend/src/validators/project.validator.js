import { body } from "express-validator";

export const createProjectValidator = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Project title is required")
    .isLength({ max: 120 })
    .withMessage("Project title cannot exceed 120 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 3000 })
    .withMessage("Description cannot exceed 3000 characters"),

  body("stage")
    .optional()
    .isIn(["idea", "building", "launched", "growing", "paused"])
    .withMessage("Invalid project stage"),

  body("techStack")
    .optional()
    .isArray()
    .withMessage("Tech stack must be an array"),

  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array"),
];

export const createProjectUpdateValidator = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Update title is required")
    .isLength({ max: 150 })
    .withMessage("Update title cannot exceed 150 characters"),

  body("content")
    .optional()
    .trim()
    .isLength({ max: 3000 })
    .withMessage("Content cannot exceed 3000 characters"),

  body("type")
    .optional()
    .isIn(["update", "launch", "milestone", "problem", "learning"])
    .withMessage("Invalid update type"),
];