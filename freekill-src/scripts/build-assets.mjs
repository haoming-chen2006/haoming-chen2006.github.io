// Asset pipeline: walks the three v1 packages plus the shared image tree in the
// FreeKill checkout, re-encodes every raster to WebP, writes it under
// public/assets/ with a content-hashed name, and emits the asset manifest that
// contract/manifest.ts describes.
//
// Nothing is written back into the FreeKill checkout — it is read-only input.
//
// What ships at v1 and why:
//   in   card art, general portraits, card/seat/button chrome, logos, emoji,
//        backgrounds — the 537-file first-paint set from assets-findings.md
//   out  image/symbolic (633 Adwaita SVGs, ~15 referenced, CC-BY-SA baggage),
//        image/anim + packages/*/image/anim (22 card-use sprite sequences,
//        15.6 MB, purely decorative), audio (severable; see --audio),
//        image/modmaker, image/lady.png
// The excluded sets are one flag away, not a rewrite: --anim, --audio.
import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname, relative, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { cpus } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(here, '..');
export const ENGINE_ROOT = process.env.FK_ROOT || '/Users/haoming/FreeKill';
const OUT_DIR = join(WEB_ROOT, 'public', 'assets');
const MANIFEST = join(WEB_ROOT, 'public', 'asset-manifest.json');
const BASE = process.env.FK_BASE || '/freekill/';

const argv = new Set(process.argv.slice(2));
const WANT_ANIM = argv.has('--anim');
const WANT_AUDIO = argv.has('--audio');

/* ------------------------------------------------------------------ sources */

/**
 * `mobile` adds 317 general portraits and 27 chrome rasters (7.6 MB of JPEG) and
 * no `anim/` tree at all. Its 82 MB of audio is severable and stays behind
 * `--audio` with everyone else's.
 */
const PACKS = ['standard', 'standard_cards', 'maneuvering', 'mobile'];

/** Quality per class, from the measured re-encode table in assets-findings.md. */
function qualityFor(rel) {
  if (/\.jpe?g$/i.test(rel)) return rel.includes('/generals/') ? 82 : 80;
  return 85;
}

function kindFor(rel) {
  if (/^packages\/[^/]+\/image\/generals\//.test(rel)) return 'general';
  if (/^packages\/[^/]+\/image\/card\//.test(rel)) return 'card';
  if (/^packages\/standard\/audio\/skill\//.test(rel)) return 'skill-audio';
  if (/^packages\/standard\/audio\/death\//.test(rel)) return 'death-audio';
  if (/\/audio\/card\//.test(rel) || /^audio\//.test(rel)) return 'card-audio';
  return 'misc';
}

function packFor(rel) {
  const m = /^packages\/([^/]+)\//.exec(rel);
  return m ? m[1] : 'core';
}

function walk(absRoot, rel, out) {
  let entries;
  try { entries = readdirSync(absRoot).sort(); } catch { return out; }
  for (const name of entries) {
    const abs = join(absRoot, name);
    const r = rel ? `${rel}/${name}` : name;
    if (statSync(abs).isDirectory()) walk(abs, r, out);
    else out.push(r);
  }
  return out;
}

function isRaster(rel) {
  return /\.(png|jpe?g)$/i.test(rel);
}

function excluded(rel) {
  if (rel.startsWith('image/symbolic/')) return true;   // Adwaita, ~15 of 633 used
  if (rel.startsWith('image/modmaker/')) return true;
  if (rel === 'image/lady.png') return true;
  if (rel === 'image/icon.rc' || rel === 'image/icon.ico') return true;
  if (!WANT_ANIM && /(^|\/)image\/anim\//.test(rel)) return true;
  return false;
}

export function collect() {
  const rels = [];
  for (const r of walk(join(ENGINE_ROOT, 'image'), 'image', [])) rels.push(r);
  for (const pkg of PACKS) {
    for (const r of walk(join(ENGINE_ROOT, 'packages', pkg), `packages/${pkg}`, [])) {
      if (r.includes('/image/') || (WANT_AUDIO && r.includes('/audio/'))) rels.push(r);
    }
  }
  if (WANT_AUDIO) for (const r of walk(join(ENGINE_ROOT, 'audio'), 'audio', [])) rels.push(r);

  return rels.filter((r) => !excluded(r)).filter((r) => isRaster(r) || (WANT_AUDIO && r.endsWith('.mp3')));
}

/* ----------------------------------------------------------------- encoding */

function run(cmd, args) {
  return new Promise((res, rej) =>
    execFile(cmd, args, { maxBuffer: 1 << 24 }, (err, so, se) => (err ? rej(new Error(`${cmd}: ${se || err.message}`)) : res(so))));
}

async function pool(items, width, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(width, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  }));
  return out;
}

async function encodeOne(rel, tmpDir) {
  const src = join(ENGINE_ROOT, rel);
  if (!isRaster(rel)) {
    // Audio ships as-is; mp3 is already compressed and cwebp has nothing to say.
    const bytes = readFileSync(src);
    return { rel, ext: extname(rel).toLowerCase(), bytes, original: bytes.length };
  }
  const original = statSync(src).size;
  const tmp = join(tmpDir, createHash('sha1').update(rel).digest('hex') + '.webp');
  await run('cwebp', ['-quiet', '-q', String(qualityFor(rel)), '-alpha_q', '100', '-m', '6', src, '-o', tmp]);
  const bytes = readFileSync(tmp);
  rmSync(tmp, { force: true });
  return { rel, ext: '.webp', bytes, original };
}

/* --------------------------------------------------------------------- main */

export async function buildAssets({ quiet = false } = {}) {
  const rels = collect();
  if (!rels.length) throw new Error(`no assets found under ${ENGINE_ROOT}`);

  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });
  const tmpDir = join(OUT_DIR, '.tmp');
  mkdirSync(tmpDir, { recursive: true });

  const t0 = Date.now();
  const encoded = await pool(rels, Math.max(4, cpus().length), (rel) => encodeOne(rel, tmpDir));
  rmSync(tmpDir, { recursive: true, force: true });

  const entries = [];
  const totals = {};
  let originalBytes = 0;
  for (const { rel, ext, bytes, original } of encoded) {
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
    const href = `assets/${hash}${ext}`;
    const dest = join(WEB_ROOT, 'public', href);
    if (!existsSync(dest)) writeFileSync(dest, bytes);
    const kind = kindFor(rel);
    entries.push({ key: rel, href, kind, bytes: bytes.length, pack: packFor(rel) });
    totals[kind] = (totals[kind] ?? 0) + bytes.length;
    originalBytes += original;
  }
  entries.sort((a, b) => (a.key < b.key ? -1 : 1));

  const manifest = { version: 1, base: BASE, entries, totals };
  writeFileSync(MANIFEST, JSON.stringify(manifest));

  const outBytes = entries.reduce((n, e) => n + e.bytes, 0);
  if (!quiet) {
    console.log(`${entries.length} assets  ${(originalBytes / 1048576).toFixed(2)} MB -> ` +
      `${(outBytes / 1048576).toFixed(2)} MB webp (${(100 - (outBytes / originalBytes) * 100).toFixed(0)}% smaller) ` +
      `in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    for (const [k, v] of Object.entries(totals).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${k.padEnd(12)} ${(v / 1048576).toFixed(2)} MB`);
    }
    console.log(`-> ${relative(process.cwd(), MANIFEST)}`);
  }
  return manifest;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await buildAssets();
}
