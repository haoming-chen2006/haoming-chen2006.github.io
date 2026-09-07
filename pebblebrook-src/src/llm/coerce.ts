/**
 * Turning a model reply into something the sim can execute: validate the tool name, coerce arguments to the
 * schema, resolve names to ids, and shape conversation turns. Anything doubtful is rejected so the brain falls back.
 */
import { ITEMS, RECIPES } from '../core/items.ts';
import type { ConversationContext, ConversationTurn, DecisionContext, Emote, JsonSchema, Place, Villager } from '../core/types.ts';
import { EMOTES, TONES } from './prompt.ts';
import type { LlmResponse, LlmToolCall } from './types.ts';

export interface DecisionOk { ok: true; tool: string; args: Record<string, unknown>; thought: string; say?: string }
export interface CoerceFail { ok: false; reason: string }

export interface Resolvers { villagers: Villager[]; places: Place[]; self?: Villager; playerName?: string }

const VILLAGER_KEYS = new Set(['target', 'villager', 'to', 'who', 'with', 'from', 'about', 'for']);
const PLACE_KEYS = new Set(['place', 'area', 'where', 'at', 'shop', 'building', 'destination']);
const ITEM_KEYS = new Set(['item', 'give', 'want', 'gift', 'crop', 'seed']);

const norm = (s: string): string => s.toLowerCase().trim().replace(/[.!?,;:]+$/, '').replace(/^the\s+/, '').replace(/'s$/, '').trim();
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

export function matchToolName(raw: string, names: string[]): string | undefined {
  const s = raw.trim().replace(/^functions?\./, '');
  if (names.includes(s)) return s;
  const low = s.toLowerCase().replace(/[\s-]+/g, '_');
  return names.find((n) => n.toLowerCase() === low);
}

/** Every balanced `{…}` block in a text (string-aware), outermost first. */
function jsonObjectsIn(text: string): string[] {
  const out: string[] = [];
  let depth = 0, start = -1, inStr = false, esc = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') { inStr = true; continue; }
    if (c === '{') { if (depth === 0) start = i; depth++; }
    else if (c === '}') { depth--; if (depth === 0 && start >= 0) { out.push(text.slice(start, i + 1)); start = -1; } if (depth < 0) depth = 0; }
  }
  return out;
}

