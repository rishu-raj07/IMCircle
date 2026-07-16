import express from "express";

import {
  listWeeks,
  getWeekDetail,
  generateWeek,
  publish,
  unpublish,
  editWinner,
  removeWinner,
  editActivityPosition,
  removeActivityPosition,
  listNominations,
  reviewNomination,
} from "../controllers/adminSpotlight.controller.js";
import { adminProtect } from "../middleware/adminProtect.js";

const router = express.Router();

router.get("/weeks", adminProtect, listWeeks);
router.get("/weeks/:weekKey", adminProtect, getWeekDetail);
router.post("/generate", adminProtect, generateWeek);
router.post("/weeks/:weekKey/publish", adminProtect, publish);
router.post("/weeks/:weekKey/unpublish", adminProtect, unpublish);
router.put("/weeks/:weekKey/winner", adminProtect, editWinner);
router.delete("/weeks/:weekKey/winner/:category", adminProtect, removeWinner);
router.put("/weeks/:weekKey/activity/:position", adminProtect, editActivityPosition);
router.delete("/weeks/:weekKey/activity/:position", adminProtect, removeActivityPosition);
router.get("/nominations", adminProtect, listNominations);
router.patch("/nominations/:nominationId", adminProtect, reviewNomination);

export default router;
