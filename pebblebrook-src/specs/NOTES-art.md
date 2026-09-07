# NOTES — art + render (Agent C)

Status: **working end to end** on both the hand-made demo village and Agent A's generated world.
`npm run check` is clean for `src/art/**`, `src/render/**` and `scripts/*` (remaining errors at the time
of writing are in other agents' in-progress modules). Verified by Playwright screenshots
(`node scripts/render_shots.cjs`) at noon/spring, dusk/autumn, night/winter+snow, storm, fog, summer
night (fireflies), the farm, the lake, the mine, hover labels, low quality, and the character sheet.

## Files

| file | what |
|---|---|
| `src/art/index.ts` | `loadArt(base): Promise<Art>` — the `Art` contract from core; also exports the generators |
| `src/art/catalogue.ts` | **the data**: every Kenney sheet coordinate used, autotile sets, building pieces, item sprites, recolour regions |
| `src/art/atlas.ts` | loads `rpg.png`, bakes 4 seasonal sheets, 3 water frames, all 256-mask autotiles (lazily), the synthetic deep-water set |
| `src/art/tiles.ts` | terrain sprites (`tileSprite`), building pieces / doors / windows, fences, bridges, tree & rock tiles, mine mouth, flowers |
| `src/art/objects.ts` | `objectSprite(atlas, kind, data, season, frame)` for every `ObjectKind`; drawn props (well, board, bench, lantern post, animals, ripples, stage, maypole, scarecrow, trough, sawhorse, beehive, nets, mailbox…) |
| `src/art/characters.ts` | the character generator: 16×28 frames, 4 dirs × (idle + 4 walk), 11 hair styles, 4 hats, 3 builds, profession overlays, 32×32 portrait |
| `src/art/crops.ts` | crop stage sprites for every `CROPS` entry (tall corn/sunflower are 16×32) + produce icons |
| `src/art/icons.ts` | item icons (sheet or drawn, fallback pouch with initial), weather/skill/place icons |
| `src/art/emotes.ts` | the 11 emote bubbles |
| `src/art/pixel.ts` | canvas + colour helpers, `Painter` (whole-pixel drawing) |
| `src/render/index.ts` | `createRenderer(canvas, art, world): Renderer` (+ `RendererExt` extras) |
| `src/render/ground.ts` | chunked ground cache (16×16 tiles per chunk), building composition, roof/window/chimney/water lists |
| `src/render/camera.ts` | smoothed, clamped camera |
| `src/render/lighting.ts` | `ambient(hour, season, weather)` + the light canvas pass |
| `src/render/weather.ts` | rain/splashes, snow, fog sheets, storm flashes (+ `sfx thunder` on the bus) |
| `src/render/particles.ts` | chimney smoke, autumn leaves, fireflies, birds |
| `src/render/overlay.ts` | speech bubbles, labels, highlight, vignette |
| `src/render/fakeworld.ts` | `FakeWorld` (84×64 demo village implementing `World`) + `FakeSim` (ten walking, chatting villagers on any `World`) |
| `src/render/preview.ts` | the preview harness (`scripts/preview.html`) |
| `scripts/preview.html` | dev page: `http://localhost:5190/pebblebrook/scripts/preview.html?…` |
| `scripts/render_shots.cjs` | Playwright screenshot scenes (29, real + demo world) → `--out dir`; the latest set is in `e2e/shots/render/` (gitignored) |
| `scripts/atlas_preview.html`, `atlas_shots.cjs`, `atlas_region.cjs` | labelled views of the sheet for reading tile indices |

## How to run

```
npm run dev                                    # port 5190
open http://localhost:5190/pebblebrook/scripts/preview.html?hour=21&season=summer&weather=sunny
node scripts/render_shots.cjs                  # every scene; or: node scripts/render_shots.cjs noon-spring chars
```

Preview URL params: `hour` (fractional), `season`, `weather` (sunny|cloudy|rain|storm|fog|snow), `intensity`,
`follow=player|<villagerId>|none` (+ `x`,`y` for the free camera; WASD pans), `px`,`py` (player position),
`speed` (in-game minutes per real second), `quality=low`, `walk=0` (freeze villagers), `talk=0`,
`inside=cerys:bakery,bram:smithy` (park villagers inside → smoke/glow/hidden), `birds=1`, `world=fake`
(the hand-made village instead of `generateWorld`), `seed`, and `mode=chars|pieces|items` (debug sheets:
all villager sprites + portraits / every building piece per colour set / every item, crop stage, emote, UI icon).

## Catalogue conventions (`src/art/catalogue.ts`)

- `TileRef = [col, row]` on `rpg.png`: source x = col·17, y = row·17 (16 px tiles, 1 px margin, 57×31).
- **Autotiles** are Kenney's 13-piece blob sets (centre, 4 edges, 4 outer corners, 4 inner notches).
  `atlas.autotile(name, mask, season, frame)` returns the tile for any 8-neighbour mask; atlas.ts bakes all
  256 masks per set by compositing the four 8×8 quadrants. Mask bits (clockwise from north):
  `N=1 NE=2 E=4 SE=8 S=16 SW=32 W=64 NW=128` (exported from `src/art/index.ts`); a set bit means "that
  neighbour joins me". Sets: `water` (grassy shore), `pool` (stone rim), `dirt` (used for dirt, path *and*
  farmland soil), `stone`, `sand`, `farmland` (the bordered brown block, unused now), `meadow`, `leaves`,
  `flowerfield`, `snow`, plus the synthetic `deep` (translucent blob drawn over shallow water).
