/**
 * A minimal Sim for headless tests of the event system when the real sim cannot be built. Villagers
 * follow their profession schedule by teleporting between places each hour; an interrupt while a
 * placed event is live sends them to it (what `attend_event` would do). Memories, relationships,
 * requests, shops and save/load behave like the real sim's public contract.
 */
import type { Sim } from '../core/app.ts';
import { bus as globalBus, type Bus } from '../core/bus.ts';
import { item } from '../core/items.ts';
import { SeededRng } from '../core/rng.ts';
import type {
  ActiveEvent, Brain, ConversationTurn, Emote, ItemId, ItemStack, Memory, PlaceId, PlayerState, Relationship, Request, SkillName, ToolDef, Villager, VillagerId, World,
} from '../core/types.ts';
import { SCHEDULES, VILLAGERS, type VillagerSpec } from '../core/villagers.ts';
import type { StallShop } from './helpers.ts';

const SKILLS: SkillName[] = ['farming', 'fishing', 'mining', 'cooking', 'crafting', 'charm', 'lore', 'medicine'];

const SHOP_BASE: Record<PlaceId, [ItemId, number][]> = {
  store: [['flour', 6], ['candle', 6], ['nails', 6], ['fertiliser', 8], ['bread', 4], ['tea', 6], ['cloth', 2], ['book', 2], ['lantern', 1], ['wood', 6]],
  bakery: [['bread', 6], ['sweet_roll', 4]], tavern: [['ale', 20], ['cider', 10], ['stew', 6]], smithy: [['nails', 12], ['horseshoe', 3], ['lantern', 1]],
  clinic: [['tonic', 4], ['bandage', 8], ['herbs', 3]], carpenter: [['wood', 10], ['chair', 2]], dock: [['perch', 4], ['trout', 2]], library: [['book', 4], ['poetry', 2]],
};

function makeVillager(spec: VillagerSpec, world: World): Villager {
  const home = world.place(spec.home);
  const skills = Object.fromEntries(SKILLS.map((s) => [s, spec.skills[s] ?? 0])) as Record<SkillName, number>;
  return {
    id: spec.id, name: spec.name, profession: spec.profession, home: spec.home, workplace: spec.workplace,
    pos: { ...(home?.interior ?? home?.anchor ?? { x: 40, y: 35 }) }, facing: 'down', inside: home?.interior ? spec.home : undefined,
    needs: { energy: 80, hunger: 70, social: 60, fun: 60, comfort: 70, purpose: 60 }, mood: 0.1, money: spec.money,
    inventory: spec.inventory.map(([id, qty]) => ({ id, qty })), skills, health: 95,
    personality: { ...spec.personality, traits: [...spec.personality.traits], likes: [...spec.personality.likes], dislikes: [...spec.personality.dislikes] },
    relationships: {}, memory: [], goals: [], plan: null, action: null, queue: [], status: [], look: { ...spec.look }, brain: 'local', birthday: { ...spec.birthday }, stats: {},
  };
}

const BLOCK_PLACE: Record<string, (v: Villager) => PlaceId | undefined> = {
  sleep: (v) => v.home, breakfast: (v) => v.home, work: (v) => v.workplace, lunch: () => 'square', dinner: (v) => v.home, social: () => 'tavern', free: () => 'square', chores: (v) => v.home, errand: () => 'store', festival: () => 'festival_grounds',
};

export interface FakeSim extends Sim {
  requests: Request[];
  events: ActiveEvent[];
  chronicle: { t: number; text: string; importance: number; about?: VillagerId[]; place?: PlaceId }[];
  bus: Bus;
  shops: Map<PlaceId, StallShop>;
  isAsleep(v: Villager): boolean;
  short(id: VillagerId | 'player'): string;
  /** interrupts received, for assertions */
  interrupts: { who: VillagerId; reason: string; t: number }[];
}

export function createFakeSim(world: World, seed: number, opts: { bus?: Bus } = {}): FakeSim {
  const bus = opts.bus ?? globalBus;
  const rng = new SeededRng((seed ^ 0x51a7) >>> 0);
  let memorySeq = 0, requestSeq = 0;
  const villagers = VILLAGERS.map((s) => makeVillager(s, world));
  for (const spec of VILLAGERS) { const v = villagers.find((x) => x.id === spec.id)!; for (const o of villagers) if (o.id !== v.id) v.relationships[o.id] = rel(spec.opinions[o.id] ?? 0); }
  const asleep = new Set<VillagerId>();
  const shops = new Map<PlaceId, StallShop>();
  for (const [place, base] of Object.entries(SHOP_BASE)) shops.set(place, { place, owner: world.place(place)?.owner, stock: base.map(([id, qty]) => ({ id, qty })), demand: {}, base: base.map(([id, qty]) => ({ id, qty })), markup: 1.1, overrides: {}, sold: 0, bought: 0, open: true });
  const player: PlayerState = { pos: { ...(world.place('square')?.anchor ?? { x: 40, y: 35 }) }, facing: 'down', money: 150, inventory: [], skills: Object.fromEntries(SKILLS.map((s) => [s, 1])) as Record<SkillName, number>, energy: 100, name: 'Newcomer', hotbar: 0 };
  const stubBrain: Brain = { kind: 'local', decide: async () => ({ tool: 'idle', args: {}, thought: '' }), converse: async () => ({ speaker: 'player', text: '' }), reflect: async () => [] };
  let lastHour = -1;

  const sim: FakeSim = {
    world, villagers, player, requests: [], events: [], conversations: [], chronicle: [], bus, shops, rng, interrupts: [],
    brains: { local: stubBrain, llm: null }, tools: [] as ToolDef[],
    villager: (id) => villagers.find((v) => v.id === id),
    villagersNear: (pos, radius) => villagers.filter((v) => !v.inside && Math.hypot(v.pos.x - pos.x, v.pos.y - pos.y) <= radius),
    isAsleep: (v) => asleep.has(v.id),
    short: (id) => id === 'player' ? player.name : VILLAGERS.find((s) => s.id === id)?.short ?? id,
    give(v, s) { const cur = v.inventory.find((x) => x.id === s.id); if (cur) cur.qty += s.qty; else v.inventory.push({ id: s.id, qty: s.qty }); },
    take(v, s) { if (!sim.has(v, s.id, s.qty)) return false; let left = s.qty; for (const st of v.inventory) { if (st.id !== s.id) continue; const d = Math.min(st.qty, left); st.qty -= d; left -= d; if (left <= 0) break; } v.inventory = v.inventory.filter((x) => x.qty > 0); return true; },
    has(v, id, qty = 1) { let n = 0; for (const s of v.inventory) if (s.id === id) n += s.qty; return n >= qty; },
    remember(v, m) { const mem: Memory = { ...m, id: `m${(memorySeq++).toString(36)}`, t: world.time.minute, tags: m.tags ?? [] }; v.memory.push(mem); if (v.memory.length > 200) v.memory.splice(0, 50); bus.emit({ type: 'memory', who: v.id, memory: mem }); return mem; },
    adjustRelationship(a, b, delta, note) {
      if (b === a.id) return;
      let r = a.relationships[b]; if (!r) { r = rel(0); a.relationships[b] = r; }
      const before = r.label;
      r.affinity = clamp(r.affinity + (delta.affinity ?? 0), -100, 100); r.trust = clamp(r.trust + (delta.trust ?? 0), 0, 100); r.romance = clamp(r.romance + (delta.romance ?? 0), 0, 100); r.familiarity = clamp(r.familiarity + (delta.familiarity ?? 0), 0, 100);
      if (note) { r.notes.push(note); if (r.notes.length > 12) r.notes.shift(); }
      if (r.label !== 'partner') r.label = r.romance >= 40 && r.affinity >= 30 ? 'crush' : r.affinity <= -30 ? 'rival' : r.affinity >= 60 && r.familiarity >= 40 ? 'close friend' : r.affinity >= 25 && r.familiarity >= 15 ? 'friend' : r.familiarity >= 8 || Math.abs(r.affinity) > 10 ? 'acquaintance' : 'stranger';
      if (before !== r.label || Math.abs(delta.affinity ?? 0) >= 5) bus.emit({ type: 'relationship', a: a.id, b, delta: delta.affinity ?? 0, label: r.label });
    },
    say(v, text, to, tone) { v.speech = { text, until: world.time.minute + 6, to }; bus.emit({ type: 'say', who: v.id, text, to, pos: { ...v.pos } }); void tone; },
    emote(v, kind: Emote) { v.emote = { kind, until: world.time.minute + 5 }; bus.emit({ type: 'emote', who: v.id, kind, pos: { ...v.pos } }); },
    startConversation: () => null,
    postRequest(by, text, reward, needs) { const req: Request = { id: `r${(requestSeq++).toString(36)}`, by, text, reward, needs, postedAt: world.time.minute, expiresAt: world.time.minute + 3 * 1440 }; sim.requests.push(req); bus.emit({ type: 'request', request: req, phase: 'posted' }); return req; },
    shopStock: (place) => (shops.get(place)?.stock ?? []).map((s) => ({ ...s })),
    priceOf(id, place) { const shop = place ? shops.get(place) : undefined; return Math.max(1, Math.round(item(id).price * (shop?.markup ?? 1) * eventMult(sim.events, id))); },
    interrupt(v, reason) {
      sim.interrupts.push({ who: v.id, reason, t: world.time.minute });
      const live = sim.events.filter((e) => e.place && e.startedAt <= world.time.minute + 30 && e.endsAt > world.time.minute);
      const ev = live.find((e) => e.kind === 'festival') ?? live[0];
      if (ev && ev.place) moveTo(v, ev.place);
      v.action = { tool: ev ? 'attend_event' : 'idle', args: ev ? { id: ev.id } : {}, startedAt: world.time.minute, endsAt: world.time.minute + 60, label: ev ? `at ${ev.name}` : 'idling', thought: reason, progress: 0 };
    },
    log(text, importance, about, place) { sim.chronicle.push({ t: world.time.minute, text, importance, about, place }); if (sim.chronicle.length > 400) sim.chronicle.splice(0, 100); bus.emit({ type: 'chronicle', text, importance, about, place }); },
    update(minutes) {
      let left = minutes;
      while (left > 0) {
        const dt = Math.min(30, left); left -= dt;
        const before = world.time.dayIndex;
        world.tick(dt);
        const t = world.time;
        if (t.dayIndex !== before) onNewDay();
        if (t.hour !== lastHour) { lastHour = t.hour; onNewHour(); }
        for (const r of sim.requests) if (!r.done && !r.expired && r.expiresAt <= t.minute) { r.expired = true; bus.emit({ type: 'request', request: r, phase: 'expired' }); }
        sim.requests = sim.requests.filter((r) => !(r.done && t.minute - r.postedAt > 2 * 1440) && !(r.expired && t.minute - r.expiresAt > 1440));
        for (const v of villagers) {
          if (v.action && v.action.endsAt <= t.minute) v.action = null;
          if (asleep.has(v.id) && v.health < 100) v.health = Math.min(100, v.health + (dt / 60) * 1.5);
          else if (v.health < 100 && v.needs.hunger > 60) v.health = Math.min(100, v.health + (dt / 60) * 0.3);
          const sick = v.status.includes('sick');
          if (v.health < 45 && !sick) v.status.push('sick');
          else if (v.health > 72 && sick) v.status.splice(v.status.indexOf('sick'), 1);
          for (const k of ['energy', 'hunger', 'social', 'fun', 'comfort', 'purpose'] as const) v.needs[k] = clamp(v.needs[k] + (k === 'energy' && asleep.has(v.id) ? 4 : -0.8) * (dt / 60), 0, 100);
          if (v.speech && v.speech.until <= t.minute) v.speech = undefined;
          if (v.emote && v.emote.until <= t.minute) v.emote = undefined;
        }
      }
    },
    setBrain(id, kind) { const v = sim.villager(id); if (v) v.brain = kind; },
    save: () => ({ v: 1, rng: rng.state, memorySeq, requestSeq, villagers: villagers.map((v) => ({ ...v, action: null, queue: [], speech: undefined, emote: undefined })), player: { ...player }, requests: sim.requests, events: sim.events, chronicle: sim.chronicle, shops: [...shops.values()], lastHour }),
    load(data) {
      const s = data as { rng?: number; memorySeq?: number; requestSeq?: number; villagers?: Villager[]; player?: PlayerState; requests?: Request[]; events?: ActiveEvent[]; chronicle?: FakeSim['chronicle']; shops?: StallShop[]; lastHour?: number };
      if (typeof s.rng === 'number') rng.state = s.rng;
      if (typeof s.memorySeq === 'number') memorySeq = s.memorySeq;
      if (typeof s.requestSeq === 'number') requestSeq = s.requestSeq;
      if (Array.isArray(s.villagers)) for (const sv of s.villagers) { const v = sim.villager(sv.id); if (v) Object.assign(v, sv, { action: null, queue: [] }); }
      if (s.player) Object.assign(player, s.player);
      if (Array.isArray(s.requests)) sim.requests = s.requests;
      if (Array.isArray(s.events)) sim.events = s.events;
      if (Array.isArray(s.chronicle)) sim.chronicle = s.chronicle;
      if (Array.isArray(s.shops)) for (const sh of s.shops) { const cur = shops.get(sh.place); if (cur) Object.assign(cur, sh); }
      if (typeof s.lastHour === 'number') lastHour = s.lastHour;
    },
    playerTalk: async (v): Promise<ConversationTurn> => ({ speaker: v.id, text: 'Hello.', end: true }),
    playerGift(v, id) { if (!sim.take(player, { id, qty: 1 })) return { ok: false, reaction: 'You have none.' }; sim.give(v, { id, qty: 1 }); sim.adjustRelationship(v, 'player', { affinity: 3, familiarity: 1 }); return { ok: true, reaction: 'Thank you.' }; },
    playerEnter(place) { const p = world.place(place); if (!p?.interior) return false; player.inside = place; player.pos = { ...p.interior }; return true; },
    playerLeave() { const p = player.inside ? world.place(player.inside) : undefined; player.inside = undefined; if (p) player.pos = world.nearestWalkable({ x: (p.door ?? p.anchor).x, y: (p.door ?? p.anchor).y + 1 }, 3); },
    endPlayerConversation() {},
    playerBuy(place, id, qty = 1) {
      const shop = shops.get(place); if (!shop) return { ok: false, message: 'That is not a shop.', cost: 0 };
      const cur = shop.stock.find((s) => s.id === id); if (!cur || cur.qty < qty) return { ok: false, message: 'Out of stock.', cost: 0 };
      const cost = sim.priceOf(id, place) * qty; if (player.money < cost) return { ok: false, message: `You need ${cost} coins.`, cost };
      cur.qty -= qty; if (cur.qty <= 0) shop.stock.splice(shop.stock.indexOf(cur), 1); shop.sold += qty; player.money -= cost; sim.give(player, { id, qty });
      return { ok: true, message: `Bought ${qty} ${item(id).name}.`, cost };
    },
    playerSell(place, id, qty = 1) { const shop = shops.get(place); if (!shop) return { ok: false, message: 'That is not a shop.', earned: 0 }; if (!sim.take(player, { id, qty })) return { ok: false, message: 'You do not have that.', earned: 0 }; const earned = Math.floor(item(id).price * 0.6) * qty; player.money += earned; const cur = shop.stock.find((s) => s.id === id); if (cur) cur.qty += qty; else shop.stock.push({ id, qty }); return { ok: true, message: `Sold ${qty}.`, earned }; },
    playerAcceptRequest(id) { const r = sim.requests.find((x) => x.id === id && !x.done && !x.acceptedBy && x.expiresAt > world.time.minute); if (!r) return false; r.acceptedBy = 'player'; bus.emit({ type: 'request', request: r, phase: 'accepted' }); return true; },
    playerCompleteRequest(id) {
      const r = sim.requests.find((x) => x.id === id && !x.done && x.acceptedBy === 'player'); if (!r) return { ok: false, message: 'No such request.' };
      for (const n of r.needs) if (!sim.has(player, n.id, n.qty)) return { ok: false, message: `You still need ${n.qty} ${item(n.id).name}.` };
      const poster = r.by === 'player' ? undefined : sim.villager(r.by);
      for (const n of r.needs) { sim.take(player, n); if (poster) sim.give(poster, { ...n }); }
      player.money += r.reward.money ?? 0; if (poster) poster.money = Math.max(0, poster.money - (r.reward.money ?? 0));
      if (r.reward.item) sim.give(player, { ...r.reward.item });
      r.done = true; bus.emit({ type: 'request', request: r, phase: 'done' });
      if (poster) sim.adjustRelationship(poster, 'player', { affinity: 6, trust: 6, familiarity: 3 }, `brought ${r.text}`);
      return { ok: true, message: `Delivered. You earned ${r.reward.money ?? 0} coins.` };
    },
  };

  function moveTo(v: Villager, place: PlaceId): void {
    const p = world.place(place); if (!p) return;
    if (p.interior) { v.inside = place; v.pos = { ...p.interior }; } else { v.inside = undefined; v.pos = { ...p.anchor }; }
  }
  function onNewHour(): void {
    const t = world.time; const h = t.hour + t.min / 60;
    for (const v of villagers) {
      if (v.action?.tool === 'attend_event' && v.action.endsAt > t.minute) continue;
      const entries = SCHEDULES[v.profession] ?? SCHEDULES.none;
      let block = 'sleep';
      for (const e of entries) if (e.hour <= h) block = e.block;
      if (world.festivalToday() && h >= (world.festivalToday()?.hour ?? 99)) block = 'festival';
      if (block === 'sleep') asleep.add(v.id); else asleep.delete(v.id);
      const place = BLOCK_PLACE[block]?.(v);
      if (place) moveTo(v, place);
      v.plan = { day: t.dayIndex, entries: entries.map((e) => ({ ...e })), summary: '' };
    }
  }
  function onNewDay(): void {
    const t = world.time;
    for (const shop of shops.values()) for (const b of shop.base) { const cur = shop.stock.find((s) => s.id === b.id); if (!cur) shop.stock.push({ ...b }); else if (cur.qty < b.qty) cur.qty = b.qty; }
    for (const v of villagers) {
      v.goals = v.goals.filter((g) => !(g.done && t.minute - g.createdAt > 1440) && !(t.minute - g.createdAt > 6 * 1440));
      if (v.birthday.season === t.season && v.birthday.day === t.day) sim.log(`It is ${sim.short(v.id)}'s birthday.`, 5, [v.id]);
    }
    const fest = world.festivalToday();
    if (fest) { const start = (t.dayIndex - 1) * 1440 + fest.hour * 60; sim.events.push({ id: `festival_${t.dayIndex}`, name: fest.name, kind: 'festival', startedAt: start, endsAt: start + 240, place: 'festival_grounds', text: `${fest.name} today.`, data: { hour: fest.hour } }); }
  }
  onNewHour();
  return sim;
}

function rel(affinity: number): Relationship {
  return { affinity, trust: 20 + Math.max(0, affinity) * 0.5, romance: 0, familiarity: Math.max(5, Math.abs(affinity) * 0.6), label: affinity > 10 ? 'acquaintance' : 'stranger', notes: [], lastTalked: -9999 };
}

function eventMult(events: ActiveEvent[], id: ItemId): number {
  let m = 1;
  for (const e of events) { const p = e.data?.prices as Record<string, number> | undefined; if (p && typeof p[id] === 'number') m *= p[id]; }
  return m;
}

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

export type { ItemStack };
