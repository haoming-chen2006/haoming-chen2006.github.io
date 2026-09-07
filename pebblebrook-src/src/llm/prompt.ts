/**
 * Prompt builders: a stable system prompt per villager and compact per-call messages. Numbers become words
 * (needs, mood, time-ago) so the model reads a situation, not a state dump.
 */
import { item as itemDef } from '../core/items.ts';
import { fmtClock, fmtDate, timeFromMinute } from '../core/time.ts';
import type { ConversationContext, ConversationTurn, DecisionContext, Emote, Memory, Needs, Profession, Relationship, Villager } from '../core/types.ts';
import { VILLAGER_BY_ID } from '../core/villagers.ts';
import type { LlmToolSchema } from './types.ts';

export const TONES: NonNullable<ConversationTurn['tone']>[] = ['warm', 'neutral', 'cold', 'flirty', 'angry', 'sad', 'joking'];
export const EMOTES: Emote[] = ['happy', 'sad', 'angry', 'love', 'question', 'idea', 'sleepy', 'music', 'sweat', 'exclaim', 'sick'];

export const firstName = (v: { name: string }): string => v.name.split(' ')[0];
const cut = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const list = (xs: string[]): string => xs.join(', ');

const PROFESSION_PHRASE: Record<Profession, string> = {
  farmer: 'the farmer', blacksmith: 'the blacksmith', baker: 'the baker', fisher: 'the fisher', doctor: 'the village doctor',
  innkeeper: 'the innkeeper of The Drowsy Owl', miner: 'the miner', shopkeeper: 'the keeper of the General Store', librarian: 'the librarian',
  carpenter: 'the carpenter', none: 'a villager',
};

/** Stable per-villager system prompt (identical across calls, which keeps it cache-friendly). */
export function systemPrompt(v: Villager): string {
  const p = v.personality;
  const blurb = VILLAGER_BY_ID[v.id]?.blurb ?? '';
  return [
    `You are ${v.name}, ${PROFESSION_PHRASE[v.profession] ?? 'a villager'} of Pebblebrook, a small river village of ten neighbours who farm, fish, forge, bake, trade and gossip.${blurb ? ` ${blurb}` : ''}`,
    `How you speak: ${p.voice}`,
    `Traits: ${list(p.traits)}. Likes: ${list(p.likes)}. Dislikes: ${list(p.dislikes)}.`,
    `Your dream: ${p.dream}`,
    'The world: days run 24 hours and most shops open about 8:00–18:00; you sleep at home at night. Money is coins — a loaf costs about 12, a good tool 60–90. Four seasons of 28 days (spring, summer, autumn, winter); crops, fish and forage follow the season, and the weather changes plans. Festivals fall on the calendar.',
    'You act by choosing exactly ONE tool per turn; the world carries it out and asks you again when it ends or something interrupts you. Every tool also takes `thought` (one line of inner voice, required) and an optional `say` (a short line spoken aloud). Be specific, stay in character, and only refer to people, places and items that exist here.',
  ].join('\n');
}

export function needsToWords(n: Needs): string[] {
  const w: string[] = [];
  if (n.energy < 20) w.push('exhausted'); else if (n.energy < 40) w.push('tired');
  if (n.hunger < 20) w.push('starving'); else if (n.hunger < 40) w.push('hungry');
  if (n.social < 25) w.push('lonely'); else if (n.social < 45) w.push('a little lonely');
  if (n.fun < 25) w.push('bored stiff'); else if (n.fun < 45) w.push('bored');
  if (n.comfort < 30) w.push('uncomfortable (cold or wet)');
  if (n.purpose < 30) w.push('restless'); else if (n.purpose < 50) w.push('unfulfilled');
  return w.length ? w : ['content'];
}

export function moodWord(m: number): string {
  return m > 0.5 ? 'cheerful' : m > 0.15 ? 'good' : m > -0.15 ? 'even' : m > -0.5 ? 'low' : 'miserable';
}

