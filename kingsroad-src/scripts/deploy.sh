#!/usr/bin/env bash
# Build Kingsroad and copy the built site + source into the personal website repo
# (haoming-chen2006.github.io) as /kingsroad (built) and /kingsroad-src (source), mirroring
# how FreeKill is hosted there. Commits and pushes only when --push is given.
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
SITE="${SITE_REPO:-$HOME/haoming-chen2006.github.io}"
cd "$HERE"
npm run check
npm run build
rm -rf "$SITE/kingsroad" "$SITE/kingsroad-src"
mkdir -p "$SITE/kingsroad" "$SITE/kingsroad-src"
cp -R dist/. "$SITE/kingsroad/"
# source snapshot without dependencies/build output/screenshots
rsync -a --exclude node_modules --exclude dist --exclude .git --exclude 'e2e/shots' ./ "$SITE/kingsroad-src/"
echo "Copied build to $SITE/kingsroad and source to $SITE/kingsroad-src"
if [[ "${1:-}" == "--push" ]]; then
  cd "$SITE"
  git add kingsroad kingsroad-src
  git commit -m "kingsroad: deploy $(date +%Y-%m-%d)" || echo "nothing to commit"
  git push
fi
