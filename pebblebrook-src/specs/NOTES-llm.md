# NOTES — llm (Agent F)

Owner: Agent F. Module: `src/llm/` — the `LlmBrain` that lets villagers think and talk through Claude
(Anthropic Messages API) or an OpenAI chat model, with a queue/budget and a silent fallback to the local
brain so the world never stalls. No npm dependencies: plain `fetch`, browser-safe.

Status: IMPLEMENTED — offline tests pass; live smoke test against `claude-haiku-4-5-20251001` recorded at the bottom.

## Run / test

```
npm run check                                   # tsc
node scripts/llm_test.ts                        # offline unit tests (fake fetch, canned Anthropic + OpenAI replies)
set -a; source ~/.hermes/.env; set +a; node scripts/llm_test.ts   # + ONE live decide and ONE live converse (≤ 6 requests)
```

## Files

| file | what |
|---|---|
| `index.ts` | exports: `DEFAULT_LLM`, `loadLlmSettings`, `saveLlmSettings`, `createLlmBrain(settings, fallback, opts?)`, `llmStats`, `resetLlmStats`, plus the pieces below for tests |
| `brain.ts` | the `LlmBrain`: decide / converse / chat / reflect, mode gating, fallback + stats |
| `prompt.ts` | system prompt per villager, decision / conversation / reflection messages, tool-schema wrapping, needs → words, time-ago, memory picking |
| `coerce.ts` | tool-name validation, arg coercion to the JSON schema, name → id resolution (villagers, places, items, recipes), text-reply salvage, `ConversationTurn` shaping |
| `queue.ts` | priority queue: ≤ 3 in flight, per-in-game-hour budget, 12 s timeout, backoff on 429/5xx, cooldowns, `llmStats` |
| `anthropic.ts` | `POST https://api.anthropic.com/v1/messages` with `tools` + `tool_choice`; parses `tool_use` and text blocks |
| `openai.ts` | `POST https://api.openai.com/v1/chat/completions` with function `tools`; parses `tool_calls` and content |
| `types.ts` | `LlmRequest`/`LlmResponse`/`Provider`, `LlmError`, `redact()` |

`scripts/llm_test.ts` — node test script (see bottom).

## How it plugs in

`main.ts` already does `createLlmBrain(() => llm, local)` and hands the result to `createSim(world, seed, { local, llm })`.
The sim calls `brains.llm` only for villagers whose `brain === 'llm'` (set from the Director panel).

Mode (from `LlmSettings.mode`, Settings panel):

| mode | decide | converse / chat | reflect |
|---|---|---|---|
| `all` | model | model | model |
| `social` | local (sync, no "thinking…" pause) | model | model |
| `off` (or provider `none` / empty key) | local | local | local |

The sim duck-types `decideSync` / `converseSync` / `reflectSync` on the brain it calls. The `LlmBrain` exposes them as
**getters** that return the local brain's sync method exactly when that kind of call is not LLM-driven, so mixed mode
has zero latency for the local half. When the model is used, the call is async and the sim shows "thinking…".

Every failure — budget spent, cooldown, queue full, timeout, HTTP error, refusal, unknown tool, unparseable reply,
missing required argument — is caught inside the brain and answered by the local brain. Nothing is thrown to the sim.

## Prompt shapes

### System prompt (one per villager, stable across calls)

```
You are Ada Thornfield, the farmer of Pebblebrook, a small river village of ten neighbours who farm, fish, forge, bake, trade and gossip. Runs the farm on the east road. Up before the rooster, in bed before the owls.
How you speak: Plain-spoken, warm, says what she means and then gets back to work.
Traits: early riser, stubborn, generous, practical. Likes: vegetable, rustic, sunny, farming, honest work, stew. Dislikes: fancy, laziness, storm, gossip.
Your dream: A harvest so big the whole village eats for free at the Harvest Feast.
The world: days run 24 hours and most shops open about 8:00–18:00; you sleep at home at night. Money is coins — a loaf costs about 12, a good tool 60–90. Four seasons of 28 days (spring, summer, autumn, winter); crops, fish and forage follow the season, and the weather changes plans. Festivals fall on the calendar.
You act by choosing exactly ONE tool per turn; the world carries it out and asks you again when it ends or something interrupts you. Every tool also takes `thought` (one line of inner voice, required) and an optional `say` (a short line spoken aloud). Be specific, stay in character, and only refer to people, places and items that exist here.
```

