# Balance notes

Numbers live in `src/game/cards.ts`, `src/game/constants.ts` and `src/game/bot.ts`. This file records the
reasoning behind the tuning so future changes stay coherent.

## Match flow
- 3 s countdown before the clock starts; nothing moves and cards cannot be played ("Get ready!").
- 180 s regulation, last 60 s at double elixir; tied crowns go to 120 s overtime at triple elixir, next tower wins;
  still tied → lowest tower health loses.
- Comeback: the side with fewer crowns regenerates elixir 10% faster (`COMEBACK_ELIXIR_MULT`).

## Possession
- Soulbound: +25% max health. Soul Harvest: +0.3 elixir per champion kill, capped at 3 per possession so
  Bone Horde / Raiders farms cannot snowball.
- Cooldown after champion death 4 s, after voluntary release 6 s.
- Kill streaks: champion kills within 4 s of each other → Double / Triple / Quad kill, Rampage (5), Unstoppable (6+).

## Towers
Princess 2900 hp / 108 dmg per 0.8 s (range 7.5); King 4800 hp / 140 dmg per 1 s (range 7). Raised from
2600/95 and 4200/120 once bot champions arrived, so an unanswered push still needs support and a
possessed player has time to answer it.

## Spells
Telegraphs were lengthened so a possessed player can react: Meteor 1.5 s (was 1.0), Volley 1.0 s (0.8),
Frost 0.6 s (0.3) and freeze 3.5 s (4.0). Shock stays near-instant (0.15 s) as the cheap reset.

## Bot difficulty
| | Easy | Normal | Hard |
|---|---|---|---|
| Elixir rate | 0.65x | 0.85x | 1.12x |
| Reaction | 2.8 s | 1.4 s | 0.45 s |
| Placement noise | 2.5 | 1.0 | 0.35 |
| Aggression | 0.3 | 0.55 | 1.0 |
| Possesses troops | never | sometimes (32 s cooldown) | often (12 s cooldown) |
| Champion reaction / aim jitter | – | 0.8 s / 0.9 tiles | 0.2 s / 0.15 tiles |

The bot champion (`bot_hero.ts`) prefers tanks, win conditions, assassins and damage dealers, never swarm
units. It marches via bridges, kites when ranged, strafes, uses its kit when a target is in range, dashes to
close or escape, retreats toward its king below 30% health, and releases a hopeless champion (below 18%)
or a stale one (45 s) so the commander can pick a fresh body later.

The bot commander answers a human-driven champion with swarms, splash and chain lightning, saves Shock/Frost
for the enemy champion on its side, reinforces its own champion where it fights, plays Frenzy on a push, and
chips the weakest tower with a spell rather than sitting at 10 elixir. Its opening lane and timing are seeded
random so matches diverge from the first play.

Measured against a player who never plays a card (`scripts/idle_test.ts`, Vanguard vs Siege): Easy takes its
first crown around 40-55 s and three crowns after 2-2.5 min; Normal three-crowns in about 1.5-1.8 min; Hard in
about a minute. Bot-vs-bot (`scripts/stress.ts`): Easy loses to Normal 8/8, Hard beats Normal 7/8.

## Headless checks
- `node scripts/idle_test.ts` — time to first crown / 3-crown against an idle player per difficulty.
- `node scripts/bot_hero_test.ts` — the Hard bot possesses, crosses the river, uses abilities, dies or releases.
- `node scripts/stress.ts 24` — bot vs bot across seeds/difficulties, no crashes.
