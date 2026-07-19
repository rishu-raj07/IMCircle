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

  // `poll` arrives as a JSON string (multipart/form-data can't carry a real
  // array field) — parsed and validated here so createPost's controller
  // body can assume it's already either undefined or a clean array of 2-4
  // trimmed, non-empty option strings.
  body("poll").custom((value) => {
    if (value === undefined || value === "" || value === null) return true;

    let parsed;
    try {
      parsed = typeof value === "string" ? JSON.parse(value) : value;
    } catch {
      throw new Error("Invalid poll data");
    }

    const options = Array.isArray(parsed?.options) ? parsed.options : null;
    if (!options) throw new Error("A poll needs at least 2 options");

    const cleaned = options
      .map((option) => String(option || "").trim())
      .filter(Boolean);

    if (cleaned.length < 2 || cleaned.length > 4) {
      throw new Error("A poll needs between 2 and 4 options");
    }

    if (cleaned.some((option) => option.length > 80)) {
      throw new Error("Poll options must be 80 characters or fewer");
    }

    return true;
  }),
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
