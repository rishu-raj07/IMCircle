import express from "express";

import {
  createOpportunity,
  getOpportunities,
  getSingleOpportunity,
  updateOpportunity,
  deleteOpportunity,
  applyOpportunity,
  getMyOpportunities,
  getAppliedOpportunities,
} from "../controllers/opportunity.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

import {
  createOpportunityValidator,
  opportunityIdValidator,
  getOpportunitiesValidator,
  applyOpportunityValidator,
} from "../validators/opportunity.validator.js";

const router = express.Router();

router.post(
  "/",
  protect,
  createOpportunityValidator,
  validate,
  createOpportunity
);

router.get(
  "/",
  protect,
  getOpportunitiesValidator,
  validate,
  getOpportunities
);

// Keep before "/:id"
router.get("/my", protect, getMyOpportunities);

router.get("/applied", protect, getAppliedOpportunities);

router.get(
  "/:id",
  protect,
  opportunityIdValidator,
  validate,
  getSingleOpportunity
);

router.patch(
  "/:id",
  protect,
  opportunityIdValidator,
  validate,
  updateOpportunity
);

router.delete(
  "/:id",
  protect,
  opportunityIdValidator,
  validate,
  deleteOpportunity
);

router.post(
  "/:id/apply",
  protect,
  opportunityIdValidator,
  applyOpportunityValidator,
  validate,
  applyOpportunity
);

export default router;