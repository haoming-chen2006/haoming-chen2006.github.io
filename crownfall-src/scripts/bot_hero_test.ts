// Proves the bot possesses a troop on Hard, drives it across the river, uses its kit, and lets go or dies cleanly.
declare const process: { exitCode?: number };
import { Simulation } from '../src/game/sim.ts';
import { idleCommand } from '../src/game/hero.ts';
import { PRESET_DECKS, cardsFromIds } from '../src/game/cards.ts';
import { RIVER_MID, TICK } from '../src/game/constants.ts';
import type { Difficulty } from '../src/game/bot.ts';

let failures = 0;
function run(difficulty: Difficulty, seed: number, seconds: number) {
  const sim = new Simulation({ playerDeck: cardsFromIds(PRESET_DECKS.Vanguard), botDeck: cardsFromIds(PRESET_DECKS.Nightfall), difficulty, seed });
  sim.skipCountdown();
  const w = sim.w;
  let possessEvents = 0, releaseEvents = 0, crossed = false, abilities = 0, dashes = 0, deaths = 0, streaks = 0, minY = 99;
  let heroTicks = 0;
  for (let t = 0; t < seconds * 60 && w.phase !== 'ended'; t++) {
    sim.step(TICK, idleCommand());
    for (const ev of w.events) {
      if (ev.type === 'botPossess') possessEvents++;
      if (ev.type === 'botRelease') releaseEvents++;
      if (ev.type === 'ability' && ev.team === 1) abilities++;
      if (ev.type === 'dash' && ev.team === 1) dashes++;
      if (ev.type === 'heroDeath' && ev.team === 1) deaths++;
      if (ev.type === 'streak') streaks++;
    }
    w.events.length = 0;
    const h = w.hero(1);
    if (h) {
      heroTicks++;
      if (!Number.isFinite(h.pos.x) || !Number.isFinite(h.pos.y) || !Number.isFinite(h.hp)) throw new Error('non-finite bot hero state');
      if (h.pos.y > RIVER_MID + 1) crossed = true;
      minY = Math.min(minY, h.pos.y);
      if (!h.possessed) throw new Error('hero id points at a unit that is not possessed');
    }
    for (const e of w.entities) if (!Number.isFinite(e.pos.x) || !Number.isFinite(e.pos.y)) throw new Error(`NaN on ${e.kind} ${e.id}`);
  }
  const s = w.players[1].stats;
  console.log(`${difficulty.padEnd(6)} seed=${seed} possess=${possessEvents} release=${releaseEvents} deaths=${deaths} crossed=${crossed} heroTime=${(heroTicks / 60).toFixed(1)}s abilities=${abilities} dashes=${dashes} heroDmg=${Math.round(s.heroDamage)} heroKills=${s.heroKills} streaks=${streaks} crowns=${w.players[0].crowns}-${w.players[1].crowns} t=${w.time.toFixed(0)}s`);
  return { possessEvents, crossed, abilities, releaseEvents, deaths, heroTicks };
}

const hard = [1, 2, 3].map((seed) => run('hard', seed, 150));
const normal = [1, 2].map((seed) => run('normal', seed, 180));
run('easy', 1, 120);
if (!hard.every((r) => r.possessEvents > 0)) { failures++; console.log('!! hard bot never possessed in some seed'); }
if (!hard.some((r) => r.crossed)) { failures++; console.log('!! hard bot champion never crossed the river'); }
if (!hard.some((r) => r.abilities > 0)) { failures++; console.log('!! hard bot champion never used an ability'); }
if (!hard.some((r) => r.releaseEvents > 0 || r.deaths > 0)) { failures++; console.log('!! hard bot champion never released or died'); }
if (!normal.some((r) => r.possessEvents > 0)) console.log('note: normal bot did not possess in these seeds (allowed, it is probabilistic)');
console.log(failures ? `FAILURES: ${failures}` : 'bot hero test passed');
process.exitCode = failures ? 1 : 0;
