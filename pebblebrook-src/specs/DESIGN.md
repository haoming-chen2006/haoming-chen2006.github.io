# Pebblebrook — a living village

A Stardew-Valley-like village where ten villagers are each run by their own AI agent. They have
professions, needs, personalities, memories and relationships; they choose from a broad set of
tools (walk, work, talk, gossip, trade, cook, gift, invite, argue, teach, organise…) and do whatever
they want. The player walks among them, talks, trades, farms and fishes, takes on requests, and can
step into "Director" mode to fire external events and read any villager's mind.

Judged on the depth and coherence of the game design, not on any one feature. Everything must work
with **no API key** (the local brains must be good). With a key, the villagers think and speak
through Claude (or an OpenAI model).

## Stack and conventions

- TypeScript + Vite, Canvas 2D at 16 px tiles with integer scaling, DOM for UI. No frameworks.
- `npm run check` (tsc, `erasableSyntaxOnly`: no parameter properties, no enums) must stay clean.
- Node 22 runs scripts directly: `node scripts/sim.ts 7` plays seven in-game days headlessly.
- Deterministic given a seed (`core/rng.ts`); never `Math.random` inside `src/sim`, `src/world`, `src/agents`.
- Art: Kenney's CC0 packs in `public/assets/kenney/` (`rpg.png` 968×526, 16 px tiles, 1 px margin,
  57×31 tiles; `chars.png` 918×203 composable people; `tinytown.png`). Characters are generated in code
  so they can walk in four directions (see `src/art/`).
- Deploys like Crownfall: `scripts/deploy.sh` copies `dist/` into `~/haoming-chen2006.github.io/pebblebrook`
  and the source into `pebblebrook-src`. Base path `/pebblebrook/`.

## Module ownership

```
src/core/      types, rng, event bus, time, ids, tool + brain contracts        (lead; frozen, extend by PR)
src/world/     map generation, places, pathfinding, objects, calendar, weather (Agent A)
src/sim/       villagers, needs, inventory, economy, action execution, tools,  (Agent B)
               conversations, memory stream, relationships, save/load
src/agents/    Mind interface, LocalBrain (utility + schedule + goals),        (Agent B)
               LlmBrain adapters (Agent F, src/llm/)
src/events/    external events, festivals, requests/quests, director API       (Agent E)
src/art/       sprite atlas, tile catalogue, character generator, lighting      (Agent C)
src/render/    camera, tile/entity renderer, weather, bubbles, emotes           (Agent C)
src/ui/        HUD, dialogue, inspector, director panel, board, inventory, shop (Agent D)
src/player/    avatar, controls, interactions, player activities                (Agent H)
src/audio/     synthesised music + sfx                                         (Agent G)
src/main.ts    boot, loop, wiring                                              (lead)
scripts/       headless simulation + chronicle + tests
e2e/           Playwright play-tests + screenshots
```

Each module exposes ONE entry file (`index.ts`) with the functions/classes named below. Anything not
listed is private to the module. When two modules must talk, they do it through `core/` types and
the event bus, never by importing each other's internals.

## The world (`src/world`)

