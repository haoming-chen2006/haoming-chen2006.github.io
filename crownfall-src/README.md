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
npm run test:sim   # determinism, deterministic maths, snapshot round-trip, lockstep-over-a-fake-network
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

## What's in the box (competition build)

* **Enemy champions.** On Normal and Hard the bot possesses its own tanks, win conditions and
  assassins, drives them across the river, aims abilities, dashes and retreats. They wear a crimson
  aura; yours is gold.
* **Match flow.** Loading splash, a camera flyover with a 3-2-1 countdown, a first-match tutorial
  that spotlights each step (deploy, possess, fight, ability, summon, return), kill streaks, a kill
  feed, Soul Harvest chips, and a results screen with awards (Champion, Warlord, Executioner…) and
  a slow orbit around the fallen throne.
* **First person for real.** Hands and weapons per class (bow draw, rifle recoil, staff orb, drake
  jaw, imp claws, boar reins), muzzle flashes, hit markers, a crosshair that reddens over enemies,
  a damage vignette and low-health pulse, mouse sensitivity / invert / FOV settings.
* **Sound.** Two composed synthesized pieces (menu and a layered battle theme with fills and bar-
  aligned intensity changes), 118 sounds including a call per card and a sound per ability,
  spatial panning while possessed, ambience beds, and stingers for crowns, possession and the end.
* **Art.** Cel-shaded characters with class kits, capes, helmets and faces; towers with archer
  posts and a throne dome; cobbled lanes, flowers, banners, lanterns, forests, mountains, clouds;
  trails, decals, debris physics, status props and body-type death animations.

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

## Online duels

Press **Online Duel** on the main menu, type a name, and either **Create Room** (you get a four-letter
code and a link such as `…/crownfall/#/join/ABCD` to send to a friend) or **Join** with a code. The
waiting room shows both seats with their decks, a chat box, and whether the two browsers found a direct
connection. The host presses **Start Battle**; the results screen offers a **Rematch** that starts the
moment both players ask for it.

How it works, in one paragraph: the simulation is deterministic, so both browsers run the *same* match
from a shared seed and only exchange inputs — one small packet per tick per seat — in **lockstep**
(`src/net/lockstep.ts`). Each side stamps its input for a few ticks in the future (the "input delay",
chosen from the measured round trip: 3 ticks on a direct link, more when relayed) and steps a tick only
once it holds both seats' inputs for it. Every second both worlds are hashed and compared; if they ever
differ, the guest asks the host for a full snapshot (`src/game/snapshot.ts`) and replays from there.
`src/engine/dmath.ts` replaces `Math.sin/cos/atan2/exp/hypot` in the simulation with bit-exact software
versions, because those differ between V8 and JavaScriptCore and a Chrome-vs-Safari match would drift
without it (`scripts/determinism_test.ts` proves the hashes agree under `node` and `bun`).

Transport (`src/net/peer.ts`): a WebRTC data channel straight between the two browsers when NAT allows
(typically 1–60 ms), signalled over Supabase Realtime; otherwise every packet is relayed through the
same Supabase channel. A late direct channel is picked up whenever it opens. Rooms (`src/net/room.ts`)
are Realtime channels with presence — no database tables, so there is nothing to migrate; a room lives
as long as its host's tab does. Identity is an anonymous Supabase sign-in plus a locally stored name.

The guest plays team 1 (the top of the arena) but sees the arena from their own end: the camera,
minimap, colours (blue is always *you*), HUD and results all go through `src/render3d/perspective.ts`
rather than assuming team 0.

Leaving mid-match (Esc → Leave Battle) concedes. If the other browser disappears — closed tab, dead
connection for 25 s — the remaining player wins by forfeit. There is no pause online; Esc opens a menu
over a battle that keeps going.

Tests: `npm run test:sim` runs the determinism, maths, snapshot and lockstep suites headlessly (the last
one plays 150 s of a duel through a fake network with 30–300 ms of latency, jitter and duplicated
packets, then corrupts the guest and checks the snapshot heals it). `node e2e/duel.cjs` drives two real
browsers through the whole flow against the dev server — see `e2e/README.md`.

## Deploying

`scripts/deploy.sh` type-checks, builds with base `/crownfall/`, and copies the build to
`~/haoming-chen2006.github.io/crownfall` (plus a source snapshot in `crownfall-src`). Add `--push`
to commit and push the site. Live: https://haoming-chen2006.github.io/crownfall/

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
src/net/       online duels: identity, rooms (Supabase presence), WebRTC/relay link, lockstep driver
src/engine/    math, seeded RNG, keyboard/pointer input, camera (zoom, follow, shake); dmath = bit-exact trig/exp
src/game/      pure simulation, no DOM: cards, world, terrain/pathing, combat, unit AI,
               structures, abilities, hero (possession), deploy/spells, bot, sim orchestrator
src/render/    Canvas 2D: procedural sprites, arena, effects/projectiles, renderer + minimap
src/ui/        DOM HUD, menus, deck builder, card elements, the online hub + waiting room
src/audio/     WebAudio synthesised SFX and ambience
scripts/       headless tests that run the simulation under Node
```

The simulation is deterministic given a seed and fixed 60 Hz ticks, which is what lets the headless
scripts exercise the whole game without a browser.
