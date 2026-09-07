/**
 * The notice board's supply side: plausible requests generated from villagers' trades and state, a
 * relationship bonus when someone completes one, and the three-step map/hill/heirloom story chain.
 */
import type { BusEvent } from '../core/bus.ts';
import { item } from '../core/items.ts';
import type { ItemStack, Request, Season, Villager, VillagerId } from '../core/types.ts';
import type { Sim } from '../core/app.ts';
import { addGoal, chronicle, completeGoals, first, remember, toast } from './helpers.ts';
import type { EventCtx } from './types.ts';

export interface RequestRule {
  by: VillagerId;
  text: string;
  needs: ItemStack[];
  /** relative likelihood among the villager's eligible rules */
  weight: number;
  seasons?: Season[];
  /** occasionally added on top of the coin reward */
  bonus?: ItemStack;
  /** expiry in days (default 4) */
  days?: number;
  when?: (sim: Sim, v: Villager) => boolean;
}

const evening = (sim: Sim): boolean => sim.world.time.hour >= 15;
const lowOn = (id: string, n: number) => (sim: Sim, v: Villager): boolean => !sim.has(v, id, n);

/** What each villager plausibly needs. Item ids are from core/items.ts. */
export const REQUEST_RULES: RequestRule[] = [
  // Ada — farm upkeep
  { by: 'ada', text: '2 pouches of nails and 4 wood to mend the far fence', needs: [{ id: 'nails', qty: 2 }, { id: 'wood', qty: 4 }], weight: 3 },
  { by: 'ada', text: '3 fertiliser for the new beds', needs: [{ id: 'fertiliser', qty: 3 }], weight: 3, seasons: ['spring', 'summer', 'autumn'] },
  { by: 'ada', text: '2 loaves for the field lunch — no time to bake', needs: [{ id: 'bread', qty: 2 }], weight: 2 },
  { by: 'ada', text: '5 wood for a new field gate', needs: [{ id: 'wood', qty: 5 }], weight: 2 },
  { by: 'ada', text: 'a herbal tonic for the cow that is off her feed', needs: [{ id: 'tonic', qty: 1 }], weight: 1 },
  // Bram — the forge
  { by: 'bram', text: '5 copper ore for a batch of lanterns', needs: [{ id: 'copper_ore', qty: 5 }], weight: 3, bonus: { id: 'horseshoe', qty: 1 } },
  { by: 'bram', text: '4 iron ore — the pickaxe orders are stacking up', needs: [{ id: 'iron_ore', qty: 4 }], weight: 3 },
  { by: 'bram', text: '4 wood for tool handles', needs: [{ id: 'wood', qty: 4 }], weight: 2 },
  { by: 'bram', text: '2 strong coffees for the early shift', needs: [{ id: 'coffee', qty: 2 }], weight: 1 },
  { by: 'bram', text: '4 stone for relining the hearth', needs: [{ id: 'stone', qty: 4 }], weight: 1 },
  // Cerys — the bakery
  { by: 'cerys', text: '3 jars of honey for the sweet rolls', needs: [{ id: 'honey', qty: 3 }], weight: 4, bonus: { id: 'sweet_roll', qty: 2 } },
  { by: 'cerys', text: '3 wild berries for a pie', needs: [{ id: 'berries', qty: 3 }], weight: 3, seasons: ['spring', 'summer'], bonus: { id: 'berry_pie', qty: 1 } },
  { by: 'cerys', text: '4 eggs for the morning batch', needs: [{ id: 'egg', qty: 4 }], weight: 3 },
  { by: 'cerys', text: '3 strawberries for a tart', needs: [{ id: 'strawberry', qty: 3 }], weight: 2, seasons: ['spring'] },
  { by: 'cerys', text: '4 apples for an apple cake', needs: [{ id: 'apple', qty: 4 }], weight: 2, seasons: ['summer', 'autumn'] },
  { by: 'cerys', text: '2 flour — the sacks are nearly empty', needs: [{ id: 'flour', qty: 2 }], weight: 2, when: lowOn('flour', 3) },
  // Dov — the dock
  { by: 'dov', text: '2 wood to patch the boat', needs: [{ id: 'wood', qty: 2 }], weight: 3 },
  { by: 'dov', text: '1 cloth for mending the nets', needs: [{ id: 'cloth', qty: 1 }], weight: 2 },
  { by: 'dov', text: '2 herbal teas. Long mornings', needs: [{ id: 'tea', qty: 2 }], weight: 1 },
  { by: 'dov', text: 'a pouch of nails for the dock planks', needs: [{ id: 'nails', qty: 1 }], weight: 1 },
  // Elin — the clinic
  { by: 'elin', text: '3 bunches of herbs for tonics', needs: [{ id: 'herbs', qty: 3 }], weight: 4, bonus: { id: 'tonic', qty: 1 } },
  { by: 'elin', text: '1 honey to sweeten the cough syrup', needs: [{ id: 'honey', qty: 1 }], weight: 2 },
  { by: 'elin', text: '2 mushrooms for a poultice', needs: [{ id: 'mushroom', qty: 2 }], weight: 2, seasons: ['autumn'] },
  { by: 'elin', text: '1 cloth for bandages', needs: [{ id: 'cloth', qty: 1 }], weight: 2 },
  // Finn — the tavern
  { by: 'finn', text: '4 perch for tonight\'s stew', needs: [{ id: 'perch', qty: 4 }], weight: 4, bonus: { id: 'stew', qty: 1 } },
  { by: 'finn', text: '4 potatoes for the pot', needs: [{ id: 'potato', qty: 4 }], weight: 3 },
  { by: 'finn', text: '4 apples for a cider pressing', needs: [{ id: 'apple', qty: 4 }], weight: 2, seasons: ['summer', 'autumn'], bonus: { id: 'cider', qty: 2 } },
  { by: 'finn', text: '4 eggs for the breakfast trade', needs: [{ id: 'egg', qty: 4 }], weight: 2 },
  { by: 'finn', text: '6 wood for the tavern fire', needs: [{ id: 'wood', qty: 6 }], weight: 3, seasons: ['autumn', 'winter'] },
  { by: 'finn', text: 'a hand behind the bar tonight — ask at the Owl', needs: [], weight: 1, when: evening, days: 1 },
  // Greta — the mine
  { by: 'greta', text: '2 ales for after the shift', needs: [{ id: 'ale', qty: 2 }], weight: 3 },
  { by: 'greta', text: '3 beeswax candles for the lower gallery', needs: [{ id: 'candle', qty: 3 }], weight: 3, bonus: { id: 'copper_ore', qty: 2 } },
  { by: 'greta', text: '1 iron bar to fix the pick head', needs: [{ id: 'iron_bar', qty: 1 }], weight: 2 },
  { by: 'greta', text: '2 bread for the shift bag', needs: [{ id: 'bread', qty: 2 }], weight: 2 },
  { by: 'greta', text: 'a horseshoe — for luck, before the third gallery', needs: [{ id: 'horseshoe', qty: 1 }], weight: 1, when: lowOn('horseshoe', 1) },
  // Hal — the store
  { by: 'hal', text: '5 turnips — the shelf is bare', needs: [{ id: 'turnip', qty: 5 }], weight: 3, seasons: ['spring'] },
  { by: 'hal', text: '6 eggs for the store', needs: [{ id: 'egg', qty: 6 }], weight: 3 },
  { by: 'hal', text: '2 wool — there is a buyer in the city', needs: [{ id: 'wool', qty: 2 }], weight: 2 },
  { by: 'hal', text: '5 wood for crates', needs: [{ id: 'wood', qty: 5 }], weight: 2 },
  { by: 'hal', text: '3 mushrooms for a customer', needs: [{ id: 'mushroom', qty: 3 }], weight: 2, seasons: ['autumn'] },
  { by: 'hal', text: '2 pumpkins for the store window', needs: [{ id: 'pumpkin', qty: 2 }], weight: 2, seasons: ['autumn'] },
  // Ines — the library
  { by: 'ines', text: 'a book I have not read, any book', needs: [{ id: 'book', qty: 1 }], weight: 3 },
  { by: 'ines', text: '2 beeswax candles for reading late', needs: [{ id: 'candle', qty: 2 }], weight: 3 },
  { by: 'ines', text: '2 wildflowers to press in the herbarium', needs: [{ id: 'wildflower', qty: 2 }], weight: 2, seasons: ['spring', 'summer'] },
  { by: 'ines', text: '2 herbal teas for the reading room', needs: [{ id: 'tea', qty: 2 }], weight: 1 },
  // Jory — the yard
  { by: 'jory', text: '8 wood for a commission', needs: [{ id: 'wood', qty: 8 }], weight: 4, bonus: { id: 'birdhouse', qty: 1 } },
  { by: 'jory', text: '2 pouches of nails', needs: [{ id: 'nails', qty: 2 }], weight: 3 },
  { by: 'jory', text: '1 cloth for a chair seat', needs: [{ id: 'cloth', qty: 1 }], weight: 2 },
  { by: 'jory', text: '3 wool for cushions', needs: [{ id: 'wool', qty: 3 }], weight: 2 },
  { by: 'jory', text: '2 ciders. It helps the whittling', needs: [{ id: 'cider', qty: 2 }], weight: 1 },
  { by: 'jory', text: '3 stone for the workshop step', needs: [{ id: 'stone', qty: 3 }], weight: 1 },
];

/** The story chain: the map's other half → a lantern for the hill → candles for the Stoneleigh remembrance. */
interface ChainStep { by: VillagerId; text: string; needs: ItemStack[]; money: number; bonus?: ItemStack; days: number; goal: string; onDone(ctx: EventCtx, r: Request): void }

const CHAIN: ChainStep[] = [
  {
    by: 'ines', text: 'the other half of the old map (a map fragment) — the merchant sometimes has one', needs: [{ id: 'map_fragment', qty: 1 }], money: 60, bonus: { id: 'poetry', qty: 1 }, days: 10, goal: 'find the other half of the old map',
    onDone(ctx, r) {
      const ines = ctx.sim.villager('ines'); if (!ines) return;
      const who = r.acceptedBy ?? 'player';
      remember(ctx.sim, ines, `The two halves of the map fit. Together they show Library Hill, and a mark by the old bench. ${ctx.name(who)} brought the second half`, 9, ['map', 'mystery', 'story', 'pleasant'], who === 'player' ? ['player'] : [who], 'library');
      addGoal(ines, 'search Library Hill by the old bench — at night, with a lantern', 8, ctx.now);
      chronicle(ctx.sim, 'Ines has both halves of the old map. It shows Library Hill, and a mark by the bench.', 7, ['ines'], 'library');
      toast(ctx.sim, 'The map is whole. Ines needs a lantern to search the hill.', 'good');
    },
  },
  {
    by: 'ines', text: 'a lantern — to search Library Hill at night where the map says', needs: [{ id: 'lantern', qty: 1 }], money: 50, days: 8, goal: 'search the hill by lantern light',
    onDone(ctx, r) {
      const ines = ctx.sim.villager('ines'), greta = ctx.sim.villager('greta'); if (!ines) return;
      const who = r.acceptedBy ?? 'player';
      remember(ctx.sim, ines, `By lantern light, under the bench on Library Hill: a locket with a green stone, and the name STONELEIGH scratched inside. Greta's family`, 10, ['heirloom', 'mystery', 'story', 'pleasant', 'lore'], ['greta'], 'hill');
      remember(ctx.sim, ines, `${ctx.name(who)} found the lantern that let Ines search the hill`, 6, ['story', 'helped', 'pleasant'], who === 'player' ? ['player'] : [who]);
      if (greta) {
        ctx.sim.give(greta, { id: 'gem', qty: 1 });
        remember(ctx.sim, greta, 'Ines found a locket on the hill with STONELEIGH scratched inside — grandmother\'s. Greta has never liked books and is reconsidering', 10, ['heirloom', 'mystery', 'story', 'family', 'pleasant'], ['ines'], 'hill');
        ctx.sim.adjustRelationship(greta, 'ines', { affinity: 20, trust: 22, familiarity: 6 }, 'found grandmother\'s locket');
        ctx.sim.adjustRelationship(ines, 'greta', { affinity: 10, familiarity: 6 }, 'the locket');
        addGoal(greta, 'hold a remembrance for grandmother at the graveyard', 8, ctx.now);
        addGoal(ines, 'write the Stoneleigh chapter of the history', 7, ctx.now);
      }
      for (const v of ctx.sim.villagers) if (v.id !== 'ines' && v.id !== 'greta') remember(ctx.sim, v, 'Ines dug a locket out from under the bench on Library Hill — a Stoneleigh heirloom, lost for fifty years', 6, ['heirloom', 'mystery', 'story', 'news'], ['ines', 'greta']);
      chronicle(ctx.sim, 'Under the bench on Library Hill, by lantern light, Ines found the Stoneleigh locket.', 9, ['ines', 'greta'], 'hill');
      toast(ctx.sim, 'Ines found the Stoneleigh locket on the hill.', 'good');
    },
  },
  {
    by: 'greta', text: '2 beeswax candles for a remembrance at grandmother\'s grave', needs: [{ id: 'candle', qty: 2 }], money: 45, bonus: { id: 'horseshoe', qty: 1 }, days: 8, goal: 'hold a remembrance for grandmother',
    onDone(ctx, r) {
      const greta = ctx.sim.villager('greta'), ines = ctx.sim.villager('ines');
      const who = r.acceptedBy ?? 'player';
      if (greta) { remember(ctx.sim, greta, `Candles at grandmother's grave, the locket round Greta's neck, Ines reading the old deed out loud. ${ctx.name(who)} brought the candles`, 10, ['heirloom', 'story', 'family', 'pleasant', 'remembrance'], who === 'player' ? ['player', 'ines'] : [who, 'ines'], 'graveyard'); completeGoals(greta, 'hold a remembrance'); greta.needs.purpose = Math.min(100, greta.needs.purpose + 40); }
      if (ines && greta) { remember(ctx.sim, ines, 'Ines read the founding deed at the Stoneleigh remembrance. Greta cried and then punched her arm, gently', 9, ['heirloom', 'story', 'lore', 'pleasant'], ['greta'], 'graveyard'); ctx.sim.adjustRelationship(ines, 'greta', { affinity: 12, trust: 10, familiarity: 6 }); ctx.sim.adjustRelationship(greta, 'ines', { affinity: 12, trust: 10, familiarity: 6 }); completeGoals(ines, 'write the Stoneleigh chapter'); }
      for (const v of ctx.sim.villagers) if (v.id !== 'greta' && v.id !== 'ines') remember(ctx.sim, v, 'The Stoneleigh remembrance at the graveyard: candles, the locket, and Ines reading. The mystery of the old map is finished', 6, ['heirloom', 'story', 'news', 'pleasant'], ['greta', 'ines'], 'graveyard');
      chronicle(ctx.sim, 'The Stoneleigh remembrance: candles at the grave, the locket returned, the map\'s story told. Greta and Ines are friends now, to everyone\'s surprise.', 9, ['greta', 'ines'], 'graveyard');
      toast(ctx.sim, 'The map mystery is solved.', 'good');
    },
  },
];

