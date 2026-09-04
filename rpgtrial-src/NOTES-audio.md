# Hollowmere — audio notes (audio agent)

Everything lives in `src/audio/**`, `public/assets/audio/**`, `scripts/fetch-audio.mjs`,
`scripts/audio-check.mjs`, and the test bench `dev-audio.html` + `src/audio/dev-audio.ts`.
No file outside those was touched.

## Wiring (lead)

```ts
import { AudioSystem } from './audio/audio.ts';

const audio = new AudioSystem();          // safe before any user gesture; adds its own unlock listeners
audio.init().then(...);                   // decodes sfx + ambience (~230 files); music decodes lazily per mood
// per frame (render loop is fine):
audio.update(dt, { pos: player.pos, yaw: cam.yaw, camPos: cam.camera.position /*, hp01 */ });
audio.setArea('shore' | 'crypt');         // reverb size, ambience beds, area-specific music variants
audio.setMood('menu'|'explore'|'camp'|'tension'|'combat'|'boss'|'victory'|'ending'|'death');
audio.setTimeOfDay(t);                    // fraction of a day (0.5 = noon; >1 is treated as hours). Default 0.78 (dusk)
audio.setVolumes({ master, music, sfx }); // 0..1 (also via document CustomEvent 'ui:volume' {detail:{master,music,sfx}})
audio.play('chest_open' | 'gate_open' | 'boulder' | 'lockpick' | 'owl' | 'whisper' | 'thunder' | <any manifest id>, { pos, volume, pitch, loop });
audio.playStinger('sting_bighit_1');      // musical hit over the current track (ducks the bed)
audio.setPaused(on);                      // low-pass + dip; also driven automatically by bus 'ui' events
```

- `update()` also reads `window.__hm.world.player.hp/maxHp` (set by game.ts) for the low-HP heartbeat if you
  don't pass `hp01`. `sfx.ts` uses `window.__hm.world.actors` to know whether a hit target is a skeleton /
  the player / the boss (falls back to id heuristics: `sk*`, `boss`, `player`).
- The system subscribes itself to every gameplay event on `bus` and to `document` CustomEvents:
  `'ui:sfx'` with `detail` ∈ `click, hover, open, close, dice, success, fail, nat20, nat1, levelup, loot,
  equip, error, page, select, back, confirm, toggle, scroll, chest, gate, boulder, lockpick` (unknown detail
  strings fall through to `play(detail)` if it is a manifest id, else a soft tick).
- Mood changes it makes on its own (all idempotent with your own `setMood` calls, deduped within 0.5 s):
  `encounterStart → combat`, `encounterEnd → short victory sting then explore`, `bossStart → big hit + boss`,
  `bossEnd → victory (full sting, auto-returns to explore after 7 s)`, `gameOver → death | victory`,
  `prologueComplete → ending`, `rest(long) → camp`, `ui {screen:'menu'} → menu`.
  Area changes on its own: `teleport {area}` and `areaEnter` ids starting with `crypt`.
- Dialogue: `dialogueStart/End` duck music −7 dB and ambience −4 dB with a soft swell; `dialogueLine` is a
  quiet paper cue. `check` plays the dice rattle immediately and the success/fail/nat-20/nat-1 result after
  0.95 s unless the UI sends `'ui:sfx' success|fail|nat20|nat1` first (that cancels the scheduled result).
- Pause treatment: any `bus.emit('ui', { screen })` that is not `menu|classSelect|ending|death|levelUp`
  low-passes the whole mix to 700 Hz and dips it; `screen: null` restores.
- Memory: sfx+amb decoded up front ≈ 8 minutes mono ≈ 45 MB PCM. Music is decoded on demand and the last
  4 tracks are kept (~25–50 MB each). `combat` is prefetched first, then `tension`/`explore`/`camp`.

## Architecture

