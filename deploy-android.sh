#!/usr/bin/env bash
# IMCircle — Android/Play Store release build.
# Assumes frontend/android/app/keystore.properties already has your real
# signing config (storeFile/storePassword/keyAlias/keyPassword) — that's
# what android/app/build.gradle's `signingConfigs.release` reads from.
# Run this locally, not on the VPS.
#
# Usage: bash deploy-android.sh

set -euo pipefail

echo "== 1. Confirm version was bumped =="
grep -E "versionCode|versionName" frontend/android/app/build.gradle
echo "If these don't match the release you intend to ship, stop and bump them first."

echo "== 2. Build the web bundle + sync into the native project =="
cd frontend
npm run cap:android    # runs: vite build && cap sync android && cap open android
# This opens Android Studio. From here the reliable path is the Android
# Studio GUI (Build > Generate Signed Bundle / APK), since it validates the
# signing config interactively. If you'd rather stay on the CLI instead:

echo "== 2b. (Alternative) CLI-only signed bundle build =="
cd android
./gradlew bundleRelease
echo "Output AAB: frontend/android/app/build/outputs/bundle/release/app-release.aab"

echo "== 3. Upload to Play Console (manual, no CLI for this part) =="
cat <<'EOF'
1. https://play.google.com/console -> IMCircle -> Production (or Internal/
   Closed testing track first, if you stage rollouts).
2. Create new release -> upload app-release.aab.
3. Release notes: summarize this session's changes for end users, e.g.
   "Improved notifications, fixed profile location requirement, bug fixes."
4. Save -> Review release -> Start rollout.
5. Confirm the versionCode (22) is higher than whatever's currently live —
   Play Console will reject an upload with a versionCode already used.
EOF
