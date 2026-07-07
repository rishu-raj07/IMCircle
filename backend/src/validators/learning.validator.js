import { body, param, query } from "express-validator";

const learningTypes = [
  "learning",
  "resource",
  "tool",
  "tip",
  "mistake",
];

export const createLearningValidator = [
  body("title")
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage("Title cannot exceed 120 characters"),

  body("content")
    .trim()
    .notEmpty()
    .withMessage("Learning content is required")
    .isLength({ max: 3000 })
    .withMessage("Content cannot exceed 3000 characters"),

  body("topic")
    .optional()
    .trim()
    .isLength({ max: 40 })
    .withMessage("Topic cannot exceed 40 characters"),

  body("type")
    .optional()
    .isIn(learningTypes)
    .withMessage("Invalid learning type"),

  body("tags")
    .optional()
    .custom((value) => {
      if (!value) return true;

      if (Array.isArray(value)) return true;

      if (typeof value === "string") return true;

      throw new Error("Invalid tags format");
    }),

  body("media").optional(),
];

export const updateLearningValidator = [
  body("title")
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage("Title cannot exceed 120 characters"),

  body("content")
    .optional()
    .trim()
    .isLength({ max: 3000 })
    .withMessage("Content cannot exceed 3000 characters"),

  body("topic")
    .optional()
    .trim()
    .isLength({ max: 40 }),

  body("type")
    .optional()
    .isIn(learningTypes),

  body("tags")
    .optional()
    .custom((value) => {
      if (!value) return true;

      if (Array.isArray(value)) return true;

      if (typeof value === "string") return true;

      throw new Error("Invalid tags");
    }),
];

export const learningIdValidator = [
  param("id")
    .isMongoId()
    .withMessage("Invalid learning ID"),
];

export const learningCommentValidator = [
  body("text")
    .trim()
    .notEmpty()
    .withMessage("Comment is required")
    .isLength({ max: 1000 })
    .withMessage("Comment cannot exceed 1000 characters"),
];

export const learningRepostValidator = [
  body("caption")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Thought cannot exceed 200 characters"),
];

export const learningFeedValidator = [
  query("type")
    .optional()
    .isIn(learningTypes)
    .withMessage("Invalid learning type"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .toInt(),
];
