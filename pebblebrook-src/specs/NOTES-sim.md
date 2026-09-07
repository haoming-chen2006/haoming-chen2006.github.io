# NOTES — sim + agents (Agent B)

Owner: Agent B. Modules: `src/sim/` (villagers, needs, memory, relationships, economy, tools, conversations,
requests, chronicle, save/load) and `src/agents/` (LocalBrain: utility decisions, dialogue templates, reflections).

Status: COMPLETE. `npm run check` clean. `node scripts/sim.ts 7` passes all assertions on the real world and the
fake world; `node scripts/talk_test.ts` passes. 7 in-game days run in ~1 s headless.

## Run / test

```
npm run check
node scripts/sim.ts 7 1234          # 7 days, seed 1234, real world (src/world); prints chronicle + asserts, exit 1 on failure
node scripts/sim.ts 7 1234 --fake   # same on the in-module fake world (src/sim/testworld.ts)
node scripts/sim.ts 2 7 --verbose   # every say/fail line, per-day talk pairs
node scripts/talk_test.ts [seed]    # every villager × every player intent + free text + gifts; asserts non-empty, varied
```

Assertions in `scripts/sim.ts` (all pass, seed 1234, real world): ≥ 12 distinct tools per villager (actual 19–32),
≥ 40 conversations/week (actual ~380, ~40 gossip sessions), no villager idle > 60 min while awake (actual ≤ 2 min),
no need pinned at 0 for a whole day, everyone sleeps at home ≥ 5 of 7 nights, all 8 tool categories used, buys and sells
both happen (≈45 buys / 70 sells / week plus requests posted and completed), runtime < 20 s.

## Architecture

```
src/sim/index.ts         createSim(world, seed, brains) → SimImpl; TOOLS; createTestWorld (fake world for tests)
src/sim/sim.ts           SimImpl: update loop, executor (travel/timed actions/effects), decision loop, daily/nightly
                         hooks, conversations glue, requests, chronicle, player helpers, save/load
src/sim/core.ts          SimCore = SimView + internals tools may use (rt(), shops, travel(), atPlace(), …)
src/sim/villager.ts      createVillager, need rates by personality, mood, status flags, skills, day plans
src/sim/memory.ts        retrieve() scoring, forget(), gossip copies, gossipable()
src/sim/relationships.ts affinity/trust/romance/familiarity dynamics, labels, compatibility, gift appeal
src/sim/economy.ts       shop specs, stock, restock, price drift, seller's cut
src/sim/effects.ts       applies the data effects tools return
src/sim/conversation.ts  ConversationManager (villager↔villager)
src/sim/tools/*.ts       move, work, social, economy, life, craft, info, meta (+ util); index.ts exports TOOLS (88)
src/sim/testworld.ts     fake World: every place from core/places on an 84×60 grid, BFS paths, clock, crops, weather
src/agents/index.ts      createLocalBrain(seed) → LocalBrain (Brain + decideSync/converseSync/reflectSync)
src/agents/local.ts      utility decider (schedule block × needs × personality × opportunities × goals × status)
src/agents/dialogue.ts   converse(): topic choice, kind-specific exchanges, player intents, free-text routing
src/agents/templates/    voice.ts (slots, per-villager tics, first-person rewrite), thoughts.ts (~250 thought lines),
                         lines.ts (chat sub-topics + 10 conversation kinds, ~400 lines), player.ts (intents, jokes,
                         opinions, wants), reflections.ts (nightly reflection templates)
```

### How decisions resolve (important for main.ts and the LLM agent)

`Brain.decide()` is async by contract. The local brain ALSO exposes `decideSync(ctx)`, `converseSync(ctx)` and
`reflectSync(ctx)` (interface `LocalBrainSync` in `src/agents/index.ts`; the sim duck-types them, it never imports
agents). When present, the sim resolves the decision inside the same `update()` call, so the headless script never
awaits between ticks and the browser loop gets decisions the same frame. For a brain without them (the LLM brain)
the sim calls `decide()`, marks the villager pending, shows `action.label = "thinking…"` (`action.tool = 'think'`),
and applies the decision on the first tick after the promise resolves. At most one pending decision per villager;
a pending decision older than 12 in-game minutes, a rejected promise, or a failed tool falls back to the local
brain for that decision. Conversations and reflections use the same pattern (`converseSync`/`reflectSync`).
Verified with a fake delayed brain (`setTimeout`-resolved decide/converse): decisions, conversations, `chat()` for
free text and `about` all flow through the async path.

`sim.setBrain(id, 'llm')` switches a villager; `brains.llm === null` means everyone stays local.

### The tick

`update(minutes)` sub-steps at ≤ 1 in-game minute: `world.tick(dt)` → new-day / new-hour hooks → drain async
results → conversation turns → expire requests/events → per villager: base need rates (+ action rates), mood,
status flags, speech/emote expiry, then advance the action (walk along `action.path` at 3 tiles/min, or count down
`endsAt`) and, when idle, ask the brain (queue first). Up to 4 decisions per villager per tick, then a forced short
idle. Sleep completes early when energy is full and the wake hour has passed.

### Tools, travel, effects

Every tool is `execute(villager, sim, args)`. Tools that need a place, facility or a person do not fail when the
villager is elsewhere: they return a `travel` effect (path via `world.findPath`, 3 tiles/min, `enter` on arrival for
buildings) with `then = {tool, args}` re-run on arrival. So one brain decision `bake` from home walks Cerys to the
bakery and bakes. Walks to a moving villager retry up to 3 times.

`ToolResult.effects` are plain data (`{kind, ...}`), applied by `effects.ts` at action start (`when:'start'`, or the
inherently-immediate kinds: rate, say, emote, sfx, sleep, travel, conversation) or at completion. `rate` effects are
per-hour need deltas that tick while the action runs (sleep +12 energy/h, work drains, strolling +fun…). Kinds:
give/take/money/need/rate/skill/health/plot/object/relationship/memory/chronicle/sfx/status/emote/say/stat/goal/
enter/leave/mood/shop/sleep/wake/interrupt/label/fn. `fn` closures exist for bookkeeping only; in-progress actions are
dropped on save (villagers re-decide on load).

The observation memory for a tool is its `message` (third person, e.g. "Ada watered the turnips"), tagged with the
tool name, category, and the ids of any target villager/place/item, `about` the target villager.

### Villagers

`createVillager(spec)` from `core/villagers.ts`. Needs decay per hour by personality (social: 1.2 + 3×extraversion;
fun: 1.3 + 2×openness; purpose: 0.8 + 2.4×conscientiousness; comfort drops fast outdoors in rain/storm/snow). Mood is
recomputed every tick from needs, a decaying memory-valence accumulator (`pleasant`/`unpleasant` tags), weather
likes/dislikes and status flags, swung by neuroticism. Status flags: tired, wet, sick (health < 45), drunk (2 ales
within 2 h), angry (after a row), inspired (books/music/stars), celebrating (birthday/festival/engagement), injured
(mine rockfall), inLove (romance ≥ 40). Skills rise with use (diminishing). `stats` counts every tool plus
conversations, buys, sells, gifts, moneyEarned/Spent, etc.

Day plans: profession template ± personal shift (early risers −0.5 h, lazy/“early mornings” dislike +0.5 h, ±0.25 h),
Sunday off for shop trades, storms move outdoor afternoons to chores, festival replaces the afternoon, extraverts get
extra social evenings, one goal becomes a note. `plan.summary` is a one-line description for the inspector.

Daily: needs-driven goals (low money → earn, low social → see people, sick → see Elin, baker out of flour → get
flour, Finn → pay Hal back…), relationship drift, birthday memories (friends remember to bring a gift), festival
memory for all, shop restock, passing-trade takings for keepers who opened. Nightly reflection happens when the
villager goes to sleep (or at midnight if they never did): 1–3 first-person lines from the day's memories
(`agents/templates/reflections.ts`), stored as `kind:'reflection'`, importance 5–7.

### Memory

