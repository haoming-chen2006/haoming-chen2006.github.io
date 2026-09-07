/**
 * Small helpers the event hooks share. Everything here talks to the sim through the public SimView/Sim
 * contract; the few sim-internal conveniences (isAsleep, shops, bus) are duck-typed and optional.
 */
import { bus as globalBus, type Bus } from '../core/bus.ts';
import { ITEM_BY_ID, item } from '../core/items.ts';
import { VILLAGER_BY_ID } from '../core/villagers.ts';
import type { ActiveEvent, ItemId, ItemStack, PlaceId, PlotState, StatusFlag, Vec, Villager, VillagerId, WeatherKind, World, WorldTime } from '../core/types.ts';
import type { Sim } from '../core/app.ts';
import type { Announcement, EventCtx } from './types.ts';

/* ------------------------------------------------------------ duck-typed sim/world extras */

interface SimExtras {
  bus?: Bus;
  isAsleep?(v: Villager): boolean;
  shops?: Map<PlaceId, StallShop>;
  short?(id: VillagerId | 'player'): string;
}

/** The sim's ShopState shape (src/sim/core.ts); mirrored here so the merchant can park a stall. */
export interface StallShop {
  place: PlaceId;
  owner?: VillagerId;
  stock: ItemStack[];
  demand: Record<ItemId, number>;
  base: ItemStack[];
  markup: number;
  overrides: Record<ItemId, number>;
  sold: number;
  bought: number;
  open: boolean;
  closedDay?: number;
}

interface WorldVerbs {
  forceWeather?(kind: WeatherKind, intensity?: number, hours?: number): void;
  grid?: { idx(x: number, y: number): number; walk: Uint8Array; cost: Uint8Array; inBounds(x: number, y: number): boolean };
}

export const busOf = (sim: Sim): Bus => (sim as unknown as SimExtras).bus ?? globalBus;

export const first = (v: Villager): string => v.name.split(' ')[0];

export function nameOf(sim: Sim, id: VillagerId | 'player'): string {
  if (id === 'player') return sim.player.name;
  const s = (sim as unknown as SimExtras).short;
  if (s) return s.call(sim, id);
  return VILLAGER_BY_ID[id]?.short ?? sim.villager(id)?.name.split(' ')[0] ?? id;
}

export function isAsleep(sim: Sim, v: Villager): boolean {
  const f = (sim as unknown as SimExtras).isAsleep;
  if (f) return f.call(sim, v);
  return v.action?.tool === 'sleep';
}

export const inConversation = (v: Villager): boolean => v.action?.phase === 'conversation' || v.action?.tool === 'chat';

export const hourFloat = (t: WorldTime): number => t.hour + t.min / 60;

/** the schedule block a villager is in at hour h ('work', 'free', 'social', 'sleep', 'festival'…) */
export function blockOf(v: Villager, h: number): string {
  const entries = v.plan?.entries ?? [];
  let cur = '';
  for (const e of entries) if (e.hour <= h) cur = e.block;
  if (!cur) return h < 7 || h >= 22 ? 'sleep' : 'free';
  return cur;
}

export const isWorking = (v: Villager, t: WorldTime): boolean => blockOf(v, hourFloat(t)) === 'work';

/** absolute world minute of `hour` on `dayIndex` */
export const minuteAt = (dayIndex: number, hour: number): number => (dayIndex - 1) * 1440 + Math.round(hour * 60);

/* ------------------------------------------------------------ memories, goals, chronicle */

export function remember(sim: Sim, v: Villager, text: string, importance: number, tags: string[], about?: VillagerId[], place?: PlaceId): void {
  sim.remember(v, { kind: 'event', text, importance: Math.max(1, Math.min(10, Math.round(importance))), tags: [...new Set(['event', ...tags])], about, place });
}

/** Apply announcements: who knows what. Returns how many memories were written. */
export function announce(ctx: EventCtx, ev: ActiveEvent, list: Announcement[]): number {
  let n = 0;
  const def = String(ev.data.def ?? ev.id);
  for (const a of list) {
    const targets = audienceFor(ctx, ev, a);
    for (const v of targets) {
      const text = typeof a.text === 'function' ? a.text(v) : a.text;
      if (!text) continue;
      const mood = a.mood?.(v);
      const tags = [def, ...(a.tags ?? [])];
      if (mood) tags.push(mood);
      if (ev.place) tags.push(ev.place);
      remember(ctx.sim, v, text, a.importance, tags, a.about, a.place ?? ev.place);
      n++;
    }
  }
  return n;
}

