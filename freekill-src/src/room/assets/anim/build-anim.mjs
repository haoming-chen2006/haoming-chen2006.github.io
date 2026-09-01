/**
 * Packs the engine's animation frames into lazily-fetched WebP spritesheets.
 *
 *   node src/room/assets/anim/build-anim.mjs [--fk=/path/to/FreeKill] [--cap=240]
 *
 * The Qt client ships its effects as loose PNG frame folders — 522 frames and
 * 15.6 MB across the packages' `image/anim` trees, the engine's own
 * `image/anim`, and the nine `image/anim/skillInvoke` categories. Shipping
 * those as-is is not an option:
 * the whole first-paint bundle is ~1.1 MB, so 522 separate requests of raw PNG
 * would dwarf the game by an order of magnitude.
 *
 * So each folder becomes ONE horizontal strip, encoded as WebP. A strip is a
 * single request, decodes once, and animates in CSS with `steps()` on
 * `background-position` — no per-frame JavaScript, no decode hitch mid-effect,
 * and the GPU does the work. `sheets.generated.ts` carries only the metadata
 * (a couple of kB of integers) so the runtime knows a sheet's geometry without
 * a round trip; the pixels are fetched the first time an effect actually plays.
 *
 * Why the output is committed rather than built on demand: producing it needs
 * the FreeKill checkout, ffmpeg and cwebp — none of which a `npm install` has.
 * `public/fonts/` is committed for exactly that reason and this follows it.
 *
 * Two engine details worth knowing before changing anything here:
 *
 *  * Frames within a folder are NOT all the same size (`crossbow`, `vine`,
 *    `wine`, `shoe`, `flower` and `switch` each mix two or three). They are
 *    centred variants of one drawing, so every frame is padded onto the
 *    folder's bounding box before tiling — scaling them to a common size
 *    instead would make the effect pulse as it played.
 *  * `image/anim/skillInvoke/switch/` contains a 1x1 px frame. It is a spacer,
 *    not a drawing, and tiling it produces a blank flash, so frames below
 *    `MIN_FRAME` px are dropped.
 *
 * Filenames must never begin with `_`: GitHub Pages runs Jekyll over the
 * published tree and Jekyll silently refuses to serve those. `verify-dist.mjs`
 * fails the deploy if one appears, and the engine's own `fire__slash` has a
 * double underscore in the middle, which is fine — the check is on the first
 * character of a path segment.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PACKAGES } from '../../../../scripts/build-lua-bundle.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = resolve(HERE, '..', '..', '..', '..');

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const [, v] = hit.split('=');
  return v === undefined ? true : v;
};

/** Same default as `build-lua-bundle.mjs` / `build-assets.mjs`. */
const FK_ROOT = resolve(String(flag('fk', process.env.FK_ROOT ?? '/Users/haoming/FreeKill')));
const OUT_DIR = join(WEB_ROOT, 'public', 'anim');
const INDEX_TS = join(HERE, 'sheets.generated.ts');

/** Longest side of a single frame after packing. The effect draws over a seat
 *  photo that is 92-168 css px wide, so 240 covers a 2x display with room to
 *  spare and caps `kylin_bow`'s 327 px frames, the only ones above it. */
const CAP = Number(flag('cap', 240));
/** Anything smaller than this in either axis is a spacer, not a drawing. */
const MIN_FRAME = 8;
/**
 * Frames kept per effect, resampled evenly across the original sequence.
 *
 * The Qt client runs every one of these at a fixed 50 ms per frame
 * (`PixmapAnimation.qml`'s timer), so a 24-frame 杀 takes 1.2 s there. The web
 * table has a 700 ms beat to play inside — the engine's own `room:delay()`,
 * which is what paces a bot's turn — so a 1.2 s effect would still be running
 * when the next one starts.
 *
 * Keeping 12 frames and playing them at the same 50 ms gives 600 ms: the same
 * motion, the same frame rate, fitted to the window. It is also the single
 * biggest lever on size, because it halves the pixels in the longer effects.
 */
const MAX_FRAMES = Number(flag('max-frames', 12));
/** WebP quality. These are soft-edged glows over transparency, which is the
 *  content lossy WebP handles best; 78 is visually indistinguishable from 90
 *  at the size a seat photo renders them and is a third of the bytes. */
