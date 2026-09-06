# Hollowmere prologue — content / quest notes (content-quest agent)

Files I own: `src/content/prologue.ts` (script), `src/content/dialogues.ts` (trees), `src/content/story.ts` (steps, barks,
codex, area names, item ids), `src/sim/quest.ts` (step machine + cancellable waits + World-API fallbacks),
`src/sim/dialogue.ts` (dialogue runtime), `scripts/test-prologue.ts` (headless E2E), this file.

## Integration (lead)

```ts
import { startPrologue } from './content/prologue.ts';
// after startGame(classId, name) — the script strips the player's main-hand weapon itself and puts it at the wreck
const prologue = startPrologue({
  world: this.world,
  ui: this.ui,                                   // needs ui.dialogue.{present,hide,showRoll}, ui.tutorial.{show,complete}, ui.showScreen
  cam: {
    playShot: (s) => this.cam.playShot({ pos: new THREE.Vector3(s.pos.x, s.pos.y, s.pos.z), look: new THREE.Vector3(s.look.x, s.look.y, s.look.z), fov: s.fov, duration: s.duration }),
    endShot: () => this.cam.endShot(),
    snapBehind: (a) => this.cam.snapBehind(a),
  },
  props: { openChest, pushBoulder, openGate, openCryptExit },   // env agent's prop animations (+ remove 'boulder'/'gate' colliders)
  fade: (out, s) => this.fade(out, s),
  setTimeScale: (s) => this.setTimeScale(s),
});
this.frameHooks.push((dt) => prologue.update(dt));   // every frame (unscaled dt is fine)
```
`Prologue` exposes `update(dt)`, `steps` (also mirrored to `world.quest` for the journal), `flags` (= `world.flags`),
`currentStep`, `codex` (unlocked entries), `stats`, `finished`, `done` (promise), `skip(id)` (dev: beat or step id, e.g.
`__hm.prologue.skip('chapel')`), `respawn()` (call from the death screen; otherwise the script respawns after ~5 s), `dispose()`.