### Decision message (per call, ≈ 250–500 tokens; the tool schemas are sent separately as `tools`)

```
Time: Tue 3 Spring, Year 1, 9:20 am (daylight). Weather: sunny, 14°C; forecast rain.
Place: at the Farm.
Feeling: hungry, a little lonely; mood cheerful. Status: tired.
Money: 220 coins. Carrying: Turnip Seeds ×12, Seed Potatoes ×8, Hoe, Watering Can, Bread ×2.
Plan today: 5:30 breakfast · 6:30 work @ Farm · 12:00 lunch · 13:00 work @ Farm · 17:00 free · 19:00 dinner · 20:00 social · 21:30 sleep — now: work.
Goals: plant the north plots before the rain (p8); sell turnips at Hal's (p5).
Nearby: Bram (friend — "helped mend the fence"), Cerys (acquaintance).
Memories:
- yesterday: Ada watered the turnips.
- 3h ago: Ada had bread for breakfast.
- 20m ago: Bram said the storm will come early.
Happening: Spring Bloom Fair at the festival grounds — stalls open at noon.
Interrupted: chat failed: Bram is already talking to someone
Choose ONE tool for what Ada does next.
```

Rules: needs are words (thresholds in `prompt.ts`: energy < 20 exhausted / < 40 tired; satiety < 20 starving / < 40 hungry;
social < 25 lonely / < 45 a little lonely; fun < 25 bored stiff / < 45 bored; comfort < 30 uncomfortable; purpose < 30 restless / < 50 unfulfilled;
otherwise "content"). Memories: `ctx.relevant` first, then `ctx.recent` newest-first, de-duplicated by id and text, cap 8, printed oldest
first with a time-ago prefix. The `Just now` line uses the reason: `Interrupted:` / `News:` / `Someone approached:` / `A new hour:`.

### Tools

Every `ctx.options` entry becomes `{ name, description, input_schema/parameters }` with the wrapper
`properties: { thought: string (first), ...params.properties, say?: string }` and `required: ['thought', ...params.required]`
(the wrapper params carry no descriptions — the system prompt explains them once). Measured on the real sim: a decision for Cerys at 16:00
sends 47 tool schemas ≈ 3,400 tokens + system ≈ 280 + message ≈ 250, i.e. ~3.9k input tokens per decision on Haiku (≈ $0.004); the tool
list is the cost driver, so trimming `ctx.options` on the sim side is the lever if it ever matters.
Anthropic: `tool_choice: { type: 'any', disable_parallel_tool_use: true }`. OpenAI: `tool_choice: 'required'`, `parallel_tool_calls: false`.
If a model rejects forced tool use (400 mentioning `tool_choice`, e.g. Claude Fable 5.1) the adapter re-sends once with `auto`.

### Conversation (`converse` / `chat`) — forced tool `speak`

```
You are talking with Bram (friend; "helped mend the fence").
Topic: weather
What you remember:
- 20m ago: Bram said the storm will come early.
So far:
Ada: Morning, Bram. Sky looks wrong.
Bram: Storm's coming early. Mark me.
Reply as Ada in one or two sentences, in character, reacting to what was just said. Use the speak tool. Set end=true only if Ada would wrap up now.
```

