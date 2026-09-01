/**
 * The audio index. In the public build it is deliberately empty.
 *
 *   node src/room/assets/audio/build-audio.mjs              # the shipped state
 *   node src/room/assets/audio/build-audio.mjs --pack=<dir> # a pack you have rights to
 *
 * WHY THERE IS NOTHING TO PACK.
 *
 * This lane was briefed to ship the engine's music and sound effects and to hold
 * back only the general voice lines, on the strength of an earlier audit that
 * had cleared `audio/system/` and the card effect sounds and flagged the ~147
 * voice and death lines. That premise was checked before anything was deployed,
 * and it does not survive the check:
 *
 *   * Seven files in `audio/system/` still carry an intact third-party
 *     copyright notice. `egg1`, `egg2`, `flower1`, `flower2`, `fly1`, `fly2`
 *     each read `copyright=绯雨音乐 / composer=绯雨音乐 / TOPE=绯雨音乐 /
 *     comment=www.LightRain.com.cn`, and `gamestart.mp3` carries the same URL.
 *     绯雨音乐 is a commercial game-audio studio whose own portfolio lists four
 *     years of voice work on 三国杀OL. That is a live third-party claim inside
 *     the set that was called safe.
 *   * The card "effect sounds" are not effects. `events/usecard.lua:43` builds
 *     their path as `.../audio/card/<male|female>/<name>` and picks the
 *     directory from `player.gender`. Sound effects do not have a gender; these
 *     are recordings of someone saying the card's name, which is the same thing
 *     the voice lines are.
 *   * `packages/standard_cards/audio/card/male/peach.mp3` and
 *     `packages/standard/audio/death/caocao.mp3` carry the identical
 *     `encoder=Lavf59.27.100` fingerprint. The set that was cleared and the set
 *     that was flagged came off the same conversion run, so there was never an
 *     evidentiary line between them to draw.
 *   * `bgm.mp3` is an Ogg Vorbis stream remuxed to MP3 (`ENCODER=Lavc57.107.100
 *     vorbis`) with no author anywhere in the chain.
 *
 * The repository's GPL-3.0 grant does not fix this. It is repository-scoped, its
 * SPDX rollout put licence headers on source files and on nothing else, and a
 * grant is only effective from someone who holds the copyright — a contributor
 * cannot license a recording they do not own by committing it.
 *
 * The full evidence, per set, with the commands to reproduce it, is in
 * `src/room/audio/provenance.json`. Read that before changing this file.
 *
 * WHAT SHIPS INSTEAD. Everything the site sounds like is synthesised in the
 * browser: `src/room/audio/sfx.ts` for the table, `generative.ts` for the music.
 * That is zero bytes of audio assets, an unambiguous licence, and — for the
 * music — a rotation that never repeats, which one 110-second mp3 could not have
 * given us anyway.
 *
 * WHAT THIS SCRIPT IS STILL FOR. Somebody running their own copy, with their own
 * licensed recordings, should not have to patch code to use them. `--pack=<dir>`
 * indexes any directory laid out the way the engine names sounds and emits
 * `clips.generated.ts` plus `public/audio/`; at runtime a clip in the index wins
 * over the synthesised patch and anything missing falls through to it. This is
 * the same shape as FreeKill's own 资源包 mechanism, which upstream gitignores
 * and treats as user-supplied. Do not point it at a FreeKill checkout and deploy
 * the result.
 *
 * Filenames are content hashes, so none can begin with `_` — GitHub Pages runs
 * Jekyll over the published tree and Jekyll silently refuses to serve those.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = resolve(HERE, '..', '..', '..', '..');
const OUT_DIR = join(WEB_ROOT, 'public', 'audio');
const INDEX_TS = join(WEB_ROOT, 'src', 'room', 'audio', 'clips.generated.ts');

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const [, v] = hit.split('=');
  return v === undefined ? true : v;
};

const PACK = flag('pack', null);

/**
 * Clips the mixer treats as a bed rather than a one-shot: crossfaded, never cut
 * off, on the music fader. Anything over half a minute is music by definition,
 * and a pack can say so explicitly by putting it under `music/`.
 */
const MUSIC_SECONDS = 30;

function walk(absRoot, rel, out) {
  let entries;
  try { entries = readdirSync(absRoot).sort(); } catch { return out; }
  for (const name of entries) {
    const abs = join(absRoot, name);
    const r = rel ? `${rel}/${name}` : name;
    if (statSync(abs).isDirectory()) walk(abs, r, out);
    else if (/\.(mp3|ogg|wav|m4a)$/i.test(name)) out.push(r);
  }
  return out;
}

function probeSeconds(src) {
  const raw = execFileSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', src,
  ], { encoding: 'utf8' });
  const n = Number(raw.trim());
  return Number.isFinite(n) ? n : 0;
}

