# Hollowmere — sim / gameplay systems notes (sim-rules agent)

Everything under `src/sim/**` plus `src/content/{classes,items,spells}.ts` and `scripts/test.ts`.
The sim is Node-importable (no three.js / DOM). `npm test` runs 205 headless asserts (dice, attack
resolution, block/parry, i-frames, combo/charge, bot fights for all four classes, abilities, items,
checks, XP, rests, boss phases, companion, lock-on, map bounds, death/respawn, 5000-step fuzz).

## Files
| File | What |
| --- | --- |
| `sim/world.ts` | `World`: actors, movement/collision, player controller, lock-on, step order, the whole contract API (below). |
| `sim/combat.ts` | Swing state machine, melee arcs, d20 attack resolution, block/parry, poise/stagger, damage, death. `COMBAT` tuning. |
| `sim/abilities.ts` | Ability execution, cast wind-ups, projectiles (sim-side), area spells, saves, buffs. |
| `sim/ai.ts` | Enemy kinds (`ENEMY_DEFS`), brains, `spawnEnemy`, `startEncounter`, awaken, boss phases. |
| `sim/companion.ts` | Ilyra: follow / hold, Sacred Flame, Healing Word. `COMPANION` tuning. |
| `sim/inventory.ts` | Inventory, equipment + AC rules, potions (interruptible drink), scrolls, class starting gear. |
| `sim/rules.ts` | Skill/ability checks, saves, passive perception, XP/levels/feats, rests. |
| `content/classes.ts` | `CLASSES` (ClassDef per class), `FEATS`, `PLAYABLE_CLASSES`. |
| `content/items.ts` | `ITEMS`, `getItem(id)`. |
| `content/spells.ts` | `ABILITIES` (AbilityDef by id), `getAbility(id)`. |

## World API (contract names are exact; extras marked ★)
```ts
world.spawnEnemy(kind, pos, { id?, yaw?, dormant?, name?, level? }): Actor
world.startEncounter(id, actorIds)          // wakes dormant enemies (Skeletons_Awaken_Floor, 2 s invulnerable), emits encounterStart / encounterEnd
world.addToEncounter(id, actorId) ★         // used by the boss summon; content may use it too
world.encounters: Map<id, { alive }>, world.encounterMembers ★
world.skillCheck(actor, skill, dc, { label?, bonusDice?: [{label, expr}], advantage?: 'adv'|'dis'|null })  // emits check
world.abilityCheck(actor, ability, dc, opts?) / world.savingThrow(actor, ability, dc, opts?)             // emit check
world.rollSave(actor, ability, dc, opts?) ★ // no event (combat uses it and emits attackRoll{kind:'save'})
world.passivePerception(actor) ★
world.giveItem(id, qty=1) / removeItem / hasItem / countItem ★ ; world.inventory, world.gold, world.equipment
world.equip(id, slot?) / unequip(slot) ★ / useItem(id): boolean
world.grantXp(n) / chooseLevelUp(featId) / rest('short'|'long')
world.setPlayerClass(classId)               // rebuilds stats/kit/gear/model; keeps position, xp, level. Lead must rebuild the CharacterView (model changes).
world.kit: string[] ★                        // hotbar ability ids for keys 1–6 (intent.ability index)
world.useAbility(actor, id, { targetId?, free? }) ★
world.setCinematic(on) / setCompanionFollow(on, pos?) / playAnim(id, name, loop?, fade?, speed?) / lookAt(id, target)
world.releaseAnim(id) ★                      // playAnim holds the clip for its length (looping: forever); this or setCinematic(false) releases
world.flags: Set<string>, world.timeOfDay (hours; long rest +8), world.checkpoint, world.setCheckpoint(pos) ★, world.respawn() ★
world.cycleTarget(dir) / setTarget(id|null) / toggleLock() ★   // lock-on
world.damageActor(id, amount, type?, sourceId?) / healActor(id, amount) / killActor(id) ★   // scripted damage (traps, cutscenes)
world.setCondition(id, name, seconds) / clearCondition(id, name) ★   // e.g. 'guidance' before a check
world.stats ★ { kills, damageDealt, damageTaken, parries, dodges, crits, deaths, potions }  // for prologueComplete
world.addInteractable / addTrigger / addCollider ★
```
Existing members kept for `game.ts`: `spawn, step, player, actors, setAnim, setState, teleport, actorsNear,
focusInteractable, interactables, setInteractable, getInteractable, area, paused, postStep, rng, time`.

