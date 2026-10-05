// Runs each seed twice and checks the per-tick world hashes agree. Run: node scripts/determinism_test.ts [seed ...]
declare const process: { argv: string[]; exitCode?: number };
import { Simulation } from '../src/game/sim.ts';
import { TICK } from '../src/game/constants.ts';
import { hashWorld } from '../src/game/hash.ts';

const seeds = process.argv.length > 2 ? process.argv.slice(2).map(Number) : [1, 2, 3];
const MAX_TIME = 180;

function run(seed: number): { hashes: number[]; time: number; phase: string } {
  const sim = new Simulation({ mode: '5v5', difficulty: 'normal', seed, teams: [[], []], botVsBot: true });
  sim.skipCountdown();
  const w = sim.w, cmds = new Map();
  const hashes: number[] = [];
  let tick = 0;
  while (w.phase !== 'ended' && w.time < MAX_TIME) {
    sim.step(TICK, cmds);
    w.events.length = 0;
    if (++tick % 60 === 0) hashes.push(hashWorld(w));
  }
  return { hashes, time: w.time, phase: w.phase };
}

let ok = true;
for (const seed of seeds) {
  const a = run(seed), b = run(seed);
  const same = a.hashes.length === b.hashes.length && a.hashes.every((h, i) => h === b.hashes[i]);
  const first = a.hashes.findIndex((h, i) => h !== b.hashes[i]);
  console.log(`seed ${seed}: ${same ? 'OK' : `MISMATCH at second ${first + 1}`} (${a.hashes.length} samples, ${a.time.toFixed(0)}s, ${a.phase}) final=${(a.hashes.at(-1) ?? 0).toString(16)}`);
  if (!same) ok = false;
}
if (!ok) process.exitCode = 1;
