#!/usr/bin/env bash
# Build Pebblebrook and copy the built site + source into the personal website repo
# (haoming-chen2006.github.io) as /pebblebrook (built) and /pebblebrook-src (source), the same
# pattern as Crownfall and FreeKill. Commits and pushes only when --push is given.
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
SITE="${SITE_REPO:-$HOME/haoming-chen2006.github.io}"
cd "$HERE"
npm run check
npm run build
rm -rf "$SITE/pebblebrook" "$SITE/pebblebrook-src"
mkdir -p "$SITE/pebblebrook" "$SITE/pebblebrook-src"
cp -R dist/. "$SITE/pebblebrook/"
rsync -a --exclude node_modules --exclude dist --exclude .git --exclude 'e2e/shots' ./ "$SITE/pebblebrook-src/"
echo "Copied build to $SITE/pebblebrook and source to $SITE/pebblebrook-src"
if [[ "${1:-}" == "--push" ]]; then
  cd "$SITE"
  git add pebblebrook pebblebrook-src
  git commit -m "pebblebrook: deploy $(date +%Y-%m-%d)" -- pebblebrook pebblebrook-src || echo "nothing to commit"
  git push
fi
