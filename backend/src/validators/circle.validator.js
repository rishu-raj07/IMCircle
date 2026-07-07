import { body } from "express-validator";

export const createCircleValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Circle name is required")
    .isLength({ max: 80 })
    .withMessage("Circle name cannot exceed 80 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description cannot exceed 1000 characters"),

  body("coverImage")
    .optional()
    .isString()
    .withMessage("Cover image must be a string"),

  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array"),

  body("visibility")
    .optional()
    .isIn(["public", "private", "invite-only"])
    .withMessage("Invalid visibility type"),
];