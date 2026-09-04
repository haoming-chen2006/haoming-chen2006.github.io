# NOTES-ui — Hollowmere UI (BG3-style overlay)

Owner: ui agent. Everything under `src/ui/**`, `public/assets/fonts/**`, `public/assets/ui/**`, `dev-ui.html`, and the `#loading` markup in `index.html`.

## Wiring (lead)

```ts
import { createUI } from './ui/index.ts';
const ui = createUI({ world: game.world, game });      // game satisfies UIGame: pause/setQuality/quality/input/restart/startGame/cam
game.frameHooks.push((dt) => ui.update(dt));           // once per render frame (HUD bars, floating text, boss bar, cooldown sweeps)
ui.showScreen('menu');                                 // after the loading screen hides
// dialogue runtime: ui.dialogue.present(node, choices, onPick, onContinue) / ui.dialogue.hide() / ui.dialogue.showRoll(roll, onDone)
// quest runtime:    ui.tutorial.show(step) / ui.tutorial.complete(id) / ui.tutorial.card(title, html, keys?)
```

Optional second argument `createUI(ctx, { hotkeys, root, instantText })`:
- `hotkeys` (default `true`): the UI itself listens (capture phase) for **Esc / I / C / J / M** and toggles pause / inventory / character / journal / map, and for **1–9 / Space / Enter / arrows** while a dialogue or dice overlay is open. If game.ts prefers to route those keys via `input.wasPressed(...)` → `ui.showScreen(...)`, pass `hotkeys: false` so they don't double-toggle. Screens are only opened by hotkeys when `game.state === 'playing'` (or `state` is undefined).
- `instantText`: skip the dialogue typewriter.

`UI` also exposes (beyond the contract): `screen` (current `ScreenName`), `toast(text, kind)`, `root`, `warm()` (pre-compiles the dice renderer; it is called automatically ~2.5 s after creation on idle — call it earlier from the loading screen if you like).

### What the UI does with input / pause
- Any open screen: `game.pause(true)` (except `menu | classSelect | credits | death | ending`, which capture input but do not pause), `input.uiCapture = true`, `input.releaseLock()`.
- Closing the last screen: `pause(false)`, `uiCapture = false`, `input.requestLock()` (only if `game.state === 'playing'` / undefined).
- Dialogue and dice overlays: `uiCapture = true` + pointer lock released while open (choices are clickable); no pause. `isBlocking()` is true for screens, dialogue and dice.
- Class select `Begin` → `nav.close()` first (unpause / uncapture) → `game.startGame(classId, name)`. It also writes `localStorage['hm.save'] = {classId, name}`, which makes the **Continue** item appear on the main menu (Continue just calls `startGame` with those values). Pause → *Quit to menu* and death → *Main menu* clear that flag and call `game.restart()`.
- Settings: quality → `game.setQuality(t)` (your implementation reloads); sensitivity / invert Y → `game.cam.sensitivity` / `.invertY`; volumes → `document.dispatchEvent(new CustomEvent('ui:volume', { detail: { master, music, sfx } }))`. Persisted in `localStorage['hm.settings']` and re-applied on `createUI` (so the audio agent gets an initial `ui:volume` on boot).
- `quality` low/medium → the root gets class `noblur` (panels drop `backdrop-filter`) and the dice skips the PMREM environment; keeps the SwiftShader harness fast and low-end GPUs happy.
- Backdrop blur is otherwise 6 px on panels only, never full-screen.

## Bus events consumed
`damage heal miss parry attackRoll check damageMod stagger xp gold loot equip levelUp toast staminaEmpty interactable bossStart bossEnd death areaEnter cinematic rest questStep questLog respawn gameOver prologueComplete dialogueEnd ui condition`
- `attackRoll` floaters only for the player's own attacks (`18+5 = 23 vs AC 13 — HIT`); enemy attacks show only damage / MISS / DODGED / BLOCKED / PARRY.
- `damage` on the player: red hit-flash vignette + portrait shake (no number floater spam); on others: type-coloured number with the damage-type glyph, `CRITICAL!` callout.
- `levelUp` (player) → level-up screen ~1.4 s later (deferred while a dialogue / dice / other screen is open). `death` (player) → death screen after 2.6 s if still dead. `gameOver {victory:false}` → death screen. `prologueComplete` → ending screen after 1.8 s (stats table from the payload; falls back to `world.stats`). `respawn` closes the death screen.
- `ui {screen}`: consumed (idempotent) **and** emitted on every `showScreen` — handlers must not call `showScreen` from it in a way that would loop (mine guards on `name === current`).
- `cinematic {on}`: letterbox bars + hides bars/hotbar/quest/prompt/tutorial/pickups/toasts (`#hud.cine`).
- `questStep` drives the bottom-right objective panel; the panel also polls `world.quest` (first step with `done !== true`) so it stays correct without events.

## DOM events dispatched (audio agent)
`document.dispatchEvent(new CustomEvent('ui:sfx', { detail }))` with `detail ∈ 'click' | 'hover' | 'open' | 'close' | 'dice' | 'success' | 'fail' | 'levelup' | 'loot' | 'equip'`, and `'ui:volume'` as above.

