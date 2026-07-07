import { OAuth2Client } from "google-auth-library";
import { allowedGoogleClientIds } from "../config/googleClients.js";

// No single audience is passed to the OAuth2Client constructor — the
// client itself doesn't need one, since `audience` is supplied per-call to
// verifyIdToken() below (as the full allowed-clients array).
const client = new OAuth2Client();

// Verifies a Google ID token from ANY of our platforms (web, Android, iOS).
// We never trust a "platform" field sent by the frontend — the token's own
// `aud` (audience) claim is checked by google-auth-library against every
// client ID we've configured, and verification fails if it doesn't match
// one of them. This is what actually prevents a token minted for a
// different app from being replayed against IMCircle's backend.
export const verifyGoogleCredential = async (credential) => {
  if (allowedGoogleClientIds.length === 0) {
    throw new Error(
      "No Google client IDs configured on the backend (GOOGLE_WEB_CLIENT_ID / " +
        "GOOGLE_ANDROID_CLIENT_ID / GOOGLE_IOS_CLIENT_ID / GOOGLE_CLIENT_ID). " +
        "Refusing to attempt Google login verification."
    );
  }

  if (!credential) {
    throw new Error("Google credential is required");
  }

  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: allowedGoogleClientIds,
  });

  return ticket.getPayload();
};