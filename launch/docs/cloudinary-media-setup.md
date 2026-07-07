# IMCircle — Cloudinary Media Setup (the only active upload provider)

## Decision

Cloudinary handles every image, video, and file upload in this app —
profile avatars/covers, post images/videos, journey images, learning
images, community images, company/college logos, and documents.
Cloudflare is not used for media at all; if it's used later, it's for
DNS/SSL/CDN in front of the domain, which needs no code or env changes
here. See `cloudflare-media-setup.md` for how the app arrived at this
decision.

## Where uploads happen

Two paths exist, both Cloudinary-backed:

1. **Generic upload routes** (`POST /api/upload/image`, `/video`, `/file`, `/audio` in `backend/src/controllers/upload.controller.js`) — used by `frontend/src/api/uploadApi.js`'s `uploadImage()`, called from `ImageUploader.jsx` (profile avatar), `AddCompanyModal.jsx`/`AddCollegeModal.jsx` (logos), `CreateCircle.jsx` (community), and `CreateProject.jsx`.
2. **Inline uploads inside feature controllers** — `post.controller.js`, `journey.controller.js`, `learning.controller.js`, and `circlePost.controller.js` each upload directly to Cloudinary as part of creating/editing their own content (post images, journey milestone photos/videos, journey cover, learning media, circle chat images).

Both paths use the same `cloudinary.uploader.upload_stream` pattern via
`multer` memory storage (no temp files written to disk) and the same
underlying Cloudinary account (`backend/src/config/cloudinary.js`).

## Folders

`backend/src/utils/cloudinaryUpload.js` defines the canonical folder map:

| Purpose | Cloudinary folder |
|---|---|
| profile | `imcircle/profiles` |
| post | `imcircle/posts` |
| journey | `imcircle/journeys` |
| learning | `imcircle/learnings` |
| community | `imcircle/communities` |
| logo | `imcircle/logos` |
| video | `imcircle/videos` |
| file | `imcircle/files` |

The generic upload routes accept an optional `purpose` field (sent
alongside the file as a `FormData` field) and route to the matching
folder via `resolveFolder()`; omitting it falls back to a sensible
per-type default, so any older code calling `uploadImage(file)` with no
options keeps working unchanged. Existing already-uploaded assets keep
whatever folder they were originally uploaded to — Cloudinary folders are
purely organizational, so this mapping only affects where **new** uploads
land, never existing stored URLs.

## Normalized response shape

`backend/src/utils/cloudinaryUpload.js`'s `normalizeCloudinaryResult()`
builds:

```js
{
  url, secureUrl, publicId, resourceType, format,
  width, height, bytes, duration,
  provider: "cloudinary",
}
```

This is returned **additively** from the generic `/api/upload/*` routes
(merged alongside the original `{url, publicId, type, bytes, format}`
fields those routes already returned, so nothing reading the old shape
breaks). The feature controllers (post/journey/learning/circlePost)
intentionally keep persisting only `{url, publicId, type}` into their
Mongoose subdocuments — those schemas were deliberately left unchanged
(see "Database compatibility" below) rather than expanded to store the
richer metadata, to avoid any schema migration risk.

## Delivery optimization (f_auto, q_auto, responsive width)

Already implemented on the frontend in
`frontend/src/utils/mediaOptimization.js`'s `getOptimizedImageUrl()` —
every Cloudinary URL rendered through `ImageLoader.jsx` gets
`f_auto,q_auto,c_limit,w_<width>` inserted automatically, and any
non-Cloudinary URL (or an already-optimized one) passes through
unchanged. A backend-side equivalent,
`getOptimizedCloudinaryUrl()`, now exists in
`backend/src/utils/cloudinaryUpload.js` for any server-side code that
needs to build an optimized URL (e.g. a notification email thumbnail).
Neither of these touches or breaks any already-stored URL.

## Where to get your keys

[Cloudinary dashboard](https://cloudinary.com/console) → Settings → API
Keys:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## Where to paste them

Backend only (never `VITE_`-prefixed) — `backend/.env` (dev) or
`backend/.env.production` (prod). These are **required** — the backend
refuses to start without them (see `pre-deployment-checklist.md`).

## Database compatibility

`User.avatar` / `User.coverImage` / `Journey.coverImage` are plain
`String` fields; `Post.media`, `JourneyMilestone.images`,
`Learning.media`, `CirclePost.media` are arrays of `{url, type,
publicId}` subdocuments. None of these were changed. If you later want to
persist the richer normalized fields (width/height/duration/format) into
the database, the lowest-risk path is adding them as new **optional**
fields on the same subdocuments (never renaming/removing the existing
ones) — that keeps every already-stored document valid with zero
backfill required.

## Testing

1. Confirm `CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` are set in your `.env`.
2. Upload a profile photo, a post image, a journey update photo, a learning post image, and a community logo from the running app — each should land in its matching `imcircle/*` folder in the Cloudinary Media Library.
3. Confirm existing (already-uploaded) images still render — nothing about old URLs changed.