- **Joins** (`src/render/ground.ts` `joins()`): water∪deepwater∪bridge; dirt/path with dirt, path, bridge,
  door, stone; stone with stone, path, bridge, door, floor, rock, prop; sand with sand and water; farmland
  only with farmland; fence with fence; rock with rock/prop. Off-map counts as joining.
- **Building sets**: the sheet has four 7-column blocks at base columns beige 13, grey 20, blue-grey 27,
  brown 34 (rows 12..24). Walls come from rows 15–20; the pitched-roof pieces are columns 0..3 of rows 21–24
  (slopes `(c,21)/(c+1,21)`, body `(c,22)/(c+1,22)`, peak `(c,24)`), and **each block's roof pieces have
  their own colour**: brown → brown, grey → orange, blue-grey → slate, beige → cream. Columns 4..6 of rows
  21–23 are a lighter flat block (not used for roofs). `WALL_STYLES[style]` = beige, brown, grey, blue-grey;
  `ROOF_COLOURS[colour]` = brown, slate, orange, cream — chosen so a building with only a `style` gets a
  contrasting pair (beige+brown, brown+slate, grey+orange, blue-grey+cream). Doors/windows per set in
  `DOOR_FOR_SET` / `WINDOW_FOR_SET` (windows have a lit night variant).
- **Seasons**: `atlas.seasons[season]` are whole-sheet recolours. Only green pixels inside `GROUND_REGIONS`
  (ground transform: summer deeper, autumn olive, winter snow-white) and `FOLIAGE_REGIONS` (trees/bushes:
  autumn orange, winter white) change; everything else keeps base colours, so items/UI never shift. Trees
  in autumn prefer the sheet's dedicated orange variants (`TREES.*.autumn`).
- **Water** animates over 3 frames (`atlas.water[season][frame]`): the sparkle pixels drift.

## How the renderer consumes the world

- Reads `world.tile/tileVariant` and, when present, `world.describeTile(x, y)` (Agent A's contract in
  `specs/NOTES-world.md`): `style` (wall style, or roof colour on roof tiles), `window`, `roofRidge`,
  `roofEdge`, `edgeLeft/Right`, `placeId`. Without `describeTile` everything is derived: style = variant & 3,
  roof rows/ends from neighbouring roof tiles, windows every other column of the wall run (upper row of
  two-row walls), never beside a door.
- Composition: top roof row = `[slopeL, body…, slopeR]` (`peak` when 1 wide); middle rows body; bottom row
  `roofFlatLine`; a chimney sprite on the top row one tile in from the right end (also the smoke emitter);
  walls: `wallBand` (beam) on the row under the eave when there are two wall rows, `wallColumns` (planks)
  for the brown set, otherwise `wallPlain`; the interior floor under buildings is darkened so the roof's
  40 % alpha (when the followed character stands on a door/interior tile) reveals a dim inside.
- Tree/rock **tiles** draw themselves in the chunk (tree variant = species 0 oak, 1 pine, 2 apple,
  3 birch→teal conifer; rock variant = ore with glinting dots on a stone-ground mass) unless a tree/rock
  **object** sits on the tile — then only the object draws (single-tile tree when on a tree tile, 2-tall
  otherwise; `wood === 0` → stump; `depleted`/`hp <= 0` → rubble; apple `fruit > 0` → fruiting tree).
- `prop` tiles = the mine mouth (left/centre/right decided by neighbouring props). `bridge` variant 1 =
  north–south planks. `deepwater` = shallow water + the deep blob autotile. `forage` with `qty 0`/`item null`
  draws nothing. Flowerbed `colour` may be a number (0 red, 1 white, 2 blue) or a name. Decoration kinds
  handled: anvil, stage, maypole, gravestone, boat, haybale/hay, scarecrow, trough, logs, logAxe, sawhorse,
  beehive, minecart, nets, mailbox, table, tent, tentBeige, awning, awningGreen, hedge, hedgeDark, bush,
  grave, lilypad, lily, mushroom, deadtree, rocks, waterrock, crates, sacks, and any `PROPS` name.