| file | role |
| --- | --- |
| `engine.ts` | AudioContext, buses (music/sfx/amb/ui/voice) → duck stages → master → glue compressor → limiter. Two generated convolution reverbs (small outdoor / large crypt, exponentially decaying noise with early taps), per-voice sends that get wetter with distance. HRTF `PannerNode` per positional voice, listener from `update()` (ears sit 35 % of the way from the player toward the camera). Buffer cache, family/variant picking (never repeats the last variant), per-key rate limiter, 56-voice cap with priority stealing. |
| `synth.ts` | Procedural layer: whoosh (light/heavy), impact (body/metal/bone/stone/wood), per-surface footstep sweetener, granular bone rattles, cloth, risers, spells (fire crackle+sub, frost shimmer+shatter, radiant formant "choir"+bell, force sweeps/missile pops, thunder boom, necrotic drone, heal arpeggio, sparkle), UI ticks/chimes/thud/swell, owl, whisper (formant-swept breathy noise), wind gusts, drips, rumble, gulps, breath. `ProceduralPad`: D-dorian pad (Dm7 Fmaj7 G6 Am7 Cmaj7 Em7, slow detune LFOs) with sparse bell/harp notes; sits under menu/explore/camp and fills the gap while a track decodes. |
| `music.ts` | mood → track (area aware), equal-power crossfades (combat in 1.2 s / out 2.5–4 s, others 3 s), stingers with ducking, dialogue duck, victory auto-return, lazy decode + prefetch. |
| `ambience.ts` | Beds per area with time-of-day mix (birds ↔ crickets/owls), lake-edge loop that follows the nearest shoreline point (louder near/inside the water), campfire loop at `LANDMARKS.campfire`, torch/brazier/candle loops for the nearest 6 `LIGHTS` placements, random one-shots (birds, owl, frogs by the lake at night, distant thunder every 45–140 s, gusts; crypt: drips, chains, whispers/moans, far rumbles, falling stones), low-HP heartbeat (<30 %, speeds up as HP drops). |
| `sfx.ts` | Every bus event → layered recipe (see table). |
| `audio.ts` | Facade above. |
| `manifest.generated.ts` | Generated by `scripts/fetch-audio.mjs`: id → file, duration, seamless-loop length. |

## Music (all Kevin MacLeod, incompetech.com, CC BY 4.0 — attribution required, see CREDITS.txt)

| mood | shore | crypt | notes |
| --- | --- | --- | --- |
| menu | Lost Frontier (132 s loop) | same | flautando strings, choir, horn — the lake at dusk |
| explore | Angevin (140 s loop) | Ossuary 1 – A Beginning (120 s) | Renaissance flute/lute/choir; crypt = drone + ethereal melody |
| camp | Midnight Tale (150 s loop) | same | guitar/lute by the fire |
| tension | Long Note Three (96 s loop) | Ossuary 6 – Air (120 s) | drones |
| combat | Volatile Reaction (150 s loop, 7/4 brass + percussion) | same | |
| boss | Truth of the Legend (90 s loop, choir + huge percussion) | same | |
| victory | sting only: Victory Fanfare Short (cynicmusic, CC0, 9 s) → back to explore after 7 s | | `encounterEnd` uses the 5 s "Victory" (celestialghost8, CC0) |
| ending | Long Road Ahead (147 s, plays once) | | |
| death | Private Reflection (42 s, plays once) | | |
| stingers | sting_bighit_1/2 (Danse Macabre big hits), sting_levelup / sting_learn (Joth, CC0) | | |

Loops are baked with an equal-power crossfade at the seam by the pipeline; the browser strips the MP3
encoder delay (verified: decoded `explore` is exactly 140.000 s, leading silence 0), and `engine.ts`
additionally aligns `loopStart` past any leading silence if a browser doesn't.

## Ambience files (`amb/`)
`lake_water` (Vistula river waves, 48 s), `wind_pines` (45 s), `birds_day` (30 s), `crickets` (11 s),
`campfire` (27 s), `torch` (14 s, high-passed + pitched fire), `crypt_drone` (60 s), `crypt_texture` (60 s),
`crypt_drips` (19.5 s), `heartbeat` (1.8 s), `thunder_far_1..3` (field recording, low-passed),
`thunder_near`, `ghost_moan_1..3`, `ghost_breath`. Owls, whispers, gusts, drips, rumbles are synthesized.