export interface RequestGenState {
  v: 1;
  lastPostDay: Record<VillagerId, number>;
  /** ids of requests this generator posted */
  mine: string[];
  chain: { step: number; requestId: string | null; done: boolean; nextPostMinute: number };
  rewarded: string[];
}

const MAX_OPEN_PER_VILLAGER = 2;
const MAX_OPEN_TOTAL = 8;
const HOURLY_CHANCE = 0.03;

export class RequestGenerator {
  private sim: Sim;
  state: RequestGenState = { v: 1, lastPostDay: {}, mine: [], chain: { step: 0, requestId: null, done: false, nextPostMinute: 2 * 1440 }, rewarded: [] };
  /** counters for the chronicle/tests */
  stats = { posted: 0, completed: 0, expired: 0, chainSteps: 0 };

  constructor(sim: Sim) { this.sim = sim; }

  /** Hourly: maybe post something for each villager, and keep the story chain moving. */
  update(ctx: EventCtx): void {
    const t = ctx.time;
    const open = this.sim.requests.filter((r) => !r.done && !r.expired && r.expiresAt > ctx.now);
    this.chainTick(ctx, open);
    if (t.hour < 8 || t.hour > 18) return;
    if (open.length >= MAX_OPEN_TOTAL) return;
    for (const v of this.sim.villagers) {
      if ((this.state.lastPostDay[v.id] ?? -9) >= t.dayIndex) continue;
      if (open.filter((r) => r.by === v.id).length >= MAX_OPEN_PER_VILLAGER) continue;
      const restless = 1 + Math.max(0, 60 - v.needs.purpose) / 100;
      if (!ctx.rng.chance(HOURLY_CHANCE * restless)) continue;
      const rule = this.pickRule(ctx, v, open);
      if (!rule) continue;
      this.post(ctx, v, rule);
      if (open.length + 1 >= MAX_OPEN_TOTAL) break;
    }
  }

