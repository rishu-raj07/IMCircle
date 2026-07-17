# Nginx + Cloudflare Cache Config — fixes "live app shows old version"

Founder: Rishu Raj · Written for Issue 1 (live app serving a stale build).
Root cause of that bug class: `index.html` got cached for too long
somewhere in the chain (browser, Cloudflare, or Nginx), so visitors kept
loading an old `index.html` that pointed at old, since-deleted hashed
asset files. The version-check banner (`useVersionCheck.js` /
`VersionUpdateBanner.jsx`, added this session) is a mitigation for
whoever's already on a stale tab — this doc is the actual fix, so new
visits stop getting stale content in the first place.

No `nginx.conf` or Cloudflare config existed anywhere in this repo before
this file — the backend is API-only (confirmed: no `express.static` call
anywhere in `backend/src`), so the frontend static build and any
proxy/cache layer live entirely outside this codebase, on your VPS. This
file is a reference to copy onto the server; nothing here is picked up
automatically.

## The rule that matters

Vite's production build already content-hashes every JS/CSS/asset
filename (`index-D3kFj2a1.js`, not `index.js` — confirmed in
`frontend/vite.config.js`, no extra config needed for this part). That
means:

- **Hashed assets** (`/assets/*`) can be cached forever — a new deploy
  always produces new filenames, so there's no staleness risk.
- **`index.html`** must never be cached by a shared/browser cache — it's
  the only file that references the current hashed filenames, so if it
  goes stale, the whole deploy is invisible to visitors until the cache
  expires.
- **`sw.js` / the PWA manifest** must also never be cached — same
  reasoning, it's how the service worker discovers a new build exists.

## Reference `nginx.conf` (server block)

```nginx
server {
    listen 443 ssl http2;
    server_name imcircle.app www.imcircle.app;   # replace with your real domain

    root /var/www/imcircle/frontend/dist;        # path to `vite build` output
    index index.html;

    # gzip is already handled by the backend's `compression()` middleware
    # for /api responses; enable it here too for the static frontend.
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    # --- 1. Hashed static assets: cache forever, immutable ---
    # Vite's output filenames change on every build, so a 1-year cache is
    # safe — nothing ever needs to invalidate a specific hashed file.
    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    location ~* \.(png|jpg|jpeg|svg|webp|woff2?|ico)$ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    # --- 2. Service worker + PWA manifest: never cache ---
    # These are the files a client checks to discover a new deploy exists.
    # A cached sw.js is the single most common cause of "still shows the
    # old app" reports.
    location = /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        try_files $uri =404;
    }

    location = /manifest.webmanifest {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        try_files $uri =404;
    }

    # --- 3. index.html + SPA fallback: never cache ---
    # Every unmatched route falls back to index.html (client-side routing),
    # so this rule effectively covers every page URL, not just "/".
    location / {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        try_files $uri /index.html;
    }

    # --- 4. API: proxy to the Node/PM2 backend, never cached ---
    location /api/ {
        add_header Cache-Control "no-store";
        proxy_pass http://127.0.0.1:5000;   # match your backend's PORT
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;      # needed for Socket.io
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # --- 5. Socket.io (if served on a distinct path) ---
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Adjust `root`, `server_name`, and the backend proxy port (`5000`) to match
your actual VPS paths and `backend/.env` `PORT` value.

## Cloudflare (orange-cloud proxy in front of the domain)

Confirmed via `launch/docs/cloudflare-media-setup.md`: Cloudflare here is
DNS/CDN/WAF only, not media — no code or env var in this repo touches it.
These are dashboard settings only, nothing to commit:

1. **Cache Rules** (Cloudflare dashboard → Caching → Cache Rules) — add a
   rule: if URI Path does **not** start with `/assets/`, set Cache
   Eligibility to **Bypass cache**. This makes Cloudflare defer to your
   Nginx `Cache-Control` headers above for `index.html`/API/SW, while
   still edge-caching the hashed `/assets/*` files for speed.
2. Alternatively, if using legacy **Page Rules**: create a rule for
   `imcircle.app/assets/*` → Cache Level: Cache Everything, Edge Cache
   TTL: 1 month. Leave every other path on Cloudflare's default
   (respects origin headers), which is safe once the Nginx rules above
   are in place.
3. **After every deploy**, purge Cloudflare's cache for `index.html`,
   `/sw.js`, and `/manifest.webmanifest` specifically (or just "Purge
   Everything" if deploys are infrequent) — Custom Purge under Caching →
   Configuration. This is the step most likely to be forgotten and is
   the direct cause of "I deployed but it still shows old" if skipped.
4. Set **Browser Cache TTL** to "Respect Existing Headers" (not a fixed
   value) so it doesn't override the `no-cache` you're setting on
   `index.html` at the Nginx level.

## Why this fixes Issue 1 specifically

Before this session, nothing in the repo or (as far as could be
determined without VPS access) the server config distinguished
`index.html` from hashed assets — if Nginx/Cloudflare had any blanket
static-file cache rule (a common default, e.g. `expires 1y` applied to
the whole `root`), `index.html` would get cached exactly like the
assets it references, and a new deploy would stay invisible to already
cached visitors until that TTL expired. Combined with the version
banner added this session (`GET /api/meta/version` polling +
`onNeedRefresh` from the service worker), visitors get a working "Update"
prompt as a safety net even if a cache layer is ever misconfigured again.

## Deploying this file

This repo doesn't run Nginx directly (that's your VPS's job, outside this
codebase), so applying this requires manual steps on the server itself:

```bash
# On the VPS, as a sudo-capable user:
sudo cp nginx-cloudflare-cache-setup.md /tmp/reference.md   # for reference only
sudo nano /etc/nginx/sites-available/imcircle              # paste the server block above, edited for your paths
sudo nginx -t                                                # validate syntax before reloading
sudo systemctl reload nginx                                  # zero-downtime reload
```
