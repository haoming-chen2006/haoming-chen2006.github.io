# Crownfall

A browser game in the style of Clash Royale with one twist: after you deploy a troop you can
**possess** it, drive it around the arena with WASD, aim its attacks with the mouse and fire its
signature ability. When your champion dies, your soul returns to the throne and you keep playing
as the Commander.

No assets, no frameworks: TypeScript, Canvas 2D, WebAudio-synthesised sound, and a bot opponent.

## Running it

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run check      # tsc --noEmit
npm run sim        # headless bot-vs-bot matches (node scripts/sim.ts [games] [seed])
node scripts/hero_test.ts   # exercises every troop's possession kit headlessly
node scripts/stress.ts 24   # many seeds x difficulties, crash + outcome stats
```

## How a match works

* Two players, an 18x32 tile arena split by a river with two bridges. Each side has two Princess
  Towers and a King Tower (the King wakes up when a Princess Tower falls or it takes damage).
* Elixir regenerates at 1 per 2.8 s up to 10. Cards cost 2-5 elixir. You hold 4 cards and see the
  next one; a played card goes to the back of the 8-card cycle.
* 3 minutes of regulation, double elixir in the last minute. If crowns are tied, 2 minutes of
  overtime at triple elixir where the next tower wins, then a lowest-tower-health tiebreak.
* Destroying a Princess Tower gives a crown and unlocks deployment on that half of the enemy
  side. Destroying the King Tower wins instantly (3 crowns).
* Troops walk down their lane, cross the river at a bridge, and attack the closest valid target
  in sight. Buildings-only troops (Colossus, Boar Rider) ignore enemy troops. Spells hit an area
  after a short delay and do 40% damage to towers.

## Possession

* Hover a troop and press **F** (or click it). The camera zooms in and follows.
* **WASD** moves. **Hold left click** to attack toward the cursor. Melee heroes swing at the closest
  enemy in front of them; ranged heroes fire straight-line shots that can miss.
* **Space** fires the troop's signature ability (each of the 18 troops has its own kit, listed in
  the deck builder). **Shift** dashes. **E** returns to the throne.
* Possessed troops become **Soulbound**: +25% max health and a gold aura. While you are possessed
  you can deploy cards anywhere within 4 tiles of your champion, even deep in enemy territory.
* Buildings-only heroes can hit troops under manual control. Ground melee heroes can hit flyers
  that come within reach.
* **Soul Harvest**: every troop your champion kills grants 0.3 elixir.
* When the champion dies you return to the Commander view; possess again after 4 s (6 s if you
  left voluntarily).

## Cards (26)

Troops: Knight, Archers, Spearlings, Raiders, Colossus, Sharpshooter, Pyromancer, Berserker,
Drake, Imps, Boar Rider, Lancer, Bone Horde, Reaper, Bombardier, Cleric, Wraith, Stormcaller.
Buildings: Cannon, Arc Tower, Barracks. Spells: Meteor, Volley, Shock, Frenzy, Frost.

Mechanics beyond the basics: splash damage, chain lightning with stuns, a heal aura, charge
attacks (Lancer), spawner buildings with decaying lifetime, freeze, rage zones, knockback, burn,
shields, and crits (Wraith's Shadowstep).

## The bot

`src/game/bot.ts` plays a scripted but reasonable game: it scores counters against the threat in
each lane (air, swarm, tank), positions defenders between the threat and its tower, uses spells
for value or lethal, builds pushes behind a tank when rich, supports its own tanks with ranged
troops, and cycles cheap cards at full elixir. Easy, Normal and Hard change its reaction time,
placement noise and elixir income (0.85x / 1.0x / 1.15x).

## Code layout

```
src/engine/    math, seeded RNG, keyboard/pointer input, camera (zoom, follow, shake)
src/game/      pure simulation, no DOM: cards, world, terrain/pathing, combat, unit AI,
               structures, abilities, hero (possession), deploy/spells, bot, sim orchestrator
src/render/    Canvas 2D: procedural sprites, arena, effects/projectiles, renderer + minimap
src/ui/        DOM HUD, menus, deck builder, card elements
src/audio/     WebAudio synthesised SFX and ambience
scripts/       headless tests that run the simulation under Node
```

The simulation is deterministic given a seed and fixed 60 Hz ticks, which is what lets the headless
scripts exercise the whole game without a browser.