const QUALITY = Number(flag('q', 78));
/** Alpha is a smooth falloff, not a matte, so it does not need to be exact —
 *  but it does need to be smooth, and below ~85 the glow edges start banding. */
const ALPHA_QUALITY = Number(flag('alpha-q', 90));

/* ------------------------------------------------------------------ probing */

function pngSize(file) {
  // PNG: 8-byte signature, then the IHDR length+type (8 bytes), then width and
  // height as big-endian uint32. Cheaper and more portable than shelling out
  // to `sips` once per frame, which cost ~40 s over the full set.
  const buf = readFileSync(file, { length: 33 });
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

/** Frame folders are numbered `0.png`..`n.png`, so sort numerically — a
 *  lexical sort puts `10.png` before `2.png` and plays the effect scrambled. */
function framesOf(dir) {
  return readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.png'))
    .map((f) => ({ file: join(dir, f), n: Number.parseInt(basename(f, '.png'), 10) }))
    .filter((f) => Number.isFinite(f.n))
    .sort((a, b) => a.n - b.n)
    .map((f) => f.file);
}

const isDir = (p) => existsSync(p) && statSync(p).isDirectory();
const dirsIn = (p) => (isDir(p) ? readdirSync(p).map((d) => join(p, d)).filter(isDir) : []);

/**
 * Every effect the engine ships, with the name the engine uses for it.
 *
 * `kind` is what the runtime keys off, not a decoration:
 *   card   — `Animate{type:"Emotion"}` names one of these directly, and the
 *            name is the card's own name (`slash`, `fire__slash`, `peach`).
 *   common — `image/anim/`: damage, judgegood/judgebad, and the rest.
 *   skill  — `image/anim/skillInvoke/<category>`: the NINE skill categories the
 *            Qt client keys a skill invocation off. This is what makes per-skill
 *            animation work across a 319-general pool without a hand-written
 *            map: the category comes from the skill's own type.
 */
function discover() {
  const out = [];
  // Only the packages the Lua bundle actually ships — an effect for a package
  // the engine cannot load is weight nobody can ever trigger. `PACKAGES` is an
  // explicit export of the bundle builder, so adding a pack there brings its
  // animations along instead of silently shipping the game without them.
  for (const pkg of PACKAGES) {
    for (const dir of dirsIn(join(FK_ROOT, 'packages', pkg, 'image', 'anim'))) {
      out.push({ name: basename(dir), kind: 'card', dir, pack: pkg });
    }
  }
  for (const dir of dirsIn(join(FK_ROOT, 'image', 'anim'))) {
    if (basename(dir) === 'skillInvoke') {
      for (const cat of dirsIn(dir)) {
        out.push({ name: `skillInvoke/${basename(cat)}`, kind: 'skill', dir: cat, pack: 'core' });
      }
    } else {
      out.push({ name: basename(dir), kind: 'common', dir, pack: 'core' });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ packing */

function have(bin) {
  try { execFileSync('which', [bin], { stdio: 'pipe' }); return true; } catch { return false; }
}

/** Evenly spaced subset of `arr`, always keeping the first and last frame so an
 *  effect still starts and ends where the artist drew it starting and ending. */
function resample(arr, max) {
  if (arr.length <= max) return arr;
  if (max === 1) return [arr[0]];
  const out = [];
  for (let i = 0; i < max; i++) out.push(arr[Math.round((i * (arr.length - 1)) / (max - 1))]);
  return out;
}

function pack(effect, tmp) {
  const all = framesOf(effect.dir)
    .map((file) => ({ file, size: pngSize(file) }))
    .filter((f) => f.size && f.size.w >= MIN_FRAME && f.size.h >= MIN_FRAME);
  if (!all.length) return null;
  const frames = resample(all, MAX_FRAMES);

  const boxW = Math.max(...frames.map((f) => f.size.w));
  const boxH = Math.max(...frames.map((f) => f.size.h));
  // One scale factor for the whole folder, so frames keep their relative sizes.
  const scale = Math.min(1, CAP / Math.max(boxW, boxH));
  // Even dimensions: some encoders and half-pixel background-positions both
  // behave better, and an odd strip width makes `steps()` drift by a subpixel.
  const fw = Math.max(2, Math.round((boxW * scale) / 2) * 2);
  const fh = Math.max(2, Math.round((boxH * scale) / 2) * 2);

  // One ffmpeg INPUT per frame, padded and scaled individually, then `hstack`.
  //
  // The obvious route — read the folder as an image2 sequence and `tile` it —
  // silently produces a blank strip for any folder whose frames are not all the
  // same size. The demuxer reinitialises the filter graph when the picture size
  // changes and `tile`'s accumulator is reset with it, so `-frames:v 1` captures
  // an empty tile: `crossbow` came out 100 bytes and `vineburn` 2 kB, with the
  // correct dimensions and no error on stderr. Separate inputs each carry their
  // own size, so a mixed folder never reaches a filter that cannot cope.
  const sheetPng = join(tmp, 'sheet.png');
  const args = ['-y', '-loglevel', 'error'];
  for (const f of frames) args.push('-i', f.file);
  // `format=rgba` FIRST, and it is not redundant. The nine `skillInvoke`
  // categories ship as 8-bit palette PNGs whose transparency lives in a `tRNS`
  // chunk. `pad` does not accept pal8, so ffmpeg auto-inserts a conversion of
  // its own choosing — and it picks rgb24, which silently drops the palette's
  // alpha and turns every skill banner into an opaque black square over the
  // player's portrait. Naming rgba explicitly keeps the transparency.
  const chain = frames
    .map((_, i) =>
      `[${i}]format=rgba,pad=${boxW}:${boxH}:(ow-iw)/2:(oh-ih)/2:color=#00000000,`
      + `scale=${fw}:${fh}:flags=lanczos[p${i}]`)
    .join(';');
  const refs = frames.map((_, i) => `[p${i}]`).join('');
  // `hstack` requires two inputs; a one-frame effect is just the padded frame.
  const graph = frames.length > 1 ? `${chain};${refs}hstack=inputs=${frames.length}` : chain;
  args.push(
    '-filter_complex', graph,
    ...(frames.length > 1 ? [] : ['-map', '[p0]']),
    '-frames:v', '1', '-pix_fmt', 'rgba', sheetPng,
  );
  execFileSync('ffmpeg', args, { stdio: 'pipe' });

  // These are painterly glows over transparency, which is what lossy WebP is
  // good at — but the nine `skillInvoke` banners come from 256-colour palette
  // PNGs and compress better losslessly. Encode both and keep the winner rather
  // than guessing per effect.
  const lossy = join(tmp, 'sheet-lossy.webp');
  const lossless = join(tmp, 'sheet-lossless.webp');
  execFileSync('cwebp', ['-quiet', '-q', String(QUALITY), '-alpha_q', String(ALPHA_QUALITY), '-m', '6', '-mt', sheetPng, '-o', lossy], { stdio: 'pipe' });
  execFileSync('cwebp', ['-quiet', '-lossless', '-z', '9', '-mt', sheetPng, '-o', lossless], { stdio: 'pipe' });

  const pickLossless = statSync(lossless).size < statSync(lossy).size;
  const chosen = pickLossless ? lossless : lossy;

  // Both ways this can go wrong are invisible in the output size and in the
  // dimensions, and both have already happened once here: a blank strip from
  // the `tile` bug, and a fully opaque one from the pal8 alpha loss. One byte
  // catches both — the mean of the alpha plane, obtained by asking ffmpeg to
  // scale it to a single pixel. A real effect is a drawing on transparency, so
  // it sits far from either extreme.
  // Two passes and a 32x8 thumbnail rather than a direct scale to 1x1: swscale
  // will not average a 6000-pixel-wide plane down to a single pixel in one
  // step and quietly returns zero if asked, which reads as "blank" for every
  // effect. `flags=area` is the one that actually means it.
  const thumb = execFileSync('ffmpeg', [
    '-v', 'error', '-i', sheetPng,
    '-vf', 'format=rgba,alphaextract,scale=256:32:flags=area,scale=32:8:flags=area',
    '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', '-',
  ], { maxBuffer: 1 << 20 });
  const meanAlpha = thumb.reduce((n, v) => n + v, 0) / Math.max(1, thumb.length);
  if (meanAlpha < 3) throw new Error(`${effect.name}: strip is blank (mean alpha ${meanAlpha})`);
  if (meanAlpha > 250) throw new Error(`${effect.name}: strip lost its alpha (mean alpha ${meanAlpha})`);

  // `_` first is a Jekyll 404 on GitHub Pages; `/` is the skillInvoke category
  // separator and cannot survive in a filename.
  const slug = effect.name.replace(/\//g, '-').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/^[._]+/, '');
  const file = `${slug}.webp`;
  writeFileSync(join(OUT_DIR, file), readFileSync(chosen));

  return {
    name: effect.name,
    kind: effect.kind,
    file,
    frames: frames.length,
    w: fw,
    h: fh,
    bytes: statSync(chosen).size,
    mode: pickLossless ? 'lossless' : 'lossy',
    sourceFrames: all.length,
    rawBytes: all.reduce((n, f) => n + statSync(f.file).size, 0),
  };
}

/* -------------------------------------------------------------------- main */

if (!isDir(FK_ROOT)) {
  process.stderr.write(`no FreeKill checkout at ${FK_ROOT}\n  pass --fk=/path/to/FreeKill\n`);
  process.exit(2);
}
for (const bin of ['ffmpeg', 'cwebp']) {
  if (!have(bin)) {
    process.stderr.write(`${bin} is not on PATH — install it (brew install ffmpeg webp)\n`);
    process.exit(2);
  }
}

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'fk-anim-'));

const sheets = [];
let rawTotal = 0;
for (const effect of discover()) {
  const packed = pack(effect, tmp);
  if (!packed) {
    process.stdout.write(`  skip ${effect.name} (no usable frames)\n`);
    continue;
  }
  sheets.push(packed);
  rawTotal += packed.rawBytes;
  const kb = (n) => `${(n / 1024).toFixed(0)} kB`;
  process.stdout.write(
    `  ${packed.name.padEnd(24)} ${String(packed.frames).padStart(2)}f `
    + `${packed.w}x${packed.h}  ${kb(packed.rawBytes).padStart(8)} -> ${kb(packed.bytes).padStart(7)} ${packed.mode}\n`,
  );
}
rmSync(tmp, { recursive: true, force: true });

sheets.sort((a, b) => a.name.localeCompare(b.name));
const total = sheets.reduce((n, s) => n + s.bytes, 0);

writeFileSync(INDEX_TS, `/* GENERATED by src/room/assets/anim/build-anim.mjs — do not edit.
 *
 * ${sheets.length} effects, ${sheets.reduce((n, s) => n + s.frames, 0)} frames.
 * ${(rawTotal / 1024 / 1024).toFixed(2)} MB of source PNG -> ${(total / 1024).toFixed(0)} kB of WebP.
 *
 * Metadata only. The sheets themselves live in \`public/anim/\` and are fetched
 * the first time an effect plays; nothing here pulls in an image.
 */
export interface AnimSheet {
  /** The name the engine uses — a card name, an \`image/anim\` name, or
   *  \`skillInvoke/<category>\`. */
  readonly name: string;
  readonly kind: 'card' | 'common' | 'skill';
  /** Filename under \`public/anim/\`. */
  readonly file: string;
  readonly frames: number;
  /** One frame's size. The strip is \`frames * w\` wide. */
  readonly w: number;
  readonly h: number;
  readonly bytes: number;
}

export const ANIM_SHEETS: readonly AnimSheet[] = ${
  JSON.stringify(
    sheets.map(({ name, kind, file, frames, w, h, bytes }) => ({ name, kind, file, frames, w, h, bytes })),
    null,
    2,
  ).replace(/^/gm, '')
};

export const ANIM_BY_NAME: ReadonlyMap<string, AnimSheet> =
  new Map(ANIM_SHEETS.map((s) => [s.name, s]));

/** Total transfer cost if every sheet were fetched: ${(total / 1024).toFixed(0)} kB. */
export const ANIM_TOTAL_BYTES = ${total};
`);

process.stdout.write(
  `\n${sheets.length} sheets, ${sheets.reduce((n, s) => n + s.frames, 0)} frames\n`
  + `  source PNG  ${(rawTotal / 1024 / 1024).toFixed(2)} MB\n`
  + `  packed WebP ${(total / 1024).toFixed(0)} kB  (${(rawTotal / total).toFixed(1)}x smaller)\n`
  + `  -> ${OUT_DIR}\n  -> ${INDEX_TS}\n`,
);
