/**
 * The simulation: villagers, scheduler, action executor, decision loop, economy, requests, chronicle, player
 * helpers and save/load. See specs/NOTES-sim.md for the architecture.
 */
import type { Sim } from '../core/app.ts';
import { bus as globalBus, type Bus } from '../core/bus.ts';
import { clamp, dist, tileKey } from '../core/index.ts';
import { CROPS, item } from '../core/items.ts';
import { SeededRng } from '../core/rng.ts';
import type {
  ActiveEvent, Brain, ConversationContext, ConversationState, ConversationTurn, CurrentAction, Decision, DecisionContext, Effect, Emote, ItemId, ItemStack, Memory,
  Place, PlaceId, PlayerState, Relationship, Request, SkillName, ToolDef, ToolResult, Vec, Villager, VillagerId, World,
} from '../core/types.ts';
import { PLAYER_LOOK, VILLAGERS, VILLAGER_BY_ID } from '../core/villagers.ts';
import { ConversationManager } from './conversation.ts';
import type { ShopState, SimCore, TravelTarget, VillagerRuntime } from './core.ts';
import { buyPrice, createShops, dailyRestock, noteBuy, noteSell, removeStock, sellPrice, shopWants, stockOf } from './economy.ts';
import { applyEffect, isStartEffect } from './effects.ts';
import { forget, getMemorySeq, nextMemoryId, retrieve, setMemorySeq } from './memory.ts';
import { applyDelta, dailyDrift, giftAppeal, interactionDelta, newRelationship, relationOf } from './relationships.ts';
import { TOOLS, TOOL_BY_NAME } from './tools/index.ts';
import { eventMult } from './tools/economy.ts';
import { applyRates, baseRates, computeMood, createRuntime, createVillager, currentBlock, decayMoodBoost, makeDayPlan, updateStatus, wakeHourOf, addSkill as addSkillTo } from './villager.ts';

const WALK_SPEED = 3; // tiles per in-game minute
const CHRONICLE_CAP = 400;
const MAX_DECISIONS_PER_TICK = 4;
const PENDING_TIMEOUT = 12; // in-game minutes before an async decision falls back to the local brain

type SyncBrain = Brain & { decideSync?: (ctx: DecisionContext) => Decision; reflectSync?: (ctx: DecisionContext) => string[]; converseSync?: (ctx: ConversationContext) => ConversationTurn };

const LABELS: Record<string, string> = {
  till: 'tilling the soil', plant: 'planting {crop}', water: 'watering the crops', harvest: 'harvesting', tend_animals: 'seeing to the animals', fish: 'fishing', mine: 'mining', forage: 'foraging', chop: 'chopping wood',
  forge: 'at the forge', bake: 'baking', cook: 'cooking', repair: 'repairing a tool', treat: 'treating {villager}', check_up: 'checking on {villager}', open_shop: 'opening up', close_shop: 'closing up', restock: 'restocking', set_price: 'pricing stock',
  serve_drinks: 'serving drinks', host_evening: 'hosting the evening', teach: 'teaching {villager}', catalogue_books: 'cataloguing books', write_book: 'writing', build: 'building', craft_furniture: 'at the workbench', repair_structure: 'fixing things up',
  say: 'talking', greet: 'saying hello', chat: 'chatting with {target}', gossip: 'gossiping with {target}', ask: 'asking {target} something', compliment: 'talking with {target}', tease: 'ribbing {target}', apologize: 'apologising to {target}', argue: 'arguing with {target}', comfort: 'comforting {target}', invite: 'inviting {target}',
  gift: 'giving a gift', propose: 'proposing!', hug: 'hugging {target}', dance: 'dancing', tell_story: 'telling a story', play_music: 'playing music',
  buy: 'buying {item}', sell: 'selling {item}', trade: 'trading with {target}', pay: 'paying {target}', haggle: 'haggling',
  eat: 'eating', drink: 'having a drink', sleep: 'sleeping', nap: 'napping', rest: 'resting', bathe: 'washing up', stroll: 'strolling', pray: 'at the shrine', read: 'reading', garden: 'gardening', decorate_home: 'decorating', visit: 'visiting', watch_stars: 'watching the stars', swim: 'swimming',
  craft: 'crafting {recipe}', use_item: 'using {item}', pick_up: 'picking something up', drop: 'tidying', plant_flower: 'planting flowers',
  look_around: 'looking around', check_board: 'reading the board', check_weather: 'checking the sky', recall: 'thinking', ask_about: 'asking around',
  set_goal: 'making plans', remember: 'making a note', plan_day: 'planning the day', post_request: 'posting a request', accept_request: 'taking a request', complete_request: 'delivering', organise_event: 'organising something', attend_event: 'at the gathering', idle: 'idling',
  follow: 'following {villager}', wander: 'wandering', enter: 'going in', leave_building: 'stepping out', go_home: 'heading home', go_to: 'walking',
};

const FISH_TABLE: Record<string, { id: ItemId; weight: number }[]> = {
  spring: [{ id: 'perch', weight: 40 }, { id: 'trout', weight: 30 }, { id: 'carp', weight: 20 }, { id: 'salmon', weight: 4 }, { id: 'catfish', weight: 6 }],
  summer: [{ id: 'perch', weight: 35 }, { id: 'carp', weight: 30 }, { id: 'trout', weight: 20 }, { id: 'catfish', weight: 10 }, { id: 'salmon', weight: 5 }],
  autumn: [{ id: 'trout', weight: 35 }, { id: 'salmon', weight: 12 }, { id: 'perch', weight: 30 }, { id: 'carp', weight: 15 }, { id: 'catfish', weight: 8 }],
  winter: [{ id: 'perch', weight: 45 }, { id: 'carp', weight: 30 }, { id: 'trout', weight: 20 }, { id: 'catfish', weight: 3 }, { id: 'salmon', weight: 2 }],
};

export class SimImpl implements Sim, SimCore {
  readonly world: World;
  readonly rng: SeededRng;
  readonly bus: Bus;
  brains: { local: Brain; llm: Brain | null };
  tools: ToolDef[] = TOOLS;
  villagers: Villager[] = [];
  player: PlayerState;
  requests: Request[] = [];
  events: ActiveEvent[] = [];
  conversations: ConversationState[] = [];
  chronicle: { t: number; text: string; importance: number; about?: VillagerId[]; place?: PlaceId }[] = [];
  shops: Map<PlaceId, ShopState>;
  private runtime = new Map<VillagerId, VillagerRuntime>();
  private conv: ConversationManager;
  private asyncDecisions: { v: Villager; d: Decision | null }[] = [];
  private asyncReflections: { v: Villager; lines: string[]; day: number }[] = [];
  private interiorKeys = new Set<string>();
  private placeTiles = new Map<PlaceId, Set<string>>();
  private lastHourSeen: number;
  private playerConv: ConversationState | null = null;
  private playerConvVillager: VillagerId | null = null;
  private requestSeq = 0;
  private stepping = false;

  constructor(world: World, seed: number, brains: { local: Brain; llm: Brain | null }, bus: Bus = globalBus) {
    this.world = world;
    this.rng = new SeededRng((seed ^ 0x51a7) >>> 0);
    this.bus = bus;
    this.brains = brains;
    this.shops = createShops();
    for (const p of world.places) {
      if (p.interior) this.interiorKeys.add(tileKey(p.interior.x, p.interior.y));
      this.placeTiles.set(p.id, new Set(p.tiles.map((t) => tileKey(t.x, t.y))));
    }
    const playerHome = world.place('home_player');
    const square = world.place('square');
    const start = playerHome?.door ? { x: playerHome.door.x, y: playerHome.door.y + 1 } : square?.anchor ?? { x: 2, y: 2 };
    this.player = { pos: world.nearestWalkable(start, 4), facing: 'down', money: 150, inventory: [{ id: 'turnip_seed', qty: 6 }, { id: 'potato_seed', qty: 4 }, { id: 'hoe', qty: 1 }, { id: 'watering_can', qty: 1 }, { id: 'fishing_rod', qty: 1 }, { id: 'bread', qty: 2 }, { id: 'wildflower', qty: 1 }], skills: { farming: 1, fishing: 1, mining: 0, cooking: 1, crafting: 0, charm: 2, lore: 0, medicine: 0 }, energy: 100, name: 'Newcomer', hotbar: 0 };
    void PLAYER_LOOK;
    for (const spec of VILLAGERS) {
      const v = createVillager(spec, world);
      this.villagers.push(v);
      this.runtime.set(v.id, createRuntime(v.id));
    }
    this.seedRelationships();
    this.seedMemories();
    this.lastHourSeen = world.time.hour;
    for (const v of this.villagers) {
      const rt = this.rt(v);
      v.plan = makeDayPlan(v, world, this.rng.fork(1), v.goals.map((g) => g.text));
      rt.wakeHour = wakeHourOf(v.plan);
      rt.moneyAtDawn = v.money;
      v.stats.moneyAtDawn = v.money;
      rt.idleSince = this.now;
      // anyone whose day has begun starts awake; the rest are asleep in bed until their wake hour
      if (this.hourFloat() < rt.wakeHour) this.startSleeping(v, rt, (rt.wakeHour - this.hourFloat()) * 60);
    }
    this.conv = new ConversationManager(this, (v) => this.brainFor(v), (v) => this.afterConversation(v));
    this.log(`A new day in Pebblebrook. ${this.villagers.length} villagers, one newcomer.`, 3);
  }

  /* ------------------------------------------------------------ accessors */

  get now(): number { return this.world.time.minute; }
  hourFloat(): number { const t = this.world.time; return t.hour + t.min / 60 + (t.minute % 1); }
  rt(v: Villager): VillagerRuntime { let r = this.runtime.get(v.id); if (!r) { r = createRuntime(v.id); this.runtime.set(v.id, r); } return r; }
  villager(id: VillagerId): Villager | undefined { return this.villagers.find((v) => v.id === id); }
  short(id: VillagerId | 'player'): string { return id === 'player' ? this.player.name : VILLAGER_BY_ID[id]?.short ?? this.villager(id)?.name.split(' ')[0] ?? id; }
  displayName(id: VillagerId | 'player'): string { return id === 'player' ? this.player.name : this.villager(id)?.name ?? id; }
  placeName(id: PlaceId | undefined): string { if (!id) return 'outside'; return this.world.place(id)?.name ?? id; }
  isAsleep(v: Villager): boolean { return this.rt(v).asleep; }
  addSkill(v: Villager, skill: SkillName, xp: number): void { if (addSkillTo(v, skill, xp)) { this.remember(v, { kind: 'observation', text: `${this.short(v.id)} is getting better at ${skill}`, importance: 4, tags: ['skill', skill, 'pleasant'] }); this.log(`${this.short(v.id)} reached ${skill} level ${Math.floor(v.skills[skill])}.`, 3, [v.id]); } }
  fishFor(): { id: ItemId; weight: number }[] {
    const base = FISH_TABLE[this.world.season] ?? FISH_TABLE.spring;
    const rain = ['rain', 'storm'].includes(this.world.weather.kind);
    return base.map((f) => ({ id: f.id, weight: f.id === 'catfish' && rain ? f.weight * 3 : f.weight }));
  }

