# NOTES — world (Agent A)

Status: **complete and tested.** `node scripts/world_test.ts` passes for seeds 1–5; `npm run check` is clean
for `src/world/**` and `scripts/world_*.ts` (remaining tsc errors at the time of writing are in other
agents' in-progress modules: `src/sim/tools/*`, `src/ui/preview.ts`).

## Files

| file | what |
|---|---|
| `src/world/index.ts` | entry: `generateWorld(seed, { bus? })`, `describeTile`, `walkableNeighbours`, re-exports |
| `src/world/grid.ts` | tile storage (typed arrays), kind ↔ index tables, walkable/cost masks |
| `src/world/layout.ts` | the hand-designed map painter: regions, buildings, roads, water, objects, places |
| `src/world/path.ts` | A* (binary heap, generation-stamped scratch arrays), `nearestWalkable`, neighbours |
| `src/world/clock.ts` | clock, calendar/festivals, daily weather plans, weather overrides |
| `src/world/world.ts` | the `World` object: crops, nature respawns, object queries, save/load |
| `src/world/tables.ts` | fish tables, forage tables, animals, grave/sign text |
| `scripts/world_test.ts` | headless test (exit 1 on failure) — run it before touching anything here |
| `scripts/world_ascii.ts` | `node scripts/world_ascii.ts [seed] [--objects] [--places]` prints the map |

## How to run

```
node scripts/world_test.ts          # ~1 s; generation, places, paths, 60-day sim, save/load
node scripts/world_ascii.ts 1 --objects --places
```

## API

`generateWorld(seed, opts?)` returns `PebbleWorld = World & WorldExtras`. `World` is the frozen core
contract. `WorldExtras` (all optional to use; the sim will want them):

```ts
describeTile(x, y): TileInfo            // { kind, variant, style, roofEdge, roofRidge, edgeLeft, edgeRight, window, interior, placeId }
walkableNeighbours(pos): Vec[]          // up/down/left/right that are walkable
isInterior(x, y): boolean               // building interior anchor (walkable only for whoever is "inside")
till(plotId) / clear(plotId) / plant(plotId, cropOrSeedId, owner?) / water(plotId)
harvestable(plotId) / harvest(plotId) → { item, qty } | null
chop(treeId) → { item:'wood', qty:1 } | null          // one unit per call; null when wood is 0
pickFruit(treeId) → { item:'apple', qty } | null       // orchard apple trees, summer/autumn
mine(rockId) → { item, qty, broke } | null             // one hit per call (hp--); qty>0 only when it breaks
gather(forageId) → { item, qty } | null                // empties the spot until tomorrow
forceWeather(kind, intensity?, hours?)                 // events: override until end of day (or `hours`)
festivals()                                            // the calendar
rainedToday(): boolean
building(placeId): Building | undefined                // { spec, style, roof, door, interior, tiles }
grid: Grid                                             // bulk read access (kind/variant/walk typed arrays)
rng: SeededRng                                         // the world's own daily-roll RNG (state is saved)
```

Module-level exports: `describeTile(world, x, y)`, `walkableNeighbours(world, pos)`, `fishTableFor(spot,
season, weather, isDaylight)`, `FISH_TABLES`, `FORAGE`, `ANIMALS`, `FESTIVALS`, `weatherForDay(seed, dayIndex,
season, festival)`, `BUILDINGS`, `REGIONS`, `MAP_W`, `MAP_H`, `KINDS`.

`generateWorld(seed, { bus })` lets headless scripts pass their own `Bus`; the game uses the global one.
Nothing for the lead to wire in `main.ts` beyond what the stub already had.

## The map (seed 1; other seeds vary trees, flowers, forage, styles, road wiggles, river/lake outline)

Legend: `.` grass `,` dirt `=` path `#` stone/cobble `~` water `≈` deep water `:` sand `H` wall `^` roof
`D` door `B` bridge/dock `p` farmland `*` flower `T` tree `O` rock `o` bush `+` fence `&` prop/decoration
— objects: `W` well `N` board `n` bench `i` lantern `f` campfire `S` shrine `a` animal `g` forage `F` fish
spot `?` sign `%` flowerbed `b` barrel `c` crate `u` stump `C` counter `Z` bed.

```
    0         1         2         3         4         5         6         7         8         9     
    012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345
  0 OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO~≈~OOOOOOOOOOOOOOOOOOOOOOO
  1 OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO~≈~OOOOOOOOOOOOOOOOOOOOOOO
  2 OTOTOTTOOTTOOOOOOOOOOOTOTO..O.OO..OOOO.O..OO.OOOO.O..OOO.OOOOOOOOOOOOO~≈~OOOOOOOOOOOOOOOOOOOOOOO
  3 TTTTToTTTTTTTTTTTTTT.TT.TTOOOTOOOOTTOOOTOOT.......+++++++OOOOOOOOOOOOO~≈~TTTTTTTTTTTTTTTTTTTTTTT
  4 TTTTTTTTTTTTTTTTTTTT.TTTTTTT.Tg.......O.....^^^^..+&.&.&+OOO&&&OOOOOOO~≈~TTTTTTTTTTTTTTT.T..TTTT
  5 TTTTTTTTTTTTTT.TTTTTTTTT.To.OTT.^^^^........^^^^..+.....+OO##D###OOOO~~~~TTTTT.TT...TT.TT.TTT.TT
  6 TTTTTTTTTTTTTTTT.....TTTTTo.TT..^^^^..^^^...^^^^..+&.&.&+OO####O#OOOO~≈~OTTT.TT..ToTTTTTT.TTT.TT
  7 TTTTTTTTTT.ToTTT....T.oT.TTT....HHHH..^^^...HHHH.%+.....+OO,####&OOOOO~≈~TTTTT.T....T.TTTTTT.TTT
  8 TTTTTTTT.TTTTTTT....TTT.TTOTgT..HHHH..HZH.g.HHHH.S+&.&..+O?,O#####OOOO~≈~TT.TT..TTT.T.T..TTTT.TT
  9 TTTTTTTTTTTTTTTT....TTT..TO.....HHDH..HDH...HHDH..++++=++,,#####cOOOOO~≈~TTTTT..T....oT.T.oT.TTT
 10 TTTTTTTTT.TTTTTTTTTT.TT.TTo...=========================,,,#OOOOOOOOOOO~≈~TT.TTTTTTT...TTTT.TTTTT
 11 TTTTTTTTTTTTTTTT.gTTTTTTTTo................==.........?,..........OOOO~≈~TT...T.TTTTTT.TTT..TTTT
 12 TTTTTTTTTTT...g..TTTTTTTTTO..ng..g.o.T...O.==i.........,.............~≈~++++++++++++++++++++++TT
 13 TTTTTTTT.TTg......gTT.TTT.o.TO.*.....TT.g..==.T..*.....,.^^^...o....F~≈~+.........++++++++++++TT
 14 TTTTTTTTTTT..,,,TTTTTT.TTTOooOOooOoOooOOoOo==.T........,.^^^.........~≈~+...^^^^..+..a......++TT
 15 TToTTTTT...,,,.,,,TTTT.TTT.................==.........,,.HZH......T.~≈~.+...^^^^..+.a.....a.++TT
 16 TTTTTTTTT.,,.....,,,TTTT..*..^^^..^^^^.^^^.===.^^^....,..HDH.o......~≈~.+...HHHH..+...a.....++TT
 17 TTTTTTTTT,,TTTTg.T.,,T.TTT.o.^^^..^^^^.^^^i===.^^^....,,,,,........~≈~F.+...HHHH..+.a...&..a++TT
 18 TTTTTT...,.TTTT..T.T,,,TT....HHH..HHHH.HHH..==.HHH....,..........o~~~~..+...HHDH,,,.........++TT
 19 TTTTTT..,,TTTTTTgTTT.T,,,....HZH..HHHH.HZH.===.HZH...,,..........F~≈~...+T.c.,,.&.+..a.a....++TT
 20 TTTTTTg.,.TT..T.ToTT..oT,,,..HDH.%HHDH%HDH.===%HDH%..,...gT..Tg.T.~≈~...+....,,..&+.a....a..++TT
 21 TTTTTT..,,T.TTTToT..ToTT.T,,,========================,......g....~≈~...o+....,,...++++++++++++TT
 22 TTTTTTTTT,T.TT..TT..TT.gTo.................==?..i........?......~~~~....+....,,......o.......+TT
 23 TTTTTTTTT,,T.T.TTTToTg.....................==.............T..T..~≈~F....+....,,..............+TT
 24 TTTTTTTTT.,.TgTTgTTo..T.gT.................==.........o....g....~≈~.....+....,,..............+TT
 25 TTTTTTTT..,,.........T...........^^^^..^^^^==^^^^..............F~≈~.....+..T.,,..............+TT
 26 TTTTTTTT.**,,....**.g........^^^.^^^^..^^^^==^^^^.........T..T.:~≈~:....+....,,pppppp........+TT
 27 TTTTTTT...?.,..*g..T.*.......^^^.HHHH..HHHH==HHHH..........&..&:~≈~:...o+....,,pppppp......*.+TT
 28 TTTTTTTT**..,,....g.*........HZH&HHCH.cHHCH==HHCHc............:~~~~:....+*..,,,,,,,,,,,......+TT
 29 TTTTTTTT....*,*..*.....*....%HDHcHHDHbbHHDH==HHDHb........T...T:~≈~:....+....,,.......&......+TT
 30 TTTTTTTT.*.**,,...o...*...o..=========############............o:~≈~F....+.^^^,,pppppp.....*..+TT
 31 TTTTTTTT.o*..T,,..*..................i%#######N#%i...^^^^.^^^..T~≈~.....+.^^^,,pppppp...oT..*+TT
 32 TT.TTTTT.*..*.*,,*.......i....&....i.##n#######n##...^^^^.^^^...~≈~.....+.HZH,,..............+TT
 33 TTTTTTTTT.*.*o*.,,.*..*...n..........#############...HHHH.HZH..T~≈~T....+%HDH,,&.............+TT
 34 TTTTTTTT...go**.*,,..................######W######...HHCH&HDH...~≈~.....+..=.,,..............+TT
 35 TTT.TTTT...*..n**o,,..*?......f...&..##n#######n##..bHHDHb.=...F~≈~.....+?.=.,,............T.+TT
 36 TTTTTTTT.*.....T.**,,..*............?=========================BBBBBBB,,,,,,,,,,,,,,,,,,,,,...+TT
 37 TTTTTTTT*o...**.....,,*..............=========================BBBBBBB,,,,,,,,,,,,,,,,,,,,,...+TT
 38 TTTTTTTT...*....*....,,.............=#i%########%i..............~≈~F....+...,,......*.*.*.*..+TT
 39 TTTTTTTT.....*.*.*..*.,,.i.........i=......==........^^^^+++++.*~≈~.....+...,,...............+TT
 40 TTTTTTTT..*....g****.o.,,============......==........^^^^.c.&+..~≈~.....+..T,,...............+TT
 41 TTTToTTT*.....*..***...+++++++++++++?....T.==i.......HHHH....+T~≈~......+.T.,,........T...o..+TT
 42 TTTTTTTT.o.*.T*.....*T.+..^^^......+.......==........HHDH.u.&+~~≈≈~~T...+.o.,,..o............+TT
 43 TTTTTTTTg.***o*.***....+..^^^.%....+.......==.==========..++++.~≈≈≈~F...+...,,...........o...+TT
 44 TTTTTTTT.**o.*....*.g.*+..HHH......+.oT....==.............^^^.T~≈≈≈~....+...,,........o...T..+TT
 45 TTTTTTTT.*.*...*......*+..HZH.pppp.+.......==.............^^^.F~~≈≈~~...+...,,..T........T...+TT
 46 TTTTTTTT**....o....T...+?.HDH&pppp.+......i==....T........HZH=BBBBBBBBB.,,,,,,.o.........T...+TT
 47 TTTTTTTT*....*.*..*...o+...=.......+.......==.............HDH=BBBBBBBBB.,,,,,,...............+TT
 48 TTTTTTTT..*.*...g*.g.,,===================,,===================..~≈≈≈~F.++++++++++++++++++++++TT
 49 TTTTTTTTg*...*...**..,*........i.........,,===..............i...F~≈≈≈~........................TT
 50 TTTTTTTTTTTTgTTTTT*o,,**...............,,,...=......^^^..........:~≈≈≈~:......................TT
 51 TTTTTTTTT..TT.TTgTT,,...o*.T.T........,,.....==.....^^^..........:~~≈≈~~:.....................TT
 52 TTTTTTTTTTTTTTT....,....o.TT...g.o.To,,.T.....===...HZH......g*....~≈≈≈~:..T..................TT
 53 TTTTTTTT.TTTTT....,,TTT...o......o..,,..........===.HDH..g.........F~≈≈≈~F:::::F::........T...TT
 54 oTTTTTTTTT.TT...T,,Tog......TT.....,,.............====i&...bi..i.:n:~~~~~~~~~~~~~:::..........TT
 55 TTTTTTTTTTTTT.T,,,TTTTTo.........,,,T.........*.o...===========:c:~~~~~~~~~~~~~~~~~:F:........TT
 56 TTTTTTTTTTTTT,,,TTTTT..*T.o.....,,....T...T.g..*..T.........?BB:~~~~~~~~~≈≈≈≈≈~~~~~~~:g:......TT
 57 TTTTTTTT.TTT,,TTTTT..go.g.......,..o...T...*.T.............::BB~~~~~~≈≈≈≈≈≈≈≈≈≈≈≈~~~~~~:F:....TT
 58 TTTTTTTT..,,,.T..TT.TTT.T..T............T.T..o.T..T.....T..::BB~~~~≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈~~~~~~:::..TT
 59 TTTTTTTTT.,...oT.Tg.TTT......o.....To....o...T..go.*......:::BB~~≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈~~~~~~:::TT
 60 TT.TTTTTT...g.T.T.TT.TT...........T..........*..T........T:F~BF&~≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈~~~~~F:TT
 61 TTTTTTTTTg...*ToTTTTTTg....To..T...oT..TT...g.......o.....::~~~~~≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈~~~~~:::T
 62 TTTTTTTTT.TTTTTTT.TTTTT...TTTTTT.T.TT...TTTTTTTTTT.TTT..TTT::~~~~≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈~~~~~::T
 63 TTTTTTTTTTTTT.T.TTToTTT.TTTT..T.TToTTT.T..T.TTTTT.TT.oTTT.T::~~~~≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈~~~~~:::T
 64 TTTTTTTTTTTTTTTTTTTTTTTTTTTTT....TTT.TT...TTT..TT.oTTTo...T::~~~~≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈~~~~~~::TT
 65 TTTTTTTTTTTT.TToTTTTTTTTTT.T..TTTTT.TTT..ToT.T..TT.T.T.TTTT:F~~~~≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈~~~~~~::.TT
 66 TTTToTTTTTTTTTTTTTTT.TTTTTT...TTToTTTTTTT*TTTTT..TT.TTTTTTT::~~~~~≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈~~~~~~:::..TT
 67 TTTTTTTTTTTTTTTToTTToTTTTTTTT..TTTTTToT.T..TTTTTT.TTTTTTTTT:::~~~~~~≈≈≈≈≈≈≈≈≈≈≈≈≈~~~~~~~F::...TT
 68 TTTTTTTTTTTTTTT.T.TTTTTTT.TT.TTTTTTTTTTTTTT.TTTTTTTTTTT.TT..:::~~~~~~~~~~~~~~~~~~~~~~~:::.....TT
 69 TTTTTTTTTTTTTTTTTTTT.TTTTTTTTT.TTTTTTTT.TTTT.TToTTTTT..TTTT..:gF:~~~~~~~~~~~~~~~~~~~F::.......TT
 70 TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.TTTTTTTTTTTTT.TT....:::::F~~~~~~~~~~~:::::..T...g..TT
 71 TToTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.TTTTTTTTTTTTT.T........:::~≈≈≈~::::::.............TT
    0         1         2         3         4         5         6         7         8         9     
    012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345
```

Macro layout: the **village square** (cobbles, well, notice board) sits at the centre with the smithy,
store and bakery facing it from the north; **The Drowsy Owl** and Finn's rooms east of it on the main
road; the **carpenter's yard** behind the tavern with Jory's house on the south lane; the **north lane**
holds Elin's house, the clinic, Hal's and Cerys's houses; the winding north–south road climbs **Library
Hill** (library, Ines's cottage, a bench with a view) past the **chapel**, shrine and fenced **graveyard**;
the **mine** is cut into the northern rocks beyond Greta's house; the **orchard** (9 apple trees, 2 hives)
lies between the village and the **river**, which runs north→south into **Stillwater Lake** with the
**dock** and Dov's hut on its north-west shore; two bridges cross the river to **Thornfield Farm** (barn,
fenced animal field with 10 named animals, 24 plots, Ada's farmhouse, a south field); west of the square is
the open **festival field** (campfire, stage, maypole, lanterns), then the **player's farm** (house, 8 plots,
mailbox) below it, **Wren Meadow** (flowers, forage) and the **Old Wood** (dense forest with winding tracks
and clearings) to the west and south.

### Key coordinates (seed-independent except where noted)

| place | kind | anchor | door | open | notes |
|---|---|---|---|---|---|
| square | public | 41,35 | | | cobbles x37–49, y30–38; well 43,34; board 46,31 |
| well / board | landmark | 43,35 / 46,32 | | | anchor = tile south of the object |
| festival_grounds | public | 30,33 | | | x24–35, y31–39; campfire 30,35 |
| player_farm | farm | 31,44 | | | x23–35, y41–47; plots x30–33 × y45–46 |
| home_player | home | 27,46 | 27,46 | | interior 27,45 |
| smithy / store / bakery | shop | 35,29 / 41,29 / 47,29 | same | 8–18 / 8–18 / 6–16 | north row of the square |
| home_bram | home | 30,29 | 30,29 | | west of the smithy |
| tavern | shop | 55,35 | 55,35 | 12–24 | facilities bar, kitchen, counter, tables |
| home_finn | home | 59,34 | 59,34 | | |
| carpenter | workplace | 55,42 | 55,42 | 9–17 | fenced yard x57–61 y39–43 |
| home_jory | home | 59,47 | 59,47 | | |
| home_elin / clinic / home_hal / home_cerys | | 30,20 / 36,20 / 40,20 / 48,20 | same | clinic 8–18 | north lane y21 |
| library / home_ines | | 34,9 / 39,9 | same | library 9–17 | on the hill; hill lane y10 |
| chapel | public | 46,9 | 46,9 | | shrine 49,8 |
| graveyard | public | 54,7 | | | fenced x50–56 y3–9, gate 54,9, 8 graves |
| hill | nature | 29,11 | | | x26–42 y3–14, bench 29,12 |
| mine | workplace | 61,7 | 61,5 | 7–17 | interior 61,4 (the mouth); stone pocket x59–64 y5–9; ~18 ore rocks |
| home_greta | home | 58,16 | 58,16 | | |
| orchard | nature | 60,24 | | | apple trees at x58/61/64 × y20/23/26; hives 59,27 62,27 |
| river | nature | 62,38 | | | centre x≈70 (top) → 65 (mid) → 70 (lake); 3 wide, 5 wide south of y42 |
| bridge_west / bridge_east | landmark | ~65,36 / ~66,46 | | | rows 36–37 and 46–47 |
| farm | farm | 81,28 | | 5–20 | fenced x72–93 y12–48; plots x79–84 × y26–27,30–31; gates 72,36–37 and 72,46–47 |
| barn | workplace | 78,18 | 78,18 | 6–20 | animal field x82–92 y13–21, gate 82,18 |
| home_ada | home | 75,33 | 75,33 | | |
| lake | nature | ~64,54 | | | ellipse centre 75,62; sand shore; anchor is a shore tile near the dock |
| dock | workplace | 61,60 | | 5–20 | planks x61–62 y56–60; best fish spot at the end 62,60 |
| home_dov | home | 53,53 | 53,53 | | |
| meadow | nature | 15,38 | | | x8–23 y26–50; bench 14,35 |
| forest | nature | 13,14 | | | clearing at 11–15 × 12–16; tracks from 24,40 and 28,21 and 22,48 |

Building anchors are their **door** tiles. `place.tiles` is the full footprint for buildings and the area
for outdoor places; `placeAt(pos)` prefers buildings over the area they sit in. Roads and open town grass
belong to no place (`placeAt` → undefined).

## Tiles and `tileVariant` encoding (exact)

`tile(x, y)` returns a `TileKind`; `tileVariant(x, y)` is a small integer whose meaning depends on the kind.
`describeTile` decodes all of this for you.

| kind | variant |
|---|---|
| grass | 0..3 decoration (0 is ~60 %) |
| dirt, path, stone, sand, bush, flower | 0..3 decoration / colour |
| water | 0 (shallow) |
| deepwater | 1 (deep) — so "water is deep" ⇔ `kind === 'deepwater'` ⇔ `variant === 1` |
| tree | tree type: 0 oak, 1 pine, 2 apple, 3 birch |
| rock | ore: 0 stone, 1 copper, 2 iron, 3 gold (matches the rock object's `data.ore`) |
| farmland | plot state: 0 bare, 1 tilled/planted dry, 2 watered (kept in sync with the plot object) |
| fence | connectivity bits: 1 north, 2 east, 4 south, 8 west (neighbouring fence tiles) |
| bridge | 0 horizontal river bridge, 1 dock planks (north–south) |
| prop | 0 = the mine mouth (3 tiles at 60–62,4) |
| door | bits 0–1: building style 0..3 |
| wall | bits 0–1 style 0..3 · bit 2 (4) window · bit 3 (8) left end of the row · bit 4 (16) right end |
| roof | bits 0–1 roof colour 0..3 · bit 2 (4) **eave** (bottom roof row, the "roof edge") · bit 3 (8) ridge (top row) · bit 4 (16) left end · bit 5 (32) right end |

Buildings are 3–4 wide, 2–3 wall rows, 2–3 roof rows; the door is always in the bottom wall row and the
interior anchor is the wall tile directly above the door (`tile()` says `wall`, `isInterior()` says true,
`walkable()` says false). Each building's `style` and `roof` are also on `world.building(id)`. Some are
fixed for character (smithy and barn style 3/roof 0, chapel style 2/roof 3, library style 1…), the rest are
seeded.

Walkable kinds: grass, dirt, path, sand, stone, floor, door, bridge, farmland, flower — minus tiles holding a
blocking object (well, board, bench, lantern, sign, flowerbed, campfire, shrine, barrel, crate, decoration,
stump) and interior anchors. Animals, plots, forage and fish spots do not block.

## Objects

Ids are `kind_NNN` in generation order (stable per seed). `place` is set when the object belongs to a place
(`objectsAt(place, kind)`). Data schemas:

| kind | data | notes |
|---|---|---|
| plot | `PlotState` + `withered?`, `regrowIn?`, `grown?` | 24 on the farm (`owner:'ada'`, half pre-planted), 8 on the player farm |
| tree | `{ type, wood, maxWood:6, regrow, fruit?, maxFruit?, choppable?:false }` | only reachable trees are objects (~230); `wood` regrows 1 per 3 days; apple trees fruit in summer/autumn |
| rock | `{ ore, hp, maxHp, depleted }` | in the mine + a few ridge boulders; rocks with `hp <= 0` or `depleted` respawn (new ore) every Monday |
| fishspot | `{ water:'river'|'lake', table: FishEntry[], bonus? }` | reachable shore tiles; use `fishTableFor(spot, season, weather, isDaylight)` for current weights |
| forage | `{ area, item: ItemId|null, qty }` | **`qty === 0` means nothing there today**; respawns daily by season (spring herbs/wildflowers, summer berries, autumn mushrooms, winter sparse herbs) |
| animal | `{ species:'cow'|'hen'|'sheep', name, produce, fed, produced?, mood, home }` | 10 in the barn field; `fed`/`produced` reset daily for the sim's tend/collect tools |
| well, board, campfire (`lit`), shrine (`offerings`), bench (`facing`, `view?`), lantern (`lit`, `festival?`), sign (`text`), flowerbed (`colour`), barrel/crate (`contents`), stump (`seat`) | | |
| decoration | `{ kind: 'anvil'|'stage'|'maypole'|'gravestone'(+name)|'boat'|'haybale'|'scarecrow'|'trough'|'logs'|'sawhorse'|'beehive'(+honey)|'minecart'|'nets'|'mailbox'|'table' }` | |
| counter / bed | `{ shop }` / `{ owner }` | parked on interior tiles so `objectsAt('bakery','counter')` works |

Mutable state the world saves: plot, tree, rock, forage, animal, campfire, lantern, shrine data.

## Pathfinding

`findPath(from, to, { maxNodes = 6000 })`: A*, 4-directional, over the walkable mask with tile costs (roads,
cobbles, bridges, doors 2; dirt 2; grass/sand 3; farmland/flower 4) so villagers keep to roads when it is
not much longer. Returns tiles excluding the start and including the goal, or null (unreachable, or the
node cap hit). **The goal tile is always accepted even if it is not walkable** — so paths can end on an
interior anchor (through the door), a bench, a plot, a rock. Fractional positions are rounded. Measured:
500 random calls ≈ 30 ms; all 666 place-pair paths ≈ 16 ms; longest place-to-place path 105 steps.
`nearestWalkable(pos, radius = 8)` searches Chebyshev rings and falls back to the square anchor.

## Clock, weather, calendar

- Starts day 1 of spring, 6:00. `tick(minutes)` accumulates fractional minutes and steps whole minutes, so
  every event fires once and in order however large the step. Order at midnight: `newday` → `weather`
  (if it changed) → `hour`.
- Each day's weather is a **pure function of (seed, dayIndex)** (`weatherForDay`): a dominant kind from the
  season table and 1–4 timed segments (e.g. cloudy → rain 15:00 → storm 16:00 → rain 20:00), with an
  intensity for rain/snow/storm. `weather.forecast` is tomorrow's dominant kind and is always right.
  Season tables: spring sunny 40/cloudy 22/rain 30/storm 4/fog 4; summer 58/14/10/14/4; autumn sunny 30/
  cloudy 24/rain 20/fog 20/storm 6; winter snow 45/cloudy 22/sunny 20/fog 10/rain 3. Festival days never
  get a wet dominant. `temperature` is cosmetic (season base ± noise, a daily curve).
- `forceWeather(kind, intensity, hours?)` overrides until end of day or `hours`, for events (storm, drought,
  heatwave). Overrides are saved.
- Festivals (`festivalToday()`): Spring Bloom Fair spring 13 10:00 (festival_grounds); Midsummer Lantern
  Night summer 15 19:00 (square); Harvest Feast autumn 20 12:00 (festival_grounds); Winter Star winter 24
  17:00 (square). Birthdays are the sim's.

## Crops

At `newday`, every planted plot: `daysSincePlant++`; if the crop is out of season → `withered = true` (stays
`planted`, growth frozen, `harvest` returns null, `till` clears it); else if it was watered (or it rained or
snowed at any time yesterday) → `grown++`, `growth = grown / days`, `stage = floor(growth × (stages − 1))`.
Then `watered` is reset (true if it is raining at 0:00). Rain starting at any hour waters every plot
immediately. Turnip planted day 1 and watered daily is harvestable on day 4. Regrowing crops (strawberry,
corn, tomato) drop to `growth 0.75` after harvest and are ripe again after `regrowDays` watered days.
`plant()` accepts a crop id or its seed id and refuses out-of-season crops; `setPlot` replaces state
wholesale (and resyncs the farmland variant).

## Save / load

`save()` → `{ v:1, seed, clock:{ minute, frac, speed, paused, override }, rng, objects:{ id → data } }`
(~30 KB). `load(data)` restores into the same instance; the map is regenerated from the seed by
`generateWorld`, so main.ts's `generateWorld(seed)` + `world.load(saved.world)` is exactly right. A loaded
world evolves identically to the original (asserted in the test).

## Notes for other agents

- **Sim (B):** villagers "enter" by walking to `place.door` then parking on `place.interior` (hidden).
  Use the helper verbs above rather than mutating object data by hand; check `forage.data.qty > 0`, `tree
  .data.wood > 0`, `rock.data.hp > 0`. `objectsNear` returns nearest-first. Fish: draw from
  `fishTableFor(...)` with your RNG. The mine is enterable (door 61,5 / interior 61,4).
- **Renderer/art (C):** `describeTile` gives style/roof colour/edges/window bits; farmland variant 2 =
  watered soil; tree variant = species; rock variant = ore; fence bits for auto-tiling; bridge variant 1 =
  dock planks; `prop` 0 = mine mouth; deep water is its own kind. Building footprints are `world.building
  (id).tiles`. Season recolouring is yours. Object data carries `lit`, `colour`, `facing`, `species`,
  `kind` for decorations, `stage`/`crop`/`watered`/`withered` for plots.
- **Events (E):** `forceWeather`, `festivals()`, `objectsAt('farm','plot')` for crows, `objectsAt('barn',
  'animal')` for the wolf, `objectsAt('mine','rock')` for the cave-in.
- **Player (H):** `home_player` door 27,46; the player's plots are `objectsAt('player_farm','plot')`;
  fish spots and rocks are objects on/next to walkable tiles; the notice board is at 46,31 (stand at 46,32).
- **Determinism:** generation uses `SeededRng(seed).fork(1)`, daily rolls `fork(2)` (state saved), weather
  is per-day hashed. No `Math.random` anywhere in `src/world`.

## Decisions and open questions

- `bridge_west` is the main-road bridge (rows 36–37, x≈65) and `bridge_east` the southern one by the lake
  (rows 46–47, x≈66): both cross the same north–south river; "west/east" is just which sits further west.
- Animals do not block movement (they conceptually wander); everything else decorative does.
- Objects that are used up stay in `objects` with zeroed data (forage `qty 0`, tree `wood 0`, rock
  `depleted`) so ids and `objectsNear` stay stable; renderers should hide/vary them.
- `tick()` walks minute by minute; a 24-hour skip is ~1400 cheap iterations.
