// Many seeds × difficulties, bot vs bot, checking for crashes and gathering outcome stats.
declare const process: { argv: string[]; exitCode?: number };
import { Simulation } from '../src/game/sim.ts';
import { idleCommand } from '../src/game/hero.ts';
import { PRESET_DECKS, cardsFromIds } from '../src/game/cards.ts';
import { TICK } from '../src/game/constants.ts';
import type { Difficulty } from '../src/game/bot.ts';

const games = Number(process.argv[2] ?? 12);
const names = Object.keys(PRESET_DECKS);
const diffs: Difficulty[] = ['easy', 'normal', 'hard'];
const t0 = performance.now();
let crashes = 0;
const summary: Record<string, number> = {};
let totalTime = 0, maxEnt = 0, kingKills = 0, draws = 0;
for (let g = 0; g < games; g++) {
  const d = diffs[g % 3];
  const a = names[g % names.length], b = names[(g * 7 + 3) % names.length];
  const sim = new Simulation({ playerDeck: cardsFromIds(PRESET_DECKS[a]), botDeck: cardsFromIds(PRESET_DECKS[b]), difficulty: d, seed: 100 + g, botVsBot: true });
  const w = sim.w;
  try {
    let ticks = 0;
    while (w.phase !== 'ended' && ticks < 60 * 320) {
      sim.step(TICK, idleCommand());
      ticks++;
      maxEnt = Math.max(maxEnt, w.entities.length);
      w.events.length = 0;
      for (const e of w.entities) if (!Number.isFinite(e.pos.x) || !Number.isFinite(e.pos.y)) throw new Error('NaN pos');
    }
    if (w.phase !== 'ended') throw new Error('match did not end');
    const r = w.result!;
    summary[`${d}:winner${r.winner}`] = (summary[`${d}:winner${r.winner}`] ?? 0) + 1;
    totalTime += w.time;
    if (r.reason.includes('King')) kingKills++;
    if (r.winner === -1) draws++;
  } catch (e) { crashes++; console.log(`game ${g} (${a} vs ${b}, ${d}) CRASH:`, e); }
}
console.log('outcomes', summary);
console.log(`games=${games} crashes=${crashes} avgTime=${(totalTime / games).toFixed(0)}s kingKills=${kingKills} draws=${draws} maxEntities=${maxEnt} (${((performance.now() - t0) / 1000).toFixed(1)}s)`);
process.exitCode = crashes ? 1 : 0;
