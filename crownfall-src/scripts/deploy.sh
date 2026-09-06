#!/usr/bin/env bash
# Build Crownfall and copy the built site + source into the personal website repo
# (haoming-chen2006.github.io) as /crownfall (built) and /crownfall-src (source), mirroring
# how FreeKill is hosted there. Commits and pushes only when --push is given.
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
SITE="${SITE_REPO:-$HOME/haoming-chen2006.github.io}"
cd "$HERE"
npm run check
npm run build
rm -rf "$SITE/crownfall" "$SITE/crownfall-src"
mkdir -p "$SITE/crownfall" "$SITE/crownfall-src"
cp -R dist/. "$SITE/crownfall/"
# source snapshot without dependencies/build output/screenshots
rsync -a --exclude node_modules --exclude dist --exclude .git --exclude 'e2e/shots' ./ "$SITE/crownfall-src/"
echo "Copied build to $SITE/crownfall and source to $SITE/crownfall-src"
if [[ "${1:-}" == "--push" ]]; then
  cd "$SITE"
  git add crownfall crownfall-src
  git commit -m "crownfall: deploy $(date +%Y-%m-%d)" || echo "nothing to commit"
  git push
fi