`Memory` as in core. `retrieve(v, {text, tags, about, place}, n, now)` scores recency (24 h half-life) ×1 + importance
×1.2 + relevance ×1.3 (tag/about/place/keyword overlap). Cap 180 → trims to 130 by importance × recency, reflections
and importance ≥ 8 protected. Gossip copies (`kind:'gossip'`, `secondhand`, `source`) are written as "Cerys told me
that …" with the source's own name turned into a pronoun. Villagers start with ~20 seeded memories (Finn's debt to Hal,
Jory's unfixed fence, Cerys/Jory sweetness, Greta's grandmother's gold vein, the map fragment…) so day-one gossip
has material.

### Relationships

`applyDelta` with the DESIGN dynamics: romance only grows with familiarity (gate = familiarity/70) and mutual
affinity, scaled ×0.45; trust moves at 0.8×; positive affinity saturates above 60; daily drift −0.6 (warmth fades) /
+0.4 (grudges soften), romance fades after 3 days without talking. Labels: rival ≤ −30, acquaintance, friend (≥ 25 &
fam ≥ 15), close friend (≥ 60 & fam ≥ 40), crush (romance ≥ 40 & aff ≥ 30), partner/family sticky. `propose` needs
romance ≥ 75, affinity ≥ 60, familiarity ≥ 55 and a crush at least 5 days old. Interaction deltas in
`interactionDelta()` (gift by appeal −5…+15, argue −6…−9, apologise +4/+4 trust, help +6/+6, promise kept +4/+8 …),
softened/sharpened by compatibility (personality distance, shared likes, disliked traits) and mood. `notes` keep the
last 12 notable things. Bus `relationship` events on label changes and |Δ| ≥ 5; label changes also hit the chronicle.

### Conversations

`startConversation(a, b, topic)` (villager↔villager): refuses if either is asleep/busy talking or if b is a rival
who does not want to (60%). Both villagers' current actions are suspended and restored afterwards. Turns alternate
every 2.2 in-game minutes, 2–6 turns by extraversion/affinity. Topic kinds: chat (with sub-topic chosen by the opener:
news/weather/work/food/village/dreams/plans/river/festival/tired/likes/memory/money — carried on `turn.topic` so the
reply reacts), gossip (a memory about a third villager is copied to the listener on the first turn; the listener's
opinion of the subject shifts a little; gossip-haters cool towards the teller), ask, compliment, tease, argue (both
may become `angry`), apologize (accepted or not, decided at start so both sides agree), comfort, invite (accept →
both get a `meet <id> at <place> at <hour> on day <d>` goal the brain honours), visit, festival, event, ask_about.
On end both remember a summary, needs/relationships update by kind, notable ones go to the chronicle.

Player conversations (`sim.playerTalk(v, intent, line?)`): intents exactly as the UI sends them —
`greet, day, gossip, help, joke, compliment, trade, goodbye, about` (line = villager id), `chat` (line = typed text).
Also accepted: `ask_about:<id>` and any free text (routed by keywords: names → about, weather/work/food/dreams →
chat sub-topics, bye → goodbye…). With an LLM brain and typed text, `brain.chat()` is tried first; otherwise
`converse()` with `playerIntent`. `help` may post a real request on the board (the villager announces it).
`goodbye` (or `turn.end`) ends the conversation; `endPlayerConversation()` writes the memory and restores the
villager's action. `playerGift(v, item)` returns the reaction line and applies appeal-based deltas.

### Economy

Shops (`economy.ts` SHOP_SPECS): store (Hal), bakery, tavern, smithy, clinic, carpenter, dock, library, each with a
base stock (restocked 50 % daily; `restock` moves the keeper's own produce onto the shelves — the store/tavern also
buy in at 30 % of base) and a list of what it buys. Price = base × markup × demand (drifts +3 %/unit bought,
−2 %/unit sold, relaxes daily) × supply (scarce → up to +35 %) × event multipliers
(`sim.events[].data.prices: Record<ItemId, number>`, for Agent E). Sellers get 45–70 % of base. Keepers receive
80 % of villager purchases and a small daily passing-trade income when they opened. `sim.shopStock(place)`,
`sim.priceOf(item, place)`, `sim.playerBuy/playerSell` for the UI.

