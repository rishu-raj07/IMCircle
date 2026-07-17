# IMCircle — Notifications, Live-Version Staleness, and Optional Location: Final Report

Founder: Rishu Raj · Covers all three original issues plus three live
local-dev incidents hit and fixed mid-session. Written from a sandboxed
copy of the repo with no access to the real VPS/Nginx/Cloudflare/PM2/
MongoDB Atlas/Play Console — everything below was verified by reading
the actual file contents and, where noted, by a standalone Node test
run; nothing was verified against your live database or a running
browser session.

---

## Issue 1 — Live app showing an old version

**Root cause:** nothing in the repo (or, as far as could be determined,
your server config) distinguished `index.html` from hashed JS/CSS
assets for caching purposes. If any layer (browser, Cloudflare, Nginx)
applied a blanket cache rule to the whole static root, `index.html`
would get cached just like the assets it references — so a new deploy
stayed invisible to already-cached visitors until that TTL expired.

**What was built:**
- `GET /api/meta/version` (`backend/src/controllers/meta.controller.js`,
  `backend/src/routes/meta.routes.js`) — unauthenticated, returns backend
  version, frontend version, git commit hash, Android versionCode/Name,
  and build date, all computed once at process boot (reads
  `package.json` files and `frontend/android/app/build.gradle`, falls
  back to `git rev-parse --short HEAD` for the commit hash).
