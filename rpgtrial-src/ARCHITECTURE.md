# Hollowmere — architecture & conventions

A Baldur's-Gate-3-flavoured D&D prologue with Elden-Ring/Witcher-style third-person action
controls, built in TypeScript + three.js (WebGL2) + pmndrs `postprocessing` + `n8ao`.
Deployed at https://haoming-chen2006.github.io/rpgtrial/ (Vite `base: '/rpgtrial/'`).

**North star: extremely good graphics.** Everything else supports that.

## Layers (strict dependency direction: content -> sim -> core; render/ui/audio -> sim)

```
src/core      input, fixed-step loop, event bus, math helpers        (no three.js)
src/sim       deterministic game simulation: D&D rules, actors,       (NO three.js, NO DOM)
              movement/collision, AI, quests, dialogue, inventory     headless-testable
src/content   pure DATA: level layout, prologue script, dialogue,     (NO three.js, NO DOM)
              item/class/spell tables
src/render    three.js: renderer + post FX, environment, terrain,
              water, vegetation, characters/animation, camera, vfx, particles
src/ui        DOM overlay: HUD, menus, dialogue, dice, tutorial prompts
src/audio     WebAudio: music layers, sfx, ambience, spatial
src/game.ts   orchestrator: owns everything, runs the loop, wires events
src/main.ts   bootstrap + loading screen
```

`sim` and `content` must be importable from Node (`node --experimental-strip-types`) with no
browser globals so `scripts/*.ts` can run bot tests. Never import three or DOM there.

## Coordinate system & units
- three.js defaults: +Y up, metres. Characters are ~1.8 m tall (KayKit models are scaled to that).
- `yaw` is rotation around +Y in radians; a yaw of 0 faces **-Z** (three.js forward).
  Forward vector = `(-sin(yaw), 0, -cos(yaw))`? **No.** We use: forward = `(sin(yaw), 0, cos(yaw))`
  and characters' models are rotated so their visual front matches `forward`. Use
  `core/math.ts: forwardFromYaw(yaw)` everywhere; never hand-roll it.
- Terrain height: `sim/terrain.ts: terrainHeight(x, z)`. Both sim and render use it.
  Lake surface is at `LAKE_LEVEL` (see `content/level.ts`).

## Fixed-step sim
`sim/world.ts: World.step(dt = 1/60, input: PlayerIntent)`. Render interpolates nothing fancy:
it reads actor positions after the last step. Rendering runs at display rate; sim steps are
accumulated (max 5 per frame). All randomness goes through `sim/rng.ts` (seeded); the render
layer may use `Math.random()` for cosmetic things only.