### Deviations / decisions worth knowing
- **Hero HP**: level-1 max HP = hit die + CON + `HERO_HP_BONUS` (6) → fighter 18, wizard 14, rogue 15, barbarian 21.
  Enemies swing far more often than one 5e attack per round, so the cushion keeps 5e damage dice readable without
  two-shotting a wizard. Level-ups roll the hit die + CON as normal.
- **Lock-on**: Tab/MMB press = toggle (Elden Ring). Cycling is `intent.lockTargetHint = 'next' | 'prev'` (scroll) or
  `world.cycleTarget(±1)`. Acquire ≤ 18 m in front of the camera, auto-clear at > 25 m or on death. Emits `lockOn`.
- **Blocking (Q)** needs a shield (`blockMode = 'shield'`) — fighter. The wizard's Q is the *Shield* spell: `'ward'` mode,
  +5 AC while held (no parry, no damage halving, stamina cost per blocked hit, `Spellcasting` loop anim). Rogue and
  barbarian have no block; they dodge. Parry = first 0.2 s of a shield block (0.35 s with Defensive Duelist).
- **Charged heavy**: RMB press starts the heavy (Stab); if still held at 0.25 s it converts to a charge
  (`2H_Melee_Attack_Spin` at 0.42 speed as the wind-up, emits `chargeStart`) and releases into `2H_Melee_Attack_Spinning`
  at 1.5× damage. Max charge 1.1 s.
- **Sneak Attack** applies per hit from behind, versus staggered or blinded targets (1d6, 2d6 at level 3).
- **Skeleton rogue** crits on 19–20 only when attacking from behind.
- `playAnim` puts the player into state `'interact'` for the clip length (table in world.ts) unless a cinematic is on.
- `setPlayerClass('ranger')` works (Rogue_Hooded stand-in) but ranger isn't in `PLAYABLE_CLASSES`.
- Companions are `important`: they can't drop below 1 HP. `spawn()` for kind `'companion'` calls `initCompanion`,
  which only fills stats the lead didn't pass explicitly (abilities/maxHp/ac/level).
- `rest('long')` doesn't require camp supplies (content decides) and sets the checkpoint to the player position.
- Corpses: enemies stay as corpses (`dead`, death anim clamped) for 6 s then `hidden = true`; the boss corpse stays.

## Step order (`World.step`)
timers (iframes, cooldowns, conditions → `condition{on:false}`, stagger exit, poise regen, corpse hide) → player
controller (`stepPlayer`) → drink → `combat.updateAttacks` → `abilities.updateCasts` → enemy AI → companion AI →
projectiles → `postStep` hooks → knockback → push-apart → gravity/ground snap → triggers/interactables.

## Player controller (Elden Ring feel)
- Light (LMB): 3-hit combo per weapon style; the next light pressed during recovery is **buffered** and chains at
  `cancelAt` of the recovery; a light within `comboGrace` (0.45 s) after a swing continues the combo.
  Inputs pressed during dodge/stagger/jump/cast are buffered for 0.6 s.
- Attack facing snaps to the lock target, else to the movement input, then tracks during startup (7 rad/s).
- Forward root-motion step over the last 40% of startup + active (never steps through the target).
- Dodge cancels attack recovery (`canDodgeCancel`), i-frames 0.32 s, cost 22 (×0.75 with Mobile).
- No attacking while jumping (buffered until landing). Being hit interrupts drinking (`toast 'Interrupted!'`).
- Player poise 30: `Hit_A/B` reaction only when poise breaks (stagger 0.6 s).
- Stamina: light 12, heavy 24, charged 30, dodge 22, sprint 9/s, jump 8, shield bash 15, whirlwind 35; regen 26/s
  after a 0.5–0.6 s delay (half while blocking). Attacks need ≥ 8 stamina (`staminaEmpty` otherwise).
  Blocked hits cost 10/18/24 (light/heavy/charged); guard break (0 stamina) staggers 1.2 s.