## SFX ids (`sfx/`, families with variant counts; `play('<family>')` picks a variant with pitch/volume variation)
```
step_grass(5) step_stone(5) step_wood(5) step_dirt(6) step_water(3)
whoosh_light(6) blade_swish(3) sword_swing(5)
hit_flesh(4) hit_flesh_light(3) hit_slash(5) hit_metal(4) hit_plate(3) hit_generic(3) shield_wood(3) parry(4) metal_ring
bone(6) bone_pile skeleton_rise skeleton_hit body_fall(3) cloth(4)
grunt_effort(3) grunt_hurt(4) grunt_death(2) breath_exhausted roar(3) creature_hurt(2) creature_die growl(3)
spell_fire(4) spell_fire_big spell_generic(2) magic(6) spell_frost spell_cast spell_long
coins(3) coins_handle(2) leather(3) cloth_belt(3) metal_click(2) chainmail(2) armor_light sword_draw(2)
bottle bubble(3) gem(3) item_misc(3) book_flip(3) book_open book_close book_place(2)
door_open(2) door_close(3) creak(3) lock(3) lock_open stones(3) stone_heavy(3) chain(3)
air_whoosh air_whoosh_short fire_flare wood_hit(2) metal_hit(2) dice(4) bird(2) bird_night frog
ui_click(3) ui_hover(3) ui_select(2) ui_open ui_close ui_back ui_confirm(2) ui_error(2) ui_glass(3) ui_bong
ui_tick(2) ui_toggle(2) ui_pluck(2) ui_drop(2) ui_question ui_scroll
```
Named recipes for `play()`: `chest_open`, `gate_open`, `boulder`, `lockpick`, `owl`, `whisper`, `thunder`,
`gust`, `dice`, `success`, `fail`, `nat20`, `nat1`.

## Event → sound map (sfx.ts)
| event | recipe |
| --- | --- |
| footstep | surface family + synth sweetener; running louder; skeletons = bone clicks + stone; per-actor limit 0.11 s; culled > 32 m |
| swing | light: whoosh_light/blade_swish + synth whoosh; heavy/charged: sword_swing + heavy whoosh (+ effort grunt for the player) |
| damage | element layer (slash/pierce = hit_slash, bludgeon = hit_generic, fire/cold/radiant/necrotic/force/lightning/poison = sample + synth) + target layer (skeleton: bone + skeleton_hit + rattle; flesh: hit_flesh + player grunt / boss hurt). crit: + hit_metal + sub thud. blocked: shield_wood or hit_plate + metal click. Player hits dip the music 2.5 dB |
| miss | dodge = cloth + whoosh; block = shield thud; parry → parry recipe; miss = quiet whoosh |
| parry | sword clash + metal ring + synth metal impact + bright chime, music dip |
| dodge | cloth + whoosh (+ effort grunt) |
| death | skeleton = bone_pile + 14-grain rattle + extra bones; player = death grunt + body fall; boss = roar + creature_die + bone pile + rumble |
| stagger / telegraph / chargeStart | rattles/grunts; risers on heavy telegraphs (+ growl for the boss); riser on charged attacks |
| castStart / castRelease / spellImpact / projectile | per spell family: fireBolt, rayOfFrost, magicMissile (3 pops), thunderwave (boom + music dip), sacredFlame, healingWord/secondWind, rage/reckless, smokeBomb, huntersMark, shield, shieldBash, cunningDash, throwDagger, whirlwind, actionSurge, necroticBolt, summonMinions; unknown ids get a generic cast/release/impact. Projectiles get a moving positional trail |
| heal / condition / staminaEmpty | heal arpeggio; buff sparkles (guidance, hidden, frightened, poison…); exhausted breath |
| check | dice rattle → result after 0.95 s (nat 20 = bell cascade, nat 1 = double thud) |
| levelUp / xp / questStep / questLog | level-up sting + chime (rate-limited 3 s); xp tick; quest complete chime; journal page |
| loot / gold / itemUsed / equip | by item kind (coins, potion, weapon, armor, gem, scroll, food); potion = cork + gulps + heal |
| interact | chest / gate / boulder / sword / campfire recipes by interactable id |
| rest | fire flare + sleep whoosh (+ swell, camp mood on long rest) |
| dialogue* | duck + swell in/out, paper cue per line |
| encounter* / boss* / gameOver / prologueComplete | mood changes + stingers (above) |
| areaEnter / teleport / respawn / lockOn / damageMod / hitStop / cinematic | discovery chime; gate creak + whoosh; respawn shimmer; lock tick; vulnerable/immune cues; hit-stop thud; ambience dip |

