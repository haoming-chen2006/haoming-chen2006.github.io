// Headless bot-vs-bot simulation. Run: node scripts/sim.ts [games] [seed]
declare const process: { argv: string[] };
import { Simulation } from '../src/game/sim.ts';
import { idleCommand } from '../src/game/hero.ts';
import { PRESET_DECKS, cardsFromIds } from '../src/game/cards.ts';
import { TICK } from '../src/game/constants.ts';

const games = Number(process.argv[2] ?? 4);
const baseSeed = Number(process.argv[3] ?? 1);
const deckNames = Object.keys(PRESET_DECKS);
let wins = [0, 0, 0];
const t0 = performance.now();
for (let g = 0; g < games; g++) {
  const seed = baseSeed + g;
  const dA = deckNames[g % deckNames.length];
  const dB = deckNames[(g * 3 + 1) % deckNames.length];
  const sim = new Simulation({ playerDeck: cardsFromIds(PRESET_DECKS[dA]), botDeck: cardsFromIds(PRESET_DECKS[dB]), difficulty: 'normal', seed, botVsBot: true });
  const w = sim.w;
  const possessions = () => `${w.players[0].stats.possessions}/${w.players[1].stats.possessions}`;
  const cmd = idleCommand();
  let ticks = 0;
  let maxEntities = 0;
  const counts: Record<string, number> = {};
  while (w.phase !== 'ended' && ticks < 60 * 320) {
    sim.step(TICK, cmd);
    ticks++;
    maxEntities = Math.max(maxEntities, w.entities.length);
    for (const ev of w.events) counts[ev.type] = (counts[ev.type] ?? 0) + 1;
    w.events.length = 0;
    // sanity checks
    for (const e of w.entities) {
      if (!Number.isFinite(e.pos.x) || !Number.isFinite(e.pos.y)) throw new Error(`NaN position on ${e.kind} ${e.id}`);
      if (e.pos.x < -0.5 || e.pos.x > 18.5 || e.pos.y < -0.5 || e.pos.y > 32.5) throw new Error(`out of bounds ${e.kind} ${e.id} at ${e.pos.x},${e.pos.y}`);
    }
  }
  const r = w.result;
  const winner = r ? r.winner : -1;
  wins[winner === -1 ? 2 : winner]++;
  const towers = (t: 0 | 1) => w.towers(t).map((x) => `${x.towerType[0]}:${Math.round(x.hp)}`).join(' ');
  console.log(`game ${g + 1} seed=${seed} ${dA} vs ${dB}: winner=${winner} (${r?.reason}) crowns=${r?.crowns.join('-')} time=${w.time.toFixed(0)}s phase=${w.phase} maxEnt=${maxEntities}`);
  console.log(`   towers0=[${towers(0)}] towers1=[${towers(1)}] deployed=${w.players[0].stats.unitsDeployed}/${w.players[1].stats.unitsDeployed} elixirSpent=${w.players[0].stats.elixirSpent}/${w.players[1].stats.elixirSpent}`);
  console.log(`   events: deploy=${counts.deploy ?? 0} spell=${counts.spell ?? 0} death=${counts.death ?? 0} towerDestroyed=${counts.towerDestroyed ?? 0} invalid=${counts.invalid ?? 0} botPossess=${counts.botPossess ?? 0} streak=${counts.streak ?? 0} possessions=${possessions()} awards=${(r?.awards ?? []).map((a) => `${a.title}(${a.team})`).join(',')}`);
}
console.log(`wins: team0=${wins[0]} team1=${wins[1]} draws=${wins[2]}  (${((performance.now() - t0) / 1000).toFixed(2)}s)`);
