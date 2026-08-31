// Post-processing over what run-all.mjs recorded: shapes the raw spike output
// into the forms src/contract/ freezes, and emits the sample asset manifest.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { ENGINE_ROOT } from './build-bundle.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const FIX = join(here, '..', 'fixtures');
const read = (n) => JSON.parse(readFileSync(join(FIX, n), 'utf8'));
const write = (n, o) => {
  const s = JSON.stringify(o);
  writeFileSync(join(FIX, n), s);
  console.log(`  ${n.padEnd(28)} ${(s.length / 1024).toFixed(0)} KiB`);
};

// ---------------------------------------------------------------- envelopes
const stream = read('seat-command-stream.json');
const byBatch = new Map();
for (const m of stream) {
  const b = m.batch ?? 0;
  if (!byBatch.has(b)) byBatch.set(b, []);
  byBatch.get(b).push({ seq: m.seq, kind: m.kind, command: m.command, data: m.data, bytes: m.bytes });
}
write('envelopes.json', [...byBatch.entries()].sort((a, b) => a[0] - b[0]).map(([batch, messages]) => ({
  roomId: 'spike', batch, to: 1, messages,
})));

// -------------------------------------------------------------- command log
const log = read('command-log.json');
write('command-log.json', {
  seed: log.seed,
  engineBundleSha256_16: log.engineBundleSha256_16,
  note: log.note,
  steps: log.steps.map((s) => ({
    seq: s.i, playerId: s.pid, command: s.command, reply: s.reply, digest: s.digest,
  })),
});

// ----------------------------------------------------------- asset manifest
const PACKS = ['standard', 'standard_cards', 'maneuvering'];
const KIND = (rel) =>
  rel.includes('/image/generals/') ? 'general'
  : rel.includes('/image/card') ? 'card'
  : rel.includes('/audio/skill/') ? 'skill-audio'
  : rel.includes('/audio/death/') ? 'death-audio'
  : rel.includes('/audio/card/') ? 'card-audio'
  : 'misc';
const KEEP = new Set(['.png', '.jpg', '.jpeg', '.webp', '.mp3', '.ogg']);
const entries = [];
const walk = (abs, rel, pack) => {
  for (const name of readdirSync(abs).sort()) {
    const a = join(abs, name);
    const r = `${rel}/${name}`;
    if (statSync(a).isDirectory()) walk(a, r, pack);
    else if (KEEP.has(extname(name).toLowerCase())) {
      const buf = readFileSync(a);
      const h = createHash('sha256').update(buf).digest('hex').slice(0, 8);
      entries.push({
        key: r, href: `assets/${h}${extname(name).toLowerCase()}`,
        kind: KIND(r), bytes: buf.length, pack,
      });
    }
  }
};
for (const p of PACKS) walk(join(ENGINE_ROOT, 'packages', p), `packages/${p}`, p);
const totals = {};
for (const e of entries) totals[e.kind] = (totals[e.kind] ?? 0) + e.bytes;
write('asset-manifest.json', { version: 1, base: '/freekill/', entries, totals });
console.log('  asset totals:', JSON.stringify(totals), 'entries:', entries.length);
