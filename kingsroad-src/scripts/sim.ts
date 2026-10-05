// Headless bot-vs-bot match. Run: node scripts/sim.ts [games] [seed] [mode]
declare const process: { argv: string[] };
import { Simulation, type MatchMode } from '../src/game/sim.ts';
import { TICK, MAP_W, MAP_H } from '../src/game/constants.ts';
import { hashWorld } from '../src/game/hash.ts';

const games = Number(process.argv[2] ?? 1);
const baseSeed = Number(process.argv[3] ?? 1);
const mode = (process.argv[4] ?? '5v5') as MatchMode;
const maxMinutes = Number(process.argv[5] ?? 25);
const wins = [0, 0, 0];
const t0 = performance.now();
for (let g = 0; g < games; g++) {
  const seed = baseSeed + g;
  const sim = new Simulation({ mode, difficulty: 'normal', seed, teams: [[], []], botVsBot: true });
  sim.skipCountdown();
  const w = sim.w;
  let ticks = 0, maxEntities = 0;
  const counts: Record<string, number> = {};
  const cmds = new Map();
  let lastLog = 0;
  while (w.phase !== 'ended' && ticks < 60 * 60 * maxMinutes) {
    sim.step(TICK, cmds);
    ticks++;
    maxEntities = Math.max(maxEntities, w.entities.length);
    for (const ev of w.events) counts[ev.type] = (counts[ev.type] ?? 0) + 1;
    w.events.length = 0;
    for (const e of w.entities) {
      if (!Number.isFinite(e.pos.x) || !Number.isFinite(e.pos.y) || !Number.isFinite(e.hp)) throw new Error(`NaN on ${e.kind} ${e.id}`);
      if (e.pos.x < -0.5 || e.pos.x > MAP_W + 0.5 || e.pos.y < -0.5 || e.pos.y > MAP_H + 0.5) throw new Error(`out of bounds ${e.kind} ${e.id} at ${e.pos.x},${e.pos.y}`);
    }
    if (w.time - lastLog >= 120) {
      lastLog = w.time;
      const line = (t: 0 | 1) => `T${t} towers=${w.towers(t).length} kills=${w.players[t].kills} lv=${w.players[t].seats.map((s) => s.level).join('/')} gold=${w.players[t].seats.map((s) => Math.round(s.gold)).join('/')}`;
      console.log(`  ${(w.time / 60).toFixed(1)}m  ${line(0)} | ${line(1)}  ents=${w.entities.length}`);
    }
  }
  const r = w.result;
  const winner = r ? r.winner : -1;
  wins[winner === -1 ? 2 : winner]++;
  console.log(`game ${g + 1} seed=${seed} mode=${mode}: winner=${winner} (${r?.reason ?? 'timeout'}) kills=${w.players[0].kills}-${w.players[1].kills} time=${(w.time / 60).toFixed(1)}m maxEnt=${maxEntities} hash=${hashWorld(w)}`);
  console.log('  events:', Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(' '));
  for (const p of w.players) console.log(`  team ${p.team}: ${p.seats.map((s) => `${s.heroDefId}(${s.lane}) L${s.level} ${s.kills}/${s.deaths}/${s.assists} ${s.items.length}it`).join(', ')}`);
}
console.log(`wins: blue=${wins[0]} red=${wins[1]} none=${wins[2]} in ${((performance.now() - t0) / 1000).toFixed(1)}s`);