- Chunks (256×256 px canvases, one per 16×16 tiles) are baked lazily (≤ 2 per frame after the first
  frames), keyed by season, and invalidated by `bus newday`, `bus load`, a season change, or
  `renderer.invalidate(x?, y?, w?, h?)`. Roofs, windows, chimneys and water tiles are kept as lists per
  chunk and drawn per frame (overhead pass, lit windows after dark, smoke, water animation).

## Renderer surface

`createRenderer` returns the core `Renderer` plus (`RendererExt` in `src/render/index.ts`):
`invalidate()`, `hovered` (what the mouse is over, from the canvas' own mousemove), `quality`, `time`
(animation clock), `fx.ambient` / `fx.weather` (particle systems; e.g. `fx.weather.flash = 1` for a
scripted lightning flash). `follow` defaults to `'player'`; `camera` snaps on the first frame and after
`bus load`. Zoom is 3, or 2 below 1100 CSS px wide; the backing store is `devicePixelRatio`-aware with an
integer device-px-per-source-px scale so pixels stay square.

Frame order: ground chunks → animated water → y-sorted objects + villagers + player (flat objects such
as plots/ripples first; `inside` characters hidden) → roofs (+ transparency) → lit windows → ambient
particles → lighting (ambient darkness with light holes + additive warm glows; lights: windows, lanterns,
campfires, the smithy when someone is inside, the player at night) → fireflies → weather → bubbles,
emotes, hover labels, highlight, vignette. `setQuality('low')` drops particles, lights, water animation
and the vignette.

## Characters (`src/art/characters.ts`)

`buildCharacter(look, profession)` (also `art.character`) → 16×28 frames (feet on row 26, 1 px outline
margin), `frames[dir][0]` idle, `1..4` walk. Height 21–26 stretches legs/torso, build sets torso width
(6/8/10) and arm width, `hairStyle` 0..10 (crop, bob, bun, spikes, long, receding+beard, curly, braid,
side part, wavy, shaggy), `hat` 1 straw, 2 cap, 3 miner's helmet with lamp, 4 flat cap. Profession
overlays: baker apron, smith leather apron, doctor cross, farmer braces, fisher stripes, innkeeper rolled
sleeves + vest, miner strap, shopkeeper vest + tie, librarian glasses, carpenter tool belt. The outline is
generated from the silhouette, so anything drawn gets Kenney's dark edge for free. Cached per look key.
Portrait = head and shoulders of the idle-down frame at 2×.

## How to add a sprite

1. Find its (col,row) with `node scripts/atlas_region.cjs rpg <x0> <y0> <cols> <rows> 8 <name>` and view
   the PNG; add it to `PROPS`/`DETAIL`/`ITEM_SPRITES` in `catalogue.ts` (never hard-code coordinates elsewhere).
2. Anything the sheet lacks: draw it with `Painter` in `objects.ts` (`drawn(key, w, h, fn)`) or `icons.ts`
   (`DRAWN[id]`), 16 px wide, dark outline `OUTLINE`, transparent background, feet at the bottom; taller
   sprites return `oy: -1` (tiles) so they draw one tile up.
3. Objects: add a `case` in `objectSprite`; decorations go in the `decoration` switch by `data.kind`.
4. Run `node scripts/render_shots.cjs items` (or `chars`/`pieces`) and look.

## Performance

0.2–1.1 ms render time per frame at 1280×800 zoom 3 on the generated 96×72 world (120 fps cap in the
preview): chunks are single `drawImage`s, water re-blits only the visible water tiles on frames 1–2,
objects/villagers are a few hundred draws, the light canvas is at source resolution. First-frame chunk
baking of a whole 96×72 map is ~30 ms. Character sheets are built once per look.

## Open questions / for the lead

- `main.ts` needs nothing new: `createRenderer(canvas, art, world)` + `renderer.render(sim, dt, player)`
  + `resize` already match. Cast to `RendererExt` for `invalidate`/`hovered`/`fx` if wanted.
- The world's lantern objects carry `lit:false`; the renderer lights lanterns by the ambient night level
  regardless. Campfires honour `data.lit`.
- The UI agent can use `art.icon('item'|'weather'|'skill'|'place', id, size)` (canvas), `art.item(id)`
  (SpriteRect) and `art.character(look, profession).portrait`.
