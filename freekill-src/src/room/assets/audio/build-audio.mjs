/**
 * The voice bank: 2,015 recordings out of a FreeKill checkout, re-encoded,
 * levelled, and laid out so the browser can find any one of them without an
 * index lookup.
 *
 *   node src/room/assets/audio/build-audio.mjs --pack=~/FreeKill
 *   node src/room/assets/audio/build-audio.mjs --pack=~/FreeKill --dry
 *   node src/room/assets/audio/build-audio.mjs                      # ship nothing
 *
 * WHY THIS SHIPS NOW, WHEN IT DID NOT BEFORE.
 *
 * The first pass of this lane held the audio back. `provenance.json` has the
 * evidence and it has not changed: seven files in `audio/system/` carry a live
 * `copyright=绯雨音乐` notice, the voice lines share the `Lavf59.27.100`
 * fingerprint with them, and the card "effect sounds" are recordings of a person
 * saying the card's name, dispatched by the speaker's gender. None of that was
 * wrong and none of it has been re-argued.
 *
 * What changed is whose call it was. The owner of this build reviewed the
 * finding and decided to ship: an internal, aesthetics-focused competition
 * project, not a business use, risk accepted and understood. That is a decision
 * for the person publishing, not for the tool, and it is recorded in
 * `provenance.json` under `decision` with the date. This file does what it is
 * told; it does not re-open it, and it does not editorialise in the UI.
 *
 * WHAT COMES OUT.
 *
 *   public/audio/skill/fankui1.mp3     the engine's own path, package stripped
 *   public/audio/death/caocao.mp3
 *   public/audio/win/godsunce.mp3
 *   public/audio/card/male/slash.mp3
 *   public/audio/card/common/horse.mp3
 *   public/audio/system/chain.mp3
 *   public/audio/index.json            what exists, how long it runs
 *
 * The layout is `SkinBank`'s own — `/audio/<type>/<name>.mp3` — with the package
 * directory dropped, because nothing downstream knows or needs a package: the
 * engine looks a sound up by name and searches every extension for it
 * (`SkinBank.qml:231`). Flattening 2,015 files that way produces zero name
 * collisions, which the build asserts rather than assumes. The payoff is that a
 * clip's URL is a pure function of the path the engine put on the wire, so the
 * runtime needs no filename map at all — `index.json` says only what exists and
 * how long it runs, which is 60 kB rather than 300.
 *
 * WHY NOT CONTENT-HASHED FILENAMES. Everything else in this build is
 * (`build-assets.mjs`), and for good reason: an asset that changes must not be
 * served stale. These do not change — they are a frozen snapshot of a checkout —
 * and hashing them would cost a 300 kB filename map on a lane whose entire
 * problem is that 90 MB cannot be eager. `index.json` carries a build stamp and
 * every fetch carries it as `?v=`, which is the same guarantee for four bytes.
 *
 * ENCODING, AND WHY EACH NUMBER.
 *
 * Mono, 32 kHz. The sources are 96–128 kbps MP3, half of them dual-mono, and
 * measuring their spectra (`>11 kHz` sits 20–30 dB down, `>14 kHz` 25–40 dB
 * down) says a 16 kHz Nyquist throws away nothing anybody will miss while
 * 22.05 kHz audibly dulls the sibilants. Bitrate is per role: a two-second bark
 * under music is not a half-second card call and neither is the bed.
 *
 * Levelled, not compressed. 2,015 files off different conversion runs arrive
 * 6 dB apart, and a table where one general is twice as loud as the next is the
 * single most obvious way this can sound amateur. Every file is measured with
 * `loudnorm`'s gated analysis and moved by a *static* gain to a common
 * integrated loudness, with the gain clamped so true peak stays under -1 dBTP.
 * A static gain keeps the performance's own dynamics; `loudnorm`'s dynamic mode
 * would flatten a shout and a whisper into the same thing, which is the opposite
 * of what a voice line is for.
 *
 * MP3, not Opus. Opus at 24 kbps would be 22 MB against 38 and sound better —
 * and `decodeAudioData` is not `<audio>`. Safari only learned Opus-in-WebM in
 * 17.0 and Opus-in-Ogg in 18.4, and Safari's `decodeAudioData` has historically
 * accepted a narrower set than its media element. MP3 is decodable by every
 * `decodeAudioData` that has ever shipped. 16 MB is not worth a browser that
 * goes silent, and nothing here is on the first-paint path.
 *
 * Filenames may not begin with `_`: GitHub Pages runs Jekyll over the published
 * tree and Jekyll refuses those silently. Asserted below, not hoped for.
 */