### Requests

`postRequest(by, text, reward, needs)` → board (expires after 3 days, bus `request` events). Villagers post from
goals (flour, ore, wood) and when the player offers help; others `accept_request` if they have or produce the items
and `complete_request` by walking to the poster (reward paid, relationship `promise_kept`/`help`, chronicle).
Player: `playerAcceptRequest(id)`, `playerCompleteRequest(id)`.

### LocalBrain scoring (src/agents/local.ts)

Candidates are only tools whose `available()` is true. Scores (0–100-ish): sleep when the plan says so or energy
< 12; meals by hunger and meal blocks; work base = 70 (work block) or 30 + conscientiousness×15 + purpose deficit,
with per-profession intents (farmer: harvest > water > plant > till > animals > sell/cook/idle-in-the-rows; fisher;
miner; smith incl. forging himself a pickaxe; baker incl. buying flour; doctor treat/check-up/craft tonic/forage
herbs; innkeeper serve/host/cook/stock the kitchen; shopkeeper open/restock/set_price/mind the counter; librarian
catalogue/write/teach; carpenter craft/build/chop/repair). Social candidates per nearby villager scaled by
affinity, extraversion, social deficit and the schedule block (chat, gossip for gossips, compliment, tease, argue when
angry/rival, apologize when owed, comfort the sad, invite, hug, gift by appeal (≤ 2/day), propose, teach, pay debts,
trade, follow, ask_about). Leisure: stroll/read/stars/swim/pray/garden/craft/write/fish/forage/bathe/dance/story/
music/visit (tavern, square, friends where they actually are)/organise_event/attend_event, weighted by fun/comfort
deficits, likes, weather (rain keeps most people in) and status (sick → rest/clinic, drunk → dance, inspired →
write). Goals map to tools (buy seeds, get flour/ore/wood, fence, meet X at Y, catch up with X, see Elin). Then:
anti-repetition (recent tools and recent tool+target keys), a 45-min penalty on a tool that just failed (the
trigger text "X failed: …"), a conversation cooldown after each talk, seeded jitter × openness. The winner's thought
comes from `templates/thoughts.ts` (per-tool banks with slots) through the villager's voice filter.

## Bus events emitted by the sim

- `action` `{who, tool, label, phase: start|end|fail, message?, pos}` — `label` is a short present-participle
  phrase for the HUD: "walking to the Bakery", "baking", "chatting with Cerys", "sleeping", "minding the counter",
  "thinking…" (pending LLM). Walks are emitted with `tool:'go_to'` and the destination label. `message` on `end`
  is the observation ("Ada harvested 2 turnips"), on `fail` the reason.
- `say` `{who, text, to?, pos}` — also sets `villager.speech = {text, until, to}` (until = world minute, ~3.5 min).
- `emote` `{who, kind, pos}` — also sets `villager.emote = {kind, until}`.
- `memory` `{who, memory}` on every new memory (observations, conversation summaries, gossip, reflections, events).
- `relationship` `{a, b, delta, label?}` on label changes and |delta| ≥ 5. `b` may be `'player'`.
- `conversation` `{state, phase: start|turn|end}` — `state.turns` holds every line; player conversations have
  `participants: [id, 'player']`.
- `request` `{request, phase: posted|accepted|done|expired}`.
- `chronicle` `{text, importance, about?, place?}` — the storyboard; `sim.chronicle` keeps the last 400 with `t`.
  Importance guide: 2 routine trade, 3 small social, 4 notable (rows, apologies, gifts loved, salmon), 5 events
  organised/deliveries, 6+ gems, engagements, finished books, 10 proposals accepted.
- `sfx` `{name, pos}` names: chop, mine, splash, hammer, oven, coin, door, gift, laugh, argue, sleep, eat, drink,
  music, write, harvest, water, till, plant, heal, cheer, bell, knock.
- `player` `{what: enter|leave|talk|gift|buy|sell, detail}`.

