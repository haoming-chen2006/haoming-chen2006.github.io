# NOTES — events (Agent E)

Owner: Agent E. Module: `src/events/` — external events, the festival programme, the request/quest generator, the Director API.

Status: **complete and tested.** `node scripts/events_test.ts` passes for seeds 1–5 on both the fake sim and the real
sim (`createSim` from `src/sim`, which builds and runs today). `npm run check` was clean for the whole project at the
time of writing.

## Run / test

```
node scripts/events_test.ts [seed]   # ~10 s: a full year on the fake sim + 60 days on the real sim; exit 1 on failure
npm run check
```

The test runs 30-minute steps and asserts: every festival/birthday/tax day/market day fires on its day and hour, ≥ 15
distinct random events fire, nothing fires out of season, every start gets an end (including `social` events the sim
expires itself), memories are written and tagged, requests are posted/expired/rewarded ≥ price × 1.5, the story chain
completes when the player delivers, the merchant stall is buyable while he is there and gone after, the cold makes
people sick, a proposal fires from its trigger and the wedding follows two days later, `fire()` works for every id whose
preconditions hold, and a save/load round trip mid-event keeps the active events, the forecast and the byte-identical
director state (the run continues on the loaded copies).

## Files

| file | what |
|---|---|
| `src/events/index.ts` | `createDirector(sim, seed): PebbleDirector` (a `Director` plus `log`, `defs`, `requests`, `mine()`, `calendar`); re-exports `EVENTS`, `EVENT_BY_ID`, `FESTIVAL_IDS`, `MERCHANT_STOCK`, `REQUEST_RULES`, `rewardFor`, `createFakeSim`, types |
| `src/events/types.ts` | `EventDef`, `EventWhen`, `Announcement`, `EventCtx`, `FollowUp`, `CalendarEntry` |
| `src/events/helpers.ts` | announce/gather/goal/memory/relationship helpers; duck-typed weather, shop stall, walkability, sickness |
| `src/events/catalogue.ts` | the 34 event definitions (data + small hooks) |
| `src/events/requests.ts` | `REQUEST_RULES` (52 rules), `RequestGenerator`, the three-step story chain, `rewardFor` |
| `src/events/director.ts` | `DirectorImpl`: daily random rolls, calendar, hourly triggers, ticking/ending, follow-ups, save/load |
| `src/events/fakesim.ts` | a minimal `Sim` (ten villagers, schedule-driven teleporting, shops, requests, save/load) for tests |
| `scripts/events_test.ts` | the headless test |

## How it fits the sim

- **Active events live in `sim.events`**, the shared list: the economy reads `data.prices`, `attend_event` reads
  `place`/`startedAt`, `check_board` lists names, the UI reads everything. `director.active` *is* `sim.events`;
  `director.mine()` is the subset started by the director (`data.def` = catalogue id).
- Instance ids are `<defId>_<dayIndex>[ _n ]`; `data.def`, `data.source` (`random | calendar | trigger | scheduled |
  followup | chained | director`) and `data.memories` (how many memories the announcement wrote) are always set.
- The sim pushes a placeholder `festival_<dayIndex>` at newday; when the festival fires the director replaces it.
- The sim expires `kind: 'social'` events itself at `endsAt`; the director notices its own instances vanishing and
  still runs `onEnd`, the bus `event end` and follow-ups.
- Director RNG: `new SeededRng(seed).fork(7)`, state saved. No `Math.random`/`Date.now` in the module.
- Every event writes memories through `sim.remember` with `kind: 'event'`, importance by drama, tags
  `['event', <defId>, <place>, 'weather' | 'festival' | …, 'pleasant' | 'unpleasant' (per villager)]` and `about`.
- Sickness: `makeSick()` lowers `health` below 45 — the sim's status logic flags `sick`, Elin's `treat` becomes
  available; `recover()` lifts it above 72. Status flags the director sets directly: `celebrating`, `angry`,
  `inspired`, `injured`, `inLove`.
- Weather: `world.forceWeather(kind, intensity, hours)` (duck-typed; a world without it just skips the weather).
- Walkability (broken bridge): `world.grid.walk/cost` are zeroed on the bridge tiles and restored on end (and after
  load, since the map is regenerated from the seed).
- Shops: the merchant registers a `ShopState`-shaped stall under place `square` in `sim.shops` (duck-typed Map), so
  `shopStock('square')`, `priceOf(id, 'square')`, `playerBuy('square', …)` and villagers' `buy` all work; it is
  re-registered on load and deleted when he leaves. Flour shortage and the heirloom mutate the store's stock the same way.
- Attendance: `gather()` gives each villager a goal, a high-importance `event` memory and `sim.interrupt(v, reason)`
  for those awake, not in a conversation and (unless `force`) not in a work block. The brain then sees a live
  event with a `place` and `attend_event` is available — on the real sim villagers do go. Festivals, weddings, the
  mayor vote and the cave-in rescue use `force`.
- Bus: `event` start/end, `toast` (warn for calamities, good for festivals), `chronicle` via `sim.log`. Requests: the
  director listens to bus `request` (done → relationship bonus to the helper + memory; expired → a small memory).

## Event catalogue (34)

| id | kind | when | what it needs from the sim / what it does |
|---|---|---|---|
| `storm_warning` | weather | random 7 %/day, spring–autumn | Dov/Elin foresee it; schedules `storm` next day 13–16 h (shown in the forecast); goals for Ada/Dov |
| `storm` | weather | random 3 %, or from the warning | `forceWeather('storm')`, comfort down outdoors, 70 % a fence breaks → Ada posts a nails+wood request, Jory goal |
| `heatwave` | weather | random 7 %, summer, 2 days | sunny override each morning, `data.prices` ale/cider up, plots dry at 13 h and Ada is interrupted, outdoor comfort/energy down |
| `fog` | weather | random 7 %, spring/autumn/winter | `forceWeather('fog')` 7 h, `data.fishBonus 1.3`, moods by likes |
| `drought` | nature | random 4 %, summer, 3 days | sunny every morning, plots dried at noon, `fishBonus 0.6`, crop prices up, Ada goal + request; ends with rain |
| `first_snow` | weather | trigger: winter and snow, once a year | memories by temperament, hot drinks cheaper |
| `meteor_shower` | nature | random 7 %, summer/autumn, 21 h, clear sky | gathers star-lovers to the hill; attendees gain fun and a little romance with each other |
| `shooting_star` | nature | random 6 %, 20–22 h, clear sky | everyone outdoors makes a wish (a memory from their `dream`), purpose up |
| `merchant` | visitor | random 7 %, 2 days, square | stall with pearl, gem, poetry, scarf, map fragment, exotic seeds, honey, candles, book, lantern (`data.stock`, `data.merchant` for the renderer); Ines goal to buy the map; Hal grumbles |
| `flour_shortage` | economy | random 5 %, 3 days | `data.prices` flour/bread/rolls/pie/wheat up, store flour removed, Cerys angry + wheat request, everyone −3 affinity to Hal (profiteering) |
| `tax_collector` | economy | calendar: day 26 of every season, 10 h, square | everyone pays 8 % (min 5, max 80), grumbling memories, those who cannot pay get a debt memory; `data.collector` |
| `market_day` | economy | calendar: every Saturday 9 h, square | `data.prices` produce/fish/food ×1.1–1.25, non-shopkeepers gather |
| `bard` | visitor | random 6 %, 17–18 h, tavern | Orrin plays: gathers, fun/social for those at the tavern, Finn earns, Jory `inspired`; `data.visitor` |
| `visitor` | visitor | random 5 %, 3 days, tavern | a newcomer at the inn (the sim cannot add villagers): `data.visitor {name, role, story, look, place}`, Finn earns, Hal nosy, tavern-goers collect stories at 13 h/20 h |
| `letter` | social | random 9 %, 9–12 h | one of 20 letters (two per villager, cycling): memory 4–8, a goal, mood; Hal knows who got post |
| `crows` | nature | random 8 %, spring–autumn, dawn, farm | 3–6 planted farm plots set back a day (`grown`), Ada upset + scarecrow request, Jory goal |
| `cave_in` | calamity | random 3.5 %, 9–15 h, mine | Greta `injured`, trapped, interrupted; Bram+Jory+Elin forced to the mine; wood request; on end rescuers (Bram, Jory + whoever is there) get +15 affinity/+20 trust from Greta; tonic request |
| `wolf` | calamity | random 5 %, 5–7 h, barn | animals `data.mood 'frightened'`/`scared`, Ada+Bram forced over; on end the nearest awake villager drives it off, Ada trusts them more |
| `fish_bloom` | nature | random 6 %, spring–autumn, lake | `data.fishBonus 2.2`, fish cheaper, Dov gets fish + goal, Finn posts a perch request and a `stew_night` is scheduled 19 h |
| `bumper_harvest` | nature | trigger: ≥ 8 farm plots ripe, summer/autumn | crop prices down, Ada gives potatoes to everyone (+affinity), harvest supper at the tavern |
| `cold` | calamity | random 6 %, 2 days | 2–3 villagers sick (wet/cold/neurotic first), each posts a tonic request, Elin goal + interrupt + 2 tonics, may spread at noon; on end everyone recovers and trusts Elin |
| `broken_bridge` | calamity | random 4 %, 1 day, bridge_west | bridge tiles unwalkable, Jory goal + wood/nails request, +affinity to Jory when reopened |
| `stray_dog` | social | random 4.5 %, once per villager | a dog adopts the most agreeable/lonely villager (`data.pet`, `stats.dog`), schedules `dog_digs` in 2 days |
| `dog_digs` | mystery | follow-up | the dog brings back a horseshoe / map fragment / pearl / gem / toy boat |
| `heirloom` | mystery | random 4.5 %, 2 days | an heirloom vanishes into Hal's stock; three clue memories; owner posts a find-it request; a clue holder (or Hal on the last day) returns it for +12 affinity/+18 trust — the player can buy it at the store and deliver |
| `birthday` | social | calendar: each villager's birthday 18 h, tavern | friends (affinity > 10) gift something the celebrant likes (65 % each), gathering at the Owl, attendees bond |
| `proposal` | social | trigger: a pair with mutual romance ≥ 60, affinity ≥ 55, 17–21 h | partners, +30 romance, lines said, everyone gossips, Cerys wants to bake the cake; schedules `wedding` in 2 days (forecast) |
| `wedding` | festival | follow-up (or override) | chapel ceremony, everyone forced to come, couple `celebrating`, memories for all, then `stew_night` as the party |
| `stew_night` | social | scheduled by fish bloom / harvest / wedding | supper at the tavern (`opts.name`, `opts.host`), hunger/fun/social for those present, Finn earns |
| `mayor_race` | social | random 3 %, 2 days, square | two candidates from Hal/Finn/Ada/Greta/Cerys/Bram; everyone takes a side by affinity (memories, ±2); vote at 15 h next day with 80 % loyalty; winner `celebrating`, loser `angry` and −8 to the winner; `data.mayor`, `stats.mayor` |
| `bloom_fair` | festival | calendar: spring 13, 10 h, festival grounds | flower judging at 11 h (winner gets honey, `data.flowerWinner`), maypole dancing at 13 h in pairs (+romance), everyone forced to come |
| `lantern_night` | festival | calendar: summer 15, 19 h, lake | lanterns near the lake `lit`, at 20 h everyone present floats a lantern and wishes; the most promising couple gets +8 romance |
| `harvest_feast` | festival | calendar: autumn 20, 12 h, festival grounds | long table at 13 h (hunger +45), pumpkin contest at 14 h (`data.pumpkinWinner`, seeds prize; Ada sulks if she loses) |
| `winter_star` | festival | calendar: winter 24, 17 h, square | secret gift exchange at 18 h (`data.secret`, a candle is bought if nothing suits), the Star rises at 20 h |

Scheduler rules: at each new day every random event in season and off cooldown is rolled once (`perDay`, ×1.6 while it
has never fired); at most 2 hits are scheduled at seeded hours inside the event's `hours`. Calendar events fire at
their hour with a 3-hour grace (a save loaded at 22:00 on a festival day does not start the festival). Triggers are
checked hourly. `fire(id, opts)` ignores rarity, season and cooldown but keeps `canFire`, exclusivity and
one-instance-at-a-time; `list()` reports `canFire` under the same rules. `forecast()` lists the next 14 days of
calendar entries (festivals, birthdays, tax day, market day) plus labelled scheduled arrivals (a forecast storm, a
wedding, a stew night).

## Requests (`src/events/requests.ts`)

- 52 rules keyed by villager (Cerys wants honey/berries/eggs, Bram ore/wood/coffee, Elin herbs/honey, Finn fish/potatoes/
  apples/firewood, Ines books/candles/wildflowers, Jory wood/nails/cloth, Ada nails+wood/fertiliser, Dov wood/cloth,
  Greta ale/candles/iron bar/horseshoe, Hal turnips/eggs/wool…), with seasons, `when` conditions and optional item bonuses.
- Hourly between 8 and 18: each villager who has not posted today and has < 2 open requests rolls 3 %/h (more when
  their `purpose` is low) for a rule whose items they lack and can afford. Board cap 8 open. Expiry 4 days (rule
  `days` overrides; help-wanted 1 day). Reward = Σ item price × qty × 1.5 + 5 (+0–6), plus a 35 % chance of the rule's
  bonus item when they have it.