  private pickRule(ctx: EventCtx, v: Villager, open: Request[]): RequestRule | null {
    const season = ctx.time.season;
    const eligible = REQUEST_RULES.filter((r) => r.by === v.id && (!r.seasons || r.seasons.includes(season)) && (!r.when || r.when(this.sim, v))
      && !open.some((o) => o.by === v.id && o.text === r.text)
      && (r.needs.length === 0 || r.needs.some((n) => !this.sim.has(v, n.id, n.qty)))
      && v.money >= rewardFor(r.needs) + 5);
    if (!eligible.length) return null;
    const total = eligible.reduce((s, r) => s + r.weight, 0);
    let x = ctx.rng.next() * total;
    for (const r of eligible) { x -= r.weight; if (x <= 0) return r; }
    return eligible[eligible.length - 1];
  }

  private post(ctx: EventCtx, v: Villager, rule: RequestRule): Request {
    const money = rule.needs.length ? rewardFor(rule.needs) + ctx.rng.int(0, 6) : 12 + ctx.rng.int(0, 8);
    const reward: Request['reward'] = { money };
    if (rule.bonus && ctx.rng.chance(0.35) && this.sim.has(v, rule.bonus.id, rule.bonus.qty)) reward.item = { ...rule.bonus };
    const r = this.sim.postRequest(v.id, rule.text, reward, rule.needs.map((n) => ({ ...n })));
    r.expiresAt = ctx.now + (rule.days ?? 4) * 1440;
    this.state.mine.push(r.id);
    this.state.lastPostDay[v.id] = ctx.time.dayIndex;
    this.stats.posted++;
    remember(this.sim, v, `${first(v)} put a request on the board: ${rule.text} (${money} coins)`, 3, ['request', 'board', 'plan']);
    return r;
  }