`villager.action.thought` is the brain's one-liner (hover bubble); `action.label` the HUD text;
`action.progress` 0..1; `action.path` while walking; `action.phase` ∈ travel | conversation | follow | pending.

## Tool catalogue (88)

**move** (6)
- `go_to(place, villager, x, y)` — Walk to a place, to a villager, or to a tile.
- `wander(area)` — Amble to a random spot nearby (or within a named area) with no particular purpose.
- `enter(place)` — Step inside a building (walks to its door first).
- `leave_building()` — Step outside through the door of the building you are in.
- `follow(villager, minutes)` — Walk along with another villager for a while.
- `go_home()` — Go home and step inside.

**work** (27)
- `till(plot)` [farmer] — Till an empty plot at the farm so it can be planted.
- `plant(plot, crop)` [farmer] — Plant seeds in a tilled plot. Picks a seed that suits the season if none is given.
- `water(plot)` [farmer] — Water a planted plot (pointless in the rain).
- `harvest(plot)` [farmer] — Harvest a plot whose crop is ready.
- `tend_animals()` [farmer] — Feed and look after the animals in the barn; collect milk, eggs, wool.
- `fish(spot)` — Fish at a spot on the dock, river or lake. Needs a fishing rod. Rain brings the fish up.
- `mine(rock)` — Break rock in the mine for stone, ore and the odd gem. Needs a pickaxe.
- `forage(area)` — Gather berries, mushrooms, herbs and wildflowers where they grow.
- `chop(tree)` — Chop a tree for wood. Needs an axe.
- `forge(recipe)` [blacksmith] — Smelt or forge something at the smithy: bars, nails, horseshoes, tools, lanterns.
- `bake(recipe)` [baker] — Bake bread, sweet rolls or a pie at the bakery oven.
- `cook(recipe)` — Cook a meal at a kitchen (home, the tavern).
- `craft_furniture(recipe)` [carpenter] — Make furniture at the carpenter's workbench: chairs, bookshelves, birdhouses, toy boats, rods.
- `repair(item, for)` [blacksmith] — Repair a villager's worn tool at the smithy for a fee.
- `treat(villager)` [doctor] — Treat a sick or injured villager with a tonic or bandage.
- `check_up(villager)` [doctor] — Give someone a quick check-up and a word of advice.
- `open_shop()` [shopkeeper/baker/innkeeper/blacksmith/doctor/carpenter/librarian/fisher] — Open your shop for the day and put your own goods on the shelves.
- `close_shop()` [shopkeeper/baker/innkeeper/blacksmith/doctor/carpenter/librarian/fisher] — Close up the shop for the day and count the takings.
- `restock()` [shopkeeper/baker/innkeeper/blacksmith/doctor/carpenter/librarian/fisher] — Restock the shelves from your own stores (costs money for bought-in goods).
- `set_price(item, price)` [shopkeeper/baker/innkeeper/blacksmith/doctor/carpenter/librarian/fisher] — Set your own price for an item in your shop (between 60% and 180% of its usual price).
- `serve_drinks()` [innkeeper] — Work the bar: pour for whoever is in, keep the stories flowing.
- `host_evening()` [innkeeper] — Make a proper evening of it at the tavern: music, stories, a round on the house. Draws people in.
- `teach(villager, skill)` — Teach someone a skill you know well.
- `catalogue_books()` [librarian] — Sort, shelve and catalogue the library.
- `write_book(title)` — Work on your own book. Five sessions finish a volume.
- `build(structure)` [carpenter] — Build a structure somewhere in the village: fence, bench, bandstand, shed, birdhouse_post, dock_plank, lantern_post.
- `repair_structure(place)` [carpenter] — Fix something up around the village: a door, a roof, the dock, a fence.

