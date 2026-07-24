import express from "express";

import {
  listNews,
  getNewsDetail,
  createNews,
  updateNews,
  deleteNews,
  uploadNewsImage,
} from "../controllers/adminNews.controller.js";
import { adminProtect } from "../middleware/adminProtect.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

router.get("/", adminProtect, listNews);
router.get("/:id", adminProtect, getNewsDetail);
router.post("/upload-image", adminProtect, upload.single("file"), uploadNewsImage);
router.post("/", adminProtect, createNews);
router.patch("/:id", adminProtect, updateNews);
router.delete("/:id", adminProtect, deleteNews);

export default router;
