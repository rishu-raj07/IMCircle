import express from "express";

import {
  uploadImage,
  uploadVideo,
  uploadFile,
  uploadAudio,
} from "../controllers/upload.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

// Cloudinary is the only active upload provider. A previous iteration of
// this file also mounted Cloudflare Images/Stream/R2 direct-upload routes
// (/image/direct-url, /video/direct-url, /file/direct-url, /complete) —
// those were removed along with their controller/services since the
// product decision is Cloudinary-only for now (Cloudflare stays for
// DNS/SSL/security, not media). See launch/docs/cloudflare-media-setup.md
// for the history if this needs to be revisited later.
router.post("/image", protect, upload.single("file"), uploadImage);

router.post("/video", protect, upload.single("file"), uploadVideo);

router.post("/file", protect, upload.single("file"), uploadFile);

router.post("/audio", protect, upload.single("file"), uploadAudio);

export default router;