**social** (17)
- `say(target, text, tone)` — Say something out loud to someone nearby (or to no one in particular).
- `greet(target)` — Greet someone nearby; they greet back.
- `chat(target, topic)` — Have a conversation with someone about a topic (or whatever comes up).
- `gossip(target, about)` — Share a rumour about someone else with a friend.
- `ask(target, question)` — Ask someone a question.
- `compliment(target)` — Pay someone a compliment.
- `tease(target)` — Rib someone good-naturedly (or not so good-naturedly).
- `apologize(target)` — Apologise to someone you have wronged.
- `argue(target, about)` — Pick a fight about something.
- `comfort(target)` — Comfort someone who is having a hard time.
- `invite(target, activity, place, hour)` — Invite someone to do something together later.
- `gift(target, item)` — Give an item from your inventory to someone.
- `propose(target)` — Ask someone to be your partner. Only sensible when you are both deeply fond of each other.
- `hug(target)` — Hug someone you are close to.
- `dance(target)` — Dance — with a partner if one is nearby, alone if not. Best at the tavern, the square, or a festival.
- `tell_story(about)` — Tell a story to whoever is around.
- `play_music(song)` — Play a tune (a whistle, a fiddle, a drum on the table) for whoever is around.

**economy** (5)
- `buy(item, qty, place)` — Buy an item from a shop that stocks it (walks there if needed).
- `sell(item, qty, place)` — Sell items from your inventory to a shop that buys that kind of thing.
- `trade(target, give, want)` — Offer another villager a swap: your item for theirs.
- `pay(target, amount, reason)` — Give someone money — settling a debt, paying for help, or just being generous.
- `haggle(place)` — Try to talk a shopkeeper down on their prices. Charm helps; some shopkeepers hate it.

**life** (14)
- `eat(item)` — Eat something from your inventory, or buy a meal at the tavern or bakery.
- `drink(item)` — Have a drink: ale or cider at the tavern, tea or coffee from your own supplies.
- `sleep()` — Go to bed at home and sleep until morning.
- `nap(place)` — Have a nap wherever you are (a bench, a chair by the fire, the grass).
- `rest()` — Sit down and rest for a while.
- `bathe()` — Wash: at home, or a dip at the lake or river in warm weather.
- `stroll(place)` — Take a walk somewhere pleasant: the lake, the meadow, the orchard, the hill, the river.
- `pray()` — Spend a quiet moment at the chapel shrine.
- `read()` — Read a book — your own, or one at the library.
- `garden()` — Potter about in your garden at home.
- `decorate_home(item)` — Put a piece of furniture or a decoration up at home.
- `visit(place)` — Call on a place — someone's home, the library, the tavern — and see who is about.
- `watch_stars(place)` — Lie back somewhere dark and watch the stars. Clear nights only.
- `swim()` — Swim in the lake. Summer, daylight, and not in a storm.

**craft** (5)
- `craft(recipe)` — Make something by hand from a recipe: cloth, candles, bandages, a scarf, flour, or anything at a station you can reach.
- `use_item(item)` — Use an item: eat or drink it, take a medicine, read a book, use fertiliser on a plot, rub a horseshoe for luck.
- `pick_up(object)` — Pick up something lying nearby (a forage spot, a dropped item, a windfall).
- `drop(item, qty)` — Throw something away.
- `plant_flower(place)` — Plant a flower somewhere pretty — by your door, in the square, in the meadow.

**info** (5)
- `look_around()` — Take stock of where you are and who is about.
- `check_board()` — Read the notice board in the square: requests, events, news.
- `check_weather()` — Look at the sky and think about tomorrow.
- `recall(query)` — Think back: retrieve memories relevant to a query.
- `ask_about(target, about)` — Ask someone what they know about a third villager or a topic.

**meta** (9)
- `set_goal(text, priority)` — Set yourself a goal to pursue over the coming days.
- `remember(note, importance)` — Make a note of something worth remembering.
- `plan_day(entries)` — Rewrite the rest of today's plan as a list of {hour, block, place?, note?} entries.
- `post_request(text, reward, needs)` — Post a request on the notice board: what you need, and what you will pay.
- `accept_request(id)` — Take on a request from the notice board.
- `complete_request(id)` — Deliver what a request asked for and collect the reward.
- `organise_event(kind, place, hour)` — Organise a get-together: a picnic, a bonfire, a game of dice, a singalong. Others hear of it and may come.
- `attend_event(id)` — Go to an event that is happening (a festival, a picnic, an evening at the tavern).
- `idle(reason, minutes)` — Do nothing in particular for a few minutes.