Positions are plain `{x,y,z}` (content can't import three). Camera shots are built from `LANDMARKS` + `terrainHeight`.

## The beats / quest steps (in order; ids are what `questStep`, `ui.tutorial.show/complete` and `skip()` use)

| beat | steps | completes when |
| --- | --- | --- |
| wake | `wake` | intro cinematic (fade from black, wide shot over the lake pushing in over 10 s, narrator ×3, Ilyra ×2, `Lie_StandUp`) |
| move | `move` (WASD/Mouse) → `sprint` (Shift) → `dodge` (Space) → `jump` (Ctrl/F) | 8 m walked · 0.6 s sprinting · `dodge` event · a jump that *lands* |
| sword | `sword` (E) → `inventory` (I) → `equip` → `sheet` (C) → `cardAbilities` → `cardAC` → `cardProf` | `interact sword` · `ui{screen:'inventory'}` · `equip` of the player's own weapon · `ui{screen:'character'}` · 7 s per card |
| cache | `cache` → `cacheLoot` (E) → `potion` (R) | within 6.5 m of `LANDMARKS.cache` → Perception roll vs DC 12 (passive ≥ 12 also finds it; on a miss Ilyra spots it — fail-forward) · `interact cache` → 2 potions + 15 gold · `itemUsed potionHealing` or the R key seen in `world.intent` |
| talk | `talk` (E on Ilyra) | `ILYRA_TALK` tree ends (Insight DC 10 → Persuasion DC 13 / Intimidation DC 15 → confession; Guidance offer) |
| camp | `camp` → `rest` (E) → `chest` (E) → `hotbar` (1) | trigger `camp` · `CAMPFIRE` tree (choices apply `rest:short`/`rest:long`) · chest → class gear + Ring of Protection · any ability key / `castStart` |
| boulder | `boulder` (E, Athletics DC 12) [+ `boulderHelp`] | success; first failure opens `BOULDER_HELP` (Help action → advantage) |
| chapel | `chapel` → `lockOn` (Tab) → `lightAttack` (LMB) → `dodgeAttack` (Space) → `block`/Shield (Q) → `heavyAttack` (RMB) → `ability` (1) → `finishChapel` → `levelUp` → `captain` → `key` (E) | trigger `chapel` → `startEncounter('chapel', minion_1..3)` (they lie in the graves from the start); stages are event-gated (`lockOn`/`targetId`, `swing light`, `miss dodge`, `miss block|parry`/`parry`, `swing heavy|charged`, ability intent/`castStart`); Ilyra holds Sacred Flame during the lessons; if the fight ends early the remaining lessons are marked done ("…Well. That works too."); XP topped up to 300 → `levelUp` → waits for `pendingLevelUps === 0`; captain (`warrior`, encounter `captain`) → key from the corpse (`captainKey` interactable) **or** the altar (Religion/Investigation DC 10, whichever is better) |
| gate | `gate` (E) | key opens outright, else Sleight of Hand DC 14 (retry) → `props.openGate` → fade → teleport to `cryptEntrance` (`areaEnter crypt`) |
| crypt | `crypt` → `cryptHall` → `brazier` (E) | trigger `cryptHall` (0,−499.5) → encounter `cryptHall` (mage + rogue in the antechamber) → brazier short rest **or** walking on to the boss trigger |
| boss | `boss` | trigger `cryptBoss` → cinematic (two shots) → `BOSS_INTRO` (Intimidation/Persuasion DC 15 → `bossHesitate`) → encounter `boss` → `bossEnd`; the Warden is worth a level by himself, so the script waits for that level-up before the ending |
| ending | `ending` | `ENDING` tree (branches on `ilyraConfessed`; sets `endingAbbey`/`endingSecret`/`endingOwed`/`endingAlone`) → fade → `prologueComplete{stats}` |

Every combat beat loops **death → `deathFlow` → `world.respawn()` → enemies re-spawned → encounter restarted** (the boss gets a
fresh `bossStart` banner). Checkpoints: start, camp, chapel entrance (53,4), crypt entrance, before the boss door (0,−524).

Runtime objects the script adds to the world: interactables `ilyra` (follows her; enabled after the intro, disabled in
combat/dialogue), `altar`, `brazier` (0,−504 — on the antechamber's magic brazier), `captainKey` (at the corpse); trigger
`cryptHall`. Ilyra is `important` (can't drop below 1 HP).

## World API used (all present on the sim World now)
`spawnEnemy`, `startEncounter`, `skillCheck`, `giveItem`, `equip`, `useItem`, `grantXp`, `rest`, `setCinematic`,
`setCompanionFollow`, `playAnim`, `lookAt`, `setCheckpoint` (+ `checkpoint`), `respawn`, `teleport`, `remove`,
`setInteractable`/`getInteractable`, `flags`, `encounters`, `inventory`, `gold`, and when present: `equipment`, `unequip`,
`removeItem`, `hasItem`, `setCondition`, `stats`. `installWorldApiFallbacks(world)` (sim/quest.ts) installs minimal
implementations for anything missing and logs the list — harmless on the full sim (nothing is missing).

Guidance: `giveGuidance` sets `player.conditions.guidance` (600 s) + flag `guidance`; **the sim consumes it on the next
check** (rules.ts adds the 1d4). Prologue chooses nothing here — the rule stays in one place.

## Events
Emitted by the script: `questStep`, `questLog`, `toast`, `areaEnter`, `dialogueStart/Line/End` (runtime),
`cinematic{on, shot: 'wide'|'closeup'|'ots'|'two'}` (per dialogue node + intro/boss), `condition` (guidance/hesitant),
`stagger` (bossHesitate), `gold`, `bossStart` **only** if the AI hasn't emitted one 4 s into the boss encounter, `bossEnd`
only if the sim didn't, `prologueComplete{stats}` (merged `world.stats` + rolls/nat20/nat1/checksPassed/checksFailed/deaths/
time/level/xp/gold).

**Barks**: Ilyra's per-beat lines are `dialogueLine` events *outside* a `dialogueStart…dialogueEnd` pair (speakerId
`'ilyra'`). → **UI request**: show these as a bottom subtitle ("Ilyra — …") for ~max(3, 0.06·chars) s when no dialogue is
open. The HUD currently has no handler for them, so the tutorial's voice is invisible in-game until it does.

Listened to: `trigger`, `interact`, `check`, `attackRoll`, `damage`, `death`, `itemUsed`, `equip`, `ui{screen}`, `dodge`,
`swing`, `miss`, `parry`, `lockOn`, `castStart`, `telegraph` (slow-mo 0.3× for 1.1 s on the first enemy wind-up during the
dodge lesson), `encounterEnd`, `bossStart/End`, `condition`.

## Dialogue data conventions (sim/dialogue.ts)
* `{name}`, `{class}`, `{Class}`, `{weapon}` substituted in nodes, choices and step copy.
* `next: 'a?condition|b'` routes conditionally. Choices with `check` → `successNext` / `failNext`.
* `choice.effect` fires on pick; `node.effect` when shown. Several effects: `'a;b'`.
* Speaker `'narrator'` has no actor; `'player'` → `world.playerId`; else an actor id. `emote` → `world.playAnim(actor, emote)`.
* Nat 20 / nat 1: Ilyra reacts (`CRIT_LINES` per skill) **after** `ui.dialogue.showRoll` finishes (`onRollDone`), or 1.3 s
  after a world check, so the dice aren't spoiled.

Effects: `flag:x` `unflag:x` `giveGuidance` `gold:N` `item:id[:qty]` `xp:N` `rest:short|long` `codex:id` `toast:text` `log:text`
`anim:actorId:name` `follow:on|off` `bossHesitate` (−2 AC for 10 s + 2.5 s stagger).
Conditions: `flag:x` `!flag:x` `class:id` `hasItem:id` `area:shore|crypt` `codex:id` `gold>=N` `level>=N`.

Flags worth knowing: `met:ilyra`, `talkedIlyra`, `ilyraConfessed`, `ilyraIntimidated`, `ilyraDeflected`, `ilyraTrusts`,
`ilyraOwes`, `guidance`, `refusedGuidance`, `boulderHelp`, `bossHesitated`, `bossDead`, `area:*`, `codex:*` (+ each codex
entry's own `unlock` flag so `ui/journal.ts`'s filter matches), `ending*`, `prologueComplete`.

## Notes for the other agents
* **UI**: (1) subtitles for barks (above). (2) The death screen's "Rise again" calls `game.restart()` — please call
  `prologue.respawn()` (or `world.respawn()`); the script otherwise auto-respawns ~5 s after the fade. (3) Level-up: the UI
  already opens the screen on `levelUp`; the script just waits for `pendingLevelUps === 0` (don't `showScreen('levelUp')`
  twice). (4) Journal: reads `world.quest` and `CODEX` from `content/story.ts` filtered by flags — works as is. (5) Ending:
  the UI opens on `prologueComplete` — the script does not call `showScreen('ending')`.
* **sim-rules**: `World.teleport()` while `state === 'jump'` leaves the player stuck in `jump` forever (onGround is set, the
  landing branch never runs). I guard my own teleports; worth resetting the state inside `teleport()`.
  XP: minions 25, captain 100, hall 200, boss 450 + a top-up to 300 after the chapel ⇒ level 2 at the chapel, level 3 on
  the Warden — intentional, handled.
* **lead**: the player may spawn with class gear equipped; the wake beat unequips + removes the main-hand item and the
  wreck returns it (`Take the longsword` / `quarterstaff` / `dagger` / `greataxe`). `INTERACTABLES.sword.label` is patched at runtime.

## Test
`node --experimental-strip-types scripts/test-prologue.ts` (VERBOSE=1 prints every line). Four scenarios run the whole
prologue against the real sim in < 1 s each: fighter (nat-20s everywhere, prefers rolling choices, chat hub, brazier),
wizard (every skill fails first then succeeds, last-choice policy, altar key, dies in the chapel and to the boss), barbarian
(seeded random, first choice), rogue (`skip('chapel')`, deaths). Asserts step order/completion, dialogue + rolls, both key
routes, respawn/boss reset, codex, ending flags, `prologueComplete`, no unsubstituted `{vars}`, no unhandled rejections.
`npx tsc --noEmit` is clean for all of the files above.