## Event bus (`core/events.ts`)
Typed pub/sub `bus.emit('hit', {...})`, `bus.on('hit', fn)`. Sim emits gameplay events; render,
ui and audio subscribe. Event names/payloads are declared in `core/events.ts: Events`.
Add new events there (append, don't rename).

## Actors (`sim/types.ts`)
Every character (player, companion, enemies) is an `Actor` with D&D stats (abilities, AC, HP,
proficiency, level), action-game state (stamina, `state` machine, i-frames, poise), a
`model` id (which KayKit glTF), and an `anim` request (`{ name, loop, fade, speed }`) that the
render layer plays. Render never mutates sim state.

## Player intent (`sim/types.ts: PlayerIntent`)
Built by `game.ts` from `core/input.ts` and the camera yaw every sim step:
`{ move: {x, z} (camera-relative, normalised), sprint, dodge, jump, lightAttack, heavyAttack,
block, lockOn, interact, ability: 0-5|null, useItem, cameraYaw }`.

## Controls (Elden Ring / Witcher feel — keep these exact)
| Action | Key |
| --- | --- |
| Move | WASD |
| Camera | Mouse (pointer lock), scroll = zoom |
| Sprint | Shift (hold) — drains stamina |
| Dodge roll | Space (tap) — i-frames, costs stamina |
| Jump | Space while sprinting? No: **Ctrl/ C = jump**; Space = dodge |
| Light attack | Left mouse |
| Heavy attack | Right mouse (hold ≥ 0.25 s = charged) |
| Block / parry | Q (hold) — parry window is first 0.2 s |
| Lock-on | Middle mouse or Tab; scroll while locked = switch target |
| Interact | E |
| Abilities / spells | 1 2 3 4 5 6 |
| Potion | R |
| Inventory | I, Character sheet C, Journal J, Map M |
| Pause / settings | Esc |

## Asset conventions (`public/assets`)
- `models/characters/*.glb` KayKit characters (Knight, Mage, Rogue, Barbarian, Ranger,
  Skeleton_Warrior/Mage/Rogue/Minion). Animation names as in the glb (see `render/anims.ts`).
- `models/props/<name>/<name>.glb` Poly Haven / KayKit props, decimated with gltfpack.
- `textures/<name>/<name>_{diff,nor_gl,arm}_1k.jpg` Poly Haven PBR sets.
- `hdri/*.hdr` (1k–2k). `audio/{music,sfx,amb}/*.ogg|mp3`. `fonts/*.woff2`.
- Load through `render/assets.ts: assets.gltf(path)`, `assets.texture(path)`, `assets.hdr(path)`
  (cached, path-prefixed with `import.meta.env.BASE_URL`).
- Keep the deployed folder under ~80 MB total. Trees: gltfpack `-si 0.03` or lower.

## Quality tiers (`render/quality.ts`)
`ultra | high | medium | low` toggled in settings; controls shadow map size, AO, bloom, DoF,
grass density, tree count, pixel ratio. Default is auto-detected (`high` on desktop GPUs).

## File ownership during parallel work
Each agent edits ONLY its own files; new files go in its own folder. Shared files
(`sim/types.ts`, `core/events.ts`, `content/level.ts`) are appended-to only, with a comment
`// <agent-name>:` — never reorder or rename existing members. If you need something from
another module that doesn't exist yet, add a TODO in your own file and stub it locally.

## Testing
- `npm run check` (tsc) must pass.
- `npm test` runs `scripts/test.ts` — headless sim tests (rules, combat, quest flow, bot run).
- `e2e/*.cjs` Playwright screenshots against `npm run dev` (port 5180). Verify visually.

## Contracts between agents (implement EXACTLY these names)

### World API (sim-rules agent implements on `World`, content-quest agent calls)
```ts
world.spawnEnemy(kind: 'minion'|'warrior'|'mage'|'rogue'|'boss', pos: Vec3, opts?: { id?, yaw?, dormant?: boolean, name?, level? }): Actor
world.startEncounter(id: string, actorIds: string[]): void   // wakes dormant enemies (awaken anim), emits encounterStart; emits encounterEnd when all dead
world.skillCheck(actor: Actor, skill: SkillKey, dc: number, opts?: { label?, bonusDice?, advantage? }): RollResult // emits 'check'
world.abilityCheck / world.savingThrow(actor, ability, dc, opts?): RollResult
world.giveItem(itemId: string, qty = 1): void            // emits loot; world.inventory: InventorySlot[]; world.gold
world.equip(itemId): void; world.useItem(itemId): void   // emits equip/itemUsed
world.grantXp(amount): void                              // emits xp; levelUp at thresholds (300 xp = level 2)
world.chooseLevelUp(choiceId): void
world.rest(kind: 'short'|'long'): void                   // emits rest
world.setPlayerClass(classId: ClassId): void             // rebuilds player stats/kit/model from content/classes.ts
world.setCinematic(on: boolean): void                    // freezes player input, actors idle
world.setCompanionFollow(on: boolean, targetPos?: Vec3)  // Ilyra follows/holds position
world.playAnim(actorId, name, loop?, fade?, speed?)      // for cinematics/dialogue emotes
world.lookAt(actorId, targetId | Vec3)                   // turn an actor toward something
world.flags: Set<string>                                 // quest flags
world.encounters: Map<string, { alive: number }>
```
### Dialogue runtime (`sim/dialogue.ts`, content-quest owns): `startDialogue(world, tree)`, resolves choices/checks, emits
`dialogueStart/dialogueLine/dialogueEnd` and calls `ui.dialogue.present(node, choices, onPick)` through `game.ui` (set by game.ts).
Effects/conditions strings are resolved by `content/prologue.ts: resolveEffect(world, id)` / `checkCondition(world, id)`.

### UI context (ui agent implements `src/ui/index.ts: createUI(ctx: UIContext): UI`)
```ts
interface UIContext { world: World; game: { pause(on: boolean): void; setQuality(t: QualityTier): void; quality: QualityTier; input: Input; restart(): void; startGame(classId: ClassId, name: string): void; cam: ThirdPersonCamera } }
interface UI {
  update(dt: number): void;          // per frame: HUD bars, floating text positions (uses game.cam.camera.project)
  showScreen(name: 'menu'|'classSelect'|'pause'|'inventory'|'character'|'journal'|'map'|'levelUp'|'settings'|'ending'|'death'|null): void
  dialogue: { present(node: DialogueNode, choices: DialogueChoice[], onPick: (i: number) => void, onContinue: () => void): void; hide(): void; showRoll(roll: RollResult, onDone: () => void): void }
  tutorial: { show(step: QuestStep): void; complete(id: string): void }
  worldToScreen(pos: Vec3): { x: number; y: number; visible: boolean }
  isBlocking(): boolean              // a menu is open → game paused / input captured
}
```
UI reads state from `world.player`, `world.inventory`, `world.gold`, `world.quest` (QuestStep[]) and subscribes to bus events.

### Environment ↔ post-FX
`WorldView` exposes `sun: DirectionalLight`, `sunPosition: Vector3` (far-away point for god rays), `sunSprite: Mesh` (emissive disc), `fogColor`, `terrain: Mesh`, `water: Mesh`, `colliderMeshes: Object3D[]` (for camera collision), `heightAt(x,z)`.
`Renderer` exposes `setCinematic(on: boolean, focusDistance?: number)`, `flash(color, strength)`, `damageVignette(strength)`, `hitStop(seconds)` and `settings`.

## Gotcha: bone names
GLTFLoader sanitises node names (`handslot.r` → `handslotr`, `hand.l` → `handl`). `CharacterView.bones` stores both spellings.