function audienceFor(ctx: EventCtx, ev: ActiveEvent, a: Announcement): Villager[] {
  const sim = ctx.sim;
  if (Array.isArray(a.to)) return a.to.map((id) => sim.villager(id)).filter((v): v is Villager => !!v);
  if (a.to === 'everyone') return sim.villagers;
  if (a.to === 'awake') return sim.villagers.filter((v) => !isAsleep(sim, v));
  const place = a.place ?? ev.place;
  const p = place ? sim.world.place(place) : undefined;
  if (!p) return sim.villagers.filter((v) => !isAsleep(sim, v));
  return villagersAround(sim, p.anchor, a.radius ?? 10, place);
}

/** villagers standing within `radius` of pos, plus those inside `place` */
export function villagersAround(sim: Sim, pos: Vec, radius: number, place?: PlaceId): Villager[] {
  const out: Villager[] = [];
  for (const v of sim.villagers) {
    if (v.inside) { if (place && v.inside === place) out.push(v); continue; }
    if (Math.hypot(v.pos.x - pos.x, v.pos.y - pos.y) <= radius) out.push(v);
  }
  return out;
}

export function villagersAt(sim: Sim, place: PlaceId, radius = 4): Villager[] {
  const p = sim.world.place(place);
  if (!p) return [];
  return villagersAround(sim, p.anchor, radius, place);
}

export function nearestTo(sim: Sim, pos: Vec, filter?: (v: Villager) => boolean): Villager | undefined {
  let best: Villager | undefined, bd = Infinity;
  for (const v of sim.villagers) {
    if (filter && !filter(v)) continue;
    const d = Math.hypot(v.pos.x - pos.x, v.pos.y - pos.y);
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}

export function addGoal(v: Villager, text: string, priority: number, now: number): void {
  if (v.goals.some((g) => !g.done && g.text === text)) return;
  v.goals.push({ id: `ev${now}_${v.goals.length}`, text, priority: Math.max(1, Math.min(10, priority)), createdAt: now });
}

export function completeGoals(v: Villager, prefix: string): void {
  for (const g of v.goals) if (!g.done && g.text.startsWith(prefix)) g.done = true;
}

export function chronicle(sim: Sim, text: string, importance: number, about?: VillagerId[], place?: PlaceId): void {
  sim.log(text, importance, about, place);
}

export function toast(sim: Sim, text: string, kind: 'info' | 'warn' | 'good' = 'info'): void {
  busOf(sim).emit({ type: 'toast', text, kind });
}

/**
 * Get a group to come: a goal, a high-importance memory, and an interrupt for those free to react.
 * `force` interrupts even villagers in a work block (festivals are village-wide).
 */
export function gather(ctx: EventCtx, ev: ActiveEvent, who: Villager[], reason: string, goalText: string, priority = 8, force = false): Villager[] {
  const sim = ctx.sim;
  const came: Villager[] = [];
  for (const v of who) {
    if (isAsleep(sim, v)) continue;
    addGoal(v, goalText, priority, ctx.now);
    if (inConversation(v)) continue;
    if (!force && isWorking(v, ctx.time)) continue;
    sim.interrupt(v, reason);
    came.push(v);
  }
  return came;
}

/* ------------------------------------------------------------ state changes */

export function setStatus(v: Villager, flag: StatusFlag, on: boolean): void {
  const has = v.status.includes(flag);
  if (on && !has) v.status.push(flag);
  if (!on && has) v.status.splice(v.status.indexOf(flag), 1);
}

/** Lower health so the sim's status logic marks them sick (health < 45 = sick; > 72 clears). */
export function makeSick(v: Villager, severity = 1): void {
  v.health = Math.min(v.health, 44 - Math.round(6 * severity));
  setStatus(v, 'sick', true);
  v.needs.comfort = Math.max(0, v.needs.comfort - 15);
}

export function recover(v: Villager, to = 78): void {
  if (v.health < to) v.health = to;
  setStatus(v, 'sick', false);
}

export function adjustNeeds(v: Villager, d: Partial<Villager['needs']>): void {
  for (const k of Object.keys(d) as (keyof Villager['needs'])[]) {
    const x = d[k];
    if (typeof x === 'number') v.needs[k] = Math.max(0, Math.min(100, v.needs[k] + x));
  }
}

export function nudgeMood(v: Villager, delta: number): void {
  v.mood = Math.max(-1, Math.min(1, v.mood + delta));
}

export function forceWeather(world: World, kind: WeatherKind, intensity?: number, hours?: number): boolean {
  const w = world as unknown as WorldVerbs;
  if (!w.forceWeather) return false;
  w.forceWeather(kind, intensity, hours);
  return true;
}

/** Block or restore walkability on a set of tiles; returns the saved values (for restore). */
export function blockTiles(world: World, tiles: Vec[]): number[] | null {
  const g = (world as unknown as WorldVerbs).grid;
  if (!g) return null;
  const saved: number[] = [];
  for (const t of tiles) {
    if (!g.inBounds(t.x, t.y)) { saved.push(0, 0); continue; }
    const i = g.idx(t.x, t.y);
    saved.push(g.walk[i], g.cost[i]);
    g.walk[i] = 0; g.cost[i] = 0;
  }
  return saved;
}

export function restoreTiles(world: World, tiles: Vec[], saved: number[]): void {
  const g = (world as unknown as WorldVerbs).grid;
  if (!g) return;
  tiles.forEach((t, k) => { if (g.inBounds(t.x, t.y)) { const i = g.idx(t.x, t.y); g.walk[i] = saved[k * 2] ?? 1; g.cost[i] = saved[k * 2 + 1] ?? 2; } });
}

export const shopsOf = (sim: Sim): Map<PlaceId, StallShop> | undefined => (sim as unknown as SimExtras).shops;

export function stockOfShop(sim: Sim, place: PlaceId, id: ItemId): number {
  const shop = shopsOf(sim)?.get(place);
  if (!shop) return 0;
  let n = 0;
  for (const s of shop.stock) if (s.id === id) n += s.qty;
  return n;
}

export function removeFromShop(sim: Sim, place: PlaceId, id: ItemId): number {
  const shop = shopsOf(sim)?.get(place);
  if (!shop) return 0;
  let n = 0;
  shop.stock = shop.stock.filter((s) => { if (s.id === id) { n += s.qty; return false; } return true; });
  return n;
}

export function addToShop(sim: Sim, place: PlaceId, id: ItemId, qty: number): boolean {
  const shop = shopsOf(sim)?.get(place);
  if (!shop) return false;
  const cur = shop.stock.find((s) => s.id === id);
  if (cur) cur.qty += qty; else shop.stock.push({ id, qty });
  return true;
}

/** -1..1 how much a villager would like an item, from tags against likes/dislikes. */
export function appeal(v: Villager, id: ItemId): number {
  const def = item(id);
  let s = 0;
  for (const t of def.tags) { if (v.personality.likes.includes(t)) s += 0.5; if (v.personality.dislikes.includes(t)) s -= 0.6; }
  if (def.kind === 'gift') s += 0.2;
  return Math.max(-1, Math.min(1, s));
}

/** Something in `from`'s inventory that `to` would like and `from` can spare (not a tool). */
export function giftable(from: Villager, to: Villager): ItemId | null {
  let best: ItemId | null = null, bs = 0.15;
  for (const s of from.inventory) {
    const d = ITEM_BY_ID[s.id];
    if (!d || d.kind === 'tool' || d.kind === 'seed' || s.qty < 1) continue;
    const a = appeal(to, s.id) + (d.kind === 'gift' ? 0.2 : 0) - (d.price < 6 ? 0.2 : 0);
    if (a > bs) { bs = a; best = s.id; }
  }
  return best;
}

/** Hand an item over with memories on both sides and a relationship bump. */
export function giveGift(ctx: EventCtx, from: Villager, to: Villager, id: ItemId, occasion: string): boolean {
  const sim = ctx.sim;
  if (!sim.take(from, { id, qty: 1 })) return false;
  sim.give(to, { id, qty: 1 });
  const nm = item(id).name.toLowerCase();
  const ap = appeal(to, id);
  remember(sim, from, `${first(from)} gave ${first(to)} ${nm} ${occasion}`, 4, ['gift', 'social', 'pleasant'], [to.id]);
  remember(sim, to, `${first(from)} gave ${first(to)} ${nm} ${occasion}${ap > 0.5 ? ' — a favourite' : ''}`, ap > 0.5 ? 6 : 4, ['gift', 'received', 'social', 'pleasant'], [from.id]);
  sim.adjustRelationship(to, from.id, { affinity: 3 + ap * 6, trust: 1, familiarity: 1, romance: ap > 0.4 ? 1.5 : 0 }, `${nm} ${occasion}`);
  sim.adjustRelationship(from, to.id, { affinity: 1, familiarity: 1 });
  return true;
}

/* ------------------------------------------------------------ world queries */

export function plantedFarmPlots(world: World): { id: string; plot: PlotState & { grown?: number } }[] {
  const out: { id: string; plot: PlotState & { grown?: number } }[] = [];
  for (const o of world.objectsAt('farm', 'plot')) {
    const p = world.plot(o.id) as (PlotState & { grown?: number; withered?: boolean }) | undefined;
    if (p && p.state === 'planted' && !p.withered) out.push({ id: o.id, plot: p });
  }
  return out;
}

/** Set a plot back by `days` of growth (the world recomputes growth from `grown` each morning). */
export function setBackPlot(world: World, id: string, days: number): void {
  const o = world.object(id);
  if (!o) return;
  const d = o.data as unknown as PlotState & { grown?: number };
  const crop = d.crop;
  const grown = Math.max(0, (d.grown ?? 0) - days);
  d.grown = grown;
  const daysNeeded = crop ? cropDays(crop) : 4;
  d.growth = Math.min(1, grown / daysNeeded);
  d.stage = Math.floor(d.growth * 3);
  world.setPlot(id, { state: d.state, crop: d.crop, growth: d.growth, watered: d.watered, daysSincePlant: d.daysSincePlant, stage: d.stage, owner: d.owner });
  (world.object(id)!.data as unknown as { grown?: number }).grown = grown;
}

function cropDays(id: ItemId): number {
  switch (id) { case 'turnip': return 3; case 'wheat': return 4; case 'potato': case 'sunflower': return 5; case 'strawberry': case 'tomato': case 'cabbage': return 6; case 'corn': return 7; case 'pumpkin': return 8; default: return 5; }
}

export function dryPlots(world: World): number {
  let n = 0;
  for (const o of world.objectsAt('farm', 'plot')) {
    const d = o.data as unknown as PlotState;
    if (d.state === 'planted' && d.watered) { d.watered = false; world.setPlot(o.id, { ...d }); n++; }
  }
  return n;
}

export function pairs(sim: Sim): [Villager, Villager][] {
  const out: [Villager, Villager][] = [];
  const vs = sim.villagers;
  for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) out.push([vs[i], vs[j]]);
  return out;
}

export interface RomanceCandidate { a: Villager; b: Villager; score: number }

/** Pairs whose feelings could carry a proposal (thresholds mirror the sim's `propose` tool, softened for the override). */
export function romanceCandidates(sim: Sim, minRomance: number, minAffinity: number): RomanceCandidate[] {
  const out: RomanceCandidate[] = [];
  const taken = (v: Villager): boolean => Object.values(v.relationships).some((r) => r.label === 'partner');
  for (const [a, b] of pairs(sim)) {
    const ab = a.relationships[b.id], ba = b.relationships[a.id];
    if (!ab || !ba) continue;
    if (taken(a) || taken(b)) continue;
    const r = Math.min(ab.romance, ba.romance), af = Math.min(ab.affinity, ba.affinity);
    if (r >= minRomance && af >= minAffinity) out.push({ a, b, score: r + af + Math.min(ab.familiarity, ba.familiarity) * 0.5 });
  }
  return out.sort((x, y) => y.score - x.score);
}

export const sumBy = <T>(arr: T[], f: (x: T) => number): number => arr.reduce((s, x) => s + f(x), 0);

export const cap = (s: string): string => (s.length ? s[0].toUpperCase() + s.slice(1) : s);

export const list = (names: string[]): string => names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

export const money = (n: number): string => `${Math.round(n)} coins`;