- Cunning Dash: sprint free and +20% speed for 6 s. Slowed: ×0.5 speed.

### Weapon styles → anims (`combat.STYLE_ATTACKS`)
| style | lights | heavy | charged |
| --- | --- | --- | --- |
| `1h` (longsword/mace/warhammer, Skeleton_Blade) | Slice_Horizontal → Slice_Diagonal → Chop | 1H_Melee_Attack_Stab | 2H_Melee_Attack_Spinning |
| `2h` (greataxe/greatsword/staff) | 2H Slice → 2H Chop → 2H Stab | 2H_Melee_Attack_Chop | Spinning |
| `dual` (dagger + dagger) | Dualwield Slice → Chop → Stab | 1H Stab | Spinning |
| `unarmed` | Punch_A → Punch_B → Kick | Kick | Kick |
Timings (startup/active/recovery s): 1h lights 0.22/0.14/0.30, 0.20/0.14/0.30, 0.26/0.15/0.40; 1h heavy 0.38/0.16/0.50;
charged 0.12/0.30/0.35. Reach 2.2–2.7 m, arc ±60° (charged/whirlwind 360°). `animSpeed` scales the clip so it spans the swing.

## Rules (5e)
- Attack roll: d20 + ability mod (STR, or best of STR/DEX for finesse) + proficiency vs AC. Nat 20 doubles all damage
  dice (weapon + sneak); nat 1 always misses. Advantage: attacker reckless, target reckless, target staggered.
  Disadvantage: attacker blinded. Assassinate: auto-crit vs staggered. GWM: −5/+10 on heavy & charged.
- Damage types + skeleton traits: resist piercing, **vulnerable to bludgeoning** (mace/warhammer/quarterstaff), immune
  poison. `damageMod` event announces resist/vulnerable/immune; UI should show it. Rage: resist S/P/B, +2 damage.
- Spell save DC = 8 + prof + INT (wizard) / WIS (Ilyra) → 13 at level 1. Spell attack = prof + mod.
- Checks: proficiency, expertise (rogue Stealth & Sleight of Hand), Guidance (condition `guidance` → +1d4, consumed),
  armor stealth disadvantage, Ring of Protection +1 saves. `passivePerception = 10 + WIS + prof`.
- XP: level 2 at 300, level 3 at 900 (`XP_THRESHOLDS`). Kill XP: minion 25 (summoned 10), warrior/mage/rogue 100, boss 450.
  Level-up: HP roll, `pendingLevelUps++`, `levelUp` event; `chooseLevelUp(featId)` applies a `FEATS` entry.
- Short rest: spend hit dice (1d{hitDie}+CON each) until full, refresh Second Wind/Action Surge, wizard Arcane
  Recovery (+1 slot once per long rest). Long rest: everything, conditions cleared, `timeOfDay += 8`.

## Classes (`content/classes.ts`)
| class | model | HP/AC | kit (keys 1-3) | resources | level-2 feats |
| --- | --- | --- | --- | --- | --- |
| fighter | Knight | 18 / 16 (chain shirt + shield) | secondWind, actionSurge, shieldBash | secondWind 1, actionSurge 1 | greatWeaponMaster, defensiveDuelist |
| wizard | Mage | 14 / 12 | fireBolt, rayOfFrost, magicMissile, thunderwave (+ Q = Shield) | spellSlots1 2, arcaneRecovery 1 | empoweredEvocation, tough |
| rogue | Rogue | 15 / 14 (leather) | throwDagger, cunningDash, smokeBomb | smokeBomb 2 | assassinate, mobile |
| barbarian | Barbarian | 21 / 15 (unarmored: 10+DEX+CON) | rage, recklessAttack, whirlwind | rage 2 | brutalCritical, savageAttacker |
Starting gear: 2 Potions of Healing + 2 rations each; wizard also a Scroll of Magic Missile.

