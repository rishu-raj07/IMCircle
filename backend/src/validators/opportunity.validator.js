import { body, param, query } from "express-validator";

export const createOpportunityValidator = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 120 })
    .withMessage("Title cannot exceed 120 characters"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ max: 5000 })
    .withMessage("Description cannot exceed 5000 characters"),

  body("type")
    .isIn(["job", "freelance", "internship", "founder-hiring"])
    .withMessage("Invalid opportunity type"),

  body("workMode")
    .optional()
    .isIn(["remote", "hybrid", "onsite"])
    .withMessage("Invalid work mode"),

  body("experienceLevel")
    .optional()
    .isIn(["fresher", "junior", "mid", "senior"])
    .withMessage("Invalid experience level"),

  body("salaryMin").optional().isNumeric(),
  body("salaryMax").optional().isNumeric(),
];

export const opportunityIdValidator = [
  param("id").isMongoId().withMessage("Invalid opportunity ID"),
];

export const getOpportunitiesValidator = [
  query("type")
    .optional()
    .isIn(["job", "freelance", "internship", "founder-hiring"]),

  query("workMode").optional().isIn(["remote", "hybrid", "onsite"]),

  query("page").optional().isInt({ min: 1 }),

  query("limit").optional().isInt({ min: 1, max: 50 }),
];

export const applyOpportunityValidator = [
  body("coverLetter")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Cover letter cannot exceed 2000 characters"),

  body("resumeUrl")
    .optional()
    .trim()
    .isURL()
    .withMessage("Resume URL must be valid"),
];