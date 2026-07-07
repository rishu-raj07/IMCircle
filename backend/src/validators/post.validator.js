import { body, param } from "express-validator";

export const createPostValidator = [
  body("content")
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage("Post content must be between 1 and 2000 characters"),

  body("visibility")
    .optional()
    .isIn(["public", "followers", "circle"])
    .withMessage("Invalid post visibility"),

  body("purpose")
    .optional()
    .isIn(["general", "achievement", "question", "query", "opportunity"])
    .withMessage("Invalid post purpose"),
];

export const commentValidator = [
  body("text")
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage("Comment must be between 1 and 500 characters"),
];

export const postIdValidator = [
  param("postId").isMongoId().withMessage("Invalid post ID"),
];
