# Kingsroad — design notes

A first-person 5v5 lane-pushing battle in the spirit of Honor of Kings, built on Crownfall's engine
(deterministic 60 Hz simulation, Three.js cel-shaded renderer, WebAudio-synthesised sound).

## Match

* Square 56×56 map. Blue (team 0) base bottom-left, Red (team 1) top-right. Point-symmetric.
* Three lanes: **top** (left edge then top edge), **mid** (diagonal), **bot** (bottom edge then right edge).
  Each lane has three towers per side (outer, inner, base) and ends at the **crystal**. Destroying the
  enemy crystal wins. Towers must fall in order; a tower prefers minions, but turns on a hero that
  attacks an allied hero under it.
* The river runs along the other diagonal. **Tyrant** (bottom-right pit, team buff + gold) and the
  **Overlord** (top-left pit, empowered minions) spawn at 2:00 and 8:00 and respawn.
* Jungle: each side has a blue buff (mana regen + cooldown), a red buff (burn + slow on hit) and four
  small camps. Bushes hide units from enemies outside them.
* Minion waves every 30 s from 0:30: 3 melee + 3 ranged, a siege minion every third wave.
* Economy: passive gold, last hits, assists, tower gold shared, objectives. Levels 1–15 from XP shared
  with nearby allies. Skill 1/2 from level 1, ultimate at 4; skill points are assigned automatically
  (skill priority per hero). Items (6 slots) can be bought anywhere; a recommended build auto-buys
  when affordable (toggle in the shop).
* Death: respawn at base after 5 s + 2 s/level. Kill streaks announce (double/triple… shutdown).

## Heroes (10; three skills each, built from Crownfall's ability kinds)

| Hero | Role | Skills (1 / 2 / Ult) |
|---|---|---|
| Xuanwu, the Bulwark | tank | Shield Bash (dashStrike+stun) / Stone Skin (selfBuff shield) / Earthquake (aoeSelf stun) |
| Qinglong, Storm Lancer | warrior | Dragon Thrust (lineShot pierce) / Whirl (spin) / Sky Dive (leap stun) |
| Yingren, Shadow Blade | assassin | Shadowstep (blink crit) / Fan of Knives (spreadShot) / Execution (dashStrike execute) |
| Wukong, Stone Monkey | assassin | Cloud Leap (leap) / Staff Sweep (cone knockback) / Golden Cyclone (spin) |
| Huofeng, Flame Oracle | mage | Fireball (aoeAim burn) / Flame Breath (cone) / Meteor Rain (aoeAim) |
| Bingji, Frost Weaver | mage | Ice Lance (lineShot slow) / Frost Nova (aoeSelf freeze) / Blizzard (aoeAim sustained) |
| Shenshe, Divine Archer | marksman | Piercing Arrow (lineShot) / Rapid Fire (selfBuff) / Arrow Storm (aoeAim) |
| Huochong, Gunner | marksman | Scatter (spreadShot) / Combat Roll (blink) / Barrage (cone) |
| Mingyue, Moon Priestess | support | Moonlight (healBurst) / Lunar Bind (lineShot stun) / Sanctuary (aoeSelf heal) |
| Leigong, Thunder Warden | support | Chain Lightning (chain) / Thunder Dash (dashStrike) / Storm Call (aoeAim stun) |

Damage is physical or magic; armour and magic resist reduce it (HoK formula: 600/(600+def)).

## Controls

WASD move (camera-relative), mouse look, **LMB** basic attack toward the crosshair, **1/2/3** (or Q/W/E)
skills aimed at the crosshair, **F** flash (blink), **Space** dash, **B** recall (3 s), **I** shop, **Tab**
scoreboard, **V** first/third person, **M** big map, Esc menu.

## Code layout

```
src/game/      simulation: map (lanes, towers, camps, walls, nav grid), heroes, units (minions, monsters),
               items, abilities, combat, towers, minions, monsters, hero (player control, economy),
               bot (hero bots), sim
src/render3d/  Three.js: map3d, entities, effects, viewmodel (first-person hands), overlay (minimap, bars)
src/ui/        HUD (bars, skills, gold, minimap, kill feed, shop, scoreboard), menus (hero select), results
src/audio/     synthesised SFX and music
scripts/       headless tests (bot-vs-bot matches, determinism)
e2e/           Playwright play-tests with screenshots
```

## Modes and multiplayer (requirements added 2026-10-05)

* Modes: **5v5** (full map), **3v3** (full map, three lanes still, fewer heroes), **1v1** (mid lane only:
  outer/inner/base towers on mid, other lanes closed, jungle still open). Every seat can be a human or a bot;
  any number of bots per side.
* Online: rooms on Supabase presence (same project as Crownfall), WebRTC/relay links, deterministic lockstep
  with one input packet per human seat per tick. Sim API: `step(dt, commands: Map<seatKey, HeroCommand>)`;
  bots fill in the rest locally and deterministically (seeded rng), so no bot traffic crosses the wire.
* Every hero skill, dash, flash, recall, shop purchase and skill point goes through `HeroCommand`.

## The twist

Honor of Kings-shaped, but every skill and item has a second, playful effect:
* Skills have **"resonance"**: landing a skill on an enemy hero charges the hero's crown; at full charge the
  next skill is "crowned" (bigger, with an extra effect, e.g. Fireball leaves a lava pool, Shield Bash carries
  the victim with you).
* Items carry **moods**: e.g. Bloodthirst Blade heals *allies* near your kills; Frost Heart makes attackers
  slip (brief knockback); Phoenix Feather explodes when you die; Swift Boots leave a speed trail allies can use.
* Towers "wake up": a tower that kills a hero gets a crown and shoots faster for 30 s; a crystal at low health
  summons guardian minions.
* Jungle buffs are stealable and the Tyrant can be *ridden* for 20 s by whoever lands the last hit.