/** Salvage a tool call from a plain-text reply: `{"tool": "x", "args": {...}}` or a flat `{"name": "x", "target": ...}`. */
export function parseToolCallFromText(text: string, names: string[]): LlmToolCall | null {
  if (!text) return null;
  const cleaned = text.replace(/```[a-z]*\n?/gi, '');
  for (const candidate of jsonObjectsIn(cleaned)) {
    let j: unknown;
    try { j = JSON.parse(candidate); } catch { continue; }
    if (!isObj(j)) continue;
    const nameKey = ['tool', 'name', 'action', 'function', 'tool_name'].find((k) => typeof j[k] === 'string');
    if (!nameKey) continue;
    const name = matchToolName(j[nameKey] as string, names);
    if (!name) continue;
    const argsKey = ['args', 'arguments', 'input', 'params', 'parameters'].find((k) => isObj(j[k]));
    let args: Record<string, unknown>;
    if (argsKey) {
      args = { ...(j[argsKey] as Record<string, unknown>) };
      for (const k of ['thought', 'say']) if (typeof j[k] === 'string' && args[k] === undefined) args[k] = j[k];
    } else {
      args = { ...j }; delete args[nameKey];
    }
    return { name, args };
  }
  return null;
}

export function resolveVillagerId(raw: unknown, r: { villagers: Villager[]; playerName?: string }): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const s = norm(raw);
  if (!s) return undefined;
  if (s === 'player' || s === 'newcomer' || s === 'you' || (r.playerName && s === r.playerName.toLowerCase())) return 'player';
  for (const v of r.villagers) if (v.id.toLowerCase() === s) return v.id;
  for (const v of r.villagers) {
    const full = v.name.toLowerCase(), parts = full.split(/\s+/);
    if (full === s || parts[0] === s || parts[parts.length - 1] === s) return v.id;
  }
  for (const v of r.villagers) { const f = v.name.toLowerCase().split(/\s+/)[0]; if (s.startsWith(`${f} `) || s.startsWith(`${f},`)) return v.id; }
  return undefined;
}

export function resolvePlaceId(raw: unknown, places: Place[], self?: Villager, villagers: Villager[] = []): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const s = norm(raw);
  if (!s) return undefined;
  if (self && (s === 'home' || s === 'my home' || s === 'my house' || s === 'house')) return self.home;
  if (self && (s === 'work' || s === 'workplace' || s === 'my workplace')) return self.workplace;
  for (const p of places) if (p.id.toLowerCase() === s) return p.id;
  for (const p of places) if (norm(p.name) === s) return p.id;
  const owner = s.match(/^(.+?)(?:'s|’s)?\s+(home|house|place)$/) ?? s.match(/^(?:home|house) of (.+)$/);
  if (owner) {
    const vid = resolveVillagerId(owner[1], { villagers });
    if (vid) { const home = places.find((p) => p.id === `home_${vid}`); if (home) return home.id; }
  }
  let best: Place | undefined, bestLen = 0;
  for (const p of places) {
    const n = norm(p.name);
    if ((n.includes(s) || s.includes(n)) && n.length > bestLen) { best = p; bestLen = n.length; }
  }
  return best?.id;
}

export function resolveItemId(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const s = norm(raw);
  if (!s) return undefined;
  const key = s.replace(/\s+/g, '_');
  const byId = ITEMS.find((i) => i.id === key);
  if (byId) return byId.id;
  const byName = ITEMS.find((i) => i.name.toLowerCase() === s);
  if (byName) return byName.id;
  if (s.endsWith('s')) { const singular = s.slice(0, -1); const hit = ITEMS.find((i) => i.name.toLowerCase() === singular || i.id === singular.replace(/\s+/g, '_')); if (hit) return hit.id; }
  return undefined;
}

export function resolveRecipeId(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const s = norm(raw), key = s.replace(/\s+/g, '_');
  return (RECIPES.find((r) => r.id === key) ?? RECIPES.find((r) => r.name.toLowerCase() === s))?.id;
}

function castValue(v: unknown, ps: JsonSchema): unknown {
  const t = Array.isArray(ps.type) ? ps.type[0] : ps.type;
  switch (t) {
    case 'string': {
      let s: string;
      if (typeof v === 'string') s = v;
      else if (typeof v === 'number' || typeof v === 'boolean') s = String(v);
      else return undefined;
      if (Array.isArray(ps.enum)) {
        const en = ps.enum as unknown[];
        if (en.includes(s)) return s;
        const hit = en.find((e) => typeof e === 'string' && e.toLowerCase() === s.trim().toLowerCase());
        return hit;
      }
      return s;
    }
    case 'number': case 'integer': {
      let n: number;
      if (typeof v === 'number') n = v;
      else if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) n = Number(v);
      else return undefined;
      if (!Number.isFinite(n)) return undefined;
      if (t === 'integer') n = Math.round(n);
      if (typeof ps.minimum === 'number') n = Math.max(ps.minimum, n);
      if (typeof ps.maximum === 'number') n = Math.min(ps.maximum, n);
      return n;
    }
    case 'boolean': {
      if (typeof v === 'boolean') return v;
      if (typeof v === 'number') return v !== 0;
      if (typeof v === 'string') { const s = v.trim().toLowerCase(); if (['true', 'yes', '1'].includes(s)) return true; if (['false', 'no', '0', ''].includes(s)) return false; }
      return undefined;
    }
    case 'array': {
      let arr: unknown;
      if (Array.isArray(v)) arr = v;
      else if (typeof v === 'string') { try { arr = JSON.parse(v); } catch { arr = [v]; } if (!Array.isArray(arr)) arr = [v]; }
      else arr = [v];
      const items = isObj(ps.items) ? (ps.items as JsonSchema) : undefined;
      return items ? (arr as unknown[]).map((x) => (isObj(x) && items.type === 'object' ? coerceArgs(x, items, { villagers: [], places: [] }).args : castValue(x, items))).filter((x) => x !== undefined) : arr;
    }
    case 'object': {
      let o: unknown = v;
      if (typeof v === 'string') { try { o = JSON.parse(v); } catch { return undefined; } }
      if (!isObj(o)) return undefined;
      return isObj(ps.properties) ? coerceArgs(o, ps, { villagers: [], places: [] }).args : o;
    }
    default:
      return v;
  }
}

function resolveByKey(key: string, ps: JsonSchema, v: unknown, r: Resolvers): unknown {
  if (typeof v !== 'string') return v;
  const k = key.toLowerCase();
  const desc = String(ps.description ?? '').toLowerCase();
  if (VILLAGER_KEYS.has(k) || desc.includes('villager')) { const id = resolveVillagerId(v, r); if (id) return id; }
  if (PLACE_KEYS.has(k) || desc.includes('place') || desc.includes('building')) { const id = resolvePlaceId(v, r.places, r.self, r.villagers); if (id) return id; }
  if (ITEM_KEYS.has(k) || desc.includes('item')) { const id = resolveItemId(v); if (id) return id; }
  if (k === 'recipe' || desc.includes('recipe')) { const id = resolveRecipeId(v); if (id) return id; }
  return v;
}

/** Fill defaults, cast to the schema, drop unknown keys, resolve names → ids. Missing required keys are reported. */
export function coerceArgs(raw: Record<string, unknown>, schema: JsonSchema, r: Resolvers): { args: Record<string, unknown>; missing: string[] } {
  const props = isObj(schema.properties) ? (schema.properties as Record<string, JsonSchema>) : {};
  const required = Array.isArray(schema.required) ? (schema.required as string[]) : [];
  const args: Record<string, unknown> = {};
  const missing: string[] = [];
  for (const [key, ps] of Object.entries(props)) {
    const v = raw[key];
    if (v === undefined || v === null || v === '') {
      if (ps.default !== undefined) args[key] = ps.default;
      else if (required.includes(key)) missing.push(key);
      continue;
    }
    const cast = castValue(v, ps);
    if (cast === undefined) { if (required.includes(key)) missing.push(key); continue; }
    args[key] = resolveByKey(key, ps, cast, r);
  }
  return { args, missing };
}

export const resolversFor = (ctx: DecisionContext): Resolvers => ({ villagers: ctx.sim.villagers, places: ctx.world.places, self: ctx.villager, playerName: ctx.sim.player?.name });

/** From a provider reply to a validated decision, or a reason to fall back. */
export function decisionFromResponse(res: LlmResponse, ctx: DecisionContext): DecisionOk | CoerceFail {
  const names = ctx.options.map((o) => o.name);
  const call = res.toolCalls[0] ?? parseToolCallFromText(res.text, names);
  if (!call) return { ok: false, reason: res.text ? `no tool call in reply: "${res.text.slice(0, 80)}"` : 'empty reply' };
  const name = matchToolName(call.name, names);
  if (!name) return { ok: false, reason: `unknown tool "${call.name}"` };
  const tool = ctx.options.find((o) => o.name === name)!;
  const raw = call.args;
  const thoughtRaw = typeof raw.thought === 'string' ? raw.thought : res.text.split('\n')[0] ?? '';
  const thought = thoughtRaw.trim().slice(0, 200) || `(${name})`;
  const say = typeof raw.say === 'string' && raw.say.trim() ? raw.say.trim().slice(0, 200) : undefined;
  const { args, missing } = coerceArgs(raw, tool.params, resolversFor(ctx));
  if (missing.length) return { ok: false, reason: `${name}: missing ${missing.join(', ')}` };
  return { ok: true, tool: name, args, thought, say };
}

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

function cleanLine(s: string, me: string): string {
  let t = s.replace(/\s+/g, ' ').trim();
  t = t.replace(new RegExp(`^${me}\\s*:\\s*`, 'i'), '');
  if (t.length >= 2 && ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith('“') && t.endsWith('”')))) t = t.slice(1, -1).trim();
  return t.slice(0, 320);
}

/** A `speak` tool call (or a bare text reply) as a ConversationTurn; null when there is nothing usable. */
export function turnFromResponse(res: LlmResponse, ctx: ConversationContext): ConversationTurn | null {
  const me = ctx.speaker.name.split(' ')[0];
  const call = res.toolCalls.find((c) => c.name === 'speak') ?? res.toolCalls[0] ?? parseToolCallFromText(res.text, ['speak']);
  const a: Record<string, unknown> = call?.args ?? {};
  const rawText = typeof a.text === 'string' ? a.text : typeof a.line === 'string' ? a.line : res.text;
  const text = cleanLine(rawText ?? '', me);
  if (!text) return null;
  const turn: ConversationTurn = { speaker: ctx.speaker.id, text };
  if (typeof a.tone === 'string' && (TONES as string[]).includes(a.tone.toLowerCase())) turn.tone = a.tone.toLowerCase() as ConversationTurn['tone'];
  const end = castValue(a.end, { type: 'boolean' });
  if (typeof end === 'boolean') turn.end = end;
  const delta = castValue(a.affinityDelta, { type: 'integer' });
  if (typeof delta === 'number') turn.affinityDelta = clamp(delta, -5, 5);
  if (typeof a.emote === 'string' && (EMOTES as string[]).includes(a.emote.toLowerCase())) turn.emote = a.emote.toLowerCase() as Emote;
  if (isObj(a.remember) && typeof a.remember.text === 'string' && a.remember.text.trim()) {
    const imp = castValue(a.remember.importance, { type: 'integer' });
    const tags = Array.isArray(a.remember.tags) ? a.remember.tags.filter((t): t is string => typeof t === 'string').slice(0, 6) : [];
    turn.remember = { text: a.remember.text.trim().slice(0, 200), importance: clamp(typeof imp === 'number' ? imp : 3, 1, 10), tags };
  }
  if (typeof a.topic === 'string' && a.topic.trim()) turn.topic = a.topic.trim().slice(0, 40);
  return turn;
}

/** 1–3 reflection strings from a `reflect` tool call, or from a text reply's lines. */
export function reflectionsFromResponse(res: LlmResponse): string[] {
  const call = res.toolCalls.find((c) => c.name === 'reflect') ?? res.toolCalls[0] ?? parseToolCallFromText(res.text, ['reflect']);
  let lines: string[] = [];
  const arr = call?.args.reflections;
  if (Array.isArray(arr)) lines = arr.filter((x): x is string => typeof x === 'string');
  else if (typeof arr === 'string') lines = arr.split('\n');
  else if (res.text) lines = res.text.split('\n');
  return lines.map((s) => s.replace(/^\s*[-*•\d.)]+\s*/, '').trim()).filter(Boolean).map((s) => s.slice(0, 240)).slice(0, 3);
}