- Grid map 96×72 tiles, `TileKind` per cell (`grass | dirt | path | water | sand | stone | floor | wall | door | bridge | farmland | crop | flower | tree | rock | bush | fence | prop`), a `walkable` mask, and an `objects` list (see `WorldObject`). Generated from a hand-designed layout with seeded variation: village square with well and notice board in the centre; roads; ten homes; workplaces (Bakery, Smithy, General Store, Tavern "The Drowsy Owl", Clinic, Library, Carpenter's yard, Fish dock, Mine entrance, Farm with 24 plots + barn); a chapel/shrine; festival grounds; forest (trees to chop, forage spots); river with two bridges and a lake; orchard; graveyard. Buildings are exteriors with a door tile; a villager "inside" is hidden, standing at the door's interior anchor.
- `Place` registry: `{ id, name, kind, tiles: Vec[], anchor: Vec, door?: Vec, owner?: VillagerId, open?: [hour, hour] }`.
- `findPath(from, to)`: A* over walkable tiles, doors passable, diagonal off, returns `Vec[]` or null. Must handle ~200 calls/second.
- `WorldClock`: minute-resolution; 1 real second = 1 in-game minute at speed 1 (a day is 24 minutes at 1×; speeds 1/2/4/8; pause). `season: spring|summer|autumn|winter`, 28-day seasons, day-of-week, festival days on the calendar. Sunrise 6:00, sunset 19:00 shifted by season.
- `Weather`: `sunny | cloudy | rain | storm | fog | snow` with a daily forecast, transitions at hours; affects crops (rain waters), fishing (rain = more fish), moods and outdoor plans.
- `Crop plots`: `{ state: empty|tilled|planted, cropId, growth 0..1, watered, daysSincePlant }` grow per day; `crops.ts` catalogue (turnip, potato, strawberry, corn, pumpkin, wheat, tomato…) with season, days, sell price.
- Trees regrow wood; rocks respawn ore in the mine area; fish spots have a season/weather-dependent table; forage spawns daily (berries, mushrooms, herbs, flowers).

## Villagers (`src/sim`)

Ten adults, each with a home and a profession:

| id | name | profession | workplace | a few traits |
|---|---|---|---|---|
| ada | Ada Thornfield | farmer | Farm | early riser, stubborn, generous |
| bram | Bram Oakhollow | blacksmith | Smithy | gruff, loyal, secretly sentimental |
| cerys | Cerys Wren | baker | Bakery | cheerful, gossip, romantic |
| dov | Dov Marlow | fisher | Dock | patient, dry humour, loner |
| elin | Elin Vasque | doctor | Clinic | precise, anxious, kind |
| finn | Finn Halloway | innkeeper | Tavern | loud, hospitable, spendthrift |
| greta | Greta Stoneleigh | miner | Mine | brave, blunt, superstitious |
| hal | Hal Pennywort | shopkeeper | General Store | shrewd, nosy, cautious |
| ines | Ines Calloway | librarian | Library | curious, shy, idealist |
| jory | Jory Fenn | carpenter | Carpenter's yard | easy-going, lazy, artistic |

`Villager` state: position, facing, `inside?: PlaceId`, `needs` (energy, hunger, social, fun, comfort,
purpose: 0..100, decay per hour by personality), `mood` (-1..1 derived + events), `money`, `inventory`
(`ItemStack[]`), `skills` (farming, fishing, mining, cooking, crafting, charm, lore 0..10), `health`,
`personality` (Big Five 0..1 + trait tags + likes/dislikes), `relationships: Record<VillagerId, Relationship>`
(`affinity -100..100`, `trust`, `romance`, `familiarity`, `label`), `memory: MemoryStream`, `goals`,
`schedule` (profession template with personal variation), `currentAction` + `queue`, `status` flags
(sick, tired, drunk, injured, inLove…).

`MemoryStream`: `Memory { id, t, kind: observation|reflection|plan|conversation|event, text, importance 1..10,
tags: string[], about?: VillagerId[], place?: PlaceId }`. `retrieve(query, n)` scores recency × importance ×
relevance (tag/keyword overlap). Nightly `reflect()` writes 1–3 higher-level memories (local: templated
aggregation over the day; LLM: model-written). Conversations create memories on both sides; gossip
copies a memory (with `secondhand: true`) to the listener.

`Relationship` dynamics: every interaction adjusts affinity by compatibility (agreeableness, shared
likes, mood) and by content (gift the person likes: +, insult: −, kept a promise: +trust). Labels update at
thresholds; romance grows only with familiarity and mutual affinity; a proposal is a tool.

## Tools (`src/sim/tools`) — the contract every brain uses

```ts
interface ToolDef {
  name: string;                        // snake_case, unique
  description: string;                 // one sentence for the LLM
  params: JsonSchema;                  // object schema, all params documented
  category: 'move'|'work'|'social'|'economy'|'life'|'craft'|'info'|'meta';
  professions?: Profession[];          // undefined = anyone
  available(v: Villager, w: World): boolean;      // cheap check for the option list
  execute(v: Villager, w: World, args: unknown): ToolResult;  // validates, then starts/does it
}
interface ToolResult { ok: boolean; message: string; durationMin?: number; effects?: Effect[] }
```

The catalogue (≈50 tools; each is a file under `src/sim/tools/`; `index.ts` exports `TOOLS`):

- **move**: `go_to(place|villager|x,y)`, `wander(area)`, `enter(place)`, `leave_building`, `follow(villager)`, `go_home`.
- **work** (profession-gated): `till(plot)`, `plant(plot, crop)`, `water(plot)`, `harvest(plot)`, `tend_animals`;
  `fish(spot)`; `mine(rock)`, `forage(area)`, `chop(tree)`; `forge(item)`, `repair(item, for)`; `bake(recipe)`,
  `cook(recipe)`; `treat(villager)`, `check_up(villager)`; `open_shop`, `close_shop`, `restock`, `set_price(item, price)`;
  `serve_drinks`, `host_evening`; `teach(villager, skill)`, `catalogue_books`, `write_book`; `build(structure)`,
  `craft_furniture(item)`, `repair_structure(place)`.
- **social**: `say(target, text, tone)`, `greet`, `chat(target, topic)`, `gossip(target, about)`, `ask(target, question)`,
  `compliment`, `tease`, `apologize`, `argue(target, about)`, `comfort`, `invite(target, activity, place, hour)`,
  `gift(target, item)`, `propose(target)`, `hug`, `dance(target?)`, `tell_story`, `play_music`.
- **economy**: `buy(item, qty)`, `sell(item, qty)`, `trade(target, give, want)`, `pay(target, amount, reason)`, `haggle`.
- **life**: `eat(item|at tavern)`, `drink`, `sleep`, `nap(place)`, `rest`, `bathe`, `stroll`, `pray`, `read`, `garden`,
  `decorate_home(item)`, `visit(place)`, `watch_stars`, `swim`.
- **craft**: `craft(recipe)`, `use_item(item)`, `pick_up`, `drop`, `plant_flower(tile)`.
- **info**: `look_around`, `check_board`, `check_weather`, `recall(query)`, `ask_about(target, villager|topic)`.
- **meta**: `set_goal(text, priority)`, `remember(note, importance)`, `plan_day(entries[])`, `post_request(text, reward, needs)`,
  `accept_request(id)`, `complete_request(id)`, `organise_event(kind, place, hour)`, `attend_event(id)`, `idle(reason)`.

Every tool returns an observation string that goes into the villager's memory (`kind: observation`,
importance from the tool). Long actions run over several minutes; the executor advances them each tick
(`sim.update(dtMinutes)`), interrupts when a precondition fails, and reports completion.

