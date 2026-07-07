# IMCircle — Security, QA & Mobile Readiness Audit

Scope: React/Vite frontend, Node/Express/MongoDB backend, admin panel. This audit builds on the production-hardening pass already completed in this session (console-log cleanup, hardcoded-localhost fix, error-message leakage fix across 30 controllers, `.gitignore`/secrets hygiene, character limits, admin OTP hardening). Findings below are new/additional to that work, verified by reading the actual source.

No code has been changed as part of this audit. Everything below is investigation only, per your instruction.

---

## A. Critical Issues

### A1. Socket.io has zero authentication — private messages and notifications can be intercepted
**File:** `backend/src/socket/socket.js`
**Risk:** Anyone who opens a WebSocket connection to the server (no login required — Socket.io's handshake doesn't check the JWT cookie at all) can:
- Call `socket.emit("user_online", "<any user's real Mongo ID>")` and join that user's private notification room. `emitNotification()` broadcasts to `io.to(recipientId)`, so the attacker starts receiving that person's real notifications (follows, messages, circle requests, etc.) — this is exactly the "notification leakage" and "private message leakage" risk you asked me to check for.
- Call `socket.emit("join_chat", "<any conversationId>")` and join that room with no check that the connecting user is actually a participant. `emitMessage()` broadcasts new messages to `io.to(conversationId)` — an attacker who knows or guesses a conversation ID can silently listen to two other people's live chat.
- The REST message API (`message.controller.js`) *does* correctly check participancy on every request — the socket layer is the only place this protection is missing, which is what makes it easy to overlook.

**Exact fix:**
1. Add a Socket.io auth middleware (`io.use(...)`) that reads the `accessToken` cookie (or an `auth.token` handshake field) and verifies it the same way `auth.middleware.js` does, rejecting the connection if invalid. Attach `socket.data.userId` from the verified token.
2. Replace `socket.on("user_online", (userId) => socket.join(userId))` with `socket.join(socket.data.userId)` — never trust a client-supplied ID for room membership.
3. In `join_chat`, look up the `Conversation` by ID and confirm `socket.data.userId` is in `participants` before calling `socket.join()`; reject otherwise.
4. In `message_delivered`, use `socket.data.userId` instead of the client-supplied `userId` field.

This is the single highest-impact fix in this audit — it's a live data-privacy hole in an app that's about to ship.

---

### A2. Mass-assignment on Project/Opportunity/CirclePost updates
**Files:** `backend/src/controllers/project.controller.js` (`updateProject`, line ~102), `backend/src/controllers/opportunity.controller.js` (`updateOpportunity`, line ~95), `backend/src/controllers/circlePost.controller.js` (`updateCirclePost`, line ~196)
**Risk:** All three do `Object.assign(document, req.body)` after confirming the caller owns the document — ownership is checked correctly, but *which fields* get written is not restricted at all. There's no body validator on any of these three PATCH routes (`opportunityIdValidator`/nothing only validates the `:id` param, not the body). A user editing their own project/opportunity/circle post can add extra fields to the request body — e.g. verification/feature flags, counts, or any other field that exists on the Mongoose schema but was never meant to be user-editable — and they'll be written straight to the document.
**Exact fix:** Replace `Object.assign(doc, req.body)` with an explicit allowlist, e.g.:
```js
const { title, description, stage, techStack, tags } = req.body;
if (title !== undefined) project.title = title;
if (description !== undefined) project.description = description;
// ...only the fields that should ever be user-editable
```
Do the same for `opportunity` and `circlePost`. This is a small, mechanical, low-risk change per file — I'd do these one at a time and verify each still saves correctly.

---

## B. High Priority Issues

