/**
 * The memory stream: remember, retrieve (recency × importance × relevance), nightly reflection templates,
 * importance-weighted forgetting, and gossip copies.
 */
import type { Memory, MemoryKind, Rng, Villager, VillagerId } from '../core/types.ts';

export const MEMORY_CAP = 180;
export const MEMORY_TRIM_TO = 130;

let memorySeq = 0;
export const nextMemoryId = (): string => `m${(memorySeq++).toString(36)}`;
export const setMemorySeq = (n: number): void => { memorySeq = n; };
export const getMemorySeq = (): number => memorySeq;

const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'at', 'with', 'for', 'is', 'was', 'it', 'i', 'me', 'my', 'he', 'she', 'they', 'we', 'that', 'this', 'about', 'from', 'by', 'as', 'be', 'so', 'but', 'not', 'up', 'out', 'into', 'than', 'then', 'their', 'his', 'her', 'them', 'had', 'has', 'have', 'did', 'do', 'said', 'told']);

export function words(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
}

export interface Query { text?: string; tags?: string[]; about?: VillagerId[]; place?: string }

/** Score a memory against a query. Recency decays with a 24h half-life, importance is linear, relevance is overlap. */
export function scoreMemory(m: Memory, q: Query, now: number, qWords: string[]): number {
  const ageH = Math.max(0, now - m.t) / 60;
  const recency = Math.pow(0.5, ageH / 24);
  const importance = m.importance / 10;
  let rel = 0;
  if (q.tags?.length) { const set = new Set(m.tags); for (const t of q.tags) if (set.has(t)) rel += 1; }
  if (q.about?.length && m.about?.length) { for (const a of q.about) if (m.about.includes(a)) rel += 1.5; }
  if (q.place && m.place === q.place) rel += 0.5;
  if (qWords.length) {
    const mw = new Set(words(m.text));
    let hit = 0;
    for (const w of qWords) if (mw.has(w)) hit++;
    rel += hit / Math.sqrt(qWords.length);
  }
  const relevance = rel === 0 ? 0 : Math.min(2.5, rel);
  return recency * 1.0 + importance * 1.2 + relevance * 1.3 + (m.kind === 'reflection' ? 0.3 : 0);
}

export function retrieve(v: Villager, q: Query, n: number, now: number): Memory[] {
  const qw = q.text ? words(q.text) : [];
  const scored = v.memory.map((m) => ({ m, s: scoreMemory(m, q, now, qw) }));
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, n).map((x) => x.m);
}

export function recent(v: Villager, n: number): Memory[] {
  return v.memory.slice(-n);
}

/** Trim the stream by dropping the least valuable memories (importance × recency; reflections protected). */
export function forget(v: Villager, now: number): number {
  if (v.memory.length <= MEMORY_CAP) return 0;
  const value = (m: Memory): number => {
    const ageD = Math.max(0, now - m.t) / 1440;
    return m.importance * Math.pow(0.7, ageD) + (m.kind === 'reflection' ? 4 : 0) + (m.importance >= 8 ? 3 : 0);
  };
  const ranked = v.memory.map((m, i) => ({ m, i, val: value(m) })).sort((a, b) => a.val - b.val);
  const dropCount = v.memory.length - MEMORY_TRIM_TO;
  const drop = new Set(ranked.slice(0, dropCount).map((x) => x.i));
  v.memory = v.memory.filter((_, i) => !drop.has(i));
  return dropCount;
}

/** Copy a memory to a listener as second-hand. */
const PRONOUN: Record<string, [string, string]> = { Ada: ['she', 'her'], Bram: ['he', 'his'], Cerys: ['she', 'her'], Dov: ['he', 'his'], Elin: ['she', 'her'], Finn: ['he', 'his'], Greta: ['she', 'her'], Hal: ['he', 'his'], Ines: ['she', 'her'], Jory: ['he', 'his'] };
/** "Elin went to the Owl" told by Elin becomes "she went to the Owl". */
export function pronounise(text: string, name: string): string {
  const pr = PRONOUN[name];
  if (!pr) return text;
  return text.replace(new RegExp(`^${name}'s\\b`), pr[1]).replace(new RegExp(`^${name} `), pr[0] + ' ').replace(new RegExp(`\\b${name}'s\\b`, 'g'), pr[1]).replace(new RegExp(`\\b${name}\\b`, 'g'), pr[0] === 'she' ? 'her' : 'him');
}
export function gossipCopy(m: Memory, source: VillagerId, sourceName: string, now: number): Omit<Memory, 'id' | 't'> {
  const body = lowerFirst(pronounise(m.text, sourceName)).replace(/\.+$/, '');
  const text = m.secondhand && m.source ? `${sourceName} passed on that ${body}` : `${sourceName} told me that ${body}`;
  return { kind: 'gossip', text, importance: Math.max(1, m.importance - 1), tags: [...new Set([...m.tags, 'gossip', 'heard'])], about: m.about, place: m.place, secondhand: true, source, ...(now ? {} : {}) };
}

const PROPER = ['Ada', 'Bram', 'Cerys', 'Dov', 'Elin', 'Finn', 'Greta', 'Hal', 'Ines', 'Jory', 'Pebblebrook', 'The ', 'Newcomer', 'It '];
export const lowerFirst = (s: string): string => (!s || /^I\b/.test(s) || PROPER.some((n) => s.startsWith(n)) ? s : s[0].toLowerCase() + s.slice(1));

/** Whether v already knows this memory (by text) — avoids gossip echoes. */
export function knows(v: Villager, text: string): boolean {
  const key = text.toLowerCase().replace(/^.*?told me that /, '').replace(/^.*?passed on that /, '');
  return v.memory.some((m) => m.text.toLowerCase().replace(/^.*?told me that /, '').replace(/^.*?passed on that /, '') === key);
}

/** A memory the speaker could gossip about: notable, about someone else, not about the listener, not too old. */
export function gossipable(v: Villager, listener: VillagerId, now: number, rng: Rng): Memory | null {
  const ok = v.memory.filter((m) =>
    m.importance >= 3 && m.about && m.about.length > 0 && !m.about.includes(listener) && m.about.some((a) => a !== v.id) && now - m.t < 5 * 1440 && m.kind !== 'plan' && m.kind !== 'reflection');
  if (!ok.length) return null;
  // prefer juicy: high importance, recent, tagged gossip-worthy
  ok.sort((a, b) => juicy(b, now) - juicy(a, now));
  const top = ok.slice(0, 4);
  return rng.pick(top);
}

const JUICY = new Set(['argued', 'romance', 'gift', 'secret', 'drunk', 'accident', 'promise', 'kiss', 'proposal', 'money', 'debt', 'sick', 'flirt']);
function juicy(m: Memory, now: number): number {
  let s = m.importance + Math.pow(0.5, (now - m.t) / 1440) * 3;
  for (const t of m.tags) if (JUICY.has(t)) s += 2;
  if (m.secondhand) s -= 1;
  return s;
}

export const memoryKinds: MemoryKind[] = ['observation', 'reflection', 'plan', 'conversation', 'event', 'gossip'];
