import { body, param } from "express-validator";

export const createPostValidator = [
  // Text is optional — a post can be just an image, just a voice note, or
  // any combination, so this can't require a minimum length on its own.
  // The "must have SOMETHING" rule is enforced by the .custom() check below,
  // which also looks at whether any media files were uploaded.
  body("content")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Post cannot exceed 2000 characters"),

  body("content").custom((value, { req }) => {
    const hasText = Boolean(String(value || "").trim());
    const hasMedia = Array.isArray(req.files) && req.files.length > 0;

    if (!hasText && !hasMedia) {
      throw new Error("Write something or add a photo/voice note");
    }

    return true;
  }),

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
