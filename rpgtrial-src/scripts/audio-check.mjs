#!/usr/bin/env node
// Lists every file under public/assets/audio with size + duration and asserts the budget:
//   total <= 25 MB, every file <= 3 MB, every manifest entry present, every file decodable (ffprobe).
// Usage: node scripts/audio-check.mjs [--quiet]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'public/assets/audio');
const BUDGET = 25 * 1024 * 1024, PER_FILE = 3 * 1024 * 1024;
const QUIET = process.argv.includes('--quiet');
const FFPROBE = process.env.FFPROBE || 'ffprobe';
const haveProbe = spawnSync(FFPROBE, ['-version']).status === 0;

/** Duration without ffprobe: parse MP3 frame headers (CBR/VBR by counting frames). */
function mp3Duration(buf) {
  const BR = [[0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448], [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256], [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320], [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]];
  const SR = [[44100, 48000, 32000], [22050, 24000, 16000], [11025, 12000, 8000]];
  let i = 0;
  if (buf.length > 10 && buf.toString('latin1', 0, 3) === 'ID3') { const sz = (buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9]; i = 10 + sz; }
  let frames = 0, samples = 0;
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff || (buf[i + 1] & 0xe0) !== 0xe0) { i++; continue; }
    const ver = (buf[i + 1] >> 3) & 3, layer = (buf[i + 1] >> 1) & 3, brI = buf[i + 2] >> 4, srI = (buf[i + 2] >> 2) & 3, pad = (buf[i + 2] >> 1) & 1;
    if (ver === 1 || layer === 0 || brI === 0 || brI === 15 || srI === 3) { i++; continue; }
    const mpeg1 = ver === 3, l = 4 - layer;                                  // l: 1,2,3
    const table = mpeg1 ? (l === 1 ? 0 : l === 2 ? 1 : 2) : (l === 1 ? 2 : 3);
    const br = BR[table][brI] * 1000, sr = SR[mpeg1 ? 0 : ver === 2 ? 1 : 2][srI];
    const spf = l === 1 ? 384 : l === 3 && !mpeg1 ? 576 : 1152;
    const len = l === 1 ? ((12 * br) / sr + pad) * 4 : Math.floor((spf / 8) * br / sr) + pad;
    if (len < 4) { i++; continue; }
    frames++; samples += spf; i += len;
    if (frames === 1) { /* skip Xing/Info frame? it is counted; negligible */ }
  }
  return frames ? samples / (SR[0][0]) : 0; // assumes 44.1k (the pipeline always writes 44.1k)
}
function probe(file) {
  if (haveProbe) {
    const r = spawnSync(FFPROBE, ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=channels,sample_rate,bit_rate:format=duration', '-of', 'json', file], { encoding: 'utf8' });
    if (r.status === 0) { try { const j = JSON.parse(r.stdout); return { dur: parseFloat(j.format?.duration ?? '0'), ch: j.streams?.[0]?.channels ?? 0, sr: j.streams?.[0]?.sample_rate, ok: !!j.streams?.length }; } catch { /* */ } }
    return { dur: 0, ch: 0, ok: false };
  }
  const buf = fs.readFileSync(file); return { dur: mp3Duration(buf), ch: 0, ok: buf.length > 0 };
}

const files = [];
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(mp3|ogg|wav|m4a)$/i.test(e.name)) files.push(p); } };
walk(DIR);
files.sort();
let total = 0, problems = [];
const groups = {};
for (const f of files) {
  const st = fs.statSync(f), p = probe(f); total += st.size;
  const rel = path.relative(DIR, f); const g = rel.split(path.sep)[0]; groups[g] = groups[g] || { n: 0, bytes: 0, dur: 0 }; groups[g].n++; groups[g].bytes += st.size; groups[g].dur += p.dur;
  if (!QUIET) console.log(`${(st.size / 1024).toFixed(0).padStart(6)} KB  ${p.dur.toFixed(2).padStart(7)} s  ${p.ch ? p.ch + 'ch' : '   '}  ${rel}`);
  if (st.size > PER_FILE) problems.push(`${rel} is ${(st.size / 1048576).toFixed(2)} MB (> 3 MB)`);
  if (!p.ok || p.dur <= 0) problems.push(`${rel} is not decodable / has no duration`);
  const head = fs.readFileSync(f).subarray(0, 64).toString('latin1'); if (/<!doctype|<html/i.test(head)) problems.push(`${rel} is an HTML page`);
}
// manifest cross-check
const manifestPath = path.join(ROOT, 'src/audio/manifest.generated.ts');
if (fs.existsSync(manifestPath)) {
  const ids = [...fs.readFileSync(manifestPath, 'utf8').matchAll(/file: '([^']+)'/g)].map((m) => m[1]);
  for (const id of ids) if (!fs.existsSync(path.join(DIR, id))) problems.push(`manifest entry missing on disk: ${id}`);
  const onDisk = new Set(files.map((f) => path.relative(DIR, f).split(path.sep).join('/')));
  for (const id of ids) onDisk.delete(id);
  if (onDisk.size) console.log(`note: ${onDisk.size} file(s) on disk not in manifest: ${[...onDisk].slice(0, 8).join(', ')}${onDisk.size > 8 ? '…' : ''}`);
  console.log(`manifest: ${ids.length} entries`);
} else problems.push('src/audio/manifest.generated.ts missing (run scripts/fetch-audio.mjs)');

console.log('\ngroup      files      MB     minutes');
for (const [g, v] of Object.entries(groups)) console.log(`${g.padEnd(10)} ${String(v.n).padStart(5)}  ${(v.bytes / 1048576).toFixed(2).padStart(6)}  ${(v.dur / 60).toFixed(1).padStart(8)}`);
console.log(`TOTAL      ${String(files.length).padStart(5)}  ${(total / 1048576).toFixed(2).padStart(6)}   budget ${(BUDGET / 1048576).toFixed(0)} MB (${((total / BUDGET) * 100).toFixed(0)}%)${haveProbe ? '' : '  [durations parsed from MP3 headers; ffprobe not found]'}`);
if (total > BUDGET) problems.push(`total ${(total / 1048576).toFixed(2)} MB exceeds the 25 MB budget`);
if (problems.length) { console.error('\nPROBLEMS:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('OK: budget and integrity checks passed');