### B1. `ADMIN_JWT_ACCESS_SECRET` / `ADMIN_JWT_REFRESH_SECRET` silently fall back to the user secrets
**File:** `backend/src/controllers/adminAuth.controller.js`, `backend/src/middleware/adminProtect.js`
**Risk:** `accessSecret()` resolves as `ADMIN_JWT_ACCESS_SECRET || JWT_ACCESS_SECRET || JWT_SECRET`. If the two admin-specific env vars aren't set in production, admin tokens are signed with the *same* secret as regular user tokens. In practice this is currently safe — admin tokens carry `scope: "admin"` and regular user tokens never set that field, so `adminProtect` correctly rejects a user token — but it's a single shared secret away from a real problem if that scope check is ever refactored, and it means a leaked user JWT secret is also a leaked admin JWT secret.
**Fix:** Set `ADMIN_JWT_ACCESS_SECRET` and `ADMIN_JWT_REFRESH_SECRET` to distinct, separately-generated values in your production `.env`. No code change needed — this is a deployment-config action item.

### B2. Loose file-type filters allow SVG uploads on Journey/Learning/Circle images
**Files:** `backend/src/routes/journey.routes.js`, `backend/src/routes/learning.routes.js`, `backend/src/routes/circlePost.routes.js`
**Risk:** These three each define their own local `multer` filter using `file.mimetype.startsWith("image/")`, which permits `image/svg+xml`. SVGs can embed `<script>` tags — a classic stored-XSS vector if the file is ever rendered directly (e.g. via `<img>` in a browser context that doesn't sandbox it, or served with the wrong `Content-Type`). The app already has a *stricter*, well-built allowlist in `backend/src/middleware/upload.middleware.js` (explicit MIME list, no SVG) — these three routes just don't use it.
**Fix:** Point all three `multer` configs at the shared `upload.middleware.js` allowlist instead of their own loose `startsWith()` checks (or add `"image/svg+xml"` to an explicit denylist in each). This also removes duplicated multer setup code.

### B3. No in-app "Delete my account" UI, despite the backend supporting it
**Files:** Backend has `DELETE /profile/delete` wired and working (`profile.routes.js` → `deleteProfile`). Frontend has no button anywhere that calls it — only a passing mention in `pages/settings/Faq.jsx`.
**Risk:** Both Apple (Guideline 5.1.1(v)) and Google Play require apps that support account creation to offer in-app account deletion, not just a support-email workflow. This is a common, well-known rejection reason for UGC apps.
**Fix:** Add a "Delete my account" action in `Settings.jsx` (with a confirmation step) that calls the existing `DELETE /profile/delete` endpoint — the backend side is already done, this is frontend-only.

### B4. No user-level "Block" or "Report user" — only block-a-conversation and report-a-post exist
**Files:** `backend/src/routes/message.routes.js` (`blockConversation` — messaging only), `backend/src/routes/post.routes.js` (`reportPost` — content only), `backend/src/routes/support.routes.js` (`reportProblem` — general support, not a specific user)
**Risk:** A blocked-in-chat user can still view the victim's public profile, follow them, comment on their posts, and send circle requests. Google Play's UGC/safety policy (and Apple's) generally expects both "block this person app-wide" and "report this person" as distinct, discoverable actions for apps with user-to-user interaction — not just conversation-level blocking.
**Fix:** Add a `blockedUsers` array to the `User` model, a `PATCH /users/:id/block` endpoint that adds to it, and check that array in the relevant read paths (profile view, follow, circle request, feed) the same way `isConversationBlocked` is already checked for messaging. This is a moderate-sized feature, not a one-line fix — worth scoping separately before I touch it.

---

## C. Medium Priority Issues

| Issue | File | Fix |
|---|---|---|
| CSRF token is generated (`generateCsrfToken`) but `verifyCsrfToken` is never applied to any route — dead code giving a false sense of protection | `backend/src/middleware/csrf.middleware.js`, `frontend/src/api/axios.js` | Either wire it up properly (frontend must read the cookie and send `X-CSRF-Token` on every mutating request) or remove the unused half. Currently mitigated in practice by `sameSite: lax` on the session cookie, so this is not urgent — flagging so it doesn't look "already handled" when it isn't. |
| No dedicated rate limit on `sendMessage` or `reportPost`/`reportProblem` — only the global 300 req/15min limiter applies | `backend/src/routes/message.routes.js`, `backend/src/routes/post.routes.js`, `backend/src/routes/support.routes.js` | Add a lighter per-route limiter (e.g. `rateLimit({ windowMs: 60_000, max: 20 })`) if message/report spam becomes a real problem. Not urgent — global limiter provides a floor. |
| `Post` model has three separate single-field indexes (`author`, `createdAt`, `isDeleted`) instead of one compound index matching the actual feed query shape | `backend/src/models/Post.js` | Add `postSchema.index({ isDeleted: 1, createdAt: -1 })` (or `{ author: 1, isDeleted: 1, createdAt: -1 }` if author-scoped feeds are common) for a real query-plan win at scale. Cosmetic at current data volume. |
| `journey.routes.js` allows 50MB uploads vs 5MB everywhere else, with no compression/transcoding step before hitting Cloudinary | `backend/src/routes/journey.routes.js` | Confirm this is intentional (journey covers are sometimes video); otherwise bring it in line with the 5MB image cap used elsewhere. |
| Admin's `ALLOWED_ADMIN_MOBILES` gate is a single hardcoded fallback number (`9661140991`) if the env var isn't set | `backend/src/controllers/adminAuth.controller.js` | Already fixed to prefer `ADMIN_ALLOWED_MOBILES` env var in the earlier hardening pass — just confirm that env var is actually set in production, since the hardcoded fallback is a soft safety net, not the real gate. |

---

## D. Mobile Readiness Issues

- **No PWA manifest / service worker.** `frontend/public/manifest.json` doesn't exist, no service worker registered. If you're planning a PWA install prompt or offline fallback, this needs to be added — not required for a plain WebView/Capacitor wrap, but relevant if PWA is one of your three target modes.
- **No safe-area handling on the fixed bottom nav.** `BottomNav.jsx` uses `position: fixed; bottom: 0; height: 68px` with no `padding-bottom: env(safe-area-inset-bottom)`. On any iPhone with a home indicator (all current models), the nav will sit flush against — or be partially obscured by — the gesture bar once this is wrapped for iOS or added to a homescreen. Same risk for `FullScreenReel.jsx`'s close button and any other fixed-position chrome.
- **`viewport` meta tag is missing `viewport-fit=cover`.** Currently `width=device-width, initial-scale=1.0` only. Without `viewport-fit=cover`, iOS won't even give you `env(safe-area-inset-*)` values to work with, so the safe-area fix above needs this too.
- **No `theme-color` meta tag or `apple-touch-icon`.** Affects how the app looks when added to a homescreen or in a wrapped WebView's status bar — currently browser-default.
- **Page `<title>` is the literal placeholder "frontend".** Cosmetic but visible in tab titles, PWA install prompts, and share previews.
- **Positive findings (already solid):** `ImageLoader.jsx` uses `IntersectionObserver` for real lazy-loading; the reel/feed components already handle loading/empty/error states per-section rather than one global spinner; back-button behavior relies on standard React Router history, which behaves correctly in both browser and WebView contexts without extra wiring needed.

---

## E. Security Vulnerabilities (summary — see A/B for detail)

- **Critical:** Unauthenticated Socket.io — room-join spoofing (A1).
- **Critical:** Mass-assignment on 3 update endpoints (A2).
- **High:** Shared JWT secret fallback between user/admin auth (B1).
- **High:** Loose SVG-permitting file filters on 3 upload routes (B2).
- **Medium:** CSRF verification defined but unused (C).
- **Already fixed in this session, confirmed still correct:** helmet + mongo-sanitize + hpp globally applied; CORS locked to a single origin; global + per-route (OTP, auth) rate limiting; `trust proxy` set correctly; refresh-token rotation **with reuse detection** (session hash comparison, auto-revoke on mismatch — this is genuinely well-built, better than most apps this size); Google login verifies the credential server-side rather than trusting client-supplied profile data; password/refreshToken/OTP fields all `select: false` on the User model; no `dangerouslySetInnerHTML`/`innerHTML` anywhere in the frontend (React's default escaping is intact); no `eval`/`$where`/`new Function` in the backend.
- **IDOR spot-check (post/journey/message/project delete & update):** all correctly scope their query by `req.user._id` before mutating — no cross-user IDOR found in the endpoints checked.

---

## F. Store Approval Missing Requirements

| Requirement | Status |
|---|---|
| Privacy policy page | ✅ Present (`pages/settings/PrivacyPolicy.jsx`) |
| Terms of service page | ✅ Present (`pages/settings/Terms.jsx`) |
| Report content (post) | ✅ Present |
| Report a general problem | ✅ Present (`support.routes.js`) |
| Block within a conversation | ✅ Present |
| **In-app account deletion (UI)** | ❌ Backend exists, no frontend button — **B3 above** |
| **Block/report a user app-wide (not just in chat)** | ❌ Missing — **B4 above** |
| Admin moderation tools (view reports, act on them) | ✅ Present (`adminReports.controller.js`, admin panel) |

B3 and B4 are the two items most likely to actually block or delay Play Store/App Store approval for a UGC + messaging app. Everything else in this category is already in place.

---

## G. Performance Improvements

- Compound index on `Post` for the `{isDeleted, createdAt}` feed query shape (see C table).
- `journey.routes.js`'s 50MB upload ceiling with no server-side compression before Cloudinary — worth a size/type sanity check if journeys commonly include video.
- No other N+1 or missing-pagination patterns found in the feed/analytics controllers checked — `feed.controller.js` consistently uses `.limit()` per content type and cursor-based pagination for the combined feed.
- Console-log volume, hardcoded localhost URLs, and raw error-message leakage were already addressed in the earlier pass this session — not re-flagged here.

---

## H. Files Reviewed and Confirmed Safe / No Issue

- `backend/src/controllers/auth.controller.js` — refresh-token rotation with reuse detection, Google login server-side verification, rate-limited login/register/OTP routes.
- `backend/src/middleware/security.middleware.js` — helmet + mongo-sanitize + hpp correctly composed and applied globally.
- `backend/src/app.js` — CORS locked to `CLIENT_URL`, body size limits, `trust proxy` set, global error handler already hides stack traces in production.
- `backend/src/models/User.js` — password/refreshToken/OTP fields properly excluded via `select: false`.
- `backend/src/controllers/post.controller.js`, `journey.controller.js` (delete/update), `project.controller.js` (delete), `message.controller.js` (delete) — ownership checks present and correct.
- `backend/src/middleware/upload.middleware.js` — strict MIME allowlist, memory storage (no disk path traversal risk), reasonable size cap.
- `frontend/src/components/common/ImageLoader.jsx` — proper `IntersectionObserver` lazy loading.
- No XSS/injection vectors found in either the frontend (`dangerouslySetInnerHTML`) or backend (`eval`, `$where`, `new Function`) codebases.

---

## Suggested order if you want me to proceed

1. **A1 (socket auth)** — highest real-world impact, moderate effort.
2. **A2 (mass-assignment allowlist)** — small, mechanical, low risk, three files.
3. **B3 (delete-account UI)** — frontend-only, backend already works.
4. **B2 (SVG filter)** — small config change, three files.
5. **B4 (block/report user)** — the largest of these, needs a short design decision (what exactly gets hidden from a blocked user) before I touch code.
6. B1 and the C-table items are mostly config/deployment actions on your end, not code changes.

Let me know which of these you want done, and in what order — I'll do them one at a time so nothing existing breaks.