## Brains (`src/agents`)

```ts
interface Brain {
  kind: 'local' | 'llm';
  decide(ctx: DecisionContext): Promise<Decision>;   // called when the villager is idle or interrupted
  onObservation?(v: Villager, m: Memory): void;
  reflect?(ctx: DecisionContext): Promise<string[]>;  // nightly
  converse?(ctx: ConversationContext): Promise<ConversationTurn>; // one line in a conversation
}
interface DecisionContext { villager: Villager; world: World; sim: SimView; now: WorldTime; nearby: Villager[];
  options: ToolDef[]; recent: Memory[]; relevant: Memory[]; day: DayPlan; }
interface Decision { tool: string; args: Record<string, unknown>; thought: string; say?: string; emote?: Emote }
```

`LocalBrain`: (1) follow the daily schedule (profession template: wake, breakfast, work block, lunch, work,
free time, dinner, evening social, sleep) as soft priorities; (2) utility scoring of options: needs
deficits × personality weights, opportunity (someone liked nearby, festival, request board), goals,
weather, mood, randomness (seeded) for variety; (3) pick tool + args; (4) produce a one-line `thought`
in the villager's voice from templates. Conversations: pick a topic from relevant memories, gossip,
relationship state, events, needs; produce lines from a rich template bank with variation, tone from
mood/personality; 2–6 turns; both sides gain memories and relationship deltas.