export function timeAgo(nowMinute: number, t: number): string {
  const d = Math.max(0, nowMinute - t);
  if (d < 2) return 'just now';
  if (d < 60) return `${Math.round(d)}m ago`;
  if (d < 24 * 60) return `${Math.round(d / 60)}h ago`;
  const days = Math.floor(d / (24 * 60));
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

/** Relevant first, then the newest recent ones; de-duplicated by id and text; capped; returned oldest first. */
export function pickMemories(relevant: Memory[], recent: Memory[], n = 8): Memory[] {
  const seenId = new Set<string>(), seenText = new Set<string>();
  const out: Memory[] = [];
  const add = (m: Memory): void => {
    if (out.length >= n || seenId.has(m.id) || seenText.has(m.text)) return;
    seenId.add(m.id); seenText.add(m.text); out.push(m);
  };
  for (const m of relevant) add(m);
  for (let i = recent.length - 1; i >= 0; i--) add(recent[i]);
  return out.sort((a, b) => a.t - b.t);
}

function relationshipPhrase(rel: Relationship | null | undefined): string {
  if (!rel) return 'stranger';
  const note = rel.notes.length ? rel.notes[rel.notes.length - 1] : '';
  let label: string = rel.label;
  if (rel.affinity <= -25 && rel.label !== 'rival') label += ', sour lately';
  return note ? `${label} — "${cut(note, 70)}"` : label;
}

function fmtHour(h: number): string {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return `${hh}:${String(mm).padStart(2, '0')}`;
}

/** "the Bakery" / "The Drowsy Owl" / "Ada's House" — no doubled article, no article before a possessive. */
const theName = (name: string): string => (/^the\s/i.test(name) || /['’]s\b/.test(name) ? name : `the ${name}`);

function whereIs(ctx: DecisionContext): string {
  const v = ctx.villager;
  if (v.inside) { const p = ctx.world.place(v.inside); if (p) return `inside ${theName(p.name)}`; }
  const here = ctx.world.placeAt({ x: Math.round(v.pos.x), y: Math.round(v.pos.y) });
  if (here) return `at ${theName(here.name)}`;
  return `outdoors near (${Math.round(v.pos.x)}, ${Math.round(v.pos.y)})`;
}

function inventoryLine(v: Villager): string {
  if (!v.inventory.length) return 'nothing';
  const rows = [...v.inventory].sort((a, b) => b.qty * itemDef(b.id).price - a.qty * itemDef(a.id).price).slice(0, 8);
  return rows.map((s) => `${itemDef(s.id).name}${s.qty > 1 ? ` ×${s.qty}` : ''}`).join(', ');
}

function planLine(ctx: DecisionContext): string {
  const plan = ctx.villager.plan;
  if (!plan || !plan.entries.length) return 'Plan today: none in particular.';
  const hourNow = ctx.now.hour + ctx.now.min / 60;
  const entries = plan.entries.map((e) => `${fmtHour(e.hour)} ${e.block}${e.place ? ` @ ${ctx.world.place(e.place)?.name ?? e.place}` : ''}`);
  let current = plan.entries[0];
  for (const e of plan.entries) if (e.hour <= hourNow) current = e;
  return `Plan today: ${entries.join(' · ')} — now: ${current.block}.`;
}

function triggerLabel(reason: DecisionContext['reason']): string {
  switch (reason) {
    case 'interrupted': return 'Interrupted';
    case 'event': return 'News';
    case 'approached': return 'Someone approached';
    case 'newhour': return 'A new hour';
    default: return 'Just now';
  }
}

/** The per-decision user message. Aim: well under ~1,200 tokens. */
export function decisionMessage(ctx: DecisionContext): string {
  const v = ctx.villager, w = ctx.world, t = ctx.now;
  const lines: string[] = [];
  lines.push(`Time: ${fmtDate(t)}, ${fmtClock(t)} (${t.isDaylight ? 'daylight' : 'dark'}). Weather: ${w.weather.kind}, ${Math.round(w.weather.temperature)}°C; forecast ${w.weather.forecast}.`);
  lines.push(`Place: ${whereIs(ctx)}.`);
  lines.push(`Feeling: ${needsToWords(v.needs).join(', ')}; mood ${moodWord(v.mood)}.${v.status.length ? ` Status: ${v.status.join(', ')}.` : ''}`);
  lines.push(`Money: ${Math.round(v.money)} coins. Carrying: ${inventoryLine(v)}.`);
  lines.push(planLine(ctx));
  const goals = v.goals.filter((g) => !g.done).sort((a, b) => b.priority - a.priority).slice(0, 3);
  if (goals.length) lines.push(`Goals: ${goals.map((g) => `${cut(g.text, 80)} (p${g.priority})`).join('; ')}.`);
  const near = ctx.nearby.filter((o) => o.id !== v.id).slice(0, 6).map((o) => `${firstName(o)} (${relationshipPhrase(v.relationships[o.id])})`);
  const pl = ctx.sim.player;
  if (pl && Math.hypot(pl.pos.x - v.pos.x, pl.pos.y - v.pos.y) <= 8 && (pl.inside ?? undefined) === (v.inside ?? undefined)) near.push(`${pl.name} the newcomer (${relationshipPhrase(v.relationships.player)})`);
  lines.push(near.length ? `Nearby: ${near.join(', ')}.` : 'Nearby: nobody.');
  const mems = pickMemories(ctx.relevant, ctx.recent, 8);
  if (mems.length) {
    lines.push('Memories:');
    for (const m of mems) lines.push(`- ${timeAgo(t.minute, m.t)}: ${cut(m.text, 140)}${m.secondhand ? ' (heard second-hand)' : ''}`);
  }
  for (const ev of ctx.sim.events.slice(0, 2)) lines.push(`Happening: ${ev.name}${ev.place ? ` at ${theName(w.place(ev.place)?.name ?? ev.place)}` : ''} — ${cut(ev.text, 120)}`);
  const open = ctx.sim.requests.filter((r) => !r.done && !r.expired && !r.acceptedBy && r.by !== v.id).slice(0, 2);
  for (const r of open) lines.push(`Notice board: "${cut(r.text, 90)}" posted by ${r.by === 'player' ? 'the newcomer' : firstName(ctx.sim.villager(r.by) ?? { name: r.by })}${r.reward.money ? `, reward ${r.reward.money} coins` : ''}.`);
  if (ctx.reason !== 'idle' && ctx.trigger) lines.push(`${triggerLabel(ctx.reason)}: ${cut(ctx.trigger, 160)}`);
  lines.push(`Choose ONE tool for what ${firstName(v)} does next.`);
  return lines.join('\n');
}

// explained once in the system prompt; per-tool descriptions would cost ~15 tokens × every tool on every decision
const THOUGHT_PARAM = { type: 'string' };
const SAY_PARAM = { type: 'string' };

/** `ctx.options` as provider-neutral tool schemas, each wrapped with `thought` (required, first) and `say`. */
export function decisionTools(ctx: DecisionContext): LlmToolSchema[] {
  return ctx.options.map((t) => {
    const params = t.params as { properties?: Record<string, unknown>; required?: string[] };
    const properties = { thought: THOUGHT_PARAM, ...(params.properties ?? {}), say: SAY_PARAM };
    const required = ['thought', ...(params.required ?? []).filter((r) => r !== 'thought' && r !== 'say')];
    return { name: t.name, description: t.description, params: { ...t.params, type: 'object', properties, required } };
  });
}

export const SPEAK_TOOL: LlmToolSchema = {
  name: 'speak',
  description: 'Say your next line in the conversation.',
  params: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'what you say, one or two sentences' },
      tone: { type: 'string', enum: TONES },
      end: { type: 'boolean', description: 'true if you want to stop talking after this line' },
      affinityDelta: { type: 'integer', minimum: -5, maximum: 5, description: 'how this exchange changes how you feel about them' },
      emote: { type: 'string', enum: EMOTES },
      remember: {
        type: 'object', description: 'only if something worth remembering was said',
        properties: { text: { type: 'string' }, importance: { type: 'integer', minimum: 1, maximum: 10 }, tags: { type: 'array', items: { type: 'string' } } },
        required: ['text', 'importance'],
      },
      topic: { type: 'string', description: 'what this line is about, one or two words' },
    },
    required: ['text', 'tone', 'end', 'affinityDelta'],
  },
};

