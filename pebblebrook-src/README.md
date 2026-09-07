# Pebblebrook

A living village. Ten villagers — a farmer, a blacksmith, a baker, a fisher, a doctor, an innkeeper,
a miner, a shopkeeper, a librarian and a carpenter — each run by their own AI agent with needs,
a personality, a memory of everything that happened to them, opinions about everyone else, and a
catalogue of around fifty things they can decide to do: work their trade, cook, trade, gossip, give
gifts, invite each other out, argue, apologise, fall in love, post requests, organise a picnic, or
just sit by the lake. You walk among them, talk, trade, farm and fish, take on their requests, and
can step into Director mode to throw events at the village and read any villager's mind.

Live: https://haoming-chen2006.github.io/pebblebrook/

## Playing

- **Move** WASD / arrows, Shift to run. **E** interacts with whatever is nearest: a villager (talk),
  a door (enter), a crop plot (till / plant / water / harvest), a tree, a rock, the water (fish), a
  forage spot, a shop counter, the notice board, your bed.
- **1–9** select a hotbar item (seeds to plant, tools to use). Mouse wheel cycles.
- **Space** pause · **-** / **=** slower / faster (1×, 2×, 4×, 8×). One real second is one village
  minute at 1×, so a day is about 24 minutes.
- **Tab** Inspector (a villager's needs, mood, plan, memories, relationships, current thought) ·
  **V** Village overview and storyboard · **B** notice board · **G** Director · **F** follow a villager ·
  **Esc** menu (save / load / settings).
- Talking: pick an intent (ask about their day, gossip, ask for help, joke, compliment, gift, trade,
  ask about someone) — with an API key configured in Settings you can also type anything.

## The villagers are agents

Every villager is driven by a *brain* that, whenever the villager is idle or something interrupts
them, sees their situation (needs, mood, schedule, goals, who is nearby, the weather, the notice
board, retrieved memories) and picks one **tool** from the catalogue with arguments. The simulation
executes it over time, and the outcome becomes a memory. Conversations are produced turn by turn
the same way. Two brains exist:

- **Local brain** (always on, no key needed): a utility planner over the schedule, needs × personality,
  opportunities, goals and seeded randomness, with a large bank of dialogue and thought templates in
  each villager's voice.
- **LLM brain** (Settings → AI brains): Claude (`claude-haiku-4-5`, or Sonnet) via the Anthropic API,
  or an OpenAI model. The model gets the same context as a compact prompt plus the tool schemas, and
  answers with a tool call and a thought; conversations and nightly reflections become genuinely
  written. Your key stays in your browser and is sent only to that provider. Any failure falls back
  to the local brain so the village never stalls.

Memory: a stream of observations, conversations, gossip (second-hand memories with a source) and
nightly reflections, retrieved by recency × importance × relevance. Relationships: affinity, trust,
romance and familiarity with labels from stranger to partner, moved by every interaction.

## External events

Storms and fog, a travelling merchant, four festivals, a cold going around, crows on the crops, a mine
cave-in, wolves near the sheep, a flour shortage, birthdays, a meteor shower, a lost heirloom, a stray
dog, a proposal… The Director panel (G) lets you fire any of them.

## Development

```sh
npm install
npm run dev                # http://localhost:5190/pebblebrook/
npm run check              # tsc
node scripts/sim.ts 7      # headless: seven village days, chronicle + variety assertions
node scripts/world_test.ts # map, places, pathfinding, calendar, crops
```

`scripts/deploy.sh [--push]` builds and copies into the site repo (`/pebblebrook` + `/pebblebrook-src`).

Architecture and module ownership: `specs/DESIGN.md`. Per-module notes: `specs/NOTES-*.md`.

Art: Kenney's CC0 Roguelike/RPG and Roguelike Characters packs (kenney.nl); villager sprites are
generated in code. Music and sound are synthesised with WebAudio.