`LlmBrain` (`src/llm`): builds a compact prompt (identity + personality + needs + goals + relationships
summary + retrieved memories + what is nearby + the option list as tool schemas) and asks the model for
one tool call plus a short thought (and speech when talking). Providers: Anthropic Messages API with tool
use (default `claude-haiku-4-5-20251001`, selectable `claude-sonnet-5`) and OpenAI chat completions with
functions. Keys entered by the player, stored in localStorage, sent only to that provider. A budget/queue
keeps ≤ 3 requests in flight and ≤ N per in-game hour; any failure or timeout falls back to LocalBrain for
that decision so the world never stalls. Mixed mode: LLM for conversations and big decisions, local for
routine (configurable).

## Events (`src/events`)

`GameEvent { id, name, kind: weather|visitor|festival|calamity|social|economy|mystery|nature, when: schedule|random|trigger,
 announce(text) → memory for everyone who would know, apply(world, sim), followUps, duration }`.
Catalogue (≥ 20): storms, heatwave, fog; travelling merchant (rare goods, 2 days); the four festivals
(Spring Bloom Fair, Midsummer Lantern Night, Harvest Feast, Winter Star) with activities villagers attend;
cold going around (doctor busy); crows on the crops; mine cave-in (rescue); wolf near the sheep; flour
shortage (bakery prices); a letter/visitor for someone; birthday (others may gift); meteor shower;
drought; fish bloom; lost heirloom mystery; stray dog adopts a villager; a proposal → wedding; a
newcomer moves in (11th villager); tax collector; bard passing through; power struggle for mayor.
Requests/quests: villagers post needs on the notice board (`post_request` tool + generated from needs);
the player or another villager can accept and complete. Director API: `fire(eventId)`, `list()`,
`forecast()`.

## Player (`src/player`) and UI (`src/ui`)

Avatar walks (WASD/arrows), `E` interacts with the nearest thing (villager → dialogue; plot → farm
actions; water → fish; rock → mine; shop counter → shop; board → requests; door → enter/knock), `Tab`
inspector, `F` follow a villager, `1-9` hotbar, `Esc` menu, `Space`/`+`/`-` speed. Dialogue with a
villager: with an LLM, free text; always available: intent buttons (Ask about their day, Gossip, Give
gift, Ask for help, Joke, Compliment, Trade, Goodbye) answered by the villager's brain. Player has money,
inventory, a small farm plot, and skills.

UI (DOM): HUD (clock, date/season, weather, money, speed), speech bubbles + emote icons above heads,
hover thought bubbles, dialogue box, inventory/hotbar, shop window, notice board, Inspector (villager card:
portrait, mood, needs bars, current action + thought, plan for the day, relationships graph, memory
stream with importance, goals), Village overview (who is where, doing what — a live "storyboard" feed of
notable happenings), Director panel (fire events, time speed, brain mode per villager, API key), Title
screen with seed and a "How to play", Save/Load (localStorage), Settings (audio, key). Style: warm
pixel-UI, Stardew-adjacent (wood panels, parchment).

## Rendering (`src/art`, `src/render`)

Camera follows the player (or a followed villager), integer zoom 3 (2 on small screens). Layers: ground,
ground detail, objects + characters y-sorted, overhead (tree canopies, roofs when the player is not behind
them), lighting (night tint, warm windows, lanterns, the smithy glow), weather (rain streaks, snow,
fog, lightning), bubbles/emotes in screen space. Characters: 16×24, 4 directions × 4 walk frames + idle,
composed from body/hair/outfit parts in profession colours; 10 distinct villagers + player + visitors.
Crops with 4–5 growth stages, seasonal palette swap for grass/trees, animated water, chimney smoke.

## Headless chronicle (`scripts/sim.ts`)

Runs N days with all brains local, no DOM, and prints a chronicle: per day, notable events, each
villager's action distribution, conversations held, relationship changes, money flow, requests
posted/completed; asserts variety (≥ 12 distinct tools per villager per week, ≥ 40 conversations per
week, no villager stuck > 60 minutes, needs never pinned at 0 for a whole day). This is the test of the
"they actually do whatever they want" claim, and every agent runs it before reporting.

## Definition of done

`npm run check` clean · `node scripts/sim.ts 7` passes its assertions · `node e2e/shot.cjs` produces
screenshots of title, village at noon, night, rain, a conversation, the inspector, the director panel ·
README documents controls, the agent design, the tool catalogue, and how to add a key · deployed to
`/pebblebrook/`.