## Ability ids (`content/spells.ts`)
`secondWind` (1d10+lvl, Spellcast_Raise) · `actionSurge` (stamina refill + 35% attack speed 6 s, Cheer) · `shieldBash`
(Block_Attack, 1d4+STR bludgeoning, guaranteed stagger, 6 s cd) · `fireBolt` (1d10 fire, ranged spell attack, 0.6 s cd) ·
`rayOfFrost` (1d8 cold + `slowed` 4 s) · `magicMissile` (3 homing darts 1d4+1 force auto-hit, 1 slot) · `thunderwave`
(2d8 force in a 4.5 m front arc, CON save half, knockback on fail, Spellcast_Long, 1 slot) · `shield` (Q, see above) ·
`cunningDash` · `smokeBomb` (Throw; enemies within 7 m lose target 3 s, `blinded`) · `throwDagger` (Throw; 1d4+DEX
piercing ranged attack, sneak-eligible, 0.9 s cd) · `rage` (10 s) · `recklessAttack` (8 s) · `whirlwind`
(2H_Melee_Attack_Spinning, 360°, 8 s cd) · `sacredFlame` (Ilyra: 1d8 radiant, DEX save DC 13, homing "projectile" kind
`sacredFlame`) · `healingWord` (1d4+3) · `necroticBolt` (skeleton mage: 1d8, ranged attack +3) · `summonMinions` (boss).
Conditions used: `actionSurge, raging, reckless, cunningDash, slowed, blinded, guidance, antitoxin, poisoned`.

## Items (`content/items.ts`)
Weapons `longsword greatsword greataxe handaxe dagger quarterstaff mace warhammer`; `shield`; armor `leatherArmor
studdedLeather chainShirt scaleMail chainMail plateArmor` (AC + DEX with cap; heavy armor with STR < 13 slows 15%);
`potionHealing` (2d4+2) `potionGreaterHealing` (4d4+4) `antitoxin` `scrollMagicMissile` (anyone) `rations` (1d4, not in
combat) `campSupplies` `ringProtection` (+1 AC/saves) `cryptKey` `gold` (→ `world.gold`, `gold` event).
R key: `quickPotion()` picks Greater Healing under 35% HP, else Healing. Drinking = `Use_Item`, 1.2 s, interruptible,
consumed on completion. Equipping a two-hander returns the shield to the bag; a second light weapon goes to the off hand.
Visual note for render: `mace`/`handaxe` use weaponId `axe_1handed` (Knight has no mace mesh → nothing shown).

## Enemies (`ai.ENEMY_DEFS`)
| kind | model | HP / AC | attack | poise | speed walk/run | notes |
| --- | --- | --- | --- | --- | --- | --- |
| minion | Skeleton_Minion | 9 / 12 | +3, 1d6+2 slashing, wind-up 0.45–0.48 s | 18 | 2.8 / 5.4 | lunges from just outside reach |
| warrior | Skeleton_Warrior | 22 / 14 | +4, 1d8+2; heavy 2H Chop 2d6+3 (25%, 0.85 s wind-up) | 26 | 2.2 / 4.6 | blocks 35% of your swings for 1 s; retreats once under 25% |
| mage | Skeleton_Mage | 16 / 11 | Necrotic Bolt +3 1d8 every 3–4 s; staff 1d4+1 | 12 | 2.2 / 4.4 | keeps 7–11 m, back-pedals, fires point-blank when pressed |
| rogue | Skeleton_Rogue | 18 / 13 | +4, 1d4+2 piercing, fast stabs (0.4 s), 2-hit bursts then backs off | 18 | 3.0 / 6.2 | circles to your back; backstabs crit on 19–20 |
| boss | Skeleton_Warrior ×1.35 (`actor.scale`) | 90 / 15 | +6, 2d6+3; heavy 2d8+4; phase-2 spin (360°) | 70, hyper armor | 2.3 / 4.8 | Taunt on aggro (`bossStart`), phase 2 at 50%: `summonMinions` (2 minions, Spawn_Ground_Skeletons) + jump attack (`1H_Melee_Attack_Jump_Chop`, DEX save DC 14, 3d6 bludgeoning half, knockback, `screenShake`) every 8 s |
All skeletons: resist piercing, vulnerable bludgeoning, immune poison. Attack cooldowns minion 1.6–2.4 s, warrior 2.0–2.8,
rogue 0.8–1.2, boss 1.5–2.3. At most **2 enemies swing at the same target at once** (attack tokens). Enemies mid-swing take
×0.6 poise damage (boss ×0.3) so telegraphs come out; a full 3-hit light combo staggers a warrior, a heavy staggers a minion.
Behaviours: `dormant` (Skeletons_Inactive_Floor_Pose, invulnerable) → `awaken` (2 s, invulnerable) → `chase`
(Running_A / Walking_D_Skeletons) → `attack` / `strafe` (Running_Strafe_L/R) / `retreat` (Walking_Backwards) ; leash to
`ai.home` (heals to full there); separation between enemies; `Idle_Combat` when engaged. Enemies emit `footstep`.
Level scaling (`opts.level`): +6 HP and +1 AC/attack per 2 levels.