`speak` params: `text` (required), `tone` (warm|neutral|cold|flirty|angry|sad|joking), `end` (boolean), `affinityDelta` (−5..5),
`emote` (happy|sad|angry|love|question|idea|sleepy|music|sweat|exclaim|sick), `remember` `{text, importance 1..10, tags[]}` (only if notable), `topic`.
`chat` (free text from the player) adds: `The newcomer just said: "…"` and the permission to deflect, tease or refuse in character, and
"never mention being an AI or a game". When the listener is the player the relationship line says "the newcomer who took the old farm by the river".

### Reflection — forced tool `reflect` `{ reflections: string[1..3] }`

Input: the day's memories (`ctx.recent`, which the sim sets to today's non-reflection memories; capped to the 20 most important, in order),
output 1–3 one-sentence reflections in the villager's own words, first person — the same voice the local templated reflections use.

## Budget & queue rules (`queue.ts`)

- **≤ 3 requests in flight**; waiting jobs are dispatched by priority then FIFO: player conversation (0) > villager conversation (1) > decision (2) > reflection (3).
- **Per-in-game-hour cap** `settings.budgetPerHour`: counted against `Math.floor(ctx.now.minute / 60)`; the counter resets when the hour key changes (also when a save is loaded and time jumps). A job over the cap rejects immediately (`code: 'budget'`) → fallback; it does not wait for the next hour.
- **Queue cap**: when 12 jobs are already waiting, new decisions/reflections reject at once (`'queue-full'`) so a slow model cannot pile up villagers; conversations still queue.
- **12 s timeout** per HTTP request (AbortController). Timeouts are not retried (`'timeout'`).
- **Retries with exponential backoff** on 429 / 408 / 409 / 5xx / 529 / network errors: 800 ms × 2^attempt + jitter, honouring `retry-after` when ≤ 10 s. Conversations retry twice, decisions and reflections once. A `retry-after` above 10 s is not waited for: the job fails and the queue **cools down** for that long.
- **Cooldowns** (real time; every job during a cooldown falls back instantly): 4 s after a final 429, 10 s after a final 5xx/network failure,
  30 s after a 400/404 (configuration-level here: no credits, bad model id, invalid schema — the same request would fail again), 60 s after 401/403 (bad key).
  The UI can show `llmStats.lastError` + `cooldownUntil` so the player learns why villagers went local.
- Retries within a job count as extra `requests` but only one unit of the hourly budget.

## `llmStats` (exported, mutable; the UI can poll it)

```
requests, ok, failed, retries, timeouts, fallbacks     counters
tokensIn, tokensOut                                     from provider usage (estimated chars/4 when missing)
inFlight, waiting                                       live queue state
hourKey, usedThisHour, budgetPerHour                    budget window
cooldownUntil (ms epoch, 0 = none), lastError, lastErrorAt, lastLatencyMs, lastModel
```

`fallbacks` counts only calls where the model was supposed to answer and the local brain answered instead (mode `off` does not count).
`lastError` is redacted: the API key never appears (`redact()` masks the configured key and any `sk-…` token).

## Provider quirks

- **Anthropic** (`anthropic.ts`): headers `x-api-key`, `anthropic-version: 2023-06-01`, `anthropic-dangerous-direct-browser-access: true`
  (required for calls straight from the browser). Tools use `input_schema`; forced choice `{ type: 'any' | 'tool' }` with
  `disable_parallel_tool_use: true`. `stop_reason: 'refusal'` → treated as a non-retryable failure (fallback). Model ids: default
  `claude-haiku-4-5-20251001` (the dated snapshot; the alias `claude-haiku-4-5` is equivalent), optional `claude-sonnet-5`. Haiku 4.5 takes no
  `thinking`/`effort` parameters and none are sent. If the settings model looks like a GPT model while the provider is Anthropic, the brain
  substitutes the default Claude model (and vice versa) because the Settings panel shares one model field across providers.
