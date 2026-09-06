#!/usr/bin/env bash
# Build Hollowmere and stage it into the GitHub Pages repo as /rpgtrial/ (build) + /rpgtrial-src/ (source).
# Usage: scripts/deploy.sh [pages-repo-path]   (does NOT commit or push)
set -euo pipefail
SRC="$(cd "$(dirname "$0")/.." && pwd)"
PAGES="${1:-$HOME/haoming-chen2006.github.io}"
cd "$SRC"
npm run check
npm run build
rm -rf "$PAGES/rpgtrial"
cp -R dist "$PAGES/rpgtrial"
# source beside the build (no node_modules/dist/shots; assets symlinked to the build to avoid duplicating ~100 MB)
rm -rf "$PAGES/rpgtrial-src"
mkdir -p "$PAGES/rpgtrial-src"
rsync -a --exclude node_modules --exclude dist --exclude e2e/shots --exclude .git --exclude public/assets "$SRC/" "$PAGES/rpgtrial-src/"
mkdir -p "$PAGES/rpgtrial-src/public"
ln -s ../../rpgtrial/assets "$PAGES/rpgtrial-src/public/assets"
echo "Staged: $PAGES/rpgtrial ($(du -sh "$PAGES/rpgtrial" | cut -f1)) and $PAGES/rpgtrial-src"
echo "Next: cd $PAGES && git add rpgtrial rpgtrial-src && git commit -m 'rpgtrial: Hollowmere prologue' && git push"
