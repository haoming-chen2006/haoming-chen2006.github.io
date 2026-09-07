// Runs each seed twice and checks the per-tick state hashes agree. Run: node scripts/determinism_test.ts [seed ...]
// Run it under another engine too (e.g. `bun scripts/determinism_test.ts`) and compare the printed hashes.
declare const process: { argv: string[]; exitCode?: number };
import { Simulation } from '../src/game/sim.ts';
import { idleCommand } from '../src/game/hero.ts';
import { PRESET_DECKS, cardsFromIds } from '../src/game/cards.ts';
import { TICK } from '../src/game/constants.ts';

const seeds = process.argv.length > 2 ? process.argv.slice(2).map(Number) : [1, 2, 3];
const MAX_TIME = 240;
const names = Object.keys(PRESET_DECKS);

const fnv = (h: number, s: string): number => {
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h;
};
const hex = (h: number): string => (h >>> 0).toString(16).padStart(8, '0');

interface Run { hashes: number[]; time: number; phase: string }

function run(seed: number): Run {
  const dA = names[seed % names.length], dB = names[(seed * 3 + 1) % names.length];
  const sim = new Simulation({ playerDeck: cardsFromIds(PRESET_DECKS[dA]), botDeck: cardsFromIds(PRESET_DECKS[dB]), difficulty: 'normal', seed, botVsBot: true });
  sim.skipCountdown();
  const w = sim.w, cmd = idleCommand();
  const hashes: number[] = [];
  let h = 0x811c9dc5 | 0;
  while (w.phase !== 'ended' && w.time < MAX_TIME) {
    sim.step(TICK, cmd);
    w.events.length = 0;
    h = fnv(h, String(w.time));
    for (const e of w.entities) h = fnv(h, `${e.id}|${String(e.hp)}|${String(e.pos.x)}|${String(e.pos.y)};`);
    h = fnv(h, `${String(w.players[0].elixir)}|${String(w.players[1].elixir)}\n`);
    hashes.push(h);
  }
  return { hashes, time: w.time, phase: w.phase };
}

let failed = false;
for (const seed of seeds) {
  const a = run(seed), b = run(seed);
  const ha = hex(a.hashes[a.hashes.length - 1]), hb = hex(b.hashes[b.hashes.length - 1]);
  const same = ha === hb && a.hashes.length === b.hashes.length;
  console.log(`seed=${seed} hash=${ha} ticks=${a.hashes.length} time=${a.time.toFixed(2)}s phase=${a.phase}${same ? '' : ` MISMATCH second run hash=${hb} ticks=${b.hashes.length}`}`);
  if (!same) {
    failed = true;
    const first = a.hashes.findIndex((x, i) => x !== b.hashes[i]);
    console.log(`   first differing tick: ${first}`);
  }
}
console.log(failed ? 'determinism: FAILED' : 'determinism: all seeds reproduce');
process.exitCode = failed ? 1 : 0;
