import express from "express";

import { getProfileOgPage } from "../controllers/og.controller.js";

const router = express.Router();

// Deliberately unauthenticated — social unfurl bots don't carry a login
// session, and this only ever exposes what a public profile already shows.
router.get("/profile/:username", getProfileOgPage);

export default router;
