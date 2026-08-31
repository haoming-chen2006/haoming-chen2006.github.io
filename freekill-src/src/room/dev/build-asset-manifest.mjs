// Builds a DEVELOPMENT AssetManifest (contract/manifest.ts) by walking the engine
// tree in place. Agent 4's pipeline produces the real one — content-hashed,
// WebP-converted, copied into the publish root. This one keeps engine-relative
// paths so the harness can point `base` at any static server rooted at the
// FreeKill checkout and see real art.
//
//   node src/room/dev/build-asset-manifest.mjs [engineRoot]
//
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = process.argv[2] || process.env.FK_ROOT || '/Users/haoming/FreeKill';
const PACKAGES = ['standard', 'standard_cards', 'maneuvering'];

const IMAGE = /\.(png|jpg|jpeg|webp|gif)$/i;
const AUDIO = /\.(mp3|ogg|wav)$/i;

function walk(abs, out) {
  for (const name of readdirSync(abs).sort()) {
    const a = join(abs, name);
    const st = statSync(a);
    if (st.isDirectory()) walk(a, out);
    else out.push([relative(ROOT, a), st.size]);
  }
}

function kindOf(key) {
  if (AUDIO.test(key)) {
    if (key.includes('/audio/skill/')) return 'skill-audio';
    if (key.includes('/audio/death/')) return 'death-audio';
    if (key.includes('/audio/card/')) return 'card-audio';
    return 'misc';
  }
  if (key.includes('/image/generals/')) return 'general';
  if (key.includes('/image/card/')) return 'card';
  return 'misc';
}

const files = [];
walk(join(ROOT, 'image'), files);
for (const pkg of PACKAGES) {
  for (const sub of ['image', 'audio']) {
    try { walk(join(ROOT, 'packages', pkg, sub), files); } catch { /* absent */ }
  }
}
try { walk(join(ROOT, 'audio'), files); } catch { /* absent */ }

const entries = [];
const totals = {};
for (const [key, bytes] of files) {
  if (!IMAGE.test(key) && !AUDIO.test(key)) continue;
  const kind = kindOf(key);
  // Dev href === engine-relative key; the real pipeline content-hashes it.
  entries.push({ key, href: key, kind, bytes, pack: key.startsWith('packages/') ? key.split('/')[1] : 'core' });
  totals[kind] = (totals[kind] ?? 0) + bytes;
}

const manifest = { version: 1, base: '', entries, totals };
const dest = join(here, 'data', 'asset-manifest.dev.json');
writeFileSync(dest, JSON.stringify(manifest));
console.log(`${entries.length} assets`, totals);
console.log(`-> ${dest}`);