## Companion (Ilyra)
Follows at 2.5 m (walk < 6 m, run beyond, matches sprint), teleports behind the player if > 30 m. In combat (awake enemy
within 22 m of the player) keeps ≥ 6 m from the nearest enemy and ≤ 10 m from the player, casts Sacred Flame at the
player's lock target (else nearest) every 3 ± 0.5 s, Healing Word once per encounter when the player is under 40% HP
(resets on `startEncounter`, on rest, or after 10 calm seconds). `setCompanionFollow(false, pos)` walks her to `pos` and holds.

## Events emitted (see `core/events.ts`; appended ones marked ★)
`attackRoll` (kind `'attack'`, and `'save'` for saving throws in combat) · `damage` · `heal` · `miss` (reasons miss/dodge/
block/parry) · `parry` · `death` · `swing` (at the start of the active window; kind light/heavy/charged/spell) · `dodge` ·
`footstep` (player, enemies, companion) · `castStart` / `castRelease` / `spellImpact` (also `shockwave`, `smokeBomb`,
`summonMinions`, `healingWord`) · `projectile` (kinds `fireBolt rayOfFrost magicMissile necroticBolt sacredFlame dagger`) ·
`condition` · `staminaEmpty` · `levelUp` · `xp` · `check` · `trigger` · `interactable` · `interact` · `loot` · `itemUsed` ·
`equip` (itemId '' = unequipped) · `gold` · `rest` · `bossStart` / `bossEnd` · `encounterStart` / `encounterEnd` ·
`cinematic` · `teleport` · `toast` · `screenShake` · `hitStop` (0.06 s on heavy/charged/crit hits involving the player;
0.08 on parry) · `gameOver{victory:false}` on player death.
★ `telegraph {actorId, kind, pos, duration}` (enemy wind-up started — flash/sound cue) · ★ `damageMod {targetId, type,
mod: resist|vulnerable|immune, pos}` · ★ `lockOn {actorId, targetId|null}` · ★ `stagger {actorId, pos, seconds}` ·
★ `respawn {pos}` · ★ `chargeStart {actorId}`.

## Integration notes for render / ui / audio
- Read `actor.scale` (boss 1.35) when building the view; `actor.invulnerable` while awakening; `actor.attackPhase`
  (`startup|charge|active|recovery`) if you want to tint the wind-up; `actor.hidden` after the corpse timer.
- `setPlayerClass` changes `player.model` — rebuild the CharacterView (the lead's `startGame` already does).
- Hotbar: `world.kit[i]` → `getAbility(id)` for name/icon/description; cooldown = `player.cooldowns[id]`, resource =
  `player.resources[def.cost.resource]`. Character sheet: `player.pendingLevelUps > 0` means the level-up screen is due;
  choices = `getClass(player.classId).levelUpChoices` (exclude ones already in `player.feats`).
- Equipment UI: `world.equipment` holds item ids (not in `world.inventory`); `equip(id)` / `unequip(slot)`.
- All anim names requested by the sim exist in the KayKit sets (verified against the glb clip tables); one-shots are
  scaled by `speed` so the clip spans the sim window.