  resolvePlace(raw: unknown): Place | undefined {
    if (raw === undefined || raw === null) return undefined;
    if (typeof raw === 'object') { const o = raw as { x?: number; y?: number; id?: string }; if (typeof o.id === 'string') return this.world.place(o.id); if (typeof o.x === 'number' && typeof o.y === 'number') return this.world.placeAt({ x: o.x, y: o.y }); return undefined; }
    const s = String(raw).trim();
    if (!s) return undefined;
    const direct = this.world.place(s) ?? this.world.place(s.toLowerCase().replace(/[\s-]+/g, '_'));
    if (direct) return direct;
    const low = s.toLowerCase();
    const byName = this.world.places.find((p) => p.name.toLowerCase() === low) ?? this.world.places.find((p) => p.name.toLowerCase().includes(low) || low.includes(p.name.toLowerCase()));
    if (byName) return byName;
    // "Cerys' home", "home of ada"
    const v = this.resolveVillager(low.replace(/'s? (home|house|place)$/, '').replace(/^(home|house) of /, ''));
    if (v && /home|house/.test(low)) return this.world.place(v.home);
    if (v && /shop|work/.test(low)) return this.world.place(v.workplace);
    const aliases: Record<string, string> = { 'the owl': 'tavern', 'drowsy owl': 'tavern', 'inn': 'tavern', 'pub': 'tavern', 'shop': 'store', 'general store': 'store', 'notice board': 'board', 'church': 'chapel', 'shrine': 'chapel', 'woods': 'forest', 'fields': 'farm', 'harbour': 'dock', 'pier': 'dock', 'library hill': 'hill' };
    return aliases[low] ? this.world.place(aliases[low]) : undefined;
  }

  resolveVillager(raw: unknown): Villager | undefined {
    if (raw === undefined || raw === null) return undefined;
    if (typeof raw === 'object') { const o = raw as { id?: string }; return typeof o.id === 'string' ? this.villager(o.id) : undefined; }
    const s = String(raw).trim().toLowerCase();
    if (!s || s === 'player' || s === 'newcomer') return undefined;
    return this.villager(s) ?? this.villagers.find((v) => v.name.toLowerCase() === s) ?? this.villagers.find((v) => v.name.split(' ')[0].toLowerCase() === s) ?? this.villagers.find((v) => v.name.toLowerCase().includes(s));
  }

  currentPlace(v: Villager): Place | undefined {
    if (v.inside) return this.world.place(v.inside);
    return this.world.placeAt({ x: Math.round(v.pos.x), y: Math.round(v.pos.y) });
  }

  atPlace(v: Villager, placeId: PlaceId): boolean {
    if (v.inside) return v.inside === placeId;
    const p = this.world.place(placeId);
    if (!p) return false;
    const key = tileKey(Math.round(v.pos.x), Math.round(v.pos.y));
    const tiles = this.placeTiles.get(placeId);
    if (tiles && tiles.size && tiles.has(key)) return true;
    // outside a building: standing at its door counts (garden, build, knock)
    if (p.interior) return p.door !== undefined && dist(v.pos, p.door) <= 1.6;
    return dist(v.pos, p.anchor) <= 1.6 || (p.door !== undefined && dist(v.pos, p.door) <= 1.6);
  }

  isOpen(place: Place): boolean {
    const shop = this.shops.get(place.id);
    if (shop) {
      if (shop.open) return true;
      if (shop.closedDay === this.world.time.dayIndex) return false;
    }
    if (!place.open) return place.kind !== 'shop' && place.kind !== 'workplace' ? true : true;
    const h = this.hourFloat();
    return h >= place.open[0] && h < place.open[1];
  }

  near(v: Villager, other: Villager | { pos: Vec; inside?: PlaceId }, radius = 2.5): boolean {
    if (v.inside || other.inside) return v.inside === other.inside;
    return dist(v.pos, other.pos) <= radius;
  }

  villagersNear(pos: Vec, radius: number): Villager[] {
    const insideKey = tileKey(Math.round(pos.x), Math.round(pos.y));
    const queryInside = this.interiorKeys.has(insideKey);
    const out: Villager[] = [];
    for (const v of this.villagers) {
      if (v.inside) { if (queryInside && dist(v.pos, pos) < 0.6) out.push(v); continue; }
      if (queryInside) continue;
      if (dist(v.pos, pos) <= radius) out.push(v);
    }
    return out;
  }

  audience(v: Villager, radius = 5): Villager[] { return this.villagersNear(v.pos, radius).filter((o) => o.id !== v.id && !this.isAsleep(o)); }

  bestCompanion(v: Villager): Villager | undefined {
    const near = this.audience(v, 8).filter((o) => !this.rt(o).conversation);
    if (!near.length) return undefined;
    let best: Villager | undefined, bs = -1e9;
    for (const o of near) { const s = (v.relationships[o.id]?.affinity ?? 0) + this.rng.range(0, 15); if (s > bs) { bs = s; best = o; } }
    return best;
  }

  /* -------------------------------------------------------- inventory */

  give(v: Villager | PlayerState, s: ItemStack): void {
    if (s.qty <= 0) return;
    const cur = v.inventory.find((x) => x.id === s.id && (x.quality ?? 1) === (s.quality ?? 1));
    if (cur) cur.qty += s.qty; else v.inventory.push({ id: s.id, qty: s.qty, ...(s.quality ? { quality: s.quality } : {}) });
  }
  take(v: Villager | PlayerState, s: ItemStack): boolean {
    if (!this.has(v, s.id, s.qty)) return false;
    let left = s.qty;
    for (const st of [...v.inventory]) {
      if (st.id !== s.id) continue;
      const n = Math.min(st.qty, left);
      st.qty -= n; left -= n;
      if (st.qty <= 0) v.inventory.splice(v.inventory.indexOf(st), 1);
      if (left <= 0) break;
    }
    return true;
  }
  has(v: Villager | PlayerState, id: ItemId, qty = 1): boolean { let n = 0; for (const s of v.inventory) if (s.id === id) n += s.qty; return n >= qty; }

  /* ---------------------------------------------------------- memory */

  remember(v: Villager, m: Omit<Memory, 'id' | 't'>): Memory {
    const mem: Memory = { ...m, id: nextMemoryId(), t: this.now, tags: m.tags ?? [] };
    v.memory.push(mem);
    const rt = this.rt(v);
    const val = mem.tags.includes('pleasant') ? 1 : mem.tags.includes('unpleasant') ? -1 : 0;
    if (val) rt.moodBoost = clamp(rt.moodBoost + val * (mem.importance / 10) * 0.12, -0.6, 0.6);
    if (v.memory.length > 200) forget(v, this.now);
    this.bus.emit({ type: 'memory', who: v.id, memory: mem });
    return mem;
  }
  observe(v: Villager, text: string, importance = 2, tags: string[] = [], about?: VillagerId[]): Memory {
    return this.remember(v, { kind: 'observation', text, importance, tags, about, place: v.inside ?? this.currentPlace(v)?.id });
  }

  adjustRelationship(a: Villager, b: VillagerId | 'player', delta: Partial<Pick<Relationship, 'affinity' | 'trust' | 'romance' | 'familiarity'>>, note?: string): void {
    if (b === a.id) return;
    const r = relationOf(a, b);
    const other = b === 'player' ? null : this.villager(b)?.relationships[a.id] ?? null;
    const res = applyDelta(r, delta, other);
    if (note) { r.notes.push(note); if (r.notes.length > 12) r.notes.shift(); }
    if (res.before !== res.after) {
      this.bus.emit({ type: 'relationship', a: a.id, b, delta: res.affinityChange, label: res.after });
      const nm = this.short(b);
      const line = res.after === 'rival' ? `${this.short(a.id)} now counts ${nm} as a rival.` : res.after === 'close friend' ? `${this.short(a.id)} and ${nm} have become close friends.` : res.after === 'crush' ? `${this.short(a.id)} has feelings for ${nm}.` : res.after === 'friend' && res.before !== 'close friend' && res.before !== 'crush' ? `${this.short(a.id)} and ${nm} are friends now.` : res.after === 'partner' ? `${this.short(a.id)} and ${nm} are together.` : null;
      if (line) this.log(line, res.after === 'crush' || res.after === 'partner' ? 6 : res.after === 'rival' ? 5 : 3, b === 'player' ? [a.id] : [a.id, b]);
      if (res.after === 'crush' || res.after === 'rival') { this.remember(a, { kind: 'reflection', text: res.after === 'crush' ? `I think I have a crush on ${nm}. That is inconvenient.` : `I have had enough of ${nm}.`, importance: 6, tags: ['reflection', res.after === 'crush' ? 'romance' : 'grudge'], about: b === 'player' ? [] : [b] }); if (res.after === 'crush') a.stats[`crush_${b}`] = this.world.time.dayIndex; }
    } else if (Math.abs(res.affinityChange) >= 5) {
      this.bus.emit({ type: 'relationship', a: a.id, b, delta: res.affinityChange });
    }
  }

  say(v: Villager, text: string, to?: VillagerId | 'player', tone?: ConversationTurn['tone']): void {
    void tone;
    v.speech = { text, until: this.now + 3.5, to };
    this.bus.emit({ type: 'say', who: v.id, text, to, pos: { ...v.pos } });
  }
  emote(v: Villager, kind: Emote): void {
    if (kind === 'none') return;
    v.emote = { kind, until: this.now + 2.5 };
    this.bus.emit({ type: 'emote', who: v.id, kind, pos: { ...v.pos } });
  }
  log(text: string, importance: number, about?: VillagerId[], place?: PlaceId): void {
    this.chronicle.push({ t: this.now, text, importance, about, place });
    if (this.chronicle.length > CHRONICLE_CAP) this.chronicle.splice(0, this.chronicle.length - CHRONICLE_CAP);
    this.bus.emit({ type: 'chronicle', text, importance, about, place });
  }

  startConversation(a: Villager, b: Villager, topic?: string): ConversationState | null {
    const st = this.conv.start(a, b, topic ?? 'chat');
    if (!st) return null;
    for (const v of [a, b]) {
      const rt = this.rt(v);
      if (v.action && v.action.phase !== 'conversation') rt.suspended = { action: v.action, effects: rt.effects, rates: rt.rates, remaining: Math.max(1, v.action.endsAt - this.now) };
      const other = v === a ? b : a;
      v.action = { tool: v === a ? (v.action?.tool ?? 'chat') : 'chat', args: { target: other.id }, startedAt: this.now, endsAt: this.now + 30, label: `chatting with ${this.short(other.id)}`, thought: v === a ? (v.action?.thought ?? '') : `${this.short(a.id)} wants a word.`, progress: 0, phase: 'conversation' };
      rt.effects = []; rt.rates = { social: 6 };
      this.bus.emit({ type: 'action', who: v.id, tool: 'chat', label: v.action.label, phase: 'start', pos: { ...v.pos } });
    }
    return st;
  }

  private afterConversation(v: Villager): void {
    const rt = this.rt(v);
    if (v.action?.phase === 'conversation') { this.bus.emit({ type: 'action', who: v.id, tool: 'chat', label: v.action.label, phase: 'end', pos: { ...v.pos } }); v.action = null; }
    rt.effects = []; rt.rates = {};
    v.stats.lastConversation = this.now;
    if (rt.suspended) {
      const s = rt.suspended; rt.suspended = null;
      if (s.action.phase !== 'travel' || s.action.path?.length) {
        v.action = { ...s.action, startedAt: this.now, endsAt: this.now + s.remaining };
        rt.effects = s.effects; rt.rates = s.rates;
      }
    }
    rt.idleSince = this.now;
  }

  postRequest(by: VillagerId | 'player', text: string, reward: Request['reward'], needs: ItemStack[]): Request {
    const req: Request = { id: `r${(this.requestSeq++).toString(36)}`, by, text, reward, needs, postedAt: this.now, expiresAt: this.now + 3 * 1440 };
    this.requests.push(req);
    this.bus.emit({ type: 'request', request: req, phase: 'posted' });
    this.log(`${this.short(by)} posted on the board: "${text}" (${reward.money ?? 0} coins).`, 3, by === 'player' ? [] : [by], 'board');
    return req;
  }

  shopStock(place: PlaceId): ItemStack[] { return (this.shops.get(place)?.stock ?? []).map((s) => ({ ...s })); }
  priceOf(id: ItemId, place?: PlaceId): number { return buyPrice(place ? this.shops.get(place) : undefined, id, eventMult(this, id)); }
  sellPriceOf(id: ItemId, place?: PlaceId): number { return sellPrice(place ? this.shops.get(place) : undefined, id, eventMult(this, id)); }

  /* ---------------------------------------------------------- travel */

  travel(v: Villager, target: TravelTarget, then: { tool: string; args: Record<string, unknown> } | null, label = 'walking'): ToolResult {
    let dest: Vec | undefined;
    let placeId: PlaceId | undefined;
    let enter = false;
    if (target.villager) {
      const t = this.villager(target.villager);
      if (!t) return { ok: false, message: 'no such villager' };
      if (t.inside) {
        const p = this.world.place(t.inside);
        if (!p) return { ok: false, message: 'cannot find them' };
        if (p.kind === 'home' && p.owner && p.owner !== v.id && (this.villager(p.owner)?.relationships[v.id]?.affinity ?? 0) < -10) return { ok: false, message: `${this.short(t.id)} would not let ${this.short(v.id)} in` };
        placeId = p.id; enter = true; dest = p.door ?? p.anchor;
      } else dest = { x: Math.round(t.pos.x), y: Math.round(t.pos.y) };
    } else if (target.place) {
      const p = this.world.place(target.place);
      if (!p) return { ok: false, message: `no such place ${target.place}` };
      placeId = p.id;
      if (p.interior && p.door) { dest = p.door; enter = target.enter !== false; }
      else if (p.interior) { dest = p.interior; enter = target.enter !== false; }
      else {
        const tiles = p.tiles.filter((t) => this.world.walkable(t.x, t.y) && dist(t, p.anchor) <= 4);
        dest = tiles.length ? this.rng.pick(tiles) : this.world.nearestWalkable(p.anchor, 4);
      }
    } else if (target.pos) dest = { x: Math.round(target.pos.x), y: Math.round(target.pos.y) };
    if (!dest) return { ok: false, message: 'nowhere to go' };
    if (!this.world.walkable(dest.x, dest.y)) dest = this.world.nearestWalkable(dest, 4);
    let start: Vec;
    if (v.inside) { const p = this.world.place(v.inside); const door = p?.door ?? p?.anchor ?? v.pos; start = this.world.walkable(door.x, door.y) ? { ...door } : this.world.nearestWalkable(door, 4); }
    else start = { x: Math.round(v.pos.x), y: Math.round(v.pos.y) };
    let path = this.world.findPath(start, dest);
    if (!path) { const alt = this.world.nearestWalkable(dest, 6); path = this.world.findPath(start, alt); if (path) dest = alt; }
    if (!path) return { ok: false, message: `${this.short(v.id)} could not find a way to ${placeId ? this.placeName(placeId) : 'there'}` };
    if (path.length && path[0].x === start.x && path[0].y === start.y) path = path.slice(1);
    const minutes = path.length / WALK_SPEED + (v.inside ? 0.4 : 0);
    const effect: Effect = { kind: 'travel', target, then, path, dest, placeId, enter };
    return { ok: true, message: `${this.short(v.id)} walked to ${placeId ? this.placeName(placeId) : target.villager ? this.short(target.villager) : 'a spot'}`, durationMin: Math.max(0.3, minutes), importance: 0, effects: [effect, { kind: 'rate', energy: -1.2, fun: 1 }, { kind: 'label', label }] };
  }

  private beginTravel(v: Villager, rt: VillagerRuntime, effect: Effect, label: string, thought: string, tool: string, args: Record<string, unknown>): void {
    const path = effect.path as Vec[];
    if (!path.length) { rt.zeroTravels = (rt.zeroTravels ?? 0) + 1; if (rt.zeroTravels > 3) { rt.zeroTravels = 0; rt.lastFail = tool; this.bus.emit({ type: 'action', who: v.id, tool, label, phase: 'fail', message: `${this.short(v.id)} could not get into position for ${tool}`, pos: { ...v.pos } }); v.action = null; return; } } else rt.zeroTravels = 0;
    if (v.inside) applyEffect(this, v, { kind: 'leave' });
    rt.then = effect.then as { tool: string; args: Record<string, unknown> } | null;
    rt.travel = { target: effect.target as TravelTarget, dest: effect.dest as Vec, placeId: effect.placeId as PlaceId | undefined, enter: !!effect.enter };
    rt.travellingFor = rt.then?.tool ?? tool;
    v.action = { tool, args, startedAt: this.now, endsAt: this.now + Math.max(0.3, path.length / WALK_SPEED), label, thought, progress: 0, path, target: rt.travel.dest, phase: 'travel' };
    rt.effects = []; rt.rates = { energy: -1.2, fun: 1 };
    this.bus.emit({ type: 'action', who: v.id, tool: 'go_to', label, phase: 'start', pos: { ...v.pos } });
    if (!path.length) this.arrive(v, rt);
  }

  private walk(v: Villager, a: CurrentAction, dt: number): boolean {
    let step = WALK_SPEED * dt;
    const path = a.path!;
    while (step > 0 && path.length) {
      const nxt = path[0];
      const dx = nxt.x - v.pos.x, dy = nxt.y - v.pos.y;
      const d = Math.hypot(dx, dy);
      if (Math.abs(dx) > Math.abs(dy)) v.facing = dx > 0 ? 'right' : 'left'; else if (dy !== 0) v.facing = dy > 0 ? 'down' : 'up';
      if (d <= step) { v.pos = { x: nxt.x, y: nxt.y }; path.shift(); step -= d; }
      else { v.pos = { x: v.pos.x + (dx / d) * step, y: v.pos.y + (dy / d) * step }; step = 0; }
    }
    a.progress = a.endsAt > a.startedAt ? clamp((this.now - a.startedAt) / (a.endsAt - a.startedAt), 0, 1) : 1;
    return path.length === 0;
  }

  private arrive(v: Villager, rt: VillagerRuntime): void {
    const a = v.action!;
    const tr = rt.travel!;
    v.pos = { x: Math.round(v.pos.x), y: Math.round(v.pos.y) };
    const then = rt.then;
    rt.then = null; rt.travel = null;
    this.bus.emit({ type: 'action', who: v.id, tool: 'go_to', label: a.label, phase: 'end', pos: { ...v.pos } });
    v.action = null; rt.effects = []; rt.rates = {};
    if (tr.enter && tr.placeId) {
      const p = this.world.place(tr.placeId);
      if (p?.interior) {
        if (p.kind === 'shop' && !this.isOpen(p) && p.owner !== v.id && then && !['sleep', 'open_shop', 'restock', 'close_shop'].includes(then.tool)) {
          // arrived at a closed shop: do not go in
          this.observe(v, `${this.short(v.id)} found ${p.name} closed`, 2, ['closed', p.id]);
          rt.travelRetries = 0;
          return;
        }
        applyEffect(this, v, { kind: 'enter', place: p.id });
      }
    }
    if (tr.target.villager) {
      const t = this.villager(tr.target.villager);
      if (t && !this.near(v, t, 2.5)) {
        if (rt.travelRetries < 3) { rt.travelRetries++; const res = this.travel(v, { villager: t.id }, then, `catching up with ${this.short(t.id)}`); if (res.ok) { this.beginTravel(v, rt, res.effects![0], `catching up with ${this.short(t.id)}`, a.thought, a.tool, a.args); return; } }
        this.observe(v, `${this.short(v.id)} went looking for ${this.short(t.id)} but could not catch them`, 2, ['social', 'missed'], [t.id]);
        rt.travelRetries = 0;
        return;
      }
    }
    rt.travelRetries = 0;
    if (then) this.runTool(v, then.tool, then.args, a.thought);
  }

  /* -------------------------------------------------------- executor */

  private labelFor(tool: string, args: Record<string, unknown>): string {
    let l = LABELS[tool] ?? tool.replace(/_/g, ' ');
    const nameOf = (x: unknown): string => { const v = this.resolveVillager(x); return v ? this.short(v.id) : String(x ?? 'someone'); };
    l = l.replace('{villager}', nameOf(args.villager ?? args.target ?? args.for)).replace('{target}', nameOf(args.target)).replace('{item}', typeof args.item === 'string' ? item(args.item).name.toLowerCase() : 'something').replace('{crop}', typeof args.crop === 'string' ? (CROPS.find((c) => c.id === args.crop || c.seed === args.crop)?.name.toLowerCase() ?? 'seeds') : 'seeds').replace('{recipe}', typeof args.recipe === 'string' ? String(args.recipe).replace(/_/g, ' ') : 'something');
    return l;
  }

  /** Execute a tool for a villager. Returns the tool result (ok=false when it could not start). */
  runTool(v: Villager, tool: string, args: Record<string, unknown>, thought: string): ToolResult {
    const def = TOOL_BY_NAME.get(tool);
    const rt = this.rt(v);
    if (!def) { const r = { ok: false, message: `no such tool ${tool}` }; this.bus.emit({ type: 'action', who: v.id, tool, label: tool, phase: 'fail', message: r.message, pos: { ...v.pos } }); return r; }
    if (def.professions && !def.professions.includes(v.profession)) { const r = { ok: false, message: `${tool} is not ${this.short(v.id)}'s trade` }; this.bus.emit({ type: 'action', who: v.id, tool, label: tool, phase: 'fail', message: r.message, pos: { ...v.pos } }); return r; }
    let res: ToolResult;
    try { res = def.execute(v, this, args ?? {}); } catch (e) { res = { ok: false, message: `${tool} threw: ${(e as Error).message}` }; }
    if (!res.ok) {
      v.stats.failures = (v.stats.failures ?? 0) + 1;
      rt.lastFail = tool;
      this.bus.emit({ type: 'action', who: v.id, tool, label: this.labelFor(tool, args), phase: 'fail', message: res.message, pos: { ...v.pos } });
      return res;
    }
    const effects = res.effects ?? [];
    const labelEffect = effects.find((e) => e.kind === 'label');
    const label = (labelEffect?.label as string | undefined) ?? this.labelFor(tool, args);
    const travel = effects.find((e) => e.kind === 'travel');
    if (travel) { this.beginTravel(v, rt, travel, label, thought, tool, args); return res; }
    rt.lastFail = null;
    // the tool really happens now
    v.stats[tool] = (v.stats[tool] ?? 0) + 1;
    rt.todayTools.push(tool);
    rt.recentTools.push(tool); if (rt.recentTools.length > 10) rt.recentTools.shift();
    const conv = effects.find((e) => e.kind === 'conversation');
    const start = effects.filter((e) => isStartEffect(e) && e.kind !== 'label' && e.kind !== 'conversation');
    const end = effects.filter((e) => !isStartEffect(e) && e.kind !== 'label');
    for (const e of start) applyEffect(this, v, e);
    if (conv) {
      const t = this.villager(String(conv.with));
      const st = t ? this.startConversation(v, t, String(conv.topic ?? 'chat')) : null;
      for (const e of end) applyEffect(this, v, e);
      if (!st) { const r = { ok: false, message: `${t ? this.short(t.id) : 'they'} ${t && this.rt(t).conversation ? 'was already talking to someone' : t && this.isAsleep(t) ? 'was asleep' : 'did not want to talk'}` }; this.bus.emit({ type: 'action', who: v.id, tool, label, phase: 'fail', message: r.message, pos: { ...v.pos } }); rt.lastFail = tool; return r; }
      if (v.action) { v.action.tool = tool; v.action.thought = thought; }
      return res;
    }
    const dur = res.durationMin ?? 0;
    const importance = res.importance ?? 2;
    if (dur <= 0) {
      this.bus.emit({ type: 'action', who: v.id, tool, label, phase: 'start', pos: { ...v.pos } });
      for (const e of end) applyEffect(this, v, e);
      if (importance > 0) this.remember(v, { kind: 'observation', text: res.message, importance, tags: [tool, def.category, ...tagsFor(args, this)], about: aboutFor(args, this, v), place: v.inside ?? this.currentPlace(v)?.id });
      this.bus.emit({ type: 'action', who: v.id, tool, label, phase: 'end', message: res.message, pos: { ...v.pos } });
      rt.rates = {};
      return res;
    }
    v.action = { tool, args, startedAt: this.now, endsAt: this.now + dur, label, thought, progress: 0, phase: (labelEffect?.phase as string | undefined) ?? undefined, target: labelEffect?.target ? undefined : undefined };
    if (labelEffect?.target) v.action.args = { ...v.action.args, _follow: labelEffect.target };
    rt.effects = end;
    rt.pendingMessage = { message: res.message, importance, tool, category: def.category };
    this.bus.emit({ type: 'action', who: v.id, tool, label, phase: 'start', pos: { ...v.pos } });
    return res;
  }

  private completeAction(v: Villager, rt: VillagerRuntime): void {
    const a = v.action!;
    const end = rt.effects;
    const pm = rt.pendingMessage;
    v.action = null; rt.effects = []; rt.rates = {}; rt.pendingMessage = undefined;
    for (const e of end) applyEffect(this, v, e);
    if (pm && pm.importance > 0) this.remember(v, { kind: 'observation', text: pm.message, importance: pm.importance, tags: [pm.tool, pm.category, ...tagsFor(a.args, this)], about: aboutFor(a.args, this, v), place: v.inside ?? this.currentPlace(v)?.id });
    this.bus.emit({ type: 'action', who: v.id, tool: a.tool, label: a.label, phase: 'end', message: pm?.message, pos: { ...v.pos } });
    if (a.tool === 'sleep' && rt.asleep) rt.asleep = false;
  }

  interrupt(v: Villager, reason: string): void {
    const rt = this.rt(v);
    if (rt.conversation) this.conv.leave(v, reason);
    if (v.action) {
      if (v.action.phase !== 'conversation') this.bus.emit({ type: 'action', who: v.id, tool: v.action.tool, label: v.action.label, phase: 'end', message: `interrupted: ${reason}`, pos: { ...v.pos } });
      v.action = null;
    }
    rt.effects = []; rt.rates = {}; rt.pendingMessage = undefined; rt.suspended = null; rt.then = null; rt.travel = null;
    if (rt.asleep) rt.asleep = false;
    v.queue = [];
    v.pos = { x: Math.round(v.pos.x), y: Math.round(v.pos.y) };
    if (!this.stepping) this.decideNow(v, rt, 'interrupted', reason);
    else rt.interruptedBy = reason;
  }

  private startSleeping(v: Villager, rt: VillagerRuntime, minutes: number): void {
    v.action = { tool: 'sleep', args: {}, startedAt: this.now, endsAt: this.now + Math.max(5, minutes), label: 'sleeping', thought: 'Zzz.', progress: 0 };
    rt.asleep = true; rt.effects = [{ kind: 'wake' }]; rt.rates = { energy: 12, comfort: 3, hunger: -1.2 };
    rt.sleptAtHome[this.world.time.dayIndex] = v.inside === v.home;
  }

  /* ---------------------------------------------------------- brains */

  brainFor(v: Villager): Brain { return v.brain === 'llm' && this.brains.llm ? this.brains.llm : this.brains.local; }
  setBrain(id: VillagerId, kind: 'local' | 'llm'): void { const v = this.villager(id); if (v) v.brain = kind; }

  private buildContext(v: Villager, reason: DecisionContext['reason'], trigger?: string): DecisionContext {
    const nearby = this.audience(v, 8);
    const options: ToolDef[] = [];
    for (const t of TOOLS) {
      if (t.professions && !t.professions.includes(v.profession)) continue;
      let ok = false;
      try { ok = t.available(v, this); } catch { ok = false; }
      if (ok) options.push(t);
    }
    const block = currentBlock(v.plan, this.hourFloat()).block;
    const relevant = retrieve(v, { about: nearby.map((o) => o.id), place: v.inside ?? this.currentPlace(v)?.id, tags: [block, this.world.weather.kind, 'plan', 'invite', 'request'] }, 8, this.now);
    return { villager: v, sim: this, world: this.world, now: this.world.time, nearby, options, recent: v.memory.slice(-10), relevant, reason, trigger };
  }

  /** Ask the brain and act, looping while the decisions resolve instantly. */
  private decideNow(v: Villager, rt: VillagerRuntime, reason: DecisionContext['reason'], trigger?: string): void {
    let r = reason, tr = trigger;
    while (!v.action && !rt.pending && !rt.conversation) {
      if (rt.decisionsThisTick >= MAX_DECISIONS_PER_TICK) { this.runTool(v, 'idle', { reason: 'catching a breath', minutes: 3 }, 'Give me a minute.'); break; }
      rt.decisionsThisTick++;
      rt.lastReason = r;
      if (v.queue.length) {
        const q = v.queue.shift()!;
        const res = this.runTool(v, q.tool, q.args, q.thought ?? '');
        if (!res.ok) { v.queue = []; r = 'interrupted'; tr = `${q.tool} failed: ${res.message}`; }
        continue;
      }
      const brain = this.brainFor(v) as SyncBrain;
      const ctx = this.buildContext(v, r, tr);
      if (brain.decideSync) {
        let d: Decision;
        try { d = brain.decideSync(ctx); } catch (e) { d = { tool: 'idle', args: { reason: 'lost in thought' }, thought: `(${(e as Error).message})` }; }
        const res = this.applyDecision(v, d);
        if (!res.ok) { r = 'interrupted'; tr = `${d.tool} failed: ${res.message}`; } else { r = 'idle'; tr = undefined; }
        continue;
      }
      rt.pending = true; rt.pendingSince = this.now;
      v.action = { tool: 'think', args: {}, startedAt: this.now, endsAt: this.now + PENDING_TIMEOUT, label: 'thinking…', thought: '', progress: 0, phase: 'pending' };
      brain.decide(ctx).then((d) => this.asyncDecisions.push({ v, d })).catch(() => this.asyncDecisions.push({ v, d: null }));
      break;
    }
  }

  private applyDecision(v: Villager, d: Decision): ToolResult {
    if (d.say) this.say(v, d.say);
    if (d.emote) this.emote(v, d.emote);
    return this.runTool(v, d.tool, d.args ?? {}, d.thought ?? '');
  }

  private drainAsync(): void {
    for (const { v, d } of this.asyncDecisions.splice(0)) {
      const rt = this.rt(v);
      if (!rt.pending) continue;
      rt.pending = false;
      if (v.action?.phase === 'pending') v.action = null;
      if (d) { const res = this.applyDecision(v, d); if (!res.ok) this.decideLocal(v, rt, `${d.tool} failed: ${res.message}`); }
      else this.decideLocal(v, rt, 'the model did not answer');
    }
    for (const { v, lines, day } of this.asyncReflections.splice(0)) this.storeReflections(v, lines, day);
  }

  private decideLocal(v: Villager, rt: VillagerRuntime, trigger: string): void {
    const local = this.brains.local as SyncBrain;
    if (!local.decideSync) return;
    const d = local.decideSync(this.buildContext(v, 'interrupted', trigger));
    void rt;
    this.applyDecision(v, d);
  }

  /* ------------------------------------------------------- reflection */

  private reflect(v: Villager, day: number): void {
    const rt = this.rt(v);
    if (rt.reflectedDay === day) return;
    rt.reflectedDay = day;
    const brain = this.brainFor(v) as SyncBrain;
    const ctx = this.buildContext(v, 'idle');
    const dayStart = (day - 1) * 1440;
    ctx.recent = v.memory.filter((m) => m.t >= dayStart && m.kind !== 'reflection');
    v.stats.moneyAtDawn = rt.moneyAtDawn;
    if (brain.reflectSync) { let lines: string[] = []; try { lines = brain.reflectSync(ctx); } catch { lines = []; } this.storeReflections(v, lines, day); return; }
    brain.reflect(ctx).then((lines) => this.asyncReflections.push({ v, lines, day })).catch(() => { const local = this.brains.local as SyncBrain; if (local.reflectSync) this.asyncReflections.push({ v, lines: local.reflectSync(ctx), day }); });
  }

  private storeReflections(v: Villager, lines: string[], day: number): void {
    for (const raw of lines.slice(0, 3)) {
      const text = raw.trim();
      if (!text) continue;
      const low = text.toLowerCase();
      const about = this.villagers.filter((o) => o.id !== v.id && low.includes(this.short(o.id).toLowerCase())).map((o) => o.id);
      const tags = ['reflection'];
      if (/love|crush|thinking about|feelings|kiss/.test(low)) tags.push('romance');
      if (/argu|row|angry|apolog/.test(low)) tags.push('argued');
      if (/coin|money|business|purse|sell/.test(low)) tags.push('money');
      if (/storm|rain|weather/.test(low)) tags.push('weather');
      if (/good|glad|best|happy|joy|worth/.test(low) && !/not good/.test(low)) tags.push('pleasant');
      if (/bad|wretched|worr|scare|tight|lonely|wasted/.test(low)) tags.push('unpleasant');
      this.remember(v, { kind: 'reflection', text, importance: 5 + (tags.includes('romance') ? 2 : 0), tags, about, place: v.inside });
      if (tags.includes('romance') && about.length) this.log(`${this.short(v.id)} lay awake thinking about ${this.short(about[0])}.`, 4, [v.id, about[0]]);
    }
    void day;
  }

  /* ---------------------------------------------------------- update */

  update(minutes: number): void {
    let left = minutes;
    while (left > 0) { const dt = Math.min(1, left); left -= dt; this.step(dt); }
  }

  private step(dt: number): void {
    const before = this.world.time;
    const bDay = before.dayIndex;
    this.world.tick(dt);
    const t = this.world.time;
    this.stepping = true;
    if (t.dayIndex !== bDay) this.onNewDay();
    if (t.hour !== this.lastHourSeen) { this.lastHourSeen = t.hour; this.onNewHour(); }
    this.drainAsync();
    this.conv.tick();
    this.expire();
    for (const v of this.villagers) this.stepVillager(v, dt);
    this.stepping = false;
  }

  private stepVillager(v: Villager, dt: number): void {
    const rt = this.rt(v);
    rt.decisionsThisTick = 0;
    applyRates(v, baseRates(v, this.world, rt.asleep), dt);
    if (v.action && !rt.asleep) applyRates(v, rt.rates, dt);
    else if (rt.asleep) applyRates(v, rt.rates, dt);
    decayMoodBoost(rt, dt);
    if (v.needs.comfort < 12 || v.status.includes('wet') && v.needs.comfort < 30) v.health = clamp(v.health - (dt / 60) * 1.2, 0, 100);
    else if (rt.asleep && v.health < 100) v.health = clamp(v.health + (dt / 60) * 1.5, 0, 100);
    else if (v.health < 100 && v.needs.hunger > 60) v.health = clamp(v.health + (dt / 60) * 0.3, 0, 100);
    const changed = updateStatus(v, this.world, rt, this.now);
    if (changed.includes('sick') && v.status.includes('sick')) { this.observe(v, `${this.short(v.id)} has come down with something`, 5, ['sick', 'unpleasant']); this.emote(v, 'sick'); this.log(`${this.short(v.id)} is ill.`, 4, [v.id]); }
    v.mood = computeMood(v, this.world, rt);
    if (v.speech && v.speech.until <= this.now) v.speech = undefined;
    if (v.emote && v.emote.until <= this.now) v.emote = undefined;
    if (rt.interruptedBy) { const why = rt.interruptedBy; rt.interruptedBy = undefined; this.decideNow(v, rt, 'interrupted', why); return; }
    if (rt.conversation) { rt.idleSince = this.now; return; }
    if (rt.pending) {
      if (this.now - rt.pendingSince > PENDING_TIMEOUT) { rt.pending = false; if (v.action?.phase === 'pending') v.action = null; this.decideLocal(v, rt, 'took too long to decide'); }
      rt.idleSince = this.now;
      return;
    }
    if (v.action) {
      const a = v.action;
      if (a.phase === 'travel') { if (this.walk(v, a, dt)) this.arrive(v, rt); }
      else {
        if (a.phase === 'follow' && typeof a.args._follow === 'string') this.followStep(v, a, dt);
        a.progress = clamp((this.now - a.startedAt) / Math.max(0.1, a.endsAt - a.startedAt), 0, 1);
        if (this.now >= a.endsAt - 1e-6) this.completeAction(v, rt);
        else if (rt.asleep && v.needs.energy >= 100 && this.hourFloat() >= rt.wakeHour && this.hourFloat() < 12 && a.tool === 'sleep') this.completeAction(v, rt);
      }
      if (v.action) { rt.idleSince = this.now; return; }
    }
    // idle
    const idleFor = this.now - rt.idleSince;
    if (idleFor > rt.longestIdle) rt.longestIdle = idleFor;
    this.decideNow(v, rt, 'idle');
    if (v.action || rt.pending || rt.conversation) rt.idleSince = this.now;
  }

  private followStep(v: Villager, a: CurrentAction, dt: number): void {
    const t = this.villager(String(a.args._follow));
    if (!t) return;
    if (t.inside !== v.inside) { if (t.inside) { const p = this.world.place(t.inside); if (p && dist(v.pos, p.door ?? p.anchor) < 2) applyEffect(this, v, { kind: 'enter', place: p.id }); } else applyEffect(this, v, { kind: 'leave' }); return; }
    if (v.inside) return;
    const d = dist(v.pos, t.pos);
    if (d > 2) {
      const path = this.world.findPath({ x: Math.round(v.pos.x), y: Math.round(v.pos.y) }, { x: Math.round(t.pos.x), y: Math.round(t.pos.y) }, { maxNodes: 600 });
      if (path && path.length) { const tmp: CurrentAction = { ...a, path: path.slice(1) }; this.walk(v, tmp, dt); }
    }
  }

  private expire(): void {
    for (const r of this.requests) if (!r.done && r.expiresAt <= this.now && !r.expired) { r.expired = true; this.bus.emit({ type: 'request', request: r, phase: 'expired' }); }
    this.requests = this.requests.filter((r) => !(r.done && this.now - r.postedAt > 2 * 1440) && !(r.expired && this.now - r.expiresAt > 1440));
    for (const e of [...this.events]) if (e.endsAt <= this.now && e.kind === 'social') { this.events.splice(this.events.indexOf(e), 1); }
  }

  private onNewHour(): void {
    const h = this.hourFloat();
    for (const v of this.villagers) {
      const rt = this.rt(v);
      if (rt.asleep || rt.conversation || rt.pending) continue;
      const prev = currentBlock(v.plan, h - 1).block, cur = currentBlock(v.plan, h).block;
      if (prev === cur) continue;
      if (v.action && ['idle', 'rest', 'wander', 'stroll', 'read', 'look_around', 'garden', 'watch_stars', 'nap'].includes(v.action.tool) && v.action.phase !== 'travel') {
        this.bus.emit({ type: 'action', who: v.id, tool: v.action.tool, label: v.action.label, phase: 'end', pos: { ...v.pos } });
        v.action = null; rt.effects = []; rt.rates = {}; rt.pendingMessage = undefined;
        rt.interruptedBy = `newhour:${cur}`;
      }
    }
    if (this.world.time.hour === 6) for (const shop of this.shops.values()) { dailyRestock(shop, 0.5); }
  }

  private onNewDay(): void {
    const t = this.world.time;
    const fest = this.world.festivalToday();
    this.log(`Day ${t.dayIndex}: ${t.season} ${t.day}, ${this.world.weather.kind}${fest ? ` — ${fest.name} today!` : ''}.`, fest ? 6 : 3);
    if (fest) { const place = this.world.place('festival_grounds') ? 'festival_grounds' : 'square'; const start = (t.dayIndex - 1) * 1440 + fest.hour * 60; if (!this.events.some((e) => e.id === `festival_${t.dayIndex}`)) this.events.push({ id: `festival_${t.dayIndex}`, name: fest.name, kind: 'festival', startedAt: start, endsAt: start + 240, place, text: `${fest.name} at ${this.placeName(place)} from ${fest.hour}:00.`, data: { hour: fest.hour } }); }
    for (const shop of this.shops.values()) {
      // passing trade we do not simulate: a shop that was open yesterday earns its keeper a little
      const owner = shop.owner ? this.villager(shop.owner) : undefined;
      if (owner && owner.stats.shopDay === t.dayIndex - 1) {
        const income = 18 + this.rng.int(0, 22) + shop.sold * 2;
        owner.money += income; owner.stats.moneyEarned = (owner.stats.moneyEarned ?? 0) + income;
        this.remember(owner, { kind: 'observation', text: `Takings at ${this.placeName(shop.place)} yesterday: ${income} coins`, importance: income > 40 ? 3 : 2, tags: ['money', 'work', income > 40 ? 'pleasant' : 'work'], place: shop.place });
      }
      shop.open = false; shop.closedDay = undefined; dailyRestock(shop, 0.5);
    }
    for (const v of this.villagers) {
      const rt = this.rt(v);
      if (rt.reflectedDay !== t.dayIndex - 1) this.reflect(v, t.dayIndex - 1);
      rt.moneyAtDawn = v.money; v.stats.moneyAtDawn = v.money;
      rt.todayTools = []; rt.greeted = {}; v.stats.drinksRecent = 0;
      for (const [id, r] of Object.entries(v.relationships)) dailyDrift(r, (this.now - r.lastTalked) / 1440), void id;
      v.goals = v.goals.filter((g) => !(g.done && this.now - g.createdAt > 1440) && !(this.now - g.createdAt > 6 * 1440));
      this.needGoals(v);
      v.plan = makeDayPlan(v, this.world, this.rng, v.goals.filter((g) => !g.done).map((g) => g.text));
      rt.wakeHour = wakeHourOf(v.plan);
      if (v.inventory.some((s) => item(s.id).kind === 'tool') && (rt.todayTools.length > 0 || true)) v.stats.toolWear = (v.stats.toolWear ?? 0) + (['farmer', 'miner', 'fisher', 'carpenter'].includes(v.profession) ? 1 : 0.3);
      if (v.birthday.season === t.season && v.birthday.day === t.day) {
        this.remember(v, { kind: 'event', text: `It is ${this.short(v.id)}'s birthday today`, importance: 6, tags: ['birthday', 'event', 'pleasant', 'celebrating'] });
        v.status.push('celebrating'); rt.flagUntil.celebrating = this.now + 1440;
        this.log(`It is ${this.short(v.id)}'s birthday.`, 5, [v.id]);
        for (const o of this.villagers) if (o.id !== v.id && (o.relationships[v.id]?.affinity ?? 0) > 0) this.remember(o, { kind: 'event', text: `It is ${this.short(v.id)}'s birthday today. A gift would be kind`, importance: 5, tags: ['birthday', 'event', 'gift', 'plan'], about: [v.id] });
      }
      if (fest) this.remember(v, { kind: 'event', text: `${fest.name} is today at ${fest.hour}:00 on the festival grounds`, importance: 5, tags: ['festival', 'event', 'plan', 'pleasant'], place: 'festival_grounds' });
      // memory hygiene
      if (v.memory.length > 160) forget(v, this.now);
    }
    // the world may have grown crops overnight; nothing to do here — the farmer will notice.
  }

  private needGoals(v: Villager): void {
    const add = (text: string, priority: number) => { if (!v.goals.some((g) => !g.done && g.text === text)) v.goals.push({ id: `g${this.now}_${v.goals.length}`, text, priority, createdAt: this.now }); };
    if (v.money < 50) add('earn some money: sell something or work extra', 7);
    if (v.needs.social < 40) add('see people: visit the tavern or a friend', 5);
    if (v.needs.fun < 35) add('do something enjoyable', 5);
    if (v.needs.purpose < 35) add('get some proper work done', 6);
    if (v.status.includes('sick')) add('see Elin about being ill', 8);
    const friend = Object.entries(v.relationships).filter(([id, r]) => r.affinity > 30 && this.now - r.lastTalked > 2 * 1440 && this.villager(id)).sort((a, b) => b[1].affinity - a[1].affinity)[0];
    if (friend && this.rng.chance(0.5)) add(`catch up with ${this.short(friend[0])}`, 4);
    if (v.id === 'finn' && (v.relationships.hal?.trust ?? 0) < 50 && !v.goals.some((g) => g.text.startsWith('pay Hal'))) add('pay Hal back some of what is owed', 5);
    if (v.profession === 'baker' && !this.has(v, 'flour', 2)) add('get flour for the bakery', 7);
    if (v.profession === 'blacksmith' && !this.has(v, 'iron_ore', 3) && !this.has(v, 'iron_bar', 1)) add('get ore for the forge', 6);
    if (v.profession === 'carpenter' && !this.has(v, 'wood', 4)) add('get wood for the workshop', 6);
    if (v.profession === 'farmer' && !CROPS.some((c) => c.seasons.includes(this.world.season) && this.has(v, c.seed, 1))) add('buy seeds for the season', 8);
  }

  /* ----------------------------------------------------------- player */

  private ensurePlayerConversation(v: Villager): ConversationState {
    if (this.playerConv && this.playerConvVillager === v.id && !this.playerConv.done) return this.playerConv;
    if (this.playerConv) this.endPlayerConversation();
    const rt = this.rt(v);
    if (rt.conversation) this.conv.leave(v, 'the newcomer came over');
    if (v.action && v.action.phase !== 'conversation' && v.action.phase !== 'travel') rt.suspended = { action: v.action, effects: rt.effects, rates: rt.rates, remaining: Math.max(1, v.action.endsAt - this.now) };
    else if (v.action?.phase === 'travel') { rt.then = null; rt.travel = null; v.pos = { x: Math.round(v.pos.x), y: Math.round(v.pos.y) }; }
    if (rt.asleep) rt.asleep = false;
    v.action = { tool: 'chat', args: { target: 'player' }, startedAt: this.now, endsAt: this.now + 60, label: `talking with ${this.player.name}`, thought: 'The newcomer wants a word.', progress: 0, phase: 'conversation' };
    rt.effects = []; rt.rates = { social: 8 };
    const dx = this.player.pos.x - v.pos.x, dy = this.player.pos.y - v.pos.y;
    if (Math.abs(dx) >= Math.abs(dy)) v.facing = dx >= 0 ? 'right' : 'left'; else v.facing = dy >= 0 ? 'down' : 'up';
    const st: ConversationState = { id: `p${this.now}`, participants: [v.id, 'player'], turns: [], place: v.inside ?? this.currentPlace(v)?.id, startedAt: this.now, topic: 'player' };
    this.playerConv = st; this.playerConvVillager = v.id;
    this.player.talkingTo = v.id;
    this.conversations.push(st);
    this.bus.emit({ type: 'conversation', state: st, phase: 'start' });
    this.bus.emit({ type: 'player', what: 'talk', detail: v.id });
    return st;
  }

  async playerTalk(v: Villager, intentIn: string, lineIn?: string): Promise<ConversationTurn> {
    // UI intents: greet, day, gossip, help, joke, compliment, trade, goodbye, about (line = villager id), chat (line = typed text)
    let intent = intentIn, line = lineIn;
    if (intent === 'about') { intent = `ask_about:${(line ?? '').trim()}`; line = undefined; }
    else if (intent === 'chat' || intent === 'say') { intent = 'free'; line = line ?? ''; }
    const st = this.ensurePlayerConversation(v);
    const playerText = line ?? intentText(intent, this);
    st.turns.push({ speaker: 'player', text: playerText });
    const brain = this.brainFor(v) as SyncBrain;
    const ctx: ConversationContext = { speaker: v, listener: 'player', listenerName: this.player.name, history: st.turns, relationship: v.relationships.player ?? null, relevant: retrieve(v, { about: ['player'], text: line ?? intent, tags: ['player', 'talk', 'gossip'] }, 6, this.now), topic: intent, playerLine: line, playerIntent: intent, sim: this, world: this.world };
    let turn: ConversationTurn | null = null;
    if (line && brain.chat) { try { turn = await brain.chat(ctx); } catch { turn = null; } }
    if (!turn) { try { turn = brain.converseSync ? brain.converseSync(ctx) : await brain.converse(ctx); } catch { turn = null; } }
    if (!turn) { const local = this.brains.local as SyncBrain; turn = local.converseSync ? local.converseSync(ctx) : { speaker: v.id, text: '...', end: false }; }
    turn.speaker = v.id;
    st.turns.push(turn);
    this.say(v, turn.text, 'player', turn.tone);
    if (turn.emote && turn.emote !== 'none') this.emote(v, turn.emote);
    if (turn.remember) this.remember(v, { kind: 'conversation', text: turn.remember.text, importance: turn.remember.importance, tags: [...new Set([...turn.remember.tags, 'player', 'talk'])], about: ['player'], place: st.place });
    if (turn.affinityDelta) this.adjustRelationship(v, 'player', { affinity: turn.affinityDelta, familiarity: 1 });
    else this.adjustRelationship(v, 'player', { familiarity: 0.5 });
    v.stats.playerTalks = (v.stats.playerTalks ?? 0) + 1;
    this.bus.emit({ type: 'conversation', state: st, phase: 'turn' });
    if (turn.end || intent === 'goodbye') this.endPlayerConversation();
    return turn;
  }

  endPlayerConversation(): void {
    const st = this.playerConv;
    if (!st) return;
    const v = this.playerConvVillager ? this.villager(this.playerConvVillager) : undefined;
    st.done = true;
    const idx = this.conversations.indexOf(st);
    if (idx >= 0) this.conversations.splice(idx, 1);
    this.playerConv = null; this.playerConvVillager = null;
    this.player.talkingTo = undefined;
    if (v) {
      const n = st.turns.filter((t) => t.speaker === 'player').length;
      if (n > 0) {
        const r = relationOf(v, 'player');
        this.remember(v, { kind: 'conversation', text: `${this.short(v.id)} talked with ${this.player.name}${n >= 4 ? ' for a good while' : ''}`, importance: n >= 4 ? 3 : 2, tags: ['player', 'talk', 'social', 'pleasant'], about: ['player'], place: st.place });
        this.adjustRelationship(v, 'player', { affinity: 1 + Math.min(3, n * 0.5), familiarity: 2 + n });
        r.lastTalked = this.now;
        v.needs.social = Math.min(100, v.needs.social + 6 + n * 2);
      }
      this.afterConversation(v);
    }
    this.bus.emit({ type: 'conversation', state: st, phase: 'end' });
  }

  playerGift(v: Villager, id: ItemId): { ok: boolean; reaction: string } {
    if (!this.has(this.player, id, 1)) return { ok: false, reaction: `You have no ${item(id).name.toLowerCase()} to give.` };
    if (this.isAsleep(v)) return { ok: false, reaction: `${this.short(v.id)} is asleep.` };
    const appeal = giftAppeal(v, id);
    const d = interactionDelta('gift', v, null, { appeal });
    this.take(this.player, { id, qty: 1 });
    this.give(v, { id, qty: 1 });
    this.adjustRelationship(v, 'player', d, `${this.player.name} gave ${item(id).name}`);
    const name = item(id).name;
    const reaction = appeal > 0.5 ? this.rng.pick([`${name}! How did you know? Thank you!`, `Oh — I love this. Truly. Thank you, ${this.player.name}.`, `You remembered. I will not forget this.`]) : appeal > 0.1 ? this.rng.pick([`Thank you, that is kind of you.`, `Oh! ${name}. Thank you.`, `That is thoughtful. Thank you.`]) : appeal > -0.2 ? this.rng.pick([`Oh. A ${name.toLowerCase()}. Thanks.`, `Thank you. I will find a use for it.`]) : this.rng.pick([`${name}? You know I cannot stand these.`, `Oh. Well. Thank you, I suppose.`]);
    this.say(v, reaction, 'player', appeal > 0.3 ? 'warm' : appeal < -0.2 ? 'cold' : 'neutral');
    this.emote(v, appeal > 0.5 ? 'love' : appeal > 0 ? 'happy' : appeal < -0.2 ? 'sad' : 'question');
    this.remember(v, { kind: 'observation', text: `${this.player.name} gave ${this.short(v.id)} ${name.toLowerCase()}${appeal > 0.5 ? ' — a favourite' : appeal < -0.2 ? ', not a welcome one' : ''}`, importance: appeal > 0.5 ? 6 : appeal < -0.2 ? 4 : 3, tags: ['gift', 'received', 'player', 'social', appeal < -0.2 ? 'unpleasant' : 'pleasant'], about: ['player'] });
    v.needs.social = Math.min(100, v.needs.social + 5);
    this.rt(v).moodBoost = clamp(this.rt(v).moodBoost + appeal * 0.25, -1, 1);
    this.bus.emit({ type: 'sfx', name: 'gift', pos: { ...v.pos } });
    this.bus.emit({ type: 'player', what: 'gift', detail: `${v.id}:${id}` });
    if (Math.abs(appeal) > 0.4) this.log(`${this.player.name} gave ${this.short(v.id)} ${name.toLowerCase()}.${appeal > 0.5 ? ` ${this.short(v.id)} was delighted.` : appeal < -0.2 ? ` ${this.short(v.id)} did not hide the disappointment.` : ''}`, appeal > 0.5 ? 4 : 3, [v.id]);
    return { ok: true, reaction };
  }

  playerEnter(placeId: PlaceId): boolean {
    const p = this.world.place(placeId);
    if (!p || !p.interior) return false;
    if (p.kind === 'shop' && !this.isOpen(p)) return false;
    if (p.kind === 'home' && p.owner && p.owner !== 'player') { const o = this.villager(p.owner); if (o && (o.relationships.player?.affinity ?? 0) < -10) return false; if (o && !this.atPlace(o, p.id) && (o.relationships.player?.affinity ?? 0) < 25) return false; }
    this.player.inside = p.id;
    this.player.pos = { ...p.interior };
    this.bus.emit({ type: 'sfx', name: 'door', pos: { ...(p.door ?? p.anchor) } });
    this.bus.emit({ type: 'player', what: 'enter', detail: p.id });
    return true;
  }

  playerLeave(): void {
    if (!this.player.inside) return;
    const p = this.world.place(this.player.inside);
    this.player.inside = undefined;
    const door = p?.door ?? p?.anchor ?? this.player.pos;
    this.player.pos = this.world.nearestWalkable({ x: door.x, y: door.y + 1 }, 3);
    this.player.facing = 'down';
    this.bus.emit({ type: 'sfx', name: 'door', pos: { ...door } });
    this.bus.emit({ type: 'player', what: 'leave', detail: p?.id });
  }

  playerBuy(placeId: PlaceId, id: ItemId, qty = 1): { ok: boolean; message: string; cost: number } {
    const shop = this.shops.get(placeId);
    const p = this.world.place(placeId);
    if (!shop || !p) return { ok: false, message: 'That is not a shop.', cost: 0 };
    if (!this.isOpen(p)) return { ok: false, message: `${p.name} is closed.`, cost: 0 };
    const have = stockOf(shop, id);
    if (have < qty) return { ok: false, message: have ? `Only ${have} left.` : `${p.name} has no ${item(id).name.toLowerCase()}.`, cost: 0 };
    const unit = buyPrice(shop, id, eventMult(this, id));
    const cost = unit * qty;
    if (this.player.money < cost) return { ok: false, message: `You need ${cost} coins.`, cost };
    removeStock(shop, id, qty); noteBuy(shop, id, qty);
    this.player.money -= cost; this.give(this.player, { id, qty });
    const owner = shop.owner ? this.villager(shop.owner) : undefined;
    if (owner) { owner.money += Math.round(cost * 0.8); owner.stats.moneyEarned = (owner.stats.moneyEarned ?? 0) + Math.round(cost * 0.8); this.remember(owner, { kind: 'observation', text: `${this.player.name} bought ${qty} ${item(id).name.toLowerCase()} at ${p.name}`, importance: 2, tags: ['trade', 'player', 'money'], about: ['player'] }); if (this.atPlace(owner, placeId)) this.adjustRelationship(owner, 'player', { affinity: 1, familiarity: 1 }); }
    this.bus.emit({ type: 'sfx', name: 'coin', pos: { ...this.player.pos } });
    this.bus.emit({ type: 'player', what: 'buy', detail: `${id}:${qty}` });
    return { ok: true, message: `Bought ${qty} ${item(id).name} for ${cost} coins.`, cost };
  }

  playerSell(placeId: PlaceId, id: ItemId, qty = 1): { ok: boolean; message: string; earned: number } {
    const shop = this.shops.get(placeId);
    const p = this.world.place(placeId);
    if (!shop || !p) return { ok: false, message: 'That is not a shop.', earned: 0 };
    if (!this.isOpen(p)) return { ok: false, message: `${p.name} is closed.`, earned: 0 };
    if (!this.has(this.player, id, qty)) return { ok: false, message: `You do not have ${qty} ${item(id).name.toLowerCase()}.`, earned: 0 };
    if (!shopWants(shop, id)) return { ok: false, message: `${p.name} does not buy ${item(id).name.toLowerCase()}.`, earned: 0 };
    const unit = sellPrice(shop, id, eventMult(this, id));
    const earned = unit * qty;
    this.take(this.player, { id, qty }); this.player.money += earned;
    const cur = shop.stock.find((s) => s.id === id); if (cur) cur.qty += qty; else shop.stock.push({ id, qty });
    noteSell(shop, id, qty);
    const owner = shop.owner ? this.villager(shop.owner) : undefined;
    if (owner) { owner.money = Math.max(0, owner.money - Math.round(earned * 0.6)); if (this.atPlace(owner, placeId)) this.adjustRelationship(owner, 'player', { affinity: 0.5, trust: 1, familiarity: 1 }); }
    this.bus.emit({ type: 'sfx', name: 'coin', pos: { ...this.player.pos } });
    this.bus.emit({ type: 'player', what: 'sell', detail: `${id}:${qty}` });
    return { ok: true, message: `Sold ${qty} ${item(id).name} for ${earned} coins.`, earned };
  }

  playerAcceptRequest(id: string): boolean {
    const r = this.requests.find((x) => x.id === id && !x.done && !x.acceptedBy && x.expiresAt > this.now);
    if (!r) return false;
    r.acceptedBy = 'player';
    this.bus.emit({ type: 'request', request: r, phase: 'accepted' });
    if (r.by !== 'player') { const v = this.villager(r.by); if (v) this.remember(v, { kind: 'observation', text: `${this.player.name} took on the request for ${r.text}`, importance: 3, tags: ['request', 'promise', 'player'], about: ['player'] }); }
    this.log(`${this.player.name} took on ${this.short(r.by)}'s request for ${r.text}.`, 3, r.by === 'player' ? [] : [r.by]);
    return true;
  }

  playerCompleteRequest(id: string): { ok: boolean; message: string } {
    const r = this.requests.find((x) => x.id === id && !x.done && x.acceptedBy === 'player');
    if (!r) return { ok: false, message: 'No such request.' };
    for (const n of r.needs) if (!this.has(this.player, n.id, n.qty)) return { ok: false, message: `You still need ${n.qty} ${item(n.id).name.toLowerCase()}.` };
    const poster = r.by === 'player' ? undefined : this.villager(r.by);
    for (const n of r.needs) { this.take(this.player, n); if (poster) this.give(poster, { ...n }); }
    const reward = r.reward.money ?? 0;
    this.player.money += reward;
    if (poster) poster.money = Math.max(0, poster.money - reward);
    if (r.reward.item) this.give(this.player, { ...r.reward.item });
    r.done = true;
    this.bus.emit({ type: 'request', request: r, phase: 'done' });
    if (poster) { this.adjustRelationship(poster, 'player', interactionDelta('help', poster, null), `brought ${r.text}`); this.remember(poster, { kind: 'observation', text: `${this.player.name} brought the ${r.text} ${this.short(poster.id)} asked for`, importance: 6, tags: ['request', 'helped', 'pleasant', 'player', 'promise'], about: ['player'] }); this.say(poster, this.rng.pick(['You found it! Thank you, truly.', 'I knew I could count on you.', 'Perfect. Here is what I promised.']), 'player', 'warm'); this.emote(poster, 'happy'); }
    this.log(`${this.player.name} delivered ${r.text} to ${this.short(r.by)}.`, 4, poster ? [poster.id] : []);
    this.bus.emit({ type: 'sfx', name: 'coin', pos: { ...this.player.pos } });
    return { ok: true, message: `Delivered. You earned ${reward} coins.` };
  }

  /* ---------------------------------------------------------- seeding */

  private seedRelationships(): void {
    for (const a of this.villagers) {
      const spec = VILLAGER_BY_ID[a.id];
      for (const b of this.villagers) {
        if (a.id === b.id) continue;
        const op = spec.opinions[b.id] ?? 0;
        const r = newRelationship(op);
        r.familiarity = 12 + Math.abs(op) * 0.5 + this.rng.range(0, 8);
        r.trust = clamp(25 + op * 0.6 + this.rng.range(-5, 5), 0, 100);
        r.lastTalked = this.now - this.rng.int(0, 3) * 1440;
        r.label = 'stranger';
        r.label = ((): Relationship['label'] => { const { labelFor } = { labelFor: (x: Relationship) => (x.affinity <= -30 ? 'rival' : x.affinity >= 25 ? 'friend' : 'acquaintance') as Relationship['label'] }; return labelFor(r); })();
        a.relationships[b.id] = r;
      }
      a.relationships.player = newRelationship(0);
      a.relationships.player.familiarity = 0;
      a.relationships.player.label = 'stranger';
    }
    // a few asymmetries with history
    const jc = this.villager('jory')!.relationships.cerys; jc.romance = 18;
    const cj = this.villager('cerys')!.relationships.jory; cj.romance = 22;
    const fh = this.villager('finn')!.relationships.hal; fh.trust = 20;
    const hf = this.villager('hal')!.relationships.finn; hf.trust = 10;
    const gb = this.villager('greta')!.relationships.bram; gb.romance = 10;
    const ie = this.villager('ines')!.relationships.elin; ie.familiarity = 40;
    const ei = this.villager('elin')!.relationships.ines; ei.familiarity = 40;
    for (const v of this.villagers) for (const r of Object.values(v.relationships)) { r.label = r.label === 'stranger' && r.familiarity >= 8 ? 'acquaintance' : r.label; }
  }

  private seedMemories(): void {
    const t0 = this.now;
    const M = (id: VillagerId, text: string, importance: number, tags: string[], about?: VillagerId[]) => { const v = this.villager(id)!; v.memory.push({ id: nextMemoryId(), t: t0 - this.rng.int(1, 4) * 1440, kind: 'observation', text, importance, tags, about }); };
    M('finn', 'Finn still owes Hal 80 coins from the winter', 6, ['money', 'debt', 'unpleasant'], ['hal']);
    M('hal', 'Finn owes the store 80 coins and keeps changing the subject', 6, ['money', 'debt', 'unpleasant'], ['finn']);
    M('cerys', 'Jory whistled outside the bakery for a whole hour last week', 5, ['romance', 'pleasant', 'flirt'], ['jory']);
    M('jory', 'Cerys gave Jory the last sweet roll and would not take a coin for it', 5, ['romance', 'gift', 'received', 'pleasant'], ['cerys']);
    M('cerys', 'Dov told Cerys her sweet rolls were "fine". Fine!', 4, ['unpleasant', 'gossip'], ['dov']);
    M('greta', "Greta's grandmother swore there was a gold vein under the east shaft", 6, ['mining', 'dream', 'superstition']);
    M('greta', 'Bram made Greta a new pick handle and did not charge for it', 5, ['gift', 'received', 'pleasant'], ['bram']);
    M('bram', 'Greta comes by the smithy most evenings. Bram pretends not to notice', 4, ['romance', 'quiet'], ['greta']);
    M('elin', 'Finn drank himself sick at the Lantern Night and Elin had to sit up with him', 5, ['drunk', 'sick', 'unpleasant'], ['finn']);
    M('elin', 'Ines brought Elin a book about herbs. A thoughtful gift', 5, ['gift', 'received', 'pleasant', 'books'], ['ines']);
    M('ines', 'Greta called the library "a warehouse for dust". Ines has not forgotten', 5, ['unpleasant', 'argued'], ['greta']);
    M('ines', 'There is a map fragment in the library archive. The other half is somewhere in the village', 6, ['mystery', 'lore', 'map']);
    M('ada', 'Jory promised to fix the farm fence three weeks ago. It is still broken', 5, ['promise', 'unpleasant', 'laziness'], ['jory']);
    M('jory', 'Ada keeps asking about the fence. Jory will get to it. Probably', 3, ['promise', 'work'], ['ada']);
    M('dov', 'Dov saw the great salmon jump at dawn. Nobody believes him', 6, ['fish', 'dream', 'story']);
    M('dov', 'Elin is the only one who does not fill silence with talk', 4, ['pleasant', 'quiet'], ['elin']);
    M('hal', 'Ada paid for her seeds in exact coin, as always. A good customer', 3, ['money', 'trade', 'pleasant'], ['ada']);
    M('ada', 'Bram sharpened the hoe and would only take a loaf for it', 4, ['helped', 'pleasant'], ['bram']);
    M('finn', 'Jory played the fiddle at the Owl until midnight. Best night in months', 5, ['music', 'pleasant', 'tavern'], ['jory']);
    M('greta', 'Hal charged Greta double for a lantern and called it "mine prices"', 4, ['money', 'unpleasant'], ['hal']);
    // starting goals from dreams and situations
    const G = (id: VillagerId, text: string, priority: number) => { this.villager(id)!.goals.push({ id: `g0_${id}_${text.length}`, text, priority, createdAt: t0 }); };
    G('ada', 'get the spring crops in the ground', 8); G('bram', 'forge something worth remembering', 5); G('cerys', 'find out what everyone is up to', 4); G('dov', 'catch the great salmon', 6); G('elin', 'keep everyone well this season', 6);
    G('finn', 'pay Hal back some of what is owed', 5); G('greta', 'find the gold vein', 6); G('hal', 'turn a good profit this week', 6); G('ines', 'write a chapter of the history of Pebblebrook', 5); G('jory', 'fix Ada\'s fence before she explodes', 5);
  }

  /* ------------------------------------------------------- save/load */

  save(): unknown {
    return {
      v: 1, rng: this.rng.state, memorySeq: getMemorySeq(), requestSeq: this.requestSeq,
      villagers: this.villagers.map((v) => ({ ...v, action: null, queue: [], speech: undefined, emote: undefined })),
      runtime: this.villagers.map((v) => { const r = this.rt(v); return { id: v.id, sleptAtHome: r.sleptAtHome, reflectedDay: r.reflectedDay, moneyAtDawn: r.moneyAtDawn, flagUntil: r.flagUntil, wakeHour: r.wakeHour, moodBoost: r.moodBoost, recentTools: r.recentTools }; }),
      player: { ...this.player, talkingTo: undefined },
      requests: this.requests, events: this.events, chronicle: this.chronicle,
      shops: [...this.shops.values()],
      lastHourSeen: this.lastHourSeen,
    };
  }

  load(data: unknown): void {
    if (!data || typeof data !== 'object') return;
    const d = data as ReturnType<SimImpl['save']> & Record<string, unknown>;
    const s = d as { rng?: number; memorySeq?: number; requestSeq?: number; villagers?: Villager[]; runtime?: Partial<VillagerRuntime>[]; player?: PlayerState; requests?: Request[]; events?: ActiveEvent[]; chronicle?: SimImpl['chronicle']; shops?: ShopState[]; lastHourSeen?: number };
    if (typeof s.rng === 'number') this.rng.state = s.rng;
    if (typeof s.memorySeq === 'number') setMemorySeq(Math.max(getMemorySeq(), s.memorySeq));
    if (typeof s.requestSeq === 'number') this.requestSeq = s.requestSeq;
    for (const v of this.villagers) { const rt = this.rt(v); if (rt.conversation) this.conv.leave(v, 'load'); }
    this.playerConv = null; this.playerConvVillager = null; this.conversations = [];
    if (Array.isArray(s.villagers)) for (const sv of s.villagers) { const v = this.villager(sv.id); if (!v) continue; Object.assign(v, sv, { action: null, queue: [], speech: undefined, emote: undefined }); this.runtime.set(v.id, createRuntime(v.id)); }
    if (Array.isArray(s.runtime)) for (const r of s.runtime) { const v = r.id ? this.villager(r.id) : undefined; if (!v) continue; const rt = this.rt(v); Object.assign(rt, { sleptAtHome: r.sleptAtHome ?? {}, reflectedDay: r.reflectedDay ?? 0, moneyAtDawn: r.moneyAtDawn ?? v.money, flagUntil: r.flagUntil ?? {}, wakeHour: r.wakeHour ?? wakeHourOf(v.plan), moodBoost: r.moodBoost ?? 0, recentTools: r.recentTools ?? [] }); rt.idleSince = this.now; }
    if (s.player) Object.assign(this.player, s.player, { talkingTo: undefined });
    if (Array.isArray(s.requests)) this.requests = s.requests;
    if (Array.isArray(s.events)) this.events = s.events;
    if (Array.isArray(s.chronicle)) this.chronicle = s.chronicle.slice(-CHRONICLE_CAP);
    if (Array.isArray(s.shops)) for (const sh of s.shops) { const cur = this.shops.get(sh.place); if (cur) Object.assign(cur, sh); }
    this.lastHourSeen = typeof s.lastHourSeen === 'number' ? s.lastHourSeen : this.world.time.hour;
    for (const v of this.villagers) { v.pos = { x: Math.round(v.pos.x), y: Math.round(v.pos.y) }; const rt = this.rt(v); const h = this.hourFloat(); if (h < rt.wakeHour || h >= 23.5) { const p = this.world.place(v.home); if (p) { v.inside = v.home; v.pos = { ...(p.interior ?? p.anchor) }; } this.startSleeping(v, rt, ((h < rt.wakeHour ? rt.wakeHour : rt.wakeHour + 24) - h) * 60); } }
  }
}

/* ------------------------------------------------------------ helpers */

function tagsFor(args: Record<string, unknown>, sim: SimImpl): string[] {
  const tags: string[] = [];
  for (const k of ['target', 'villager', 'for', 'about']) { const v = sim.resolveVillager(args[k]); if (v) tags.push(v.id); }
  for (const k of ['place', 'area', 'spot']) { const p = sim.resolvePlace(args[k]); if (p) tags.push(p.id); }
  if (typeof args.item === 'string') tags.push(args.item);
  if (typeof args.recipe === 'string') tags.push(args.recipe);
  if (typeof args.crop === 'string') tags.push(args.crop);
  return tags;
}

function aboutFor(args: Record<string, unknown>, sim: SimImpl, v: Villager): VillagerId[] | undefined {
  const out: VillagerId[] = [];
  for (const k of ['target', 'villager', 'for', 'about']) { const o = sim.resolveVillager(args[k]); if (o && o.id !== v.id && !out.includes(o.id)) out.push(o.id); }
  return out.length ? out : undefined;
}

function intentText(intent: string, sim: SimImpl): string {
  if (intent.startsWith('ask_about:')) { const v = sim.resolveVillager(intent.slice(10)); return v ? `What do you make of ${sim.short(v.id)}?` : `What do you know about ${intent.slice(10)}?`; }
  const map: Record<string, string> = { greet: 'Hello!', day: 'How has your day been?', gossip: 'Heard anything interesting lately?', help: 'Is there anything I can help you with?', joke: 'Want to hear a joke?', compliment: 'You are doing a fine job around here, you know.', trade: 'Would you be up for a trade?', goodbye: 'I should get going. See you around.' };
  return map[intent] ?? intent;
}

export { relationOf };