Total: 88

## What other agents must know

- **World (Agent A)** — the sim reads/writes these object shapes and uses the world's helpers when present
  (`harvest/chop/pickFruit/mine/gather` on PebbleWorld are duck-typed and preferred; otherwise it edits `data`):
  tree `{wood, fruit?, type}` (apple trees are foraged for apples, not chopped); rock `{ore, hp, depleted}`;
  forage `{item|null, qty}`; fishspot (any; `data.fish?: ItemId[]` overrides the sim's season/weather table);
  animal `{species|kind, produce, fed}` (sim sets `fed: true`, `fedDay`); plot via `world.plot/setPlot`. Places with
  `interior` are entered on arrival (villager hidden at `interior`); standing at the `door` counts as "at" the place
  for outdoor work (garden, build). Shops open by `place.open` hours; the keeper's `open_shop`/`close_shop` override
  for the day. Home facilities `bed`, `kitchen` are used; `oven`, `forge`, `workbench`, `books` locate work.
- **Events (Agent E)** — `sim.events` is the live list (the sim pushes its own `kind:'social'` gatherings and the
  day's `festival`; it removes expired social ones). `event.data.prices` multiplies shop prices. `event.data.host`
  is the organiser. Villagers attend anything with a `place` via `attend_event`. Push `'sick'` on `villager.status`
  and lower `health` to make someone ill; the doctor will come. `sim.interrupt(v, reason)` cancels an action and
  re-decides with reason `'interrupted'`. `sim.remember(v, …)` with `kind:'event'` and tags like `event`, `plan`
  makes brains react (invites, festivals).
- **LLM (Agent F)** — implement `Brain` without the sync methods; everything else is handled (pending label,
  timeouts, fallback to local). `ctx.options` is the pre-filtered available tool list; `ctx.trigger` carries
  "X failed: reason" after a failed tool. Conversation turns may set `topic` (sub-topic) and `remember` for the
  listener. `chat(ctx)` is used first for typed player text (`ctx.playerLine`), `converse` gets `playerIntent`.
- **UI (Agent D)** — `Sim` gained `playerBuy(place, item, qty)`, `playerSell(place, item, qty)`,
  `playerAcceptRequest(id)`, `playerCompleteRequest(id)` (added to `core/app.ts`, required). Player conversation
  state is `sim.player.talkingTo` + the `ConversationState` in `sim.conversations` with `'player'` as a participant.
  Villager cards: `needs`, `mood`, `status`, `plan.summary`/`plan.entries`, `goals`, `memory` (newest last, `kind`
  and `importance`), `relationships` (`label`, `notes`), `action.label/thought/progress`.
- **Core additions** (additive): `ConversationTurn.topic?`, `Request.expired?`, the four `Sim` player methods.
- **Determinism**: everything in sim/agents uses `SeededRng` (sim: `seed ^ 0x51a7`, brain: `seed ^ 0xb0a1`);
  the same seed and inputs replay identically. No `Math.random`/`Date.now` anywhere in these modules.

## Save/load

`sim.save()` → JSON-safe object (villagers without in-flight actions, runtime extras, player, requests, events,
chronicle, shops, rng state, memory id counter). `sim.load(data)` restores in place; villagers re-decide, sleepers are
put back to bed. Round-trip verified on the real world (identical money/memories/relationships after load, another
day runs clean).

## Known limits / ideas

- Villager↔villager conversations are template exchanges (2–6 turns) — with an LLM brain the same manager drives
  model-written turns.
- `plant_flower` cannot add world objects (the objects list is the world's); it decorates existing flowerbeds.
- Romance is tuned so a crush takes ~a week and a proposal ~2 weeks of mutual attention; tweak in
  `relationships.ts` (`applyDelta`) and `social.ts` (`propose`).