## Budget report (`node scripts/audio-check.mjs`)
```
group      files      MB     minutes
amb           18    1.85       6.2
music         16   12.11      20.3
sfx          219    1.37       2.1
TOTAL        253   15.33   budget 25 MB (61%)     largest file 1.88 MB (music/combat.mp3)
```
All files are MP3 (LAME VBR: music q7/q8 ≈ 85–100 kbps stereo, ambience q7 mono, sfx q4 mono), 44.1 kHz,
peak-normalized per category by the pipeline.

## Pipeline
- `node scripts/fetch-audio.mjs [--force] [--only=substr] [--no-download]` — downloads every source
  (Kenney zips, OpenGameArt files, incompetech MP3s) into `AUDIO_SRC_DIR` (default `$TMPDIR/hollowmere-audio-src`),
  verifies each is real audio (rejects HTML), trims/filters/pitches, bakes seamless loops (equal-power
  crossfade of the tail into the head), peak-normalizes, encodes, then regenerates
  `src/audio/manifest.generated.ts` and `public/assets/audio/CREDITS.txt`.
- `node scripts/audio-check.mjs [--quiet]` — lists size/duration for every file, asserts ≤ 25 MB total,
  ≤ 3 MB per file, manifest ↔ disk consistency, decodability.

## Verification done
- `npx tsc --noEmit`: 0 errors in `src/audio/**` (the remaining repo errors are in other agents' scripts).
- Headless Chromium (Playwright) against the dev server: all 231 sfx/amb files decode (0 failures),
  AudioContext resumes on the first gesture, the full ~130-button event sequence runs with **no console
  errors or page errors**, music decodes lazily and switches (explore → combat → crypt tension), the stress
  test of 150 rapid events caps at exactly 56 voices.
- A 46 s demo reel was recorded from the actual master output (`e2e/shots/audio-reel.mp3`, also
  `scratchpad/reel/`): explore + steps → dialogue → check → fight → spells → victory/level-up → crypt
  tension + whispers → boss → death. Measured: peak −1.3 dBFS, **0 clipped samples** (after adding the
  limiter — the first take clipped 240 samples), overall −16.2 dBFS RMS, exploration −21 / combat −14 dBFS,
  L/R correlation 0.80. Listen to it to judge the mix — I could not.
- Samples chosen by name were sanity-checked by envelope analysis (attack time / crest / centroid):
  StarNinjas "sword" files turned out to have 0.1–0.26 s of pre-roll (now trimmed so the whoosh lands on the
  swing frame) and one was a clash (dropped); rubberduck "blade" files are swishes, so they became
  `blade_swish` and real transients (Kenney impactMetal_light + rubberduck hits) became `hit_slash`.

## Test bench
`http://127.0.0.1:5180/rpgtrial/dev-audio.html` — buttons for every mood/area/event/spell/ui cue, sliders for
time of day / volumes / listener yaw, "Run full event sequence", "Stress", and raw sample families.
`?auto=1` runs the sequence after decode. `window.__audioDev` exposes `runAll()`, `stress()`,
`playAllSamples()`, `record(script)` (base64 webm of the master bus), `demoReel()`, `emit()`, `btn(label)`.
`window.__audioReport` = `{ total, decoded, failed[], ms }`. Note: other agents' edits trigger Vite full
reloads that kill a long bench run; my scratchpad runner aborts `/@vite/client` to avoid that.

## Known issues / follow-ups
- I could not listen to anything; all balance decisions are by meter. Expect to nudge the per-track
  `level`s in `music.ts` `TRACKS`, the bus trims in `engine.ts` `applyVolumes()`, and recipe volumes.
- Ilyra has no voice; only the male player has effort/hurt/death grunts (HaelDB / thebardofblasphemy, CC0).
  No CC0 female effort set was found on OGA; the "Female RPG Voice Starter Pack" (cicifyre, CC0) has lines
  if you want barks.
- `sting_levelup`/`sting_learn` (Joth) may read a little synthy; a synth chime is layered under them.
- `Long Road Ahead` (ending) and `Private Reflection` (death) play once; after they end only the ambience
  remains until the next `setMood`.
- Torch/candle loops depend on `LIGHTS` in `content/level.ts` being populated by the environment agent
  (read live each 0.5 s, so append-at-runtime is fine).
- HRTF panning costs a little CPU per voice; if a low-end machine struggles, set
  `panner.panningModel = 'equalpower'` in `engine.ts`/`synth.ts` (one line each).
- Safari: `decodeAudioData` of MP3 works; Vorbis was avoided for that reason. Untested on iOS.
