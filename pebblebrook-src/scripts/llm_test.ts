/**
 * LLM brain tests. Run: `node scripts/llm_test.ts`
 *  (a) offline: a fake fetch answers with canned Anthropic / OpenAI replies (including malformed ones) and the
 *      parser, coercer, fallback and budget/queue behaviour are asserted;
 *  (b) live (only when ANTHROPIC_API_KEY is set): ONE decide and ONE converse against claude-haiku-4-5-20251001.
 */
import { timeFromMinute } from '../src/core/time.ts';
import type { Brain, ConversationContext, ConversationTurn, DecisionContext, Memory, Place, SimView, ToolDef, Villager, World } from '../src/core/types.ts';
import { VILLAGER_BY_ID } from '../src/core/villagers.ts';
import type { LlmSettings } from '../src/core/app.ts';
import {
  ANTHROPIC_URL, LlmQueue, OPENAI_URL, PRIORITY, createLlmBrain, decisionMessage, estimateTokens, llmStats, redact, resetLlmStats,
  resolveItemId, resolvePlaceId, resolveVillagerId, systemPrompt, type FetchFn,
} from '../src/llm/index.ts';

declare const process: { env: Record<string, string | undefined>; exit(code: number): never };

/* ----------------------------------------------------------------- harness */

let passed = 0, failed = 0;
const tests: { name: string; fn: () => Promise<void> | void }[] = [];
const test = (name: string, fn: () => Promise<void> | void): void => { tests.push({ name, fn }); };
function assert(cond: unknown, msg: string): asserts cond { if (!cond) throw new Error(msg); }
function eq<T>(a: T, b: T, msg: string): void { if (a !== b) throw new Error(`${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }

/* --------------------------------------------------------------- fake fetch */

type Reply = { status?: number; body?: unknown; headers?: Record<string, string> } | 'hang';
interface Call { url: string; headers: Record<string, string>; body: Record<string, unknown> }

function fakeFetch(script: Reply[] | ((n: number, call: Call) => Reply)): { fetch: FetchFn; calls: Call[] } {
  const calls: Call[] = [];
  const fetch: FetchFn = (url, init) => {
    const call: Call = { url, headers: (init.headers ?? {}) as Record<string, string>, body: JSON.parse(init.body as string) as Record<string, unknown> };
    calls.push(call);
    const r = typeof script === 'function' ? script(calls.length - 1, call) : script[Math.min(calls.length - 1, script.length - 1)];
    if (r === 'hang') return new Promise((_, reject) => { init.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))); });
    return Promise.resolve(new Response(JSON.stringify(r.body ?? {}), { status: r.status ?? 200, headers: { 'content-type': 'application/json', ...(r.headers ?? {}) } }));
  };
  return { fetch, calls };
}

const anthropicToolUse = (name: string, input: Record<string, unknown>, extra: Record<string, unknown> = {}): Reply => ({
  body: { id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-haiku-4-5-20251001', content: [{ type: 'text', text: 'Hm.' }, { type: 'tool_use', id: 'toolu_1', name, input }], stop_reason: 'tool_use', usage: { input_tokens: 900, output_tokens: 60 }, ...extra },
});
const anthropicText = (text: string): Reply => ({ body: { content: [{ type: 'text', text }], stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 5 } } });
const anthropicError = (status: number, type: string, message: string, headers?: Record<string, string>): Reply => ({ status, body: { type: 'error', error: { type, message } }, headers });
const openaiToolCall = (name: string, args: string): Reply => ({
  body: { id: 'chatcmpl_1', model: 'gpt-4o-mini', choices: [{ index: 0, message: { role: 'assistant', content: null, tool_calls: [{ id: 'call_1', type: 'function', function: { name, arguments: args } }] }, finish_reason: 'tool_calls' }], usage: { prompt_tokens: 800, completion_tokens: 40 } },
});

/* ----------------------------------------------------------------- fixture */

const PLACES: Place[] = [
  { id: 'farm', name: 'Farm', kind: 'farm', tiles: [], anchor: { x: 10, y: 10 }, facilities: ['plots'] },
  { id: 'bakery', name: 'Bakery', kind: 'shop', tiles: [], anchor: { x: 30, y: 20 }, door: { x: 30, y: 21 }, interior: { x: 30, y: 19 }, owner: 'cerys', open: [8, 18], facilities: ['oven', 'counter'] },
  { id: 'tavern', name: 'The Drowsy Owl', kind: 'public', tiles: [], anchor: { x: 40, y: 20 }, facilities: ['bar', 'kitchen'] },
  { id: 'home_ada', name: "Ada's House", kind: 'home', tiles: [], anchor: { x: 12, y: 8 }, owner: 'ada', facilities: ['bed'] },
  { id: 'home_bram', name: "Bram's House", kind: 'home', tiles: [], anchor: { x: 34, y: 24 }, owner: 'bram', facilities: ['bed'] },
  { id: 'square', name: 'Village Square', kind: 'public', tiles: [], anchor: { x: 48, y: 36 }, facilities: ['well', 'board'] },
];

function makeVillager(id: string, pos: { x: number; y: number }): Villager {
  const spec = VILLAGER_BY_ID[id];
  const skills = { farming: 0, fishing: 0, mining: 0, cooking: 0, crafting: 0, charm: 0, lore: 0, medicine: 0, ...spec.skills };
  return {
    id, name: spec.name, profession: spec.profession, home: spec.home, workplace: spec.workplace, pos, facing: 'down',
    needs: { energy: 70, hunger: 30, social: 40, fun: 60, comfort: 80, purpose: 55 }, mood: 0.3, money: spec.money,
    inventory: spec.inventory.map(([i, qty]) => ({ id: i, qty })), skills, health: 100, personality: spec.personality, relationships: {},
    memory: [], goals: [], plan: null, action: null, queue: [], status: ['tired'], look: spec.look, brain: 'llm', birthday: spec.birthday, stats: {},
  };
}

function mem(id: string, t: number, text: string, importance = 3, extra: Partial<Memory> = {}): Memory {
  return { id, t, kind: 'observation', text, importance, tags: [], ...extra };
}

const tool = (name: string, description: string, params: Record<string, unknown>, category: ToolDef['category'] = 'life'): ToolDef => ({
  name, description, params, category, available: () => true, execute: () => ({ ok: true, message: '' }),
});
const TOOLS: ToolDef[] = [
  tool('go_to', 'Walk to a place, a villager, or a tile.', { type: 'object', properties: { place: { type: 'string', description: 'place id or name' }, villager: { type: 'string', description: 'villager id or name' }, x: { type: 'number' }, y: { type: 'number' } } }, 'move'),
  tool('chat', 'Start a conversation with someone nearby.', { type: 'object', properties: { target: { type: 'string', description: 'villager id or name' }, topic: { type: 'string' } }, required: ['target'] }, 'social'),
  tool('eat', 'Eat something from your pockets.', { type: 'object', properties: { item: { type: 'string' } } }),
  tool('bake', 'Bake at an oven.', { type: 'object', properties: { recipe: { type: 'string', description: 'bread | sweet_roll | berry_pie' }, qty: { type: 'integer', minimum: 1, maximum: 5, default: 1 } }, required: ['recipe'] }, 'work'),
  tool('idle', 'Do nothing for a while.', { type: 'object', properties: { reason: { type: 'string' }, minutes: { type: 'number' } } }, 'meta'),
];

function fixture(minute = 600): { ctx: DecisionContext; cctx: ConversationContext; playerCtx: ConversationContext; ada: Villager; bram: Villager; villagers: Villager[]; world: World } {
  const ada = makeVillager('ada', { x: 10, y: 10 }), bram = makeVillager('bram', { x: 12, y: 11 }), cerys = makeVillager('cerys', { x: 60, y: 60 });
  const villagers = [ada, bram, cerys];
  ada.relationships.bram = { affinity: 40, trust: 50, romance: 0, familiarity: 60, label: 'friend', notes: ['helped mend the fence'], lastTalked: minute - 200 };
  ada.relationships.player = { affinity: 5, trust: 20, romance: 0, familiarity: 10, label: 'acquaintance', notes: [], lastTalked: 0 };
  ada.goals = [{ id: 'g1', text: 'plant the north plots before the rain', priority: 8, createdAt: 0 }, { id: 'g2', text: "sell turnips at Hal's", priority: 5, createdAt: 0 }];
  ada.plan = { day: 1, summary: 'a farm day', entries: [{ hour: 5.5, block: 'breakfast' }, { hour: 6.5, block: 'work', place: 'farm' }, { hour: 12, block: 'lunch' }, { hour: 13, block: 'work', place: 'farm' }, { hour: 17, block: 'free' }, { hour: 19, block: 'dinner' }, { hour: 21.5, block: 'sleep' }] };
  ada.memory = [
    mem('m1', minute - 1500, 'Ada watered the turnips.', 2),
    mem('m2', minute - 180, 'Ada had bread for breakfast.', 1),
    mem('m3', minute - 20, 'Bram said the storm will come early.', 5, { about: ['bram'], kind: 'conversation' }),
    mem('m4', minute - 5, 'Ada tilled a plot.', 2),
  ];
  const time = timeFromMinute(minute);
  const world = {
    seed: 1, width: 96, height: 72, places: PLACES, objects: [], time, weather: { kind: 'sunny', intensity: 0, forecast: 'rain', temperature: 14 },
    place: (id: string) => PLACES.find((p) => p.id === id), placeAt: (pos: { x: number; y: number }) => (Math.hypot(pos.x - 10, pos.y - 10) < 6 ? PLACES[0] : undefined),
    season: 'spring', speed: 1, paused: false, festivalToday: () => null,
  } as unknown as World;
  const sim = {
    world, villagers, player: { name: 'Robin', pos: { x: 11, y: 12 }, facing: 'down', money: 50, inventory: [], skills: {}, energy: 80, hotbar: 0 },
    requests: [{ id: 'r1', by: 'cerys', text: 'Need 3 wild berries for a pie', reward: { money: 30 }, needs: [{ id: 'berries', qty: 3 }], postedAt: 0, expiresAt: minute + 2000 }],
    events: [{ id: 'fair', name: 'Spring Bloom Fair', kind: 'festival', startedAt: minute - 60, endsAt: minute + 600, place: 'square', text: 'stalls open at noon', data: {} }],
    conversations: [], villager: (id: string) => villagers.find((v) => v.id === id), villagersNear: () => villagers,
  } as unknown as SimView;
  const ctx: DecisionContext = { villager: ada, sim, world, now: time, nearby: [bram], options: TOOLS, recent: ada.memory.slice(-10), relevant: [ada.memory[2]], reason: 'interrupted', trigger: 'chat failed: Bram is already talking to someone' };
  const cctx: ConversationContext = { speaker: ada, listener: bram, listenerName: 'Bram', history: [{ speaker: 'ada', text: 'Morning, Bram. Sky looks wrong.' }, { speaker: 'bram', text: "Storm's coming early. Mark me." }], relationship: ada.relationships.bram, relevant: [ada.memory[2]], topic: 'the weather', sim, world };
  const playerCtx: ConversationContext = { speaker: ada, listener: 'player', listenerName: 'Robin', history: [{ speaker: 'player', text: 'Do you like the rain?' }], relationship: ada.relationships.player, relevant: [], topic: 'chat', playerLine: 'Do you like the rain?', playerIntent: 'chat', sim, world };
  return { ctx, cctx, playerCtx, ada, bram, villagers, world };
}

function makeFallback(): { brain: Brain; calls: Record<string, number> } {
  const calls = { decide: 0, converse: 0, reflect: 0, chat: 0 };
  const brain = {
    kind: 'local',
    decide: async () => { calls.decide++; return { tool: 'idle', args: { reason: 'local' }, thought: 'local thought' }; },
    converse: async (ctx: ConversationContext) => { calls.converse++; return { speaker: ctx.speaker.id, text: 'local line' } as ConversationTurn; },
    reflect: async () => { calls.reflect++; return ['local reflection']; },
    decideSync: () => ({ tool: 'idle', args: {}, thought: 'sync thought' }),
    converseSync: (ctx: ConversationContext) => ({ speaker: ctx.speaker.id, text: 'sync line' }),
    reflectSync: () => ['sync reflection'],
  } as unknown as Brain;
  return { brain, calls };
}

const KEY = 'sk-ant-test-1234567890abcdef';
const settingsOf = (over: Partial<LlmSettings> = {}): (() => LlmSettings) => {
  const s: LlmSettings = { provider: 'anthropic', apiKey: KEY, model: 'claude-haiku-4-5-20251001', mode: 'all', budgetPerHour: 60, ...over };
  return () => s;
};

function makeBrain(over: Partial<LlmSettings>, fetch: FetchFn, queueOpts: Partial<ConstructorParameters<typeof LlmQueue>[0]> = {}) {
  resetLlmStats();
  const settings = settingsOf(over);
  const fb = makeFallback();
  const queue = new LlmQueue({ budget: () => settings().budgetPerHour, timeoutMs: 200, sleep: async () => {}, ...queueOpts });
  const brain = createLlmBrain(settings, fb.brain, { fetch, queue });
  return { brain, fb: fb.calls };
}

/* ------------------------------------------------------------------- tests */

test('anthropic tool_use → decision: names resolved, numbers cast, unknown keys dropped', async () => {
  const { fetch, calls } = fakeFetch([anthropicToolUse('chat', { thought: 'Bram looks glum.', target: 'Bram Oakhollow', topic: 'the storm', bogus: 1, say: 'Bram!' })]);
  const { brain, fb } = makeBrain({}, fetch);
  const d = await brain.decide(fixture().ctx);
  eq(d.tool, 'chat', 'tool'); eq(d.args.target, 'bram', 'target resolved to id'); eq(d.args.topic, 'the storm', 'topic kept');
  assert(!('bogus' in d.args) && !('thought' in d.args) && !('say' in d.args), 'wrapper + unknown keys dropped');
  eq(d.thought, 'Bram looks glum.', 'thought'); eq(d.say, 'Bram!', 'say');
  eq(fb.decide, 0, 'no fallback'); eq(calls.length, 1, 'one request'); eq(llmStats.ok, 1, 'ok'); eq(llmStats.tokensIn, 900, 'tokens in');
});

test('anthropic go_to: place name → id, numeric string → number', async () => {
  const { fetch } = fakeFetch([anthropicToolUse('go_to', { thought: 'Bread.', place: 'the Bakery', x: '12', y: 'twelve' })]);
  const { brain } = makeBrain({}, fetch);
  const d = await brain.decide(fixture().ctx);
  eq(d.tool, 'go_to', 'tool'); eq(d.args.place, 'bakery', 'place'); eq(d.args.x, 12, 'x cast'); assert(!('y' in d.args), 'bad number dropped');
});

test('anthropic request shape: headers, tool_choice any, thought wrapper, needs as words', async () => {
  const { fetch, calls } = fakeFetch([anthropicToolUse('idle', { thought: 'x' })]);
  const { brain } = makeBrain({}, fetch);
  await brain.decide(fixture().ctx);
  const c = calls[0];
  eq(c.url, ANTHROPIC_URL, 'url');
  eq(c.headers['x-api-key'], KEY, 'key header'); eq(c.headers['anthropic-version'], '2023-06-01', 'version'); eq(c.headers['anthropic-dangerous-direct-browser-access'], 'true', 'browser header');
  const tc = c.body.tool_choice as { type: string; disable_parallel_tool_use: boolean };
  eq(tc.type, 'any', 'tool_choice'); eq(tc.disable_parallel_tool_use, true, 'single call');
  const tools = c.body.tools as { name: string; input_schema: { required: string[]; properties: Record<string, unknown> } }[];
  eq(tools.length, TOOLS.length, 'all options sent'); eq(tools[1].input_schema.required[0], 'thought', 'thought first + required'); assert(tools[1].input_schema.required.includes('target'), 'original required kept'); assert('say' in tools[1].input_schema.properties, 'say param');
  assert((c.body.system as string).startsWith('You are Ada Thornfield, the farmer'), 'system prompt');
  const msg = (c.body.messages as { content: string }[])[0].content;
  assert(msg.includes('hungry') && msg.includes('a little lonely'), 'needs as words'); assert(!/hunger:\s*30/.test(msg), 'no raw need numbers');
  assert(msg.includes('Nearby: Bram (friend — "helped mend the fence")'), 'nearby with relationship'); assert(msg.includes('Robin the newcomer'), 'player nearby');
  assert(msg.includes('Interrupted: chat failed'), 'trigger'); assert(msg.includes('Happening: Spring Bloom Fair'), 'event'); assert(msg.includes('Notice board:'), 'requests');
  assert(msg.indexOf('yesterday') < msg.indexOf('20m ago') && msg.indexOf('20m ago') < msg.indexOf('5m ago'), 'memories oldest first');
});

test('prompt size stays compact', () => {
  const { ctx, ada } = fixture();
  const m = decisionMessage(ctx), s = systemPrompt(ada);
  assert(estimateTokens(m) < 1200, `decision message ~${estimateTokens(m)} tokens`); assert(estimateTokens(s) < 400, `system prompt ~${estimateTokens(s)} tokens`);
});

test('anthropic text-only reply with JSON is salvaged', async () => {
  const { fetch } = fakeFetch([anthropicText('I think I should eat.\n```json\n{"tool": "eat", "args": {"item": "Bread"}, "thought": "Hungry."}\n```')]);
  const { brain, fb } = makeBrain({}, fetch);
  const d = await brain.decide(fixture().ctx);
  eq(d.tool, 'eat', 'tool'); eq(d.args.item, 'bread', 'item name → id'); eq(d.thought, 'Hungry.', 'thought'); eq(fb.decide, 0, 'no fallback');
});

test('unknown tool → local fallback, recorded', async () => {
  const { fetch } = fakeFetch([anthropicToolUse('dance', { thought: 'x' })]);
  const { brain, fb } = makeBrain({}, fetch);
  const d = await brain.decide(fixture().ctx);
  eq(d.thought, 'local thought', 'fallback decision'); eq(fb.decide, 1, 'fallback called'); eq(llmStats.fallbacks, 1, 'fallbacks'); assert(llmStats.lastError?.includes('unknown tool "dance"'), `lastError: ${llmStats.lastError}`);
});

test('missing required argument → fallback', async () => {
  const { fetch } = fakeFetch([anthropicToolUse('bake', { thought: 'x', qty: 2 })]);
  const { brain, fb } = makeBrain({}, fetch);
  await brain.decide(fixture().ctx);
  eq(fb.decide, 1, 'fallback'); assert(llmStats.lastError?.includes('bake: missing recipe'), `lastError: ${llmStats.lastError}`);
});

test('openai tool_calls → decision; request shape', async () => {
  const { fetch, calls } = fakeFetch([openaiToolCall('bake', JSON.stringify({ thought: 'Flour is low.', recipe: 'Sweet Roll', qty: '3' }))]);
  const { brain } = makeBrain({ provider: 'openai', model: 'gpt-4o-mini' }, fetch);
  const d = await brain.decide(fixture().ctx);
  eq(d.tool, 'bake', 'tool'); eq(d.args.recipe, 'sweet_roll', 'recipe name → id'); eq(d.args.qty, 3, 'qty cast'); eq(d.thought, 'Flour is low.', 'thought');
  const c = calls[0];
  eq(c.url, OPENAI_URL, 'url'); eq(c.headers.authorization, `Bearer ${KEY}`, 'auth header');
  const tools = c.body.tools as { type: string; function: { name: string; parameters: { required: string[] } } }[];
  eq(tools[0].type, 'function', 'function tool'); eq(tools[3].function.parameters.required[0], 'thought', 'thought wrapper');
  eq(c.body.tool_choice, 'required', 'forced'); eq(c.body.parallel_tool_calls, false, 'single'); eq((c.body.messages as { role: string }[])[0].role, 'system', 'system message'); assert(typeof c.body.max_completion_tokens === 'number', 'max_completion_tokens');
  eq(llmStats.tokensIn, 800, 'usage');
});

test('openai: cross-provider model name is swapped for the default', async () => {
  const { fetch, calls } = fakeFetch([openaiToolCall('idle', '{"thought":"x"}')]);
  const { brain } = makeBrain({ provider: 'openai', model: 'claude-haiku-4-5-20251001' }, fetch);
  await brain.decide(fixture().ctx);
  eq(calls[0].body.model, 'gpt-4o-mini', 'model');
});

test('openai: truncated arguments are salvaged; garbage falls back', async () => {
  const a = fakeFetch([openaiToolCall('bake', '{"thought":"Flour is low.","recipe":"bread","qty')]);
  const b1 = makeBrain({ provider: 'openai' }, a.fetch);
  const d = await b1.brain.decide(fixture().ctx);
  eq(d.tool, 'bake', 'salvaged'); eq(d.args.recipe, 'bread', 'recipe'); eq(d.args.qty, 1, 'default filled');
  const b = fakeFetch([openaiToolCall('bake', 'not json at all')]);
  const b2 = makeBrain({ provider: 'openai' }, b.fetch);
  await b2.brain.decide(fixture().ctx);
  eq(b2.fb.decide, 1, 'fallback'); assert(llmStats.lastError?.includes('unparseable arguments'), `lastError: ${llmStats.lastError}`);
});

test('429 then 200 → retried once and succeeds', async () => {
  const { fetch, calls } = fakeFetch([anthropicError(429, 'rate_limit_error', 'slow down', { 'retry-after': '0' }), anthropicToolUse('speak', { text: 'Storm is coming.', tone: 'neutral', end: false, affinityDelta: 0 })]);
  const { brain, fb } = makeBrain({}, fetch);
  const t = await brain.converse(fixture().cctx);
  eq(t.text, 'Storm is coming.', 'line'); eq(calls.length, 2, 'two requests'); eq(llmStats.retries, 1, 'retries'); eq(llmStats.ok, 1, 'ok'); eq(llmStats.failed, 0, 'failed'); eq(fb.converse, 0, 'no fallback');
});

test('500 twice → fallback, cooldown blocks the next call without a request', async () => {
  const { fetch, calls } = fakeFetch([anthropicError(500, 'api_error', 'boom')]);
  const { brain, fb } = makeBrain({}, fetch);
  await brain.decide(fixture().ctx);
  eq(calls.length, 2, 'decision retried once'); eq(fb.decide, 1, 'fallback'); eq(llmStats.failed, 1, 'failed'); assert(llmStats.cooldownUntil > Date.now(), 'cooldown set');
  await brain.decide(fixture().ctx);
  eq(calls.length, 2, 'no request during cooldown'); eq(llmStats.fallbacks, 2, 'fallbacks');
});

test('400 (billing / bad model) → fallback, 30 s cooldown so the config error is not hammered', async () => {
  const { fetch, calls } = fakeFetch([anthropicError(400, 'invalid_request_error', 'Your credit balance is too low to access the Anthropic API.')]);
  const { brain, fb } = makeBrain({}, fetch);
  await brain.decide(fixture().ctx); await brain.decide(fixture().ctx);
  eq(calls.length, 1, 'not retried, not repeated'); eq(fb.decide, 2, 'both fell back'); assert(llmStats.cooldownUntil >= Date.now() + 25_000 && llmStats.cooldownUntil <= Date.now() + 30_000, 'cooldown ~30 s');
  assert(llmStats.lastError?.includes('credit balance'), 'message kept');
});

test('401 → fallback, key redacted from lastError, long cooldown', async () => {
  const { fetch } = fakeFetch([anthropicError(401, 'authentication_error', `invalid x-api-key ${KEY}`)]);
  const { brain, fb } = makeBrain({}, fetch);
  await brain.decide(fixture().ctx);
  eq(fb.decide, 1, 'fallback'); assert(llmStats.lastError && !llmStats.lastError.includes(KEY), 'key redacted'); assert(llmStats.lastError?.includes('[key]'), 'mask present');
  assert(llmStats.cooldownUntil >= Date.now() + 50_000, 'auth cooldown');
});

test('timeout → fallback', async () => {
  const { fetch } = fakeFetch(['hang']);
  const { brain, fb } = makeBrain({}, fetch, { timeoutMs: 30 });
  await brain.decide(fixture().ctx);
  eq(fb.decide, 1, 'fallback'); eq(llmStats.timeouts, 1, 'timeouts'); eq(llmStats.failed, 1, 'failed');
});

test('refusal → fallback', async () => {
  const { fetch } = fakeFetch([anthropicToolUse('idle', { thought: 'x' }, { stop_reason: 'refusal' })]);
  const { brain, fb } = makeBrain({}, fetch);
  await brain.decide(fixture().ctx);
  eq(fb.decide, 1, 'fallback'); assert(llmStats.lastError?.includes('refused'), 'recorded');
});

test('forced tool_choice rejected → re-sent with auto', async () => {
  const { fetch, calls } = fakeFetch([anthropicError(400, 'invalid_request_error', 'tool_choice: type "any" is not supported for this model.'), anthropicToolUse('idle', { thought: 'Rest.', reason: 'a breather' })]);
  const { brain } = makeBrain({}, fetch);
  const d = await brain.decide(fixture().ctx);
  eq(d.tool, 'idle', 'tool'); eq(calls.length, 2, 'two requests'); eq((calls[1].body.tool_choice as { type: string }).type, 'auto', 'auto on retry');
});

test('hourly budget: over the cap falls back; a new in-game hour resets it', async () => {
  const { fetch, calls } = fakeFetch([anthropicToolUse('idle', { thought: 'x' })]);
  const { brain, fb } = makeBrain({ budgetPerHour: 2 }, fetch);
  const f = fixture(600);
  await brain.decide(f.ctx); await brain.decide(f.ctx); await brain.decide(f.ctx);
  eq(calls.length, 2, 'two requests'); eq(fb.decide, 1, 'third fell back'); eq(llmStats.usedThisHour, 2, 'used'); eq(llmStats.budgetPerHour, 2, 'cap');
  await brain.decide(fixture(660).ctx);
  eq(calls.length, 3, 'new hour → request'); eq(llmStats.usedThisHour, 1, 'reset');
});

test('queue: ≤ 3 in flight, waiting jobs run by priority', async () => {
  resetLlmStats();
  const q = new LlmQueue({ budget: () => 100, maxInFlight: 3, timeoutMs: 5000 });
  const started: string[] = [];
  const release: Record<string, () => void> = {};
  const job = (name: string, priority: 0 | 1 | 2 | 3) => q.submit({ priority, kind: name, retries: 0 }, 0, () => new Promise<string>((res) => { started.push(name); release[name] = () => res(name); }));
  const p = [job('a', PRIORITY.decision), job('b', PRIORITY.decision), job('c', PRIORITY.decision), job('d', PRIORITY.decision), job('e', PRIORITY.player)];
  await Promise.resolve();
  eq(started.join(''), 'abc', 'three in flight'); eq(llmStats.inFlight, 3, 'inFlight'); eq(llmStats.waiting, 2, 'waiting');
  release.a(); await p[0]; await new Promise((r) => setTimeout(r, 0));
  eq(started.join(''), 'abce', 'player conversation jumped the decision');
  release.b(); release.c(); release.e(); await Promise.all([p[1], p[2], p[4]]);
  eq(started.join(''), 'abced', 'then the decision'); release.d(); await p[3];
  eq(llmStats.inFlight, 0, 'drained'); eq(llmStats.ok, 5, 'all ok');
});

test('queue: too many waiting decisions are refused at once', async () => {
  resetLlmStats();
  const q = new LlmQueue({ budget: () => 100, maxInFlight: 1, maxWaiting: 2, timeoutMs: 5000 });
  const gates: (() => void)[] = [];
  const job = (priority: 0 | 1 | 2 | 3) => q.submit({ priority, kind: 'j', retries: 0 }, 0, () => new Promise<void>((res) => gates.push(res)));
  const ok = [job(2), job(2), job(2)];
  let refused = false; await job(2).catch((e: Error) => { refused = e.message === 'queue full'; });
  assert(refused, 'fourth decision refused');
  let convOk = true; const conv = job(0).catch(() => { convOk = false; });
  await Promise.resolve(); assert(convOk, 'conversations still queue');
  for (let i = 0; i < 6; i++) { await Promise.resolve(); gates.splice(0).forEach((g) => g()); await new Promise((r) => setTimeout(r, 0)); }
  await Promise.all([...ok, conv]);
});

test('modes: social keeps decisions local (sync), off keeps everything local', async () => {
  const { fetch, calls } = fakeFetch([anthropicToolUse('speak', { text: 'Hello.', tone: 'warm', end: false, affinityDelta: 1 })]);
  const social = makeBrain({ mode: 'social' }, fetch);
  const f = fixture();
  assert(typeof social.brain.decideSync === 'function', 'decideSync exposed'); eq(social.brain.decideSync!(f.ctx).thought, 'sync thought', 'delegates to local');
  assert(social.brain.converseSync === undefined, 'converse is async (model)');
  await social.brain.decide(f.ctx); eq(calls.length, 0, 'no request for decisions'); eq(social.fb.decide, 1, 'local decide');
  const t = await social.brain.converse(f.cctx); eq(t.text, 'Hello.', 'model line'); eq(calls.length, 1, 'one request'); eq(llmStats.fallbacks, 0, 'not a fallback');
  const off = makeBrain({ mode: 'off' }, fetch);
  assert(typeof off.brain.converseSync === 'function' && typeof off.brain.reflectSync === 'function', 'sync methods exposed when off');
  await off.brain.converse(f.cctx); await off.brain.reflect(f.ctx); eq(calls.length, 1, 'no requests when off'); eq(llmStats.fallbacks, 0, 'off is not a fallback');
  const none = makeBrain({ provider: 'none' }, fetch); eq(none.brain.active('social'), false, 'provider none');
  const all = makeBrain({}, fetch); assert(all.brain.decideSync === undefined && all.brain.active('decide'), 'all: async decisions');
  const nokey = makeBrain({ apiKey: '  ' }, fetch); eq(nokey.brain.active('social'), false, 'blank key');
});

test('converse: speak tool → turn (tone/end/affinity clamp/remember/emote)', async () => {
  const { fetch, calls } = fakeFetch([anthropicToolUse('speak', { text: '"Storm\'s coming, Ada."', tone: 'Warm', end: 'false', affinityDelta: 9, emote: 'happy', remember: { text: 'Ada worried about the storm', importance: 12, tags: ['weather', 3] }, topic: 'weather' })]);
  const { brain } = makeBrain({}, fetch);
  const f = fixture();
  const t = await brain.converse(f.cctx);
  eq(t.speaker, 'ada', 'speaker'); eq(t.text, "Storm's coming, Ada.", 'quotes stripped'); eq(t.tone, 'warm', 'tone normalised'); eq(t.end, false, 'end'); eq(t.affinityDelta, 5, 'clamped'); eq(t.emote, 'happy', 'emote'); eq(t.topic, 'weather', 'topic');
  eq(t.remember?.importance, 10, 'importance clamped'); eq(t.remember?.tags.join(','), 'weather', 'tags filtered');
  const c = calls[0];
  eq((c.body.tool_choice as { type: string; name: string }).name, 'speak', 'forced speak');
  const msg = (c.body.messages as { content: string }[])[0].content;
  assert(msg.includes('You are talking with Bram (friend — "helped mend the fence")'), 'relationship line'); assert(msg.includes("Bram: Storm's coming early."), 'history'); assert(msg.includes('Topic: the weather'), 'topic');
});

test('converse: bare text reply becomes the line', async () => {
  const { fetch } = fakeFetch([anthropicText('Ada: Aye, the sky has that look.')]);
  const { brain } = makeBrain({}, fetch);
  const t = await brain.converse(fixture().cctx);
  eq(t.text, 'Aye, the sky has that look.', 'name prefix stripped');
});

test('chat: player line goes into the prompt; on failure the local converse answers (never null)', async () => {
  const a = fakeFetch([anthropicToolUse('speak', { text: 'Rain is fine by me.', tone: 'neutral', end: false, affinityDelta: 1 })]);
  const b1 = makeBrain({}, a.fetch);
  const f = fixture();
  const t = await b1.brain.chat!(f.playerCtx);
  eq(t?.text, 'Rain is fine by me.', 'line');
  const msg = (a.calls[0].body.messages as { content: string }[])[0].content;
  assert(msg.includes('Robin just said: "Do you like the rain?"'), 'player line'); assert(msg.includes('Never mention being an AI'), 'guard'); assert(msg.includes('the newcomer who took the old farm'), 'player identity');
  eq((a.calls[0].body.tool_choice as { name: string }).name, 'speak', 'speak tool');
  const b = fakeFetch([anthropicError(503, 'overloaded_error', 'busy')]);
  const b2 = makeBrain({}, b.fetch);
  const t2 = await b2.brain.chat!(f.playerCtx);
  eq(t2?.text, 'local line', 'local converse'); eq(b2.fb.converse, 1, 'fallback converse'); eq(b.calls.length, 3, 'conversation retried twice');
});

test('reflect: tool → up to 3 strings; text reply → lines', async () => {
  const a = fakeFetch([anthropicToolUse('reflect', { reflections: ['I planted before the rain.', 'Bram was kind today.', 'Tomorrow the north plots.', 'A fourth one.'] })]);
  const b1 = makeBrain({}, a.fetch);
  const lines = await b1.brain.reflect(fixture().ctx);
  eq(lines.length, 3, 'capped at 3'); eq(lines[0], 'I planted before the rain.', 'first');
  const msg = (a.calls[0].body.messages as { content: string }[])[0].content;
  assert(msg.includes('Today:') && msg.includes('Ada tilled a plot.'), 'day memories'); eq((a.calls[0].body.tool_choice as { name: string }).name, 'reflect', 'reflect tool');
  const b = fakeFetch([anthropicText('- One good day.\n- Must thank Bram.')]);
  const b2 = makeBrain({}, b.fetch);
  const l2 = await b2.brain.reflect(fixture().ctx);
  eq(l2.join('|'), 'One good day.|Must thank Bram.', 'text lines');
  const c = fakeFetch([anthropicText('')]);
  const b3 = makeBrain({}, c.fetch);
  const l3 = await b3.brain.reflect(fixture().ctx);
  eq(l3[0], 'local reflection', 'empty → fallback'); eq(b3.fb.reflect, 1, 'fallback');
});

test('resolvers: villagers, places, items; redaction', () => {
  const { ada, villagers } = fixture();
  eq(resolveVillagerId('the newcomer', { villagers, playerName: 'Robin' }), 'player', 'newcomer'); eq(resolveVillagerId('robin', { villagers, playerName: 'Robin' }), 'player', 'player name');
  eq(resolveVillagerId('Oakhollow', { villagers }), 'bram', 'last name'); eq(resolveVillagerId('Cerys the baker', { villagers }), 'cerys', 'prefix'); eq(resolveVillagerId('Nobody', { villagers }), undefined, 'unknown');
  eq(resolvePlaceId("Bram's house", PLACES, ada, villagers), 'home_bram', "X's house"); eq(resolvePlaceId('home', PLACES, ada), 'home_ada', 'home'); eq(resolvePlaceId('drowsy owl', PLACES), 'tavern', 'partial name'); eq(resolvePlaceId('the square', PLACES), 'square', 'partial');
  eq(resolveItemId('Sweet Rolls'), 'sweet_roll', 'plural name'); eq(resolveItemId('iron bar'), 'iron_bar', 'spaces'); eq(resolveItemId('dragon'), undefined, 'unknown item');
  eq(redact(`key ${KEY} leaked`, KEY), 'key [key] leaked', 'configured key'); eq(redact('Bearer abcdefghijklmnopqrstuvwxyz', ''), 'Bearer [key]', 'bearer');
});

/* -------------------------------------------------------------------- live */

async function live(): Promise<void> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { console.log('\n(live smoke test skipped: ANTHROPIC_API_KEY not set)'); return; }
  console.log('\n== live smoke test: claude-haiku-4-5-20251001, one decide + one converse (≤ 6 requests) ==');
  resetLlmStats();
  let ctx: DecisionContext, cctx: ConversationContext, fallback: Brain;
  try {
    const simMod = await import('../src/sim/index.ts');
    const agentsMod = await import('../src/agents/index.ts');
    const local = agentsMod.createLocalBrain(7);
    const world = simMod.createTestWorld(7);
    const sim = simMod.createSim(world, 7, { local, llm: null });
    for (let i = 0; i < 12; i++) sim.update(15);
    const v = sim.villagers.find((x) => x.id === 'cerys') ?? sim.villagers[0];
    const options = sim.tools.filter((t) => { if (t.professions && !t.professions.includes(v.profession)) return false; try { return t.available(v, sim); } catch { return false; } });
    const nearby = sim.villagersNear(v.pos, 8).filter((o) => o.id !== v.id);
    ctx = { villager: v, sim, world, now: world.time, nearby, options, recent: v.memory.slice(-10), relevant: [], reason: 'idle' };
    const listener = nearby[0] ?? sim.villagers.find((o) => o.id !== v.id)!;
    cctx = { speaker: v, listener, listenerName: listener.name.split(' ')[0], history: [], relationship: v.relationships[listener.id] ?? null, relevant: v.memory.slice(-4), topic: 'the weather', sim, world };
    fallback = local;
    console.log(`context from the real sim: ${v.name} at ${world.time.hour}:${String(world.time.min).padStart(2, '0')}, ${options.length} tools available, ${nearby.length} nearby, talking to ${listener.name}`);
  } catch (e) {
    console.log(`real sim unavailable (${(e as Error).message.slice(0, 100)}); using the hand-built context (5 tools)`);
    const f = fixture(600); ctx = f.ctx; cctx = f.cctx; fallback = makeFallback().brain;
  }
  const brain = createLlmBrain(() => ({ provider: 'anthropic', apiKey: key, model: 'claude-haiku-4-5-20251001', mode: 'all', budgetPerHour: 6 }), fallback);
  console.log(`decision prompt ≈ ${estimateTokens(decisionMessage(ctx))} tokens + system ≈ ${estimateTokens(systemPrompt(ctx.villager))} + ${ctx.options.length} tool schemas`);
  let t0 = Date.now();
  const d = await brain.decide(ctx);
  console.log(`decide (${Date.now() - t0} ms): ${JSON.stringify(d)}`);
  t0 = Date.now();
  const turn = await brain.converse(cctx);
  console.log(`converse (${Date.now() - t0} ms): ${JSON.stringify(turn)}`);
  const { requests, ok, failed: failedRequests, fallbacks, tokensIn, tokensOut, lastError, lastModel } = llmStats;
  console.log(`llmStats: ${JSON.stringify({ requests, ok, failed: failedRequests, fallbacks, tokensIn, tokensOut, lastError, lastModel })}`);
  if (fallbacks > 0) { console.log('LIVE: the model did not answer at least one call'); failed++; }
}

/* --------------------------------------------------------------------- run */

for (const t of tests) {
  try { await t.fn(); passed++; console.log(`ok   ${t.name}`); } catch (e) { failed++; console.log(`FAIL ${t.name}\n     ${(e as Error).stack?.split('\n').slice(0, 3).join('\n     ')}\n     lastError: ${llmStats.lastError}`); }
}
console.log(`\n${passed} passed, ${failed} failed`);
await live();
process.exit(failed ? 1 : 0);
