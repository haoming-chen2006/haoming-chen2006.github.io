#!/usr/bin/env bash
# Bring the online half of Draft up. Run it from draft-src.
set -euo pipefail
cd "$(dirname "$0")"

echo "==> 1/4  link this directory to your Supabase project"
supabase link --project-ref ooumwohtgskpubglmaxz

echo "==> 2/4  create the rooms table"
supabase db push

echo "==> 3/4  set the judge's key (rotate it first if you have not)"
read -rsp "    new OPENAI_API_KEY: " KEY; echo
supabase secrets set "OPENAI_API_KEY=$KEY"

echo "==> 4/4  ship both functions"
npm run sync
supabase functions deploy action
supabase functions deploy judge

echo
echo "Done. Open https://haoming-chen2006.github.io/draft/ -> Play with friends."