/**
 * Mono, 32 kHz, and a bitrate chosen for the job.
 *
 * 64 kbps for a bed because it is the only thing anyone listens *to*; 48 for a
 * half-second impact under a table. The highpass removes the DC offset that
 * makes a short sting click on every play, and the limiter stops a pack of
 * mixed-loudness recordings from clipping the bus.
 */
function encode(src, role, tmpDir) {
  const out = join(tmpDir, `${createHash('sha1').update(src).digest('hex')}.mp3`);
  execFileSync('ffmpeg', [
    '-v', 'error', '-y', '-i', src,
    '-map', 'a:0', '-ac', '1', '-ar', '32000', '-b:a', role === 'music' ? '64k' : '48k',
    '-af', 'highpass=f=35,alimiter=limit=0.97',
    '-write_xing', '1', out,
  ]);
  const bytes = readFileSync(out);
  rmSync(out, { force: true });
  return bytes;
}

/* --------------------------------------------------------------------- main */

function build(packDir) {
  const root = resolve(packDir);
  if (!existsSync(root)) throw new Error(`no such pack directory: ${root}`);
  const rels = walk(root, '', []);
  if (!rels.length) throw new Error(`no audio files under ${root}`);

  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });
  const tmpDir = mkdtempSync(join(tmpdir(), 'fk-audio-'));

  const rows = [];
  let sourceBytes = 0;
  for (const rel of rels) {
    const src = join(root, rel);
    const seconds = probeSeconds(src);
    // The engine names a sound without its extension everywhere it names one —
    // `./audio/system/chain`, `./packages/standard_cards/audio/card/male/slash`
    // — so the key drops it too and lookup needs no normalising.
    const key = rel.replace(/\.[^./]+$/, '');
    const role = seconds >= MUSIC_SECONDS || key.startsWith('music/') ? 'music'
      : /\/audio\/(skill|death|win)\//.test(`/${key}/`) ? 'voice'
        : 'sfx';
    const bytes = encode(src, role, tmpDir);
    const file = `${createHash('sha256').update(bytes).digest('hex').slice(0, 12)}.mp3`;
    const dest = join(OUT_DIR, file);
    if (!existsSync(dest)) writeFileSync(dest, bytes);
    sourceBytes += statSync(src).size;
    rows.push({ key, file, role, bytes: bytes.length, seconds: Math.round(seconds * 100) / 100 });
  }
  rmSync(tmpDir, { recursive: true, force: true });
  rows.sort((a, b) => (a.key < b.key ? -1 : 1));

  const outBytes = rows.reduce((n, r) => n + r.bytes, 0);
  writeFileSync(INDEX_TS, render(rows, `packed from ${root}`));
  console.log(`${rows.length} clips  ${(sourceBytes / 1048576).toFixed(2)} MB -> ${(outBytes / 1024).toFixed(0)} kB`);
  console.log('This build now carries third-party audio. Check you may redistribute it');
  console.log('before deploying — see src/room/audio/provenance.json.');
}

function buildEmpty() {
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });
  // Jekyll and git both drop an empty directory, and `public/audio/` existing is
  // not load-bearing — nothing is fetched from it when the index is empty.
  rmSync(OUT_DIR, { recursive: true, force: true });
  writeFileSync(INDEX_TS, render([], 'no clip ships: every sound is synthesised — see provenance.json'));
  console.log('0 clips. Every sound is synthesised at runtime; see src/room/audio/provenance.json.');
}

function render(rows, why) {
  const summary = rows.length
    ? `${rows.length} clips, ${(rows.reduce((n, r) => n + r.bytes, 0) / 1024).toFixed(0)} kB`
    : 'empty';
  return `/* GENERATED by src/room/assets/audio/build-audio.mjs — do not edit.
 *
 * ${summary}. ${why}
 *
 * An INDEX, never audio: whatever is listed here lives in \`public/audio/\` and is
 * fetched the first time a cue asks for it. An empty index is a working game —
 * every cue carries a synthesised patch (\`sfx.ts\`, \`generative.ts\`) and a clip
 * is only ever preferred over it, never required by it.
 *
 * Keys are the engine's own sound paths with the extension dropped, because that
 * is the shape \`LogEvent{PlaySound}\` puts on the wire.
 */

/** What a clip is for. Decides its bus, its volume and whether it may be cut off. */
export type ClipRole = 'music' | 'sfx' | 'voice';

export interface Clip {
  /** Engine sound path, no extension: \`audio/system/chain\`. */
  readonly key: string;
  /** Filename under \`public/audio/\`. */
  readonly file: string;
  readonly role: ClipRole;
  readonly bytes: number;
  readonly seconds: number;
}

export const CLIPS: readonly Clip[] = ${JSON.stringify(rows, null, 2)};

export const CLIP_BY_KEY: ReadonlyMap<string, Clip> = new Map(CLIPS.map((c) => [c.key, c]));
`;
}

if (PACK) build(String(PACK));
else buildEmpty();