- `__APP_VERSION__` / `__BUILD_DATE__` baked into the frontend bundle at
  build time (`frontend/vite.config.js`'s `define`), read from
  `frontend/package.json`.
- `frontend/src/hooks/useVersionCheck.js` — polls `/api/meta/version`
  every 5 minutes + on tab focus/visibility change, compares against
  the baked-in `__APP_VERSION__`.
- `frontend/src/main.jsx` — hand-registers the PWA service worker (web
  only; `injectRegister: false` in `vite.config.js` means this used to
  not happen at all) and wires its `onNeedRefresh` callback to a
  `SW_NEEDS_REFRESH_EVENT` window event, giving `useVersionCheck` a
  faster signal than waiting for the next poll. Also exposes
  `window.__imcUpdateServiceWorker` so the banner's Update button can
  activate the new SW and reload in one step.
- `frontend/src/components/common/VersionUpdateBanner.jsx` — fixed top
  banner, "A new version of IMCircle is available," Update/Dismiss
  buttons. Hidden entirely on native builds (`IS_NATIVE` — Play Store
  handles native updates, there's no APK hot-swap).
- `launch/docs/nginx-cloudflare-cache-setup.md` — **new**, the actual
  fix (the banner above is a safety net for whoever's already on a
  stale tab, not the fix itself). Reference `nginx.conf` server block
  that caches `/assets/*` for a year (safe — Vite hashes every
  filename) while forcing `no-cache` on `index.html`, `/sw.js`, and
  `/manifest.webmanifest`; Cloudflare Cache Rules / Page Rules guidance
  to bypass cache for everything except `/assets/*`; a reminder to purge
  Cloudflare's cache for `index.html`/`sw.js` after every deploy.
- Android version bump: `frontend/android/app/build.gradle`
  `versionCode 14→15`, `versionName "1.0.14"→"1.1.0"`; `backend/package.json`
  and `frontend/package.json` both bumped to `1.1.0` (feeds the version
  endpoint and the frontend's baked-in comparison value).

---

## Issue 2 — Notifications not being created

**Root cause:** notification creation was scattered and inconsistent —
some actions (follow, circle request, mention) created a `Notification`
correctly; others (learning likes, journey comments, journey reposts)
never created one at all; several call sites hand-rolled their own
`Notification.create` + `emitNotification` logic with no deduplication,
so re-liking/re-following after unliking/unfollowing could either do
nothing or pile up duplicate rows.

**What was built — a centralized notification service**
(`backend/src/services/notification.service.js`):
- `create({...})` — the one function every controller now calls. Never
  throws (a notification failure can never fail the like/follow/comment
  action that triggered it — every error is caught and logged). Has a
  built-in "never notify a user about their own action" guard, with an
  explicit `allowSelf` opt-out for genuinely self-targeted system types
  (badges you earned, spotlight/Builder-of-the-Week).
- `dedupe: true` — for anything a user can toggle or repeat (like,
  follow, journey-follow, circle request), reuses the same document via
  a `deduplicationKey` unique index instead of creating a new row every
  time, and correctly resurfaces it as unread on re-trigger.
- `removeByDedupeKey()` — for toggle-off actions (unlike, unfollow's
  stale-notification cleanup), removes exactly that one notification by
  its exact key, never touching anything else.
- `LINK_BUILDERS` — one map turning `{entityType, entityId}` into a
  frontend route (post, journey, journey milestone, learning, circle,
  message, user, badge, spotlight), so every controller gets a
  correctly-linking notification without duplicating routing logic.

**Every relevant controller migrated to it**, and — the actual "not
being created" bug fixes — these notification types were added where
they were previously completely missing:
- Learning post likes/unlikes (`learning.controller.js`) — didn't exist
  before.
- Learning comments (`learning.controller.js`) — didn't exist before;
  also wired to the existing `@mention` parser, which it wasn't using.
- Journey milestone comments (`journey.controller.js`) — only mentions
  inside the comment fired a notification before; the comment itself,
  to the journey owner, did not.
- Journey milestone reposts (`journey.controller.js`) — didn't exist at
  all (create/update-caption/remove-repost all now notify correctly,
  each cleaning up after itself).
- Referral joins (`auth.controller.js`) — added a shared
  `notifyReferrerOfJoin` helper, wired into Google login, mobile OTP
  verification (guarded against firing on every re-verify, only the
  first), and email OTP verification.
- Badge awards (`badge.service.js`) — was previously notifying on every
  `evaluateAutoBadges` re-check, not just genuinely new awards; now uses
  `findOneAndUpdate`'s `rawResult` to detect a real upsert before
  notifying, once.
- Spotlight / Builder of the Week (`spotlight.service.js`) — now fires
  when a week is actually **published**, not at draft-generation time
  (previously a draft never resulted in a notification at all).
- Direct messages (`message.controller.js`) — replaced the old
  `isUserOnline(receiverId)` skip-check (which suppressed the
  notification if the recipient was online *anywhere* in the app) with
  a new, more precise `isUserActiveInConversation(userId, conversationId)`
  (`backend/src/socket/socket.js`) that only skips the notification if
  they're actually looking at that exact conversation right now.

**Deliberately left unchanged** (documented product decisions, not
oversights): unfollowing does not send a new "unfollowed you"
notification (the old follow notification is just cleaned up);
rejecting a circle request does not notify the requester (avoids
negative-action spam); `JourneyFollower.js` and
`JourneyMilestoneLike.js`'s Mongoose post-save hooks still call
`Notification.create` directly rather than the new service — already
functionally correct, and touching model lifecycle hooks carried more
risk than benefit.

**API/frontend work to actually surface all this:**
- `GET /api/notifications` — real pagination (`page`/`limit`, capped at
  50), returns `total`/`page`/`limit`/`hasMore`.
- `GET /api/notifications/unread-count` — new endpoint; the header bell
  badge and side-drawer count both now call this instead of computing an
  inaccurate estimate from a capped page of results.
- Real-time: `frontend/src/pages/notifications/Notifications.jsx`,
  `TopHeader.jsx`, and `SideDrawer.jsx` all listen for the existing
  `new_notification` socket event and update live, deduplicated against
  whatever's already loaded.
- `frontend/src/pages/post/PostDetail.jsx` — **new page**, `/post/:postId`
  route. Needed because notification links for post likes/comments
  pointed at `/post/:id`, but that route didn't exist — reuses the
  existing `PostCard` component as-is.
- `backend/src/utils/notificationTarget.js` — fixed a link-resolution gap
  where post notifications resolved to no link at all.
- `backend/tests/notification.service.test.js` — 27 tests against the
  centralized service (self-guard, dedupe vs. non-dedupe, every
  `LINK_BUILDERS` entry, error-swallowing, socket emission), using
  Node's built-in test runner — no new dependency installed. Verified
  passing 27/27 in an isolated scratch copy (this sandbox has no live
  MongoDB/Socket.io to run them against your real stack).

---

## Issue 3 — Location must be fully optional

**Root cause:** location was required in three independent places that
each needed fixing separately — backend "profile complete" logic,
onboarding form validation, and several display components that
defaulted a missing location to the string `"India"` instead of hiding
it.

- `backend/src/controllers/profile.controller.js` — `hasRequiredBasics()`
  no longer requires `location.city`.
- `frontend/src/pages/profile/ProfileSetup.jsx` — removed the explicit
  "Location is required" validation block and its contribution to the
  profile-completeness percentage.
- `frontend/src/pages/profile/Profile.jsx`,
  `frontend/src/pages/profile/UserProfile.jsx` — location display
  functions now return an empty string (hiding the field entirely,
  including the map-pin icon) instead of falling back to `"India"` when
  there's no real city/state set. This was the actual bug users would
  have seen: an empty profile still showed a bare pin icon or the word
  "India" because the backend defaults `country` to `"India"` even for
  an otherwise-empty location object.
- `frontend/src/pages/network/Network.jsx`,
  `frontend/src/pages/network/Requests.jsx` — same `"India"` fallback
  fix; render sites made conditional where reasonable, left unconditional
  in one grid-card layout that reserves height for uniform card sizing
  (an existing, deliberate design choice).
- `frontend/src/pages/profile/LocationField.jsx` — added a clear (×)
  button and an explicit "(optional)" label instead of a required
  asterisk.
- `frontend/src/pages/profile/BasicInfo.jsx` — passes `required={false}`
  to `LocationField`.

Recommendation logic (`Requirement #34` in the task list) was confirmed
to already degrade gracefully without a location — no code change
needed there.

---

## Live local-dev incidents hit and fixed mid-session

Three real bugs surfaced while you were testing locally partway through
this session — all caused by my own work, all fixed, documented here
for transparency rather than folded silently into the file list above.

1. **`backend/package.json` truncation.** An earlier attempt in this
   session to install a test-runner dependency (`npm install -D vitest`)
   was interrupted mid-install and left `node_modules` in a broken state,
   which also corrupted `backend/package.json` on disk (confirmed via
   independent JSON parsing, not just a visual read). Fixed by rewriting
   the file with correct content; **you needed to restart your backend
   dev server** after this fix, which I asked you to do.
2. **`firebase-admin` resolution failure** (`Cannot find package
   'firebase-admin'...`) — further fallout from the same interrupted
   install, corrupting that package's install alongside `package.json`.
   **This still needs your action**: run `npm install` in `backend/`, or
   if that's insufficient, delete `backend/node_modules` and
   `backend/package-lock.json` and reinstall clean, then restart
   `npm run dev`.
3. **Blank black frontend screen, no error.** Caused by
   `VersionUpdateBanner.jsx` importing `IS_NATIVE` from
   `frontend/src/config/platform.js`, which didn't export anything by
   that name yet (only `IS_ANDROID`/`IS_IOS`/`IS_WEB` existed) — an
   invalid ESM named import crashes bundle evaluation before React ever
   mounts, which matches "no error, just black" exactly. Fixed by adding
   the missing `export const IS_NATIVE = IS_ANDROID || IS_IOS;`. While
   fixing this I introduced and immediately caught a second bug (a
   duplicate `IS_NATIVE` declaration in `main.jsx`), and separately
   finished a half-done rename (`IS_NATIVE_EVENT` → `SW_NEEDS_REFRESH_EVENT`)
   across `main.jsx`/`useVersionCheck.js`/`versionCheckConstants.js` that
   would have caused the identical class of crash if left as-is — this is
   now fully consistent (verified via direct file reads and a repo-wide
   search confirming zero remaining references to the old name).

**A note on `npm install`/`npm uninstall` in this sandbox specifically:**
this session confirmed (and `launch/docs/pre-deployment-checklist.md`
from an earlier session independently documents the same thing) that
running `npm install`/`npm uninstall` against your real `node_modules`
from within this sandboxed environment is unreliable and has caused real
damage more than once — not a one-off fluke. I did not attempt any
further install/build/lint commands against your files this session as a
result; those are listed as manual steps below for you to run directly.

---

## Files changed (full list)

**Backend — notification service + migrations**
`backend/src/services/notification.service.js` (new),
`backend/src/models/Notification.js`,
`backend/src/controllers/notification.controller.js`,
`backend/src/utils/notificationTarget.js`,
`backend/src/socket/socket.js` (added `isUserActiveInConversation`),
`backend/src/controllers/user.controller.js`,
`backend/src/controllers/circleRequest.controller.js`,
`backend/src/controllers/journey.controller.js`,
`backend/src/controllers/learning.controller.js`,
`backend/src/controllers/message.controller.js`,
`backend/src/controllers/connection.controller.js`,
`backend/src/controllers/circlePost.controller.js`,
`backend/src/controllers/circle.controller.js`,
`backend/src/controllers/circleInvite.controller.js`,
`backend/src/services/journeyReminder.service.js`,
`backend/src/services/contentParsing.service.js`,
`backend/src/services/badge.service.js`,
`backend/src/services/spotlight.service.js`,
`backend/src/controllers/auth.controller.js`,
`backend/tests/notification.service.test.js` (new)

**Backend — version endpoint**
`backend/src/controllers/meta.controller.js`,
`backend/src/routes/meta.routes.js`,
`backend/package.json`

**Backend — location optional**
`backend/src/controllers/profile.controller.js`

**Frontend — notifications**
`frontend/src/pages/notifications/Notifications.jsx`,
`frontend/src/api/notificationApi.js`,
`frontend/src/components/navigation/TopHeader.jsx`,
`frontend/src/components/navigation/SideDrawer.jsx`,
`frontend/src/pages/post/PostDetail.jsx` (new),
`frontend/src/routes/AppRoutes.jsx`

**Frontend — version banner**
`frontend/src/hooks/useVersionCheck.js` (new),
`frontend/src/utils/versionCheckConstants.js` (new),
`frontend/src/components/common/VersionUpdateBanner.jsx` (new),
`frontend/src/App.jsx`,
`frontend/src/main.jsx`,
`frontend/src/config/platform.js`,
`frontend/src/api/metaApi.js`,
`frontend/vite.config.js`,
`frontend/package.json`,
`frontend/android/app/build.gradle`

**Frontend — location optional**
`frontend/src/pages/profile/ProfileSetup.jsx`,
`frontend/src/pages/profile/Profile.jsx`,
`frontend/src/pages/profile/UserProfile.jsx`,
`frontend/src/pages/network/Network.jsx`,
`frontend/src/pages/network/Requests.jsx`,
`frontend/src/pages/profile/LocationField.jsx`,
`frontend/src/pages/profile/BasicInfo.jsx`

**Docs**
`launch/docs/nginx-cloudflare-cache-setup.md` (new)

---

## Deployment commands, in order

Run these on your actual machine/VPS — not from this sandbox.

```bash
# 1. Backend — reconcile node_modules first (fixes the firebase-admin issue above)
cd backend
rm -rf node_modules package-lock.json   # only if `npm install` alone doesn't resolve it
npm install
npm run lint 2>/dev/null || true        # if you have a backend lint script
node --check src/server.js              # quick sanity check, safe, no side effects

# 2. Frontend — install + verify
cd ../frontend
npm install
npm run lint
npm run build                            # produces frontend/dist with hashed assets

# 3. Nginx — apply the reference config, see launch/docs/nginx-cloudflare-cache-setup.md
sudo nano /etc/nginx/sites-available/imcircle
sudo nginx -t
sudo systemctl reload nginx

# 4. Cloudflare — Cache Rules (see the doc above), then after every future deploy:
#    Caching → Configuration → Custom Purge → purge index.html, /sw.js, /manifest.webmanifest

# 5. Backend deploy (PM2)
cd backend
pm2 restart imcircle-backend --update-env    # or your actual PM2 process name
pm2 logs imcircle-backend --lines 50         # confirm clean boot, no missing-env-var exits

# 6. Frontend deploy
#    Copy frontend/dist/* to the path Nginx's `root` points at (see the doc)
rsync -avz --delete frontend/dist/ user@your-vps:/var/www/imcircle/frontend/dist/

# 7. Verify the version endpoint is live and correct
curl https://imcircle.app/api/meta/version
# expect: {"backendVersion":"1.1.0","frontendVersion":"1.1.0","commitHash":"...","androidVersionCode":15,"androidVersionName":"1.1.0","buildDate":"..."}

# 8. Android (only when ready to ship a Play Store update)
cd frontend
npm run cap:android      # runs: vite build && cap sync android && cap open android
# then build a signed release AAB/APK from Android Studio as usual, upload to Play Console
```

---

## Manual testing checklist (two separate accounts — "A" and "B")

**Setup:** log in as Account A on one device/browser, Account B on
another (or an incognito window). A and B should already follow each
other or be in the same Circle for the mention/message tests below.

**Issue 1 — version staleness**
1. Load the app, open dev tools → Application → Service Workers, confirm
   one is registered (web only — skip on native).
2. Bump `frontend/package.json`'s version, rebuild, redeploy.
3. On the already-open tab (don't refresh), within 5 minutes or on
   refocusing the tab, confirm the "new version available" banner
   appears.
4. Click Update — confirm the page reloads and now reports the new
   version (check `curl /api/meta/version` matches what's baked into
   the page, e.g. via a console log or the banner disappearing).
5. On native (Android build), confirm the banner never appears at all
   — native updates go through the Play Store, not this mechanism.

**Issue 2 — notifications (repeat each as A → B, confirm B receives it)**
1. A follows B → B gets a "New follower" notification, correctly linking
   to A's profile. A unfollows → notification is removed from B's list.
2. A likes B's post → B gets "New like," linking to `/post/:id`, page
   loads B's actual post. A unlikes → notification removed.
3. A comments on B's post, mentioning `@B` → B gets both a comment
   notification and a mention notification (not duplicated into one).
4. A likes/comments on B's Learning post → B gets both (previously
   didn't exist at all — the core regression test for this issue).
5. A comments on B's journey milestone → B gets a reply notification.
6. A reposts B's journey milestone → B gets a repost notification; A
   removes the repost → notification is cleaned up.
7. A sends B a circle request → B gets "Circle request"; B accepts → A
   gets "Circle request accepted." B rejects a separate request from A →
   confirm A does **not** get a notification (documented decision, not
   a bug).
8. A sends B a DM while B is on some other page → B gets a message
   notification + real-time toast. A sends another DM while B has that
   exact conversation open → confirm B does **not** get a duplicate
   notification for a chat they're actively viewing.
9. Bell icon badge count on B's header matches the actual unread count;
   clicking it clears the badge; scrolling the notifications list loads
   more via infinite scroll past the first page.
10. Refer a friend: B signs up using A's referral link/code → A gets a
    referral notification exactly once (not on every subsequent login).

**Issue 3 — location optional**
1. Sign up as a brand-new Account C, skip location entirely during
   onboarding — confirm you're not blocked from completing signup.
2. View Account C's profile (as C and as another viewer) — confirm no
   bare map-pin icon and no "India" text appears anywhere location would
   normally show.
3. Check Account C's card in the Network/Requests list views — same,
   no stray "India" fallback text.
4. Confirm Account C still appears in recommendations/suggestions to
   other users despite having no location set.
5. Edit Account C's profile and set a real city — confirm it now
   displays correctly, and the clear (×) button in the location field
   works to remove it again.

**General regression pass**
1. Confirm existing features untouched by this session still work:
   posting, commenting, liking, following, circles, journeys, learning
   posts, messaging, badges, spotlight — nothing here should have
   changed behaviorally beyond what's described above.
2. Confirm no navigation/menu structure changed.
