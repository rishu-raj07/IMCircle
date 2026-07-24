import express from "express";

import {
  listArticles,
  getArticleDetail,
  createArticle,
  updateArticle,
  featureArticle,
  deleteArticle,
  uploadArticleImage,
} from "../controllers/adminArticle.controller.js";
import { adminProtect } from "../middleware/adminProtect.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

router.get("/", adminProtect, listArticles);
router.get("/:id", adminProtect, getArticleDetail);
router.post("/upload-image", adminProtect, upload.single("file"), uploadArticleImage);
router.post("/", adminProtect, createArticle);
router.patch("/:id", adminProtect, updateArticle);
router.patch("/:id/feature", adminProtect, featureArticle);
router.delete("/:id", adminProtect, deleteArticle);

export default router;
