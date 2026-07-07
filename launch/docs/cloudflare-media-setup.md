# Cloudflare Media — historical note (not used)

**Current state: Cloudflare is not used for media at all.** A previous
iteration of this project added Cloudflare Images/Stream/R2 as a parallel
media pipeline alongside Cloudinary. That code
(`backend/src/services/cloudflareImages.service.js`,
`cloudflareStream.service.js`, `cloudflareR2.service.js`,
`backend/src/controllers/uploadCloud.controller.js`,
`backend/src/config/uploadPolicy.js`, the `/api/upload/*/direct-url` and
`/api/upload/complete` routes, the `@aws-sdk/client-s3` and
`@aws-sdk/s3-request-presigner` packages, and the matching frontend
functions in `uploadApi.js`) has since been **removed** — it was never
called by anything in production, and the product decision is to run on
Cloudinary only for the foreseeable future.

See `cloudinary-media-setup.md` for the current (only) media upload
setup.

## If Cloudflare is used at all going forward

It's DNS/SSL/CDN in front of the domain (e.g. Cloudflare's orange-cloud
proxy, a WAF rule, or a cache rule) — none of that requires any code or
env variable in this repository. There is no `CLOUDFLARE_*` env var
anywhere in `backend/.env.example` or `.env.production.example`, and the
backend boots without needing one.

## If Cloudflare media is ever revisited later

The removed files are recoverable from git history if this decision
changes. Re-adding them would mean: reinstalling
`@aws-sdk/client-s3`/`@aws-sdk/s3-request-presigner` (for R2 only —
Images/Stream use plain `fetch`), recreating the three service files and
the `uploadCloud.controller.js` handlers, remounting the direct-upload
routes in `backend/src/routes/upload.routes.js` alongside (not replacing)
the Cloudinary routes, and deciding at that point whether to keep both
providers side by side or migrate fully.