const INTENT_HINT: Record<string, string> = {
  greet: 'they just greeted you',
  day: 'they asked how your day is going',
  gossip: 'they want the latest gossip',
  help: 'they asked whether you need help with anything',
  joke: 'they are after a laugh',
  compliment: 'they paid you a compliment',
  about: 'they asked what you think of someone',
  chat: 'free conversation',
  goodbye: 'they are saying goodbye — wrap up as warmly or coolly as fits, and end the conversation',
};

function speakerName(ctx: ConversationContext, id: string): string {
  if (id === 'player') return ctx.sim.player?.name ?? 'the newcomer';
  if (id === ctx.speaker.id) return firstName(ctx.speaker);
  if (ctx.listener !== 'player' && id === ctx.listener.id) return firstName(ctx.listener);
  const v = ctx.sim.villager(id);
  return v ? firstName(v) : id;
}

/** The per-turn conversation message; `chat` is the player's free text. */
export function conversationMessage(ctx: ConversationContext, mode: 'converse' | 'chat'): string {
  const me = firstName(ctx.speaker);
  const lines: string[] = [];
  const rel = relationshipPhrase(ctx.relationship);
  if (ctx.listener === 'player') lines.push(`You are talking with ${ctx.listenerName}, the newcomer who took the old farm by the river (${rel}).`);
  else lines.push(`You are talking with ${ctx.listenerName} (${rel}).`);
  if (ctx.listener === 'player' && ctx.playerIntent && INTENT_HINT[ctx.playerIntent]) lines.push(`Why: ${INTENT_HINT[ctx.playerIntent]}.`);
  else if (ctx.topic) lines.push(`Topic: ${ctx.topic}.`);
  const mems = ctx.relevant.slice(0, 5).sort((a, b) => a.t - b.t);
  if (mems.length) {
    lines.push('What you remember:');
    const now = ctx.world.time.minute;
    for (const m of mems) lines.push(`- ${timeAgo(now, m.t)}: ${cut(m.text, 120)}`);
  }
  const history = ctx.history.slice(-6);
  if (history.length) {
    lines.push('So far:');
    for (const h of history) lines.push(`${speakerName(ctx, h.speaker)}: ${cut(h.text, 200)}`);
  } else lines.push('You are opening the conversation.');
  if (mode === 'chat' && ctx.playerLine) {
    lines.push(`${ctx.listenerName} just said: "${cut(ctx.playerLine, 300)}"`);
    lines.push(`Answer as ${me} would. You may deflect, tease, refuse or change the subject if it is not something ${me} would answer. Never mention being an AI, a model or a game — ${me} only knows Pebblebrook.`);
  }
  lines.push(`Reply as ${me} in one or two sentences, in character, reacting to what was just said. Use the speak tool. Set end=true only if ${me} would wrap up now.`);
  return lines.join('\n');
}

export const REFLECT_TOOL: LlmToolSchema = {
  name: 'reflect',
  description: 'Write down what today meant.',
  params: {
    type: 'object',
    properties: { reflections: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3, description: 'one to three sentences, first person' } },
    required: ['reflections'],
  },
};

/** Nightly reflection message from the day's memories (`ctx.recent`, capped to the 20 most important). */
export function reflectionMessage(ctx: DecisionContext): string {
  const me = firstName(ctx.villager);
  const today = [...ctx.recent].sort((a, b) => b.importance - a.importance).slice(0, 20).sort((a, b) => a.t - b.t);
  const lines = [`It is night. ${me} thinks back over ${fmtDate(ctx.now)}.`];
  if (today.length) { lines.push('Today:'); for (const m of today) lines.push(`- ${fmtClock(timeFromMinute(Math.max(0, m.t)))}: ${cut(m.text, 140)}`); }
  else lines.push('Today was quiet; nothing in particular happened.');
  lines.push(`Write 1–3 reflections in ${me}'s own words — what today meant, what changed with someone, what to do tomorrow. One sentence each, first person. Use the reflect tool.`);
  return lines.join('\n');
}
