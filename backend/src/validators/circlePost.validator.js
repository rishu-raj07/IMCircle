import { body } from "express-validator";

export const createCirclePostValidator = [
  body("content")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 3000 })
    .withMessage("Content cannot exceed 3000 characters"),

  body("replyTo")
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage("Invalid reply reference"),

  body("title")
    .optional()
    .trim()
    .isLength({ max: 150 })
    .withMessage("Title cannot exceed 150 characters"),

  body("type")
    .optional()
    .isIn([
      "announcement",
      "learning",
      "resource",
      "opportunity",
      "event",
      "poll",
      "update",
    ])
    .withMessage("Invalid circle post type"),

  body("media")
    .optional()
    .isArray()
    .withMessage("Media must be an array"),
];

export const commentCirclePostValidator = [
  body("text")
    .trim()
    .notEmpty()
    .withMessage("Comment text is required")
    .isLength({ max: 500 })
    .withMessage("Comment cannot exceed 500 characters"),
];