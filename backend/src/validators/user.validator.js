import { query, param } from "express-validator";

export const usernameParamValidator = [
  param("username")
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Invalid username format"),
];

export const searchUserValidator = [
  query("q")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Search query must be between 2 and 50 characters"),
];