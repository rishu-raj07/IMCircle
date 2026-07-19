#!/usr/bin/env bash
# IMCircle — server deploy script. Extends your existing push_instructions.txt
# pattern (VPS: root@200.97.163.64, repo path: /var/www/imcircle, PM2 process:
# imcircle-api). Run from your local machine; it SSHs into the VPS for you.
#
# Usage: bash deploy.sh

set -euo pipefail

VPS_HOST="root@200.97.163.64"
REPO_DIR="/var/www/imcircle"
PM2_PROCESS="imcircle-api"

echo "== 1. Push local commits =="
git push

echo "== 2. Deploy on VPS =="
ssh "$VPS_HOST" bash -s <<EOF
  set -euo pipefail
  cd "$REPO_DIR"

  # These files have local server-side edits that shouldn't be
  # overwritten by git pull (same as your existing push_instructions.txt).
  # backend/package.json was added after a deploy failed with "local
  # changes to backend/package.json would be overwritten by merge" —
  # the server had a stray uncommitted edit to its version field.
  git checkout -- backend/package-lock.json frontend/src/api/axios.js backend/package.json
  git pull
  git log -1 --oneline

  echo "-- frontend --"
  cd frontend
  npm install
  npm run build          # produces frontend/dist with hashed assets

  echo "-- nginx --"
  sudo nginx -t
  sudo systemctl reload nginx

  echo "-- backend --"
  cd ../backend
  npm install
  pm2 restart "$PM2_PROCESS" --update-env
  pm2 logs "$PM2_PROCESS" --lines 30 --nostream
EOF

echo "== 3. Verify the live version endpoint =="
curl -s https://imcircle.com/api/meta/version | tee /tmp/imcircle-version.json
echo
echo "Confirm backendVersion / frontendVersion read 1.1.10 above."

echo "== 4. Cloudflare =="
echo "Manual step (dashboard, not scriptable via curl without an API token):"
echo "Caching -> Configuration -> Custom Purge -> purge index.html, /sw.js, /manifest.webmanifest"
echo "(Only needed once you've applied the Cache Rules in launch/docs/nginx-cloudflare-cache-setup.md — safe to skip if you haven't set those up yet.)"