- Completion (bus `request` done): poster → helper +4 affinity/+6 trust/+2 familiarity and a memory for the helper (on
  top of whatever the sim's own completion does). Expiry: a small unpleasant memory for the poster.
- Events post their own requests too (storm fence, crows scarecrow, drought fertiliser, cave-in props and tonic, cold
  tonics, flour wheat, fish-bloom perch, bridge timber, heirloom find-it) — those are not counted against the per-villager cap.
- **Story chain** (`state.chain`, saved): day 2+ Ines asks for the other half of the map (60 coins + poetry; the merchant
  sells one, the dog may dig one up); when delivered she asks for a lantern to search Library Hill (50) → on delivery
  she finds the Stoneleigh locket (Greta gets a `gem`, Greta↔Ines +20/+22 trust, everyone hears); then Greta asks for two
  candles for a remembrance at the graveyard (45 + horseshoe) → everyone remembers, Greta and Ines become friends.
  Expired chain requests are re-posted two days later. Villagers can complete chain steps too.
- Help-wanted requests with no items (Finn's "a hand behind the bar") can be completed without delivering anything —
  small rewards only; a real "task" request type would need sim support (open question for Agent B).

## For the UI (Agent D) and player (Agent H)

- Render `director.active` (= `sim.events`): `name`, `text`, `place`, `startedAt/endsAt`, and `data.def` for an icon by
  event kind. `data.source === 'director'` marks overrides.
- Merchant: while `data.def === 'merchant'` is active, `data.merchant { name, pos, look }` is a person to draw at the
  square anchor and `data.stock` mirrors the stall; standing near the square anchor and pressing E should open
  `ui.openShop(world.place('square'))` — `sim.shopStock('square')` / `playerBuy('square', id, qty)` work as for any shop.
- `data.visitor { name, role?, look, place }` (visitor, bard) is an NPC to draw at the tavern door; `data.collector`
  at the square on tax day; `data.pet { name, owner }` a dog by its owner.
- `data.fishBonus` (fog 1.3, fish bloom 2.2, drought 0.6) is a hint for the fishing tables; `data.prices` is already
  applied by the economy.
- Director panel: `list()` for the Fire buttons (`canFire` respects preconditions), `forecast()` for the calendar,
  `director.log` for a history (the last 600 lines survive save/load).

## Open questions / notes for other agents

- **Sim (B):** `sim.events` entries of kind `social` are removed by the sim at `endsAt`; the director copes, but if the
  sim ever removes other kinds early, `onEnd` still runs (orphan detection by id). The placeholder `festival_<day>`
  is replaced by the director's festival at start time; if the sim wants to keep its own, use the director's
  `bloom_fair_<day>` etc. instead. `data.fishBonus` is unused by the sim so far.
- **Lead:** nothing new to wire; `createDirector(sim, seed)` and `director.update(minutes)` after `sim.update` as in
  main.ts today. `director.save()` is ~20 KB with the log.
- Determinism: the fake-sim run is fully reproducible; the real sim's own RNG is not touched by the director.
