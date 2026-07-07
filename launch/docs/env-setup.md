# IMCircle — Environment Variable Setup

Founder: Rishu Raj · App ID: com.imcircle.app

Exactly **two real env files per side** of this app — no more, no less:

| Side | Local dev | Production | Template (committed) |
|---|---|---|---|
| Frontend | `frontend/.env` | `frontend/.env.production` | `frontend/.env.example`, `frontend/.env.production.example` |
| Backend | `backend/.env` | `backend/.env.production` | `backend/.env.example`, `backend/.env.production.example` |

There is **no separate env file per platform** (web/Android/iOS). Platform
is detected at runtime in code (`frontend/src/config/platform.js` via
`Capacitor.getPlatform()`), and the one Google Sign-In client ID that
actually varies by platform is selected from whichever of the three
`VITE_GOOGLE_*_CLIENT_ID` vars matches — all three can sit in the same
`.env`/`.env.production` file at once.

## Golden rule: frontend vs backend

Anything prefixed `VITE_` gets bundled into the JavaScript that ships to
every browser/app install — **never put a secret behind a `VITE_` var**.
Google OAuth client IDs and the Maps browser key are public identifiers by
design and are safe here. Cloudinary/MSG91 keys, JWT secrets, and Mongo
connection strings are backend-only and must never get a `VITE_` prefix.

## Frontend variables

| Var | Notes |
|---|---|
| `VITE_API_BASE_URL` | e.g. `http://localhost:5000/api` (dev) / `https://api.imcircle.com/api` (prod) |
| `VITE_SOCKET_URL` | e.g. `http://localhost:5000` (dev) / `https://api.imcircle.com` (prod) |
| `VITE_GOOGLE_WEB_CLIENT_ID` | safe — public OAuth client ID |
| `VITE_GOOGLE_ANDROID_CLIENT_ID` | safe — public OAuth client ID |
| `VITE_GOOGLE_IOS_CLIENT_ID` | safe — public OAuth client ID |
| `VITE_GMAPS_BROWSER_KEY` | safe — browser-restricted Google Maps JS API key |

## Backend variables

| Var | Required? | Notes |
|---|---|---|
| `NODE_ENV` | — | `development` / `production` |
| `PORT` | — | e.g. `5000` |
| `CLIENT_URL` | production only | your frontend origin, used for CORS |
| `MONGO_URI` | **required** | MongoDB connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | **required** | long, random, distinct values |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | — | e.g. `15m` / `30d`. Older `JWT_ACCESS_EXPIRE`/`JWT_ACCESS_EXPIRES` names still work as fallbacks |
| `COOKIE_SECRET` | optional | enables signed cookies; login works fine without it |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | **required** | Cloudinary is the only active media upload provider — see `cloudinary-media-setup.md` |
| `MSG91_AUTH_KEY` / `MSG91_TEMPLATE_ID` | **required** | see `msg91-otp-setup.md` |
| `MSG91_OTP_EXPIRY_MINUTES` | optional | defaults to 5 |
| `GOOGLE_WEB_CLIENT_ID` / `GOOGLE_ANDROID_CLIENT_ID` / `GOOGLE_IOS_CLIENT_ID` | **at least one required** | see `google-oauth-setup.md` |
| `GOOGLE_MAPS_API_KEY` | optional, unused today | reserved for a future backend-side Maps API call; nothing currently reads it |

**No `CLOUDFLARE_*` variables exist anywhere in this app.** Cloudflare, if
you use it at all, is DNS/SSL/CDN in front of your domain — it needs zero
configuration from this codebase. See `cloudflare-media-setup.md` for the
history of why that's the case.

## Testing locally

1. Copy `backend/.env.example` → `backend/.env` (or edit your existing one) and fill in real dev values.
2. Copy `frontend/.env.example` → `frontend/.env` similarly.
3. `npm run dev` in `backend/` — missing required vars are logged clearly and the process exits; this is intentional fail-fast behavior, not a bug.
4. `npm run dev` in `frontend/` — any missing required `VITE_` var logs a clear `console.error` in dev, never a user-facing crash.

## Testing in production

Copy `.env.production.example` → `.env.production` on each side (or set
the same vars through your host's environment/secrets manager) and fill
in real production values. **Never commit a file with real secrets in
it** — only the `.example` templates are meant to be committed;
`.gitignore` on both sides blocks every other `.env*` file.