  private chainTick(ctx: EventCtx, open: Request[]): void {
    const c = this.state.chain;
    if (c.done) return;
    if (c.requestId) {
      const r = this.sim.requests.find((x) => x.id === c.requestId);
      if (!r) { c.requestId = null; c.nextPostMinute = ctx.now + 1440; }
      else if (r.expired || (r.expiresAt <= ctx.now && !r.done)) { c.requestId = null; c.nextPostMinute = ctx.now + 2 * 1440; }
      return;
    }
    if (ctx.now < c.nextPostMinute) return;
    const step = CHAIN[c.step];
    if (!step) { c.done = true; return; }
    const by = this.sim.villager(step.by);
    if (!by) return;
    if (open.filter((r) => r.by === by.id).length >= MAX_OPEN_PER_VILLAGER) { c.nextPostMinute = ctx.now + 360; return; }
    const r = this.sim.postRequest(by.id, step.text, { money: step.money, ...(step.bonus ? { item: { ...step.bonus } } : {}) }, step.needs.map((n) => ({ ...n })));
    r.expiresAt = ctx.now + step.days * 1440;
    c.requestId = r.id;
    this.state.mine.push(r.id);
    addGoal(by, step.goal, 7, ctx.now);
    remember(this.sim, by, `${first(by)} posted on the board: ${step.text}`, 5, ['request', 'board', 'story', 'plan']);
    this.stats.posted++;
  }