## World fields read (all optional-chained)
`world.player` (hp/maxHp/tempHp/stamina/level/xp/prof/abilities/ac/skillProfs/saveProfs/expertise/feats/conditions/resources/cooldowns/targetId/weapon/dead/pendingLevelUps), `world.playerId`, `world.actors` (companion `ilyra` or first `kind === 'companion'`; boss by `bossStart.actorId`), `world.inventory`, `world.gold`, `world.equipment`, `world.kit` (hotbar ids; falls back to `CLASSES[cls].kit`), `world.quest`, `world.flags` (unlocks `CODEX` entries in the journal; `world.journalEntries` / `world.lore` override if present), `world.stats`, `player.maxResources` (if the sim adds it; else class `resources` are the maxima for the pips).
World methods called: `equip(itemId)`, `unequip(slot)`, `useItem(itemId)`, `removeItem(itemId, qty)` (Drop; `dropItem` preferred if it ever exists), `chooseLevelUp(id)`, `setPlayerClass` (only via `game.startGame`).
Content tables: static imports of `content/classes.ts` (CLASSES, FEATS), `content/spells.ts` (ABILITIES), `content/items.ts` (ITEMS), `content/story.ts` (CODEX, ENDING_STATS_LABELS, STEPS in the dev page only); `src/ui/content.ts` keeps placeholders for any missing id and exports `setContent()` if you ever want to inject tables at runtime.

## Screens (`ui.showScreen(name)`)
`menu` · `classSelect` · `pause` · `inventory` · `character` · `journal` · `map` · `levelUp` · `settings` · `credits` · `death` · `ending` · `null`.
Inventory / character / journal / map share a tab bar (I / C / J / M switch between them, Esc or the same key closes). Settings and credits remember where they came from (menu or pause) for *Back*.
HUD: portrait + level badge, HP (with lag ghost + temp HP hatch + low-HP pulse and red vignette), stamina (flashes on `staminaEmpty`), spell-slot diamonds (blue) + class-resource diamonds (gold), conditions with timers and sweep, XP bar, companion mini-portrait, 6-slot hotbar + potion slot (cooldown conic sweep, cost, greyed when unaffordable; clicking a slot synthesises the keypress), objective panel with key chips, interaction prompt, boss bar, area title card, toasts (top), pickup cards (bottom-right), floating combat text, letterbox, crosshair dot (only for staff/wand/crossbow wielders without lock-on), rest fade. HUD is scaled with CSS `zoom` between 1× (≤900 px tall) and 1.35×.
Dice: three.js icosahedron with a numbered canvas atlas; lands with the rolled face upright (orientation solved per face), then modifier chips (`d20 · 14 + 5 modifier + Guidance 3`), total, SUCCESS / FAILURE (or HIT / MISS for attacks), nat 20 / nat 1 callouts, advantage note. Space / click continues (or skips the tumble).
Dialogue: portrait (class icon for the player, crescent crest for Ilyra, book for the narrator, crown for the boss), speaker, typewriter (click / Space to complete), numbered choices with gold `[Skill]` tags, DC preview on hover, tag icons for attack / leave / gold, `{name}` `{class}` substitution. Keys 1–9, W/S or arrows + Enter.
Tutorial: right-side stack, `show(step)` / `complete(id)` (check + slide-out), `card(title, html, keys?)` info cards (auto-dismiss 14 s, X to close), `INFO_CARDS` (ability scores, checks, AC, proficiency, spell slots, rest, stamina, HP, advantage, lock-on) exported from `src/ui/index.ts` — call `ui.tutorial.card(INFO_CARDS.ac.title, INFO_CARDS.ac.html)` from the quest script when you want one.
Key glyphs: `kbd('Shift')`, `keys(['W','A','S','D'])` from `src/ui/dom.ts`; mouse buttons as `LMB / RMB / MMB / Wheel`.

## Dev page & harness
`http://127.0.0.1:5180/rpgtrial/dev-ui.html` mounts the real `World` + `ThirdPersonCamera` over a placeholder three.js landscape with a fake `game`. Toolbar (toggle with backquote) opens every screen and fires sample events; URL params: `?screen=inventory`, `?fire=damage,crit,boss` (fired after 3 rendered frames), `?dev=0` (hide toolbar), `?flat=1` (cheap background — use it for headless shots), `?loading=1` (keep the loading screen), `?type=0` (instant dialogue text), `?class=wizard`, `?quality=high` (enables blur + dice env). `window.__dev.fire('rollNat20')` / `window.__dev.screen('map')` for `eval:`.
Shots were taken with a scratch harness equivalent to `e2e/shot.cjs` plus viewport + `__devReady` wait: `e2e/shots/ui-{loading,menu,menu-1080,class,class-1080,hud,hud-1080,dialogue,dialogue-1080,dice,dice-fail,dice-nat20,dice-nat1,inventory,inventory-1080,inventory-detail,character,journal,map,levelup,settings,pause,death,ending,credits}.png`.

## Known issues / notes
- Headless SwiftShader starves CSS transitions when the page is busy (first-frame shader compiles, backdrop blur). The lead's harness runs `?quality=medium`, which disables blur; if a shot shows a screen mid-fade, wait longer — it is not a UI bug (verified with `document.timeline` evals).
- Death screen: the sim's "death saving throw" flow is not exposed as events, so the three red pips are decorative; `respawn` closes the screen.
- The level-up HP gain shown is the average roll (`hitDie/2 + 1 + Con`); if `rules.ts` rolls it, the number may differ by a point or two.
- `chooseLevelUp(id)` is called with `levelUpChoices[i].id` from the class table; the screen closes immediately (no confirmation).
- Map: the crypt (z ≈ −500) is not drawn; the map says so when the player is down there.
- Fonts are variable-weight latin subsets (Cinzel 400–900, EB Garamond 400–800 + italic) at `/assets/fonts/*.woff2`, self-hosted via `@font-face` in `ui.css`; Vite rewrites them to `/rpgtrial/assets/fonts/...` in the build (verified).
- `public/assets/ui/` holds `corner.svg`, `divider.svg` and `icons.svg` (a `<symbol>` sprite of every icon in `src/ui/icons.ts`) for anyone who wants the same glyphs in 3D VFX or docs; the UI itself inlines them.