import { execFile, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { cpus, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = resolve(HERE, '..', '..', '..', '..');
const OUT_DIR = join(WEB_ROOT, 'public', 'audio');
const INDEX_TS = join(WEB_ROOT, 'src', 'room', 'audio', 'clips.generated.ts');
const LINES_TS = join(WEB_ROOT, 'src', 'room', 'audio', 'lines.generated.ts');
const OVERVIEW = join(WEB_ROOT, 'public', 'overview.json');

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const i = hit.indexOf('=');
  return i === -1 ? true : hit.slice(i + 1);
};

const PACK = flag('pack', null);
const DRY = flag('dry', false) === true;
const JOBS = Math.max(2, Number(flag('jobs', Math.max(4, cpus().length))) || 8);

/** The index format `src/room/audio/bank.ts` reads. Bumped when its shape moves. */
const INDEX_VERSION = 1;

/* ------------------------------------------------------------------- roles */

/**
 * What a clip is, which decides its bus, its bitrate and its budget.
 *
 * The engine's own directories carry the distinction and this reads them
 * literally rather than guessing from duration: `audio/skill|death|win` is a
 * performance, `audio/card/<gender>/` is a person saying a card's name (which
 * is also a performance — `usecard.lua:43` picks the directory off
 * `player.gender`, and sound effects do not have a gender), and everything else
 * is foley.
 */
function roleFor(key, seconds) {
  if (key === 'audio/system/bgm') return 'music';
  if (/^audio\/(skill|death|win)\//.test(key)) return 'voice';
  if (/^audio\/card\/(male|female)\//.test(key)) return 'line';
  if (seconds >= 30) return 'music';
  return 'sfx';
}

/** Bitrate per role. A bark under music is not a half-second card call. */
const BITRATE = { music: '72k', voice: '40k', line: '48k', sfx: '56k' };

/**
 * Integrated loudness every clip is moved to, in LUFS.
 *
 * One target for everything, deliberately: the *relative* mix — a death line
 * over a card thwack over a draw riffle — belongs in `runtime.ts` where it can
 * be tuned against the faders, not baked into 38 MB of files that would then
 * have to be re-encoded to change it.
 */
const TARGET_LUFS = -19;
/** Nothing is allowed nearer the ceiling than this after its gain. */
const TARGET_TP = -1.0;

/* ----------------------------------------------------------------- walking */

function walk(absRoot, rel, out) {
  let entries;
  try { entries = readdirSync(absRoot).sort(); } catch { return out; }
  for (const name of entries) {
    const abs = join(absRoot, name);
    const r = rel ? `${rel}/${name}` : name;
    if (statSync(abs).isDirectory()) walk(abs, r, out);
    else if (/\.(mp3|ogg|wav|m4a)$/i.test(name)) out.push({ abs, rel: r });
  }
  return out;
}

/**
 * Every sound in a checkout, keyed the way the engine names it.
 *
 * `packages/<pkg>/audio/skill/fankui1.mp3` and `audio/system/chain.mp3` both
 * become `audio/<type>/<name>`, because that is what `SkinBank.getAudio` looks
 * up and what `LogEvent{PlaySound}` puts on the wire once the package prefix is
 * stripped. A directory that is not a FreeKill checkout is walked whole and
 * keyed by its own layout, which is what makes `--pack` still work for someone
 * with their own recordings.
 */
function collect(root) {
  const engineish = existsSync(join(root, 'packages')) && existsSync(join(root, 'lua'));
  const found = [];
  if (engineish) {
    for (const f of walk(join(root, 'audio'), 'audio', [])) found.push(f);
    for (const pkg of readdirSync(join(root, 'packages')).sort()) {
      const dir = join(root, 'packages', pkg, 'audio');
      if (!existsSync(dir)) continue;
      for (const f of walk(dir, 'audio', [])) found.push({ ...f, pkg });
    }
  } else {
    for (const f of walk(root, '', [])) found.push({ ...f, rel: f.rel.replace(/^audio\//, '') });
    for (const f of found) f.rel = `audio/${f.rel}`;
  }

  const byKey = new Map();
  const collisions = [];
  for (const f of found) {
    const key = f.rel.replace(/\.[^./]+$/, '');
    const seen = byKey.get(key);
    if (seen) { collisions.push(`${key}: ${seen.abs} vs ${f.abs}`); continue; }
    byKey.set(key, { ...f, key });
  }
  if (collisions.length) {
    // Never silently. Two packages claiming one name means one of them would
    // never be heard, and which one is decided by directory order.
    throw new Error(`${collisions.length} name collision(s) flattening the pack:\n  ${collisions.slice(0, 8).join('\n  ')}`);
  }
  for (const key of byKey.keys()) {
    if (key.split('/').some((seg) => seg.startsWith('_'))) {
      throw new Error(`${key} has a path segment beginning with "_"; GitHub Pages will not serve it`);
    }
    if (!/^[A-Za-z0-9_./-]+$/.test(key)) throw new Error(`${key} is not URL-safe`);
  }
  return [...byKey.values()].sort((a, b) => (a.key < b.key ? -1 : 1));
}

/* --------------------------------------------------------------- ffmpeg */

const run = (cmd, args) => new Promise((res, rej) => {
  execFile(cmd, args, { maxBuffer: 1 << 26 }, (err, so, se) => (
    err ? rej(new Error(`${cmd}: ${String(se || err.message).slice(0, 400)}`)) : res({ so, se })));
});

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

/** Duration, and the gated loudness measurement the levelling runs on. */
async function analyse(src) {
  const { so } = await run('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', src,
  ]);
  const seconds = Number(String(so).trim()) || 0;

  let gainDb = 0;
  try {
    const { se } = await run('ffmpeg', [
      '-hide_banner', '-nostats', '-i', src, '-map', 'a:0',
      '-af', `loudnorm=I=${TARGET_LUFS}:TP=${TARGET_TP}:print_format=json`, '-f', 'null', '-',
    ]);
    const m = /\{[^{}]*"input_i"[\s\S]*?\}/.exec(String(se));
    if (m) {
      const j = JSON.parse(m[0]);
      const i = Number(j.input_i);
      const tp = Number(j.input_tp);
      if (Number.isFinite(i) && i > -70) {
        gainDb = TARGET_LUFS - i;
        // Never push a peak into the ceiling to chase a loudness number. A clip
        // that is quiet because it is quiet stays quiet.
        if (Number.isFinite(tp)) gainDb = Math.min(gainDb, TARGET_TP - tp);
        gainDb = Math.max(-12, Math.min(12, gainDb));
      }
    }
  } catch { /* an unmeasurable file is encoded at its own level */ }
  return { seconds, gainDb };
}

/**
 * One clip, encoded.
 *
 * The chain, in order and each for a reason: `highpass` at 70 Hz removes the DC
 * offset and rumble that makes a short clip tick on every play; `volume` is the
 * measured static gain; `alimiter` is the safety net, not the sound — with the
 * gain already clamped under -1 dBTP it should never engage.
 */
async function encode(src, role, gainDb, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  const chain = ['highpass=f=70'];
  if (Math.abs(gainDb) > 0.05) chain.push(`volume=${gainDb.toFixed(2)}dB`);
  chain.push('alimiter=limit=0.98');
  await run('ffmpeg', [
    '-v', 'error', '-y', '-i', src,
    '-map', 'a:0', '-ac', '1', '-ar', '32000',
    '-c:a', 'libmp3lame', '-b:a', BITRATE[role],
    '-af', chain.join(','),
    '-write_xing', '1', '-id3v2_version', '0', '-map_metadata', '-1',
    dest,
  ]);
  return statSync(dest).size;
}

/* ------------------------------------------------------------- the index */

/**
 * Group a bank's filenames into lines the way `QmlBackend::playSound` does.
 *
 * `src/ui/qmlbackend.cpp:271`: with `index == -1` it counts `<name><i>.mp3`
 * upward from 1 until one is missing, then picks uniformly in `[1, i]`; with
 * `i == 0` it plays `<name>.mp3`. So a line is either one unnumbered file or a
 * contiguous run of numbered ones, and the unnumbered file wins whenever both
 * could apply — `SkinBank.getAudio` tries `<name>.mp3` before `<name>1.mp3`.
 *
 * So a base is exactly a name `b` where `b.mp3` is absent and `b1.mp3` is
 * present — which means the bases are found by looking at the files whose name
 * ends in the character `1` and nothing else. Deriving them by regex instead
 * ("strip the trailing digits") gets `xuetu_v31.mp3` wrong: a lazy match strips
 * `31` and asks about `xuetu_v`, when the line is `xuetu_v3`. One character is
 * the whole rule.
 *
 * The `b.mp3 is absent` half is what stops `fastchat_m1` swallowing
 * `fastchat_m11`: `fastchat_m1` exists as a file, so `fastchat_m11` is take
 * eleven of `fastchat_m`, not take one of `fastchat_m1` — exactly what
 * `getAudio` would resolve.
 */
function groupTakes(names) {
  const have = new Set(names);
  const lines = new Map();
  const consumed = new Set();

  for (const n of names) {
    if (!n.endsWith('1')) continue;
    const base = n.slice(0, -1);
    if (!base || have.has(base) || lines.has(base)) continue;
    const takes = [];
    for (let k = 1; ; k += 1) {
      const f = `${base}${k}`;
      if (!have.has(f)) break;
      takes.push(f);
    }
    lines.set(base, takes);
    for (const t of takes) consumed.add(t);
  }
  for (const n of names) {
    if (consumed.has(n) || lines.has(n)) continue;
    lines.set(n, [n]);
  }
  return lines;
}

/** Centiseconds, which is all the timing model ever asks of a duration. */
const cs = (seconds) => Math.max(1, Math.round(seconds * 100));

/**
 * The generals table: gender, and the skill lines that actually resolve.
 *
 * Read off `public/overview.json` — the same frozen dump the reference pages
 * use, produced by booting the real client VM — rather than re-booting one
 * here. It exists to answer two questions at runtime that nothing on the wire
 * can: which gender a seat is (the room state carries a `gender` field that no
 * `applyNotify` case ever writes), and which lines are worth warming when a
 * general takes a seat.
 *
 * `s` is resolved at build time, in `RoomLogic.js:1402`'s own order: the
 * general's own take of a skill if the pack has one, otherwise the shared take.
 */
function generalsTable(banks, files) {
  const empty = { table: {}, coverage: null };
  if (!existsSync(OVERVIEW)) return { ...empty, note: 'no overview.json; no gender or warm-set data' };
  let ov;
  try { ov = JSON.parse(readFileSync(OVERVIEW, 'utf8')); } catch { return { ...empty, note: 'overview.json unreadable' }; }

  const table = {};
  const generals = ov.generals ?? [];
  const cov = {
    generals: generals.length,
    withAnyLine: 0,
    skills: 0,
    skillsHeard: 0,
    death: 0,
    win: 0,
    mute: [],
    silent: [],
    shadowed: [],
  };
  for (const g of generals) {
    const lines = [];
    for (const s of g.skills ?? []) {
      cov.skills += 1;
      const own = `${s}_${g.name}`;
      const pick = banks.skill.has(own) ? own : banks.skill.has(s) ? s : null;
      if (pick) { lines.push(pick); cov.skillsHeard += 1; } else {
        cov.mute.push(`${g.name}/${s}`);
        // A skill whose recording exists as a file but got folded into another
        // line's take run would be silent for a reason nobody could see. It has
        // never happened in this pack; if it ever does, the build says so.
        if (files.skill.has(s) || files.skill.has(own)) cov.shadowed.push(`${g.name}/${s}`);
      }
    }
    if (lines.length) cov.withAnyLine += 1; else cov.silent.push(g.name);
    if (banks.death.has(g.name)) cov.death += 1;
    if (banks.win.has(g.name)) cov.win += 1;
    table[g.name] = { g: Number(g.gender) || 0, s: lines };
  }
  return {
    table,
    coverage: cov,
    note: `${cov.withAnyLine}/${cov.generals} generals speak; ${cov.skillsHeard}/${cov.skills} skills, `
      + `${cov.death}/${cov.generals} death lines, ${cov.win}/${cov.generals} victory lines`,
  };
}

/* ---------------------------------------------------------------- the build */

async function build(packDir) {
  const root = resolve(packDir.replace(/^~(?=\/|$)/, process.env.HOME ?? '~'));
  if (!existsSync(root)) throw new Error(`no such pack directory: ${root}`);
  const sources = collect(root);
  if (!sources.length) throw new Error(`no audio files under ${root}`);

  const t0 = Date.now();
  process.stdout.write(`measuring ${sources.length} files`);
  const measured = await pool(sources, JOBS, async (s) => ({ ...s, ...(await analyse(s.abs)) }));
  process.stdout.write(` — ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);

  for (const m of measured) m.role = roleFor(m.key, m.seconds);

  if (!DRY) {
    rmSync(OUT_DIR, { recursive: true, force: true });
    mkdirSync(OUT_DIR, { recursive: true });
  }
  const scratch = DRY ? mkdtempSync(join(tmpdir(), 'fk-audio-')) : null;

  const t1 = Date.now();
  process.stdout.write(`encoding`);
  await pool(measured, JOBS, async (m) => {
    const rel = `${m.key.replace(/^audio\//, '')}.mp3`;
    const dest = DRY ? join(scratch, rel) : join(OUT_DIR, rel);
    m.bytes = await encode(m.abs, m.role, m.gainDb, dest);
    if (DRY) rmSync(dest, { force: true });
  });
  if (scratch) rmSync(scratch, { recursive: true, force: true });
  process.stdout.write(` — ${((Date.now() - t1) / 1000).toFixed(0)}s\n`);

  /* --------------------------------------------------------------- index */

  const banks = { skill: [], death: [], win: [] };
  const files = {};
  const byKey = new Map(measured.map((m) => [m.key, m]));
  for (const m of measured) {
    const b = /^audio\/(skill|death|win)\/(.+)$/.exec(m.key);
    if (b) banks[b[1]].push(b[2]);
    else files[m.key.replace(/^audio\//, '')] = cs(m.seconds);
  }

  const index = { v: INDEX_VERSION, stamp: '', files, skill: {}, death: {}, win: {}, generals: {} };
  const lineNames = { skill: null, death: null, win: null };
  const fileNames = { skill: null, death: null, win: null };
  for (const bank of ['skill', 'death', 'win']) {
    const lines = groupTakes(banks[bank]);
    lineNames[bank] = new Set(lines.keys());
    fileNames[bank] = new Set(banks[bank]);
    for (const [name, takes] of [...lines.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
      const durs = takes.map((t) => cs(byKey.get(`audio/${bank}/${t}`).seconds));
      // A single unnumbered file is a number; a run of takes is an array. That
      // is the whole difference between `fankui.mp3` and `fankui1..2.mp3`, and
      // it is what tells the runtime which URL to build.
      index[bank][name] = takes.length === 1 && takes[0] === name ? durs[0] : durs;
    }
  }
  const { table, note, coverage } = generalsTable(lineNames, fileNames);
  index.generals = table;

  const json = JSON.stringify(index);
  index.stamp = createHash('sha256').update(json).digest('hex').slice(0, 10);
  const finalJson = JSON.stringify(index);
  if (!DRY) writeFileSync(join(OUT_DIR, 'index.json'), finalJson);

  /* ------------------------------------------------------------- summary */

  const totals = {};
  let bytes = 0;
  let seconds = 0;
  let sourceBytes = 0;
  for (const m of measured) {
    totals[m.role] = totals[m.role] ?? { n: 0, bytes: 0, seconds: 0 };
    totals[m.role].n += 1;
    totals[m.role].bytes += m.bytes;
    totals[m.role].seconds += m.seconds;
    bytes += m.bytes;
    seconds += m.seconds;
    sourceBytes += statSync(m.abs).size;
  }

  const summary = {
    version: INDEX_VERSION,
    stamp: index.stamp,
    clips: measured.length,
    bytes,
    seconds: Math.round(seconds),
    indexBytes: finalJson.length,
    lines: { skill: index.skill, death: index.death, win: index.win },
    roles: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, { n: v.n, bytes: v.bytes }])),
    coverage,
    source: root,
  };
  if (!DRY) {
    writeFileSync(INDEX_TS, renderSummary(summary));
    writeFileSync(LINES_TS, renderLines(summary));
  }

  console.log(`\n${measured.length} clips  ${(sourceBytes / 1048576).toFixed(1)} MB -> ${(bytes / 1048576).toFixed(1)} MB` +
    `  (${(seconds / 60).toFixed(0)} min of audio)`);
  for (const [role, v] of Object.entries(totals).sort((a, b) => b[1].bytes - a[1].bytes)) {
    console.log(`  ${role.padEnd(6)} ${String(v.n).padStart(5)} files  ${(v.bytes / 1048576).toFixed(2).padStart(6)} MB  ` +
      `${(v.seconds / 60).toFixed(1).padStart(6)} min`);
  }
  console.log(`  index  ${(finalJson.length / 1024).toFixed(0)} kB  stamp ${index.stamp}`);
  console.log(`  lines  skill ${Object.keys(index.skill).length}  death ${Object.keys(index.death).length}  ` +
    `win ${Object.keys(index.win).length}  generals ${Object.keys(index.generals).length}`);
  console.log(`  ${note}`);
  if (coverage) {
    if (coverage.silent.length) {
      console.log(`  ${coverage.silent.length} general(s) with no skill line: ${coverage.silent.join(' ')}`);
    }
    if (coverage.shadowed.length) {
      console.log(`  !! ${coverage.shadowed.length} skill(s) have a file that the take grouping swallowed: ` +
        `${coverage.shadowed.join(' ')}`);
    }
  }
  if (DRY) console.log('\n--dry: nothing was written.');
  else console.log(`\n-> ${OUT_DIR}\n-> ${INDEX_TS}`);
}

function buildEmpty() {
  rmSync(OUT_DIR, { recursive: true, force: true });
  writeFileSync(INDEX_TS, renderSummary(null));
  writeFileSync(LINES_TS, renderLines(null));
  console.log('0 clips. Every sound is synthesised at runtime; see src/room/audio/provenance.json.');
}

/**
 * The only part of the pack that lands in the first-paint bundle.
 *
 * It has to be small, and it has to be a compile-time constant, because
 * `GameAudio.tsx` reads it at the app root to decide whether the panel offers a
 * voice fader. The 2,015-row index it summarises is in `public/audio/index.json`
 * and is fetched by `bank.ts` the first time a cue needs one — the whole point
 * being that a visitor who never turns sound on downloads none of it.
 *
 * `LINES` is the exception, and it is here on purpose: a build-time listing of
 * which skill and death lines exist, so the coverage tests can assert against
 * the real pack rather than against a hand-kept list. It is `import type`-free
 * data behind a named export the app never imports, so it tree-shakes out of
 * every chunk but the tests'.
 */
function renderSummary(s) {
  return `/* GENERATED by src/room/assets/audio/build-audio.mjs — do not edit.
 *
 * ${s ? `${s.clips} clips, ${(s.bytes / 1048576).toFixed(1)} MB, ${Math.round(s.seconds / 60)} minutes` : 'empty — no clip ships'}.
 *
 * A SUMMARY, never the index and never audio. The index is
 * \`public/audio/index.json\` (${s ? `${(s.indexBytes / 1024).toFixed(0)} kB` : 'absent'}), fetched by \`bank.ts\` the
 * first time a cue asks for a clip; the audio is
 * \`public/audio/<type>/<name>.mp3\`, fetched one clip at a time, on first use,
 * and cached.
 *
 * THIS FILE IS THE ONLY PART OF THE PACK ON THE FIRST-PAINT PATH, which is why
 * it is a handful of numbers and nothing else. \`GameAudio\` reads it at the app
 * root to decide whether to draw a voice fader, and that is all it is for. The
 * per-line listing a test would want is in the sibling \`lines.generated.ts\`,
 * which the app never imports.
 *
 * See \`provenance.json\` for what these recordings are and whose decision it was
 * to ship them.
 */

export interface PackSummary {
  /** Index format \`bank.ts\` understands. */
  readonly version: number;
  /** Content stamp, sent as \`?v=\` on every fetch so a rebuild is never stale. */
  readonly stamp: string;
  readonly clips: number;
  readonly bytes: number;
  readonly seconds: number;
  readonly roles: Readonly<Record<string, { readonly n: number; readonly bytes: number }>>;
}

export const PACK: PackSummary | null = ${s ? JSON.stringify({
    version: s.version,
    stamp: s.stamp,
    clips: s.clips,
    bytes: s.bytes,
    seconds: s.seconds,
    roles: s.roles,
  }, null, 2) : 'null'};
`;
}

/**
 * The per-line listing, in its own module because the app must never pull it in.
 *
 * `clips.generated.ts` is imported at the app root; anything exported beside
 * `PACK` would be relying on Rollup to shake 27 kB of data out of the
 * first-paint chunk, and "the bundler probably drops it" is not a measurement.
 * Two files is: nothing imports this one but `__tests__/pack.test.ts`.
 */
function renderLines(s) {
  const cov = s?.coverage ?? null;
  return `/* GENERATED by src/room/assets/audio/build-audio.mjs — do not edit.
 *
 * What the pack holds and what it covers, for the tests. THE APP DOES NOT
 * IMPORT THIS FILE and must not start: it is ${s ? `${((JSON.stringify(s.lines).length + JSON.stringify(cov).length) / 1024).toFixed(0)} kB` : '0 kB'} of build-time
 * bookkeeping, and the runtime's copy of the same facts is
 * \`public/audio/index.json\`, fetched only when sound is on.
 */

/** What the pack covers, measured against the engine's own general list. */
export interface PackCoverage {
  readonly generals: number;
  /** Generals with at least one skill line. */
  readonly withAnyLine: number;
  readonly skills: number;
  readonly skillsHeard: number;
  readonly death: number;
  readonly win: number;
  /** \`<general>/<skill>\` pairs with no recording anywhere in the pack. */
  readonly mute: readonly string[];
  /** Generals with no skill line at all. */
  readonly silent: readonly string[];
  /**
   * Skills whose file exists but was folded into another line's take run, so
   * the engine would find it and this pack would not. Empty, and asserted
   * empty: if it ever fills, \`groupTakes\` and \`QmlBackend::playSound\` have
   * stopped agreeing.
   */
  readonly shadowed: readonly string[];
}

export const COVERAGE: PackCoverage | null = ${cov ? JSON.stringify(cov) : 'null'};

/**
 * Every line the pack holds, by bank, with each take's length in centiseconds.
 * A number is one unnumbered file; an array is a numbered run from 1.
 */
export const LINES: Readonly<Record<'skill' | 'death' | 'win', Readonly<Record<string, number | readonly number[]>>>> = ${
  s ? JSON.stringify(s.lines) : '{ skill: {}, death: {}, win: {} }'};
`;
}

/* ------------------------------------------------------------------- main */

try {
  execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  execFileSync('ffprobe', ['-version'], { stdio: 'ignore' });
} catch {
  console.error('ffmpeg and ffprobe are required. `brew install ffmpeg`.');
  process.exit(2);
}

if (PACK) await build(String(PACK));
else buildEmpty();