  /** Bus hook: completion bonus, expiry memories, chain advancement. */
  onRequest(e: Extract<BusEvent, { type: 'request' }>, ctx: EventCtx): void {
    const r = e.request;
    if (e.phase === 'done') {
      if (this.state.rewarded.includes(r.id)) return;
      this.state.rewarded.push(r.id);
      if (this.state.rewarded.length > 200) this.state.rewarded.splice(0, 100);
      this.stats.completed++;
      const poster = r.by === 'player' ? undefined : this.sim.villager(r.by);
      const helper = r.acceptedBy ?? 'player';
      if (poster && helper !== poster.id) {
        this.sim.adjustRelationship(poster, helper, { affinity: 4, trust: 6, familiarity: 2 }, `helped with ${r.text}`);
        if (helper !== 'player') { const h = this.sim.villager(helper); if (h) { this.sim.adjustRelationship(h, poster.id, { affinity: 2, familiarity: 2 }); remember(this.sim, h, `${first(h)} completed ${first(poster)}'s request for ${r.text}`, 4, ['request', 'helped', 'pleasant'], [poster.id]); } }
      }
      const c = this.state.chain;
      if (c.requestId === r.id && !c.done) {
        const step = CHAIN[c.step];
        try { step?.onDone(ctx, r); } catch { /* keep the chain moving even if a hook fails */ }
        c.step++; c.requestId = null; c.nextPostMinute = ctx.now + 1440 + ctx.rng.int(0, 720);
        this.stats.chainSteps++;
        if (c.step >= CHAIN.length) c.done = true;
      }
    } else if (e.phase === 'expired') {
      if (!this.state.mine.includes(r.id)) return;
      this.stats.expired++;
      const poster = r.by === 'player' ? undefined : this.sim.villager(r.by);
      if (poster) remember(this.sim, poster, `Nobody answered ${first(poster)}'s request for ${r.text}. ${poster.personality.neuroticism > 0.5 ? 'Typical' : 'Never mind'}`, 3, ['request', 'board', 'unpleasant']);
    }
  }

  save(): RequestGenState { return { ...this.state, lastPostDay: { ...this.state.lastPostDay }, mine: [...this.state.mine], chain: { ...this.state.chain }, rewarded: [...this.state.rewarded] }; }
  load(s: unknown): void {
    if (!s || typeof s !== 'object') return;
    const d = s as Partial<RequestGenState>;
    this.state = { v: 1, lastPostDay: { ...(d.lastPostDay ?? {}) }, mine: [...(d.mine ?? [])], chain: { step: 0, requestId: null, done: false, nextPostMinute: 2 * 1440, ...(d.chain ?? {}) }, rewarded: [...(d.rewarded ?? [])] };
  }
}

/** Reward rule: item prices × 1.5, plus a little for the trouble. */
export function rewardFor(needs: ItemStack[]): number {
  const value = needs.reduce((s, n) => s + item(n.id).price * n.qty, 0);
  return Math.round(value * 1.5) + 5;
}

export const CHAIN_LENGTH = CHAIN.length;