- **OpenAI** (`openai.ts`): `Authorization: Bearer`, `tools: [{ type: 'function', function: { name, description, parameters } }]`,
  `tool_choice: 'required'` (or `{ type: 'function', function: { name } }`), `parallel_tool_calls: false`, `max_completion_tokens`.
  `function.arguments` is a JSON string — parsed, and a truncated one is salvaged when possible, otherwise the call is rejected → fallback.
  Models that reject `temperature` get one automatic retry without it. Default model `gpt-4o-mini`. `finish_reason: 'content_filter'` or a
  `refusal` message → fallback.
- Both adapters also accept a **plain-text reply**: the first `{…}` block that looks like `{ "tool"|"name": …, "args"|"arguments"|"input": … }` is used;
  for `speak` a bare text reply becomes the line itself (tone neutral).

## Coercion rules (`coerce.ts`)

Tool name: exact → case-insensitive → spaces/hyphens → underscores → strip `functions.` prefix; otherwise reject (fallback).
Args: unknown keys dropped; `default`s filled; `string` ← number/boolean; `number`/`integer` ← numeric strings, rounded for integer, clamped to
`minimum`/`maximum`; `boolean` ← "true"/"yes"/1; `array` ← JSON string or single value; `enum` matched case-insensitively (invalid enum value dropped).
Missing `required` → reject. Name resolution (soft — unknown names are passed through so the tool reports a readable failure):
villager-ish keys (`target, villager, to, who, with, from, about, for`, or a description mentioning "villager") → id via id / full name / first
name / last name, "player"/"newcomer"/the player's name → `'player'`; place-ish keys (`place, area, where, at, shop, building, destination`,
or a description mentioning "place"/"building") → id via id / name / "the X" / "home" / "work" / "X's house"; item-ish keys (`item, give, want,
gift, crop, seed`) → item id via id or display name; `recipe` → recipe id via id or name.

## Test results (last run)

`node scripts/llm_test.ts` — 26 offline tests, all passing: Anthropic and OpenAI tool-call parsing, request shapes (headers, `tool_choice`,
`thought` wrapper), text-reply salvage, unknown tool / missing argument / refusal / garbage arguments → fallback, 429 retry, 5xx and 4xx
cooldowns, 401 redaction, timeout, hourly budget reset, queue priority and in-flight cap, queue-full refusal, the three modes and the sync
getters, `speak`/`reflect` shaping, name resolvers, redaction.

Live smoke test (`set -a; source ~/.hermes/.env; set +a; node scripts/llm_test.ts`), context built from the REAL sim
(`createTestWorld` + `createLocalBrain` + `createSim`, 3 in-game hours simulated first):

```
context from the real sim: Cerys Wren at 9:00, 43 tools available, 1 nearby, talking to Ines Calloway
decision prompt ≈ 244 tokens + system ≈ 282 + 43 tool schemas
decide (378 ms): {"tool":"bake","args":{},"thought":"Flour, warmth, patience."}
converse (1 ms): {"speaker":"cerys","text":"Ooh, work never stops, does it. How is yours?","tone":"warm","end":false,"affinityDelta":0.5,"topic":"work"}
llmStats: {"requests":1,"ok":0,"failed":1,"fallbacks":2,"lastError":"decide:cerys: HTTP 400 invalid_request_error: Your credit balance is too low to access the Anthropic API. ..."}
```

The key authenticated but the account has no credits, so the API answered 400 on the first call; the brain fell back to the local brain for
the decision, entered the 30 s bad-request cooldown, and answered the conversation locally without another request. That is the designed
behaviour — the world never stalls — but it means the model's own output has NOT yet been observed end-to-end. Re-run the command above once
credits are added; the script stops after one decide and one converse (≤ 6 requests including retries).

## Open questions / follow-ups

- Prompt caching: the system prompt + tools are well under Haiku's minimum cacheable prefix, so no `cache_control` is sent; revisit if the tool list grows.
- Villager→villager conversations are 2–6 turns; with a 60/hour budget and ten LLM villagers that is most of the budget. The Director's per-villager brain toggle is the intended lever.
