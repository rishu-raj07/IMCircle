import { body, param } from "express-validator";

export const createJourneyValidator = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Journey title is required")
    .isLength({ max: 120 })
    .withMessage("Journey title cannot exceed 120 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 3000 })
    .withMessage("Description cannot exceed 3000 characters"),

  body("coverImage").optional().trim(),

  body("tags").optional(),

  body("targetDays")
    .optional()
    .isInt({ min: 1, max: 3650 })
    .withMessage("Target days must be between 1 and 3650"),

  body("totalDays")
    .optional()
    .isInt({ min: 1, max: 3650 })
    .withMessage("Total days must be between 1 and 3650"),

  body("deadline")
    .optional()
    .isISO8601()
    .withMessage("Deadline must be a valid date"),

  body("isPublic").optional().isBoolean(),
];

export const updateJourneyValidator = [
  body("title").optional().trim().isLength({ max: 120 }),
  body("description").optional().trim().isLength({ max: 3000 }),
  body("coverImage").optional().trim(),
  body("tags").optional(),
  body("targetDays").optional().isInt({ min: 1, max: 3650 }),
  body("totalDays").optional().isInt({ min: 1, max: 3650 }),
  body("deadline").optional().isISO8601(),
  body("isPublic").optional().isBoolean(),
  body("isActive").optional().isBoolean(),
  body("finalNote")
    .optional()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Final note must be between 1 and 1000 characters"),
];

export const journeyIdValidator = [
  param("id").isMongoId().withMessage("Invalid journey ID"),
];

export const milestoneIdValidator = [
  param("milestoneId").isMongoId().withMessage("Invalid milestone ID"),
];

export const createMilestoneValidator = [
  body("title").optional().trim().isLength({ max: 150 }),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage("Description cannot exceed 5000 characters"),

  body("type").optional().isIn(["update", "win", "failure", "lesson"]),

  body("achievement").optional().trim().isLength({ max: 120 }),

  body("capturedAt").optional().isISO8601(),

  body("captureSource").optional().isIn(["camera", "unknown"]),
];

export const commentMilestoneValidator = [
  body("text")
    .trim()
    .notEmpty()
    .withMessage("Comment text is required")
    .isLength({ max: 1000 })
    .withMessage("Comment cannot exceed 1000 characters"),
];
