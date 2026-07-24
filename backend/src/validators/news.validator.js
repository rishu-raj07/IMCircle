import { param, query, body } from "express-validator";

export const newsIdValidator = [param("newsId").isMongoId().withMessage("Invalid news ID")];

export const listNewsValidator = [
  query("cursor").optional().isString().isLength({ max: 500 }),
  query("limit").optional().isInt({ min: 1, max: 20 }).withMessage("limit must be between 1 and 20"),
  query("category").optional().isString().trim().isLength({ max: 60 }),
];

export const shareNewsValidator = [
  ...newsIdValidator,
  body("shareType").optional().isIn(["post", "external"]),
];
