// How long does an idle player survive against each difficulty? Used for tuning.
import { Simulation } from '../src/game/sim.ts';
import { idleCommand } from '../src/game/hero.ts';
import { PRESET_DECKS, cardsFromIds } from '../src/game/cards.ts';
import { TICK } from '../src/game/constants.ts';
import type { Difficulty } from '../src/game/bot.ts';

for (const d of ['easy', 'normal', 'hard'] as Difficulty[]) {
  const results: string[] = [];
  for (const seed of [11, 12, 13]) {
    const sim = new Simulation({ playerDeck: cardsFromIds(PRESET_DECKS.Vanguard), botDeck: cardsFromIds(PRESET_DECKS.Siege), difficulty: d, seed });
    sim.skipCountdown();
    const w = sim.w;
    let firstCrown = -1;
    while (w.phase !== 'ended' && w.time < 320) {
      sim.step(TICK, idleCommand());
      w.events.length = 0;
      if (firstCrown < 0 && w.players[1].crowns > 0) firstCrown = w.time;
    }
    results.push(`seed ${seed}: first crown ${firstCrown < 0 ? 'never' : firstCrown.toFixed(0) + 's'}, end ${w.time.toFixed(0)}s ${w.result?.reason ?? ''} ${w.players[0].crowns}-${w.players[1].crowns}`);
  }
  console.log(`${d}: ${results.join(' | ')}`);
}
