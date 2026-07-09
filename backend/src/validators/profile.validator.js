import { body } from "express-validator";

export const updateProfileValidator = [
  body("fullName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage("Full name must be between 2 and 80 characters"),

  body("username")
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers and underscore"),

  body("headline")
    .optional()
    .trim()
    .isLength({ max: 320 })
    .withMessage("Headline cannot exceed 320 characters"),

  body("dob")
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage("Date of birth must be a valid date"),

  // Free text: onboarding's "Other" chip opens a custom input and whatever
  // the person types becomes the saved category, so this can't be a fixed
  // enum any more (Student is also a valid built-in chip now).
  body("primaryInterest")
    .optional()
    .trim()
    .isLength({ max: 60 })
    .withMessage("Interest must be under 60 characters"),

  body("company")
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage("Company cannot exceed 120 characters"),

  body("bio")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Bio cannot exceed 500 characters"),

  body("field")
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage("Field cannot exceed 120 characters"),

  body("role")
    .optional()
    .isIn([
      "Student",
      "Professional",
      "Freelancer",
      "Founder",
      "Creator",
      "Business Owner",
      "Worker",
    ])
    .withMessage("Invalid role selected"),

  body("gender")
    .optional()
    .isIn([
      "Male",
      "Female",
      "Other",
      "Prefer not to say",
      "",
    ])
    .withMessage("Invalid gender"),

  body("location").optional(),

  body("avatar").optional(),

  body("profileImage").optional(),

  body("experience").optional(),

  body("education").optional(),

  body("socialLinks").optional(),

  body("skills")
    .optional()
    .isArray({ max: 20 })
    .withMessage("Skills must be an array"),

  body("skills.*.name")
    .optional()
    .trim()
    .isLength({ min: 1, max: 40 })
    .withMessage("Skill name must be between 1 and 40 characters"),

  body("skills.*.level")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Skill level must be between 1 and 100"),

  body("preferences")
    .optional()
    .isObject()
    .withMessage("Preferences must be an object"),

  body("preferences.openToWork")
    .optional()
    .isBoolean()
    .withMessage("openToWork must be true or false"),

  body("preferences.openToFreelance")
    .optional()
    .isBoolean()
    .withMessage("openToFreelance must be true or false"),

  body("preferences.openToCollab")
    .optional()
    .isBoolean()
    .withMessage("openToCollab must be true or false"),

  body("preferences.openToHiring")
    .optional()
    .isBoolean()
    .withMessage("openToHiring must be true or false"),

  body("isProfileCompleted")
    .optional()
    .isBoolean()
    .withMessage("isProfileCompleted must be true or false"),
];