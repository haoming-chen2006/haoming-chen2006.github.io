/**
 * LocalBrain: utility-based choice among the available tools — schedule block, needs × personality,
 * opportunities, goals, status, weather, seeded randomness, anti-repetition — plus a thought in the
 * villager's voice. Decisions resolve synchronously through decideSync (see specs/NOTES-sim.md).
 */
import { CROPS, item } from '../core/items.ts';
import { SeededRng } from '../core/rng.ts';
import type { Brain, ConversationContext, ConversationTurn, DayPlan, Decision, DecisionContext, ItemId, Place, ScheduleEntry, Villager, VillagerId } from '../core/types.ts';
import { converse, newDialogueState, type DialogueState } from './dialogue.ts';
import { reflectLines } from './templates/reflections.ts';
import { NEED_THOUGHTS, THOUGHTS } from './templates/thoughts.ts';
import { fill, PROFESSION_WORK, timeOfDay, voice, WEATHER_PHRASE, type Slots } from './templates/voice.ts';

interface Cand { tool: string; args: Record<string, unknown>; score: number; key: string; why?: string }

const first = (v: Villager): string => v.name.split(' ')[0];

function blockAt(plan: DayPlan | null, h: number): ScheduleEntry {
  if (!plan || !plan.entries.length) return { hour: 0, block: h < 7 || h >= 22 ? 'sleep' : 'free' };
  let cur: ScheduleEntry | null = null;
  for (const e of plan.entries) if (e.hour <= h) cur = e;
  return cur ?? { hour: 0, block: 'sleep' };
}

export class LocalBrain implements Brain {
  kind: 'local' = 'local';
  private rng: SeededRng;
  private recent = new Map<VillagerId, string[]>();
  private recentKeys = new Map<VillagerId, string[]>();
  private giftsToday = new Map<VillagerId, { day: number; n: number }>();
  private failed = new Map<VillagerId, Map<string, number>>();
  private dialogue: DialogueState = newDialogueState();

  constructor(seed: number) { this.rng = new SeededRng((seed ^ 0xb0a1) >>> 0); }

  decide(ctx: DecisionContext): Promise<Decision> { return Promise.resolve(this.decideSync(ctx)); }
  converse(ctx: ConversationContext): Promise<ConversationTurn> { return Promise.resolve(this.converseSync(ctx)); }
  reflect(ctx: DecisionContext): Promise<string[]> { return Promise.resolve(this.reflectSync(ctx)); }
  chat(): Promise<ConversationTurn | null> { return Promise.resolve(null); }

  converseSync(ctx: ConversationContext): ConversationTurn { return converse(ctx, this.rng, this.dialogue); }
  reflectSync(ctx: DecisionContext): string[] { return reflectLines(ctx.villager, ctx.recent, ctx.world, this.rng); }

  decideSync(ctx: DecisionContext): Decision {
    const v = ctx.villager;
    const sim = ctx.sim;
    const world = ctx.world;
    const rng = this.rng;
    const now = world.time.minute;
    const h = world.time.hour + world.time.min / 60;
    const p = v.personality;
    const n = v.needs;
    const w = world.weather.kind;
    const opts = new Set(ctx.options.map((o) => o.name));
    const cands: Cand[] = [];
    const add = (tool: string, score: number, args: Record<string, unknown> = {}, key?: string, why?: string) => { if (!opts.has(tool)) return; cands.push({ tool, args, score, key: key ?? tool, why }); };
    const has = (id: ItemId, q = 1) => sim.has(v, id, q);
    const count = (pred: (id: ItemId) => boolean) => v.inventory.reduce((a, s) => a + (pred(s.id) ? s.qty : 0), 0);
    const nearby = ctx.nearby.filter((o) => o.id !== v.id);
    const block = blockAt(v.plan, h).block;
    const entry = blockAt(v.plan, h);
    const affinity = (id: VillagerId) => v.relationships[id]?.affinity ?? 0;
    const placeOf = (id: string): Place | undefined => world.place(id);
    const openNow = (id: string): boolean => { const pl = placeOf(id); if (!pl) return false; if (!pl.open) return true; return h >= pl.open[0] && h < pl.open[1]; };
    const inside = v.inside;
    const here = inside ?? world.placeAt({ x: Math.round(v.pos.x), y: Math.round(v.pos.y) })?.id;
    const outdoors = !inside;
    const bad = w === 'rain' || w === 'storm' || w === 'snow';
    const likesRain = p.likes.includes('rain');
    const sick = v.status.includes('sick') || v.status.includes('injured');
    const drunk = v.status.includes('drunk');
    const angry = v.status.includes('angry');
    const tired = v.status.includes('tired');
    const failedTools = this.failed.get(v.id) ?? new Map<string, number>();
    const trigger = ctx.trigger ?? '';
    const failMatch = /^(\w+) failed/.exec(trigger);
    if (failMatch) failedTools.set(failMatch[1], now + 45);
    if (trigger.includes('could not find a way') || trigger.includes('did not want to talk') || trigger.includes('was busy')) { /* nothing extra */ }
    this.failed.set(v.id, failedTools);
    const recent = this.recent.get(v.id) ?? [];
    const recentKeys = this.recentKeys.get(v.id) ?? [];
    const sinceTalk = now - (v.stats.lastConversation ?? -9999);
    const gifts = this.giftsToday.get(v.id);
    const giftsSoFar = gifts && gifts.day === world.time.dayIndex ? gifts.n : 0;

    /* ---------------------------------------------------------- sleep */
    const wakeH = v.plan?.entries.find((e) => e.block !== 'sleep')?.hour ?? 7;
    const sleepH = v.plan?.entries.find((e) => e.block === 'sleep')?.hour ?? 22;
    const rested = n.energy >= 90 && h >= wakeH - 0.6 && h < 12;
    const nightNow = (block === 'sleep' && !rested) || h >= sleepH || h < Math.min(4, wakeH - 1);
    if (nightNow) add('sleep', 90 + (n.energy < 20 ? 30 : 0) + (tired ? 10 : 0) - (v.profession === 'innkeeper' && h < 24 && h >= 22 ? 40 : 0), {}, 'sleep', 'bedtime');
    else if (n.energy < 12) add('sleep', 95, {}, 'sleep', 'exhausted');
    if (n.energy < 40 && h >= 12 && h < 20) add('nap', 25 + (40 - n.energy) * 1.5 + (p.traits.includes('lazy') ? 15 : 0) + (p.likes.includes('naps') ? 15 : 0), {}, 'nap');
    if (n.energy < 50 && !nightNow) add('rest', 12 + (50 - n.energy) * 0.8 + (sick ? 25 : 0), {}, 'rest');

    /* ------------------------------------------------------------ food */
    const meal = ['breakfast', 'lunch', 'dinner'].includes(block);
    const hungerScore = n.hunger < 30 ? 90 : n.hunger < 45 ? 65 : n.hunger < 60 ? 35 : 0;
    if (hungerScore || (meal && n.hunger < 78)) add('eat', Math.max(hungerScore, meal ? 58 : 0) + (meal ? 15 : 0), {}, 'eat');
    if (sick && (has('tonic') || has('bandage'))) add('use_item', 85, { item: has('tonic') ? 'tonic' : 'bandage' }, 'use_item');

    /* ------------------------------------------------------------ work */
    const workBlock = block === 'work';
    const wantsWork = workBlock || n.purpose < 35 || v.goals.some((g) => !g.done && /proper work|earn some money/.test(g.text));
    let base = (workBlock ? 70 : 30) + p.conscientiousness * 15 + (60 - n.purpose) * 0.35 - (sick ? 30 : 0) - (drunk ? 25 : 0) - (tired && !workBlock ? 15 : 0);
    if (entry.note === 'day off' && !workBlock) base -= 10;
    if (wantsWork || workBlock) this.workIntents(v, ctx, add, base, has, count, openNow);

    /* ---------------------------------------------------------- chores */
    if (block === 'chores' || (block === 'free' && rng.chance(0.3))) {
      add('restock', 40, {}, 'restock');
      add('cook', 38, {}, 'cook');
      add('craft', 34, {}, 'craft');
      add('garden', 36 + (p.likes.includes('flower') || p.likes.includes('farming') ? 10 : 0) - (bad ? 30 : 0), {}, 'garden');
      add('decorate_home', 40, {}, 'decorate_home');
      add('tend_animals', 45, {}, 'tend_animals');
      add('bathe', 30 + (100 - n.comfort) * 0.3, {}, 'bathe');
    }

    /* -------------------------------------------------------- needs & leisure */
    const social = block === 'social';
    const free = block === 'free' || social || (workBlock && rng.chance(0.08)) || entry.note === 'day off';
    const socialDeficit = Math.max(0, 55 - n.social);
    const funDeficit = Math.max(0, 55 - n.fun);
    // talk to people nearby
    for (const o of nearby) {
      if (o.status.includes('sick') && v.profession !== 'doctor' && affinity(o.id) < 10) continue;
      const aff = affinity(o.id);
      const r = v.relationships[o.id];
      const fam = r?.familiarity ?? 0;
      const recentTalk = r ? now - r.lastTalked < 90 : false;
      let s = 16 + Math.max(-20, aff) / 3 + p.extraversion * 14 + socialDeficit * 0.8 + (social ? 15 : 0) + (free ? 8 : 0) - (recentTalk ? 30 : 0) - (workBlock ? 25 : 0) + (v.profession === 'innkeeper' && here === 'tavern' ? 8 : 0);
      if (o.status.includes('angry') && aff < 20) s -= 15;
      if (p.dislikes.includes('crowds') && nearby.length > 3) s -= 10;
      const goalCatch = v.goals.some((g) => !g.done && g.text === `catch up with ${first(o)}`);
      if (goalCatch) s += 25;
      add('chat', s, { target: o.id }, `chat:${o.id}`, `talk to ${first(o)}`);
      if (p.traits.includes('gossip') || p.traits.includes('nosy') || p.likes.includes('news')) add('gossip', s + 6, { target: o.id }, `gossip:${o.id}`);
      else add('gossip', s - 6, { target: o.id }, `gossip:${o.id}`);
      if (aff > 15 && v.mood > -0.1) add('compliment', s - 6 + (p.traits.includes('romantic') || p.traits.includes('flirt') ? 8 : 0) + ((r?.romance ?? 0) > 10 ? 8 : 0), { target: o.id }, `compliment:${o.id}`);
      if (fam > 15 && (p.traits.includes('easy-going') || p.traits.includes('flirt') || p.traits.includes('dry humour') || p.traits.includes('blunt') || p.traits.includes('loud'))) add('tease', s - 9, { target: o.id }, `tease:${o.id}`);
      if (aff < -8 || (angry && aff < 15)) add('argue', 18 + p.neuroticism * 25 - p.agreeableness * 20 + (angry ? 20 : 0) + (v.mood < -0.3 ? 12 : 0) + Math.max(0, -aff) * 0.5, { target: o.id, about: this.grievance(v, o, rng) }, `argue:${o.id}`);
      add('apologize', 50 + p.agreeableness * 25 + (aff > 10 ? 10 : 0), { target: o.id }, `apologize:${o.id}`);
      if (o.mood < -0.3 || o.status.includes('sick') || o.status.includes('grieving') || o.status.includes('angry')) add('comfort', 35 + p.agreeableness * 30 + Math.max(0, aff) / 4 + (p.traits.includes('kind') ? 10 : 0), { target: o.id }, `comfort:${o.id}`);
      if (aff > 18 && h >= 13 && h < 20) add('invite', 14 + p.extraversion * 22 + (social ? 8 : 0) + ((r?.romance ?? 0) > 15 ? 10 : 0), { target: o.id, activity: this.activityFor(v, o, world, rng), place: 'tavern', hour: 20 }, `invite:${o.id}`);
      if (aff >= 35 && (v.mood > 0.4 || o.mood < -0.3)) add('hug', 18 + (o.mood < -0.3 ? 15 : 0) + ((r?.romance ?? 0) > 20 ? 12 : 0), { target: o.id }, `hug:${o.id}`);
      // gifts: something they would like, or a birthday
      const birthday = v.memory.some((m) => m.tags.includes('birthday') && m.about?.includes(o.id) && now - m.t < 1440);
      const gift = this.giftFor(v, o);
      if (gift && (aff > 12 || birthday) && giftsSoFar < 2 && (v.money > 25 || item(gift.id).price <= 10)) add('gift', 14 + gift.appeal * 25 + (birthday ? 40 : 0) + (p.traits.includes('generous') ? 12 : 0) + ((r?.romance ?? 0) > 15 ? 12 : 0) + (r && r.notes.some((x) => x.startsWith('received')) ? 6 : 0) - (v.money < 40 && item(gift.id).price > 20 ? 15 : 0), { target: o.id, item: gift.id }, `gift:${o.id}`);
      if (opts.has('propose')) { if ((r?.romance ?? 0) >= 60 && (r?.affinity ?? 0) >= 55) add('propose', 40 + (r!.romance - 60) + (v.status.includes('inLove') ? 10 : 0), { target: o.id }, `propose:${o.id}`); }
      if (opts.has('teach') && v.skills[bestSkill(v)] >= 5 && (o.skills[bestSkill(v)] ?? 0) < v.skills[bestSkill(v)] - 2 && aff > 0) add('teach', 12 + p.agreeableness * 12 + (free ? 8 : 0) + (v.profession === 'librarian' && workBlock ? 25 : 0), { villager: o.id, skill: bestSkill(v) }, `teach:${o.id}`);
      if (opts.has('pay') && v.goals.some((g) => !g.done && /pay .*back|owed/.test(g.text)) && o.id === 'hal' && v.money > 70) add('pay', 45, { target: 'hal', amount: Math.min(40, Math.floor(v.money * 0.3)), reason: 'paying back what I owe' }, 'pay:hal');
      if (opts.has('trade')) { const t = this.tradeFor(v, o); if (t) add('trade', 12 + (free ? 8 : 0), { target: o.id, give: t.give, want: t.want }, `trade:${o.id}`); }
      if (opts.has('greet') && !recentTalk) add('greet', 8 + p.extraversion * 8 + (aff > 20 ? 5 : 0), { target: o.id }, `greet:${o.id}`);
      if (opts.has('follow') && aff > 30 && free && rng.chance(0.3)) add('follow', 10 + p.extraversion * 8, { villager: o.id }, `follow:${o.id}`);
      if (opts.has('ask_about') && (p.traits.includes('nosy') || p.traits.includes('gossip') || p.traits.includes('curious')) && free) { const about = this.someoneElse(v, o, sim, rng); if (about) add('ask_about', 14 + socialDeficit * 0.3, { target: o.id, about }, `ask_about:${o.id}`); }
    }
    // performing
    if (nearby.length >= 1) {
      add('tell_story', 16 + (p.traits.includes('storyteller') ? 20 : 0) + p.extraversion * 10 + funDeficit * 0.3 + (social ? 12 : 0) + (here === 'tavern' ? 10 : 0) + (nearby.length >= 3 ? 8 : 0), {}, 'tell_story');
      add('play_music', 15 + (p.likes.includes('music') ? 18 : 0) + funDeficit * 0.3 + (social ? 10 : 0) + (here === 'tavern' ? 10 : 0) + (v.status.includes('inspired') ? 10 : 0), {}, 'play_music');
    } else add('play_music', 8 + (p.likes.includes('music') ? 12 : 0) + funDeficit * 0.3 + (v.status.includes('inspired') ? 8 : 0) - (workBlock ? 20 : 0), {}, 'play_music');
    add('dance', 18 + p.extraversion * 15 + funDeficit * 0.4 + (drunk ? 18 : 0) + (p.likes.includes('music') ? 10 : 0) + (v.status.includes('celebrating') ? 15 : 0) + (nearby.length ? 6 : -10), nearby.length && rng.chance(0.6) ? { target: this.bestPartner(v, nearby)?.id } : {}, 'dance');
    // going out
    if (free || socialDeficit > 20 || funDeficit > 20) {
      const tavOpen = openNow('tavern');
      if (here !== 'tavern' && tavOpen && h >= 16) add('visit', 26 + p.extraversion * 22 + socialDeficit * 0.6 + (p.likes.includes('ale') || p.likes.includes('social') ? 10 : 0) - (p.dislikes.includes('crowds') || p.dislikes.includes('ale') ? 22 : 0) + (social ? 18 : 0) + (v.goals.some((g) => !g.done && /tavern|see people/.test(g.text)) ? 15 : 0), { place: 'tavern' }, 'visit:tavern');
      if (here !== 'square' && !bad && h < 20) add('visit', 18 + p.extraversion * 12 + socialDeficit * 0.4 + (social && !tavOpen ? 15 : 0), { place: 'square' }, 'visit:square');
      if (h >= 16 && h < 21) for (const [id, r] of Object.entries(v.relationships)) { if (id === 'player' || r.affinity < 30) continue; const o = sim.villager(id); if (!o || nearby.includes(o)) continue; if (now - r.lastTalked < 240) continue; const where = o.inside ?? world.placeAt({ x: Math.round(o.pos.x), y: Math.round(o.pos.y) })?.id; const vs = 14 + r.affinity / 5 + socialDeficit * 0.4 + (v.goals.some((g) => !g.done && g.text === `catch up with ${first(o)}`) ? 25 : 0) + (r.romance > 15 ? 10 : 0); if (where && where !== here) add('visit', vs, { place: where }, `visit:${id}`); else if (!where) add('go_to', vs - 4, { villager: o.id }, `go_to:${id}`); }
      if (here !== 'library' && openNow('library') && (p.likes.includes('books') || p.likes.includes('lore')) && v.id !== 'ines') add('visit', 18 + funDeficit * 0.4 + (bad ? 10 : 0), { place: 'library' }, 'visit:library');
    }
    // solitary leisure
    if (free || funDeficit > 15 || n.comfort < 40) {
      const nice = w === 'sunny' || (w === 'cloudy' && !p.dislikes.includes('clouds'));
      add('stroll', 20 + funDeficit * 0.4 + p.openness * 8 + (nice ? 10 : 0) + (p.likes.includes('sunny') && w === 'sunny' ? 10 : 0) + (likesRain && w === 'rain' ? 15 : 0) - (bad && !likesRain ? 35 : 0) - (p.traits.includes('lazy') ? 5 : 0) - (h >= 21 ? 20 : 0), {}, 'stroll');
      add('read', 14 + funDeficit * 0.4 + (p.likes.includes('books') || p.likes.includes('lore') || p.likes.includes('poetry') ? 22 : 0) + (bad ? 10 : 0) + (v.status.includes('inspired') ? 6 : 0) - (p.dislikes.includes('books') ? 30 : 0), {}, 'read');
      add('watch_stars', 24 + funDeficit * 0.3 + (p.likes.includes('stars') ? 22 : 0) + (v.status.includes('inLove') ? 12 : 0) + p.openness * 8, {}, 'watch_stars');
      add('swim', 26 + funDeficit * 0.4 + (n.comfort < 50 ? 10 : 0) + p.openness * 6 - (p.dislikes.includes('fish') ? 5 : 0), {}, 'swim');
      add('pray', 10 + (p.traits.includes('superstitious') || p.traits.includes('idealist') ? 18 : 0) + (sick ? 10 : 0) + (v.mood < -0.3 ? 12 : 0) + (n.comfort < 40 ? 8 : 0), {}, 'pray');
      add('garden', 14 + (p.likes.includes('flower') || p.likes.includes('farming') ? 12 : 0) + (n.purpose < 45 ? 8 : 0) - (bad ? 30 : 0), {}, 'garden');
      add('craft', 16 + (p.likes.includes('crafting') ? 14 : 0) + (bad ? 8 : 0) + (n.purpose < 45 ? 8 : 0), {}, 'craft');
      add('write_book', 14 + (v.status.includes('inspired') ? 22 : 0) + (p.likes.includes('poetry') || p.traits.includes('artistic') || p.traits.includes('dreamer') ? 12 : 0) + (v.goals.some((g) => !g.done && /chapter|history/.test(g.text)) ? 18 : 0) + (bad ? 6 : 0), {}, 'write_book');
      add('fish', 12 + funDeficit * 0.3 + (p.likes.includes('fish') || p.likes.includes('quiet') ? 12 : 0) + (w === 'rain' && likesRain ? 8 : 0) - (bad && !likesRain ? 20 : 0) + (v.profession === 'fisher' ? 20 : 0), {}, 'fish');
      add('forage', 12 + funDeficit * 0.2 + (p.likes.includes('nature') || p.likes.includes('herbs') || p.likes.includes('flower') ? 10 : 0) + (v.money < 50 ? 10 : 0) - (bad ? 20 : 0), {}, 'forage');
      add('bathe', 8 + (100 - n.comfort) * 0.45 + (v.status.includes('wet') ? 20 : 0), {}, 'bathe');
      add('plant_flower', 12 + (p.likes.includes('flower') ? 15 : 0), {}, 'plant_flower');
      add('decorate_home', 24 + (n.comfort < 50 ? 10 : 0), {}, 'decorate_home');
      add('wander', 6 + funDeficit * 0.1 - (bad ? 15 : 0), {}, 'wander');
      add('organise_event', 12 + p.extraversion * 16 + (funDeficit > 20 ? 8 : 0) + (p.traits.includes('hospitable') ? 10 : 0) - (bad ? 15 : 0), {}, 'organise_event');
    }
    add('drink', 12 + funDeficit * 0.25 + socialDeficit * 0.2 + (p.likes.includes('ale') || p.likes.includes('cider') ? 12 : 0) + (social ? 15 : 0) + (here === 'tavern' ? 15 : 0) + (v.status.includes('celebrating') ? 10 : 0) - (p.dislikes.includes('ale') && !has('tea') ? 25 : 0) - (drunk ? 10 : 0) - (workBlock ? 25 : 0) - (h < 11 && !has('tea') && !has('coffee') ? 30 : 0), {}, 'drink');
    // events
    for (const e of sim.events) if (e.endsAt > now && e.startedAt <= now + 30 && e.place && !(v.stats[`attended_${e.id}`]) && e.data.host !== v.id) add('attend_event', 40 + p.extraversion * 20 + (e.kind === 'festival' ? 35 : 0) + funDeficit * 0.3 + (typeof e.data.host === 'string' && affinity(e.data.host) > 15 ? 12 : 0) - (p.dislikes.includes('crowds') ? 25 : 0) - (p.dislikes.includes('festive') && e.kind === 'festival' ? 20 : 0) - (workBlock && e.kind !== 'festival' ? 30 : 0), { id: e.id }, `attend:${e.id}`);
    // requests
    add('complete_request', 75, {}, 'complete_request');
    add('accept_request', 26 + (60 - n.purpose) * 0.3 + p.agreeableness * 12 + (v.money < 80 ? 12 : 0) + (p.traits.includes('generous') ? 8 : 0), {}, 'accept_request');
    if (v.stats.boardDay !== world.time.dayIndex && (free || block === 'chores') && !bad) add('check_board', 10 + (p.traits.includes('nosy') || p.traits.includes('curious') ? 14 : 0) + (sim.requests.some((r) => !r.done && !r.acceptedBy) ? 6 : 0), {}, 'check_board');
    if (outdoors && v.stats.weatherDay !== world.time.dayIndex && rng.chance(0.3)) add('check_weather', 8 + (v.profession === 'farmer' || v.profession === 'fisher' ? 8 : 0), {}, 'check_weather');
    if (rng.chance(0.15)) add('look_around', 5, {}, 'look_around');
    // money
    const sellOpen = (id: ItemId): boolean => { const d = item(id); if (openNow('store')) return true; if (d.kind === 'fish') return openNow('tavern') || openNow('dock'); if (d.kind === 'ore' || id === 'gem' || id === 'stone') return openNow('smithy'); if (d.kind === 'crop' || d.kind === 'food') return openNow('tavern'); return false; };
    for (const s of v.inventory) { const d = item(s.id); if (d.kind === 'tool' || d.kind === 'seed' || !sellOpen(s.id)) continue; const keep = d.edible ? 3 : d.kind === 'material' && this.usesMaterial(v, s.id) ? 6 : 1; if (s.qty >= keep + 3) add('sell', 22 + (s.qty - keep) * 2 + (v.money < 80 ? 25 : 0) + (v.goals.some((g) => !g.done && /earn some money/.test(g.text)) ? 15 : 0) + (block === 'errand' || free ? 5 : 0) - (workBlock && !['farmer', 'fisher', 'miner'].includes(v.profession) ? 15 : 0), { item: s.id, qty: s.qty - keep }, `sell:${s.id}`); }
    // shopping for goals
    for (const g of v.goals) {
      if (g.done) continue;
      const t = g.text;
      if (/buy seeds/.test(t) && openNow('store')) { const seed = CROPS.find((c) => c.seasons.includes(world.season)); if (seed) add('buy', 55, { item: seed.seed, qty: 6, place: 'store' }, 'buy:seed'); }
      if (/get flour/.test(t)) { if (openNow('store') && v.money >= 25) add('buy', 52, { item: 'flour', qty: 3, place: 'store' }, 'buy:flour'); else add('post_request', 30, { text: '3 flour for the bakery', reward: 35, needs: [{ id: 'flour', qty: 3 }] }, 'post:flour'); }
      if (/get ore/.test(t)) { if (openNow('store') || openNow('smithy')) add('buy', 30, { item: 'iron_ore', qty: 3 }, 'buy:ore'); add('post_request', 34, { text: '3 iron ore for the forge', reward: 60, needs: [{ id: 'iron_ore', qty: 3 }] }, 'post:ore'); add('mine', 32, {}, 'mine'); }
      if (/get wood/.test(t)) { add('chop', 48, {}, 'chop'); if (openNow('carpenter') || openNow('store')) add('buy', 28, { item: 'wood', qty: 4 }, 'buy:wood'); }
      if (/see Elin/.test(t) && openNow('clinic')) add('visit', 55, { place: 'clinic' }, 'visit:clinic');
      if (/fence/.test(t) && v.profession === 'carpenter') add('build', 40, { structure: 'fence' }, 'build:fence');
      if (/under cover/.test(t) && w === 'storm' && outdoors) add('go_home', 50, {}, 'go_home');
      const meet = /^meet (\w+) at (\w+) at ([\d.]+) on day (\d+)/.exec(t);
      if (meet) {
        const [, who, place, hourS, dayS] = meet;
        const hh = Number(hourS), dd = Number(dayS);
        if (dd === world.time.dayIndex && h >= hh - 0.75 && h < hh + 2) {
          const o = sim.villager(who);
          if (o && nearby.includes(o)) { add('chat', 80, { target: o.id, topic: 'plans' }, `chat:${o.id}`); add('drink', 70, {}, 'drink'); add('dance', 60, { target: o.id }, 'dance'); }
          else if (here !== place) add('go_to', 82, { place }, `go_to:${place}`);
          else add('idle', 30, { reason: `waiting for ${o ? first(o) : who}`, minutes: 8 }, 'idle:wait');
        }
      }
    }
    if (n.hunger < 55 && !count((id) => !!item(id).edible && item(id).kind !== 'drink') && v.money >= 12 && (openNow('bakery') || openNow('store'))) add('buy', 30 + (55 - n.hunger), { item: 'bread', qty: 2 }, 'buy:bread');
    if (v.profession !== 'baker' && has('flour', 3) === false && v.profession === 'innkeeper' && openNow('store') && v.money > 40 && !has('potato', 2)) add('buy', 30, { item: 'potato', qty: 4, place: 'store' }, 'buy:potato');
    // weather & home
    if (bad && outdoors && !likesRain && !workBlock) add('go_home', 30 + (w === 'storm' ? 30 : 0) + (n.comfort < 40 ? 15 : 0), {}, 'go_home');
    if (h >= 21.5 && !nightNow && inside !== v.home && block !== 'social' && v.profession !== 'innkeeper') add('go_home', 25 + (h - 21) * 10, {}, 'go_home');
    // idle fallback
    add('idle', 1, { reason: 'nothing pressing', minutes: 4 }, 'idle');

    /* ------------------------------------------------------ modifiers */
    for (const c of cands) {
      const reps = recent.filter((t) => t === c.tool).length;
      const core = ['sleep', 'eat', 'till', 'plant', 'water', 'harvest', 'fish', 'mine', 'forge', 'bake', 'serve_drinks', 'catalogue_books', 'craft_furniture', 'chat', 'go_to', 'idle'].includes(c.tool);
      c.score -= reps * (core ? 4 : 9);
      const fu = failedTools.get(c.tool);
      if (fu && fu > now) c.score -= 70;
      const conv = ['chat', 'gossip', 'compliment', 'tease', 'argue', 'comfort', 'invite', 'ask', 'ask_about', 'tell_story', 'greet'].includes(c.tool);
      if (conv && !social) { if (sinceTalk < 40) c.score -= 35; else if (sinceTalk < 90) c.score -= 15; }
      const keyReps = recentKeys.filter((k) => k === c.key).length;
      if (keyReps && !['sleep', 'eat', 'idle', 'fish', 'mine', 'water', 'plant', 'till', 'harvest', 'forge', 'bake', 'catalogue_books', 'craft_furniture', 'serve_drinks'].includes(c.tool)) c.score -= keyReps * 25;
      if (c.key.startsWith('chat:') || c.key.startsWith('gossip:')) { const last = recent[recent.length - 1]; if (last === 'chat' || last === 'gossip') c.score -= 10; }
      c.score += rng.range(0, 12) * (0.5 + p.openness * 0.8);
      if (sick && !['sleep', 'rest', 'nap', 'eat', 'use_item', 'visit', 'go_home', 'idle', 'treat', 'drink'].includes(c.tool)) c.score -= 20;
      if (drunk && ['forge', 'mine', 'chop', 'treat', 'write_book', 'catalogue_books'].includes(c.tool)) c.score -= 30;
      if (angry && ['compliment', 'hug', 'gift', 'invite', 'dance'].includes(c.tool)) c.score -= 15;
      if (v.mood < -0.4 && ['tell_story', 'play_music', 'organise_event', 'dance'].includes(c.tool) && !drunk) c.score -= 12;
    }
    cands.sort((a, b) => b.score - a.score);
    const best = cands[0] ?? { tool: 'idle', args: { reason: 'at a loss' }, score: 0, key: 'idle' };
    recent.push(best.tool); if (recent.length > 8) recent.shift();
    this.recent.set(v.id, recent);
    recentKeys.push(best.key); if (recentKeys.length > 6) recentKeys.shift();
    this.recentKeys.set(v.id, recentKeys);
    if (best.tool === 'gift') this.giftsToday.set(v.id, { day: world.time.dayIndex, n: giftsSoFar + 1 });
    const thought = this.thought(v, best, ctx);
    const decision: Decision = { tool: best.tool, args: best.args, thought };
    if (['tell_story', 'play_music', 'dance', 'organise_event'].includes(best.tool) && rng.chance(0.4)) decision.emote = 'music';
    if (best.tool === 'eat' && n.hunger < 30 && rng.chance(0.3)) decision.emote = 'sweat';
    return decision;
  }

  /* ------------------------------------------------------- work by trade */
  private workIntents(v: Villager, ctx: DecisionContext, add: (tool: string, score: number, args?: Record<string, unknown>, key?: string, why?: string) => void, base: number, has: (id: ItemId, q?: number) => boolean, count: (pred: (id: ItemId) => boolean) => number, openNow: (id: string) => boolean): void {
    const world = ctx.world;
    const h = world.time.hour + world.time.min / 60;
    const w = world.weather.kind;
    const bad = w === 'rain' || w === 'storm';
    const season = world.season;
    const shopDayOpen = v.stats.shopDay === world.time.dayIndex;
    const openShop = (score: number) => { if (h >= 6 && h < 19 && !shopDayOpen) add('open_shop', score, {}, 'open_shop'); };
    switch (v.profession) {
      case 'farmer': {
        add('harvest', base + 14, {}, 'harvest');
        add('water', base + 6, {}, 'water');
        add('plant', base + 5, {}, 'plant');
        add('till', base + 1, {}, 'till');
        add('tend_animals', base - 2, {}, 'tend_animals');
        const hasSeeds = CROPS.some((c) => c.seasons.includes(season) && has(c.seed));
        if (!hasSeeds && openNow('store') && v.money >= 20) { const c = CROPS.filter((x) => x.seasons.includes(season)).sort((a, b) => item(b.id).price - item(a.id).price)[0]; if (c) add('buy', base, { item: c.seed, qty: 6, place: 'store' }, 'buy:seed'); }
        add('forage', base - 35, {}, 'forage');
        add('cook', base - 15, {}, 'cook');
        add('idle', base - 28, { reason: 'walking the rows', minutes: 15, place: v.workplace }, 'idle:work');
        if (count((id) => item(id).kind === 'crop') >= 4 && openNow('store')) add('sell', base - 5, { item: v.inventory.filter((s) => item(s.id).kind === 'crop').sort((a, b) => b.qty - a.qty)[0]?.id }, 'sell:crop');
        add('garden', base - 30, {}, 'garden');
        break;
      }
      case 'fisher': {
        add('fish', base + (w === 'rain' ? 8 : 0), {}, 'fish');
        if (count((id) => item(id).kind === 'fish') >= 4) add('sell', base - 6, { item: v.inventory.filter((s) => item(s.id).kind === 'fish').sort((a, b) => b.qty - a.qty)[0]?.id }, 'sell:fish');
        add('cook', base - 14, { recipe: 'fish_soup' }, 'cook');
        openShop(base - 12);
        add('restock', base - 18, {}, 'restock');
        add('idle', base - 20, { reason: 'mending nets', minutes: 20, place: v.workplace }, 'idle:work');
        break;
      }
      case 'miner': {
        add('mine', base + 4, {}, 'mine');
        if (count((id) => item(id).kind === 'ore' || id === 'stone' || id === 'gem') >= 6) add('sell', base - 5, { item: v.inventory.filter((s) => item(s.id).kind === 'ore' || s.id === 'stone').sort((a, b) => b.qty - a.qty)[0]?.id }, 'sell:ore');
        add('forage', base - 20, {}, 'forage');
        add('idle', base - 22, { reason: 'sorting ore', minutes: 15, place: v.workplace }, 'idle:work');
        if (has('gem') && openNow('store')) add('sell', base - 2, { item: 'gem' }, 'sell:gem');
        break;
      }
      case 'blacksmith': {
        add('forge', base + 4, {}, 'forge');
        if (!has('pickaxe') && has('iron_bar', 2) && has('wood', 2)) add('forge', base + 6, { recipe: 'pickaxe' }, 'forge:pickaxe');
        if (!has('pickaxe') && !has('wood', 2) && openNow('store') && v.money > 15) add('buy', base - 4, { item: 'wood', qty: 3, place: 'store' }, 'buy:wood');
        add('repair', base - 4, {}, 'repair');
        add('idle', base - 16, { reason: 'minding the smithy', minutes: 20, place: v.workplace }, 'idle:work');
        openShop(base + 2);
        add('restock', base - 12, {}, 'restock');
        if (!has('iron_ore', 3) && !has('copper_ore', 3) && !has('iron_bar') && !has('copper_bar')) { if (openNow('store') && v.money > 40 && ctx.sim.shopStock('store').some((st) => st.id === 'iron_ore' || st.id === 'copper_ore')) add('buy', base - 6, { item: ctx.sim.shopStock('store').some((st) => st.id === 'iron_ore') ? 'iron_ore' : 'copper_ore', qty: 3, place: 'store' }, 'buy:ore'); add('mine', base - 10, {}, 'mine'); add('post_request', base - 12, { text: '3 iron ore for the forge', reward: 60, needs: [{ id: 'iron_ore', qty: 3 }] }, 'post:ore'); }
        if (count((id) => ['nails', 'horseshoe', 'iron_bar', 'copper_bar'].includes(id)) >= 8) add('sell', base - 10, { item: 'nails' }, 'sell:nails');
        add('chop', base - 24, {}, 'chop');
        if (h >= 17) add('close_shop', base - 10, {}, 'close_shop');
        break;
      }
      case 'baker': {
        add('bake', base + 6, {}, 'bake');
        openShop(base + 8);
        add('idle', base - 16, { reason: 'minding the counter', minutes: 20, place: v.workplace }, 'idle:work');
        if (!has('flour', 2)) { if (openNow('store') && v.money >= 25) add('buy', base + 3, { item: 'flour', qty: 4, place: 'store' }, 'buy:flour'); else add('post_request', base - 8, { text: '3 flour for the bakery', reward: 35, needs: [{ id: 'flour', qty: 3 }] }, 'post:flour'); add('craft', base - 5, { recipe: 'flour' }, 'craft:flour'); }
        add('restock', base - 10, {}, 'restock');
        add('forage', base - 22, { area: 'forest' }, 'forage');
        if (!has('honey') && openNow('store') && v.money > 40) add('buy', base - 18, { item: 'honey', qty: 2 }, 'buy:honey');
        add('cook', base - 20, {}, 'cook');
        if (h >= 16) add('close_shop', base - 12, {}, 'close_shop');
        break;
      }
      case 'doctor': {
        add('treat', base + 22, {}, 'treat');
        add('check_up', base - 8, {}, 'check_up');
        add('idle', base - 16, { reason: 'keeping the clinic', minutes: 20, place: v.workplace }, 'idle:work');
        openShop(base + 2);
        add('craft', base - 4, has('herbs', 2) && has('honey') ? { recipe: 'tonic' } : has('cloth') ? { recipe: 'bandage' } : {}, 'craft:med');
        if (!has('herbs', 2)) add('forage', base - 6, { area: 'forest' }, 'forage');
        add('restock', base - 12, {}, 'restock');
        add('write_book', base - 24, {}, 'write_book');
        add('read', base - 28, {}, 'read');
        add('catalogue_books', base - 40, {}, 'catalogue_books');
        if (h >= 17) add('close_shop', base - 10, {}, 'close_shop');
        break;
      }
      case 'innkeeper': {
        if (h >= 11) add('serve_drinks', base + 2, {}, 'serve_drinks');
        add('host_evening', base + 12, {}, 'host_evening');
        add('idle', base - 14, { reason: 'wiping tables', minutes: 15, place: v.workplace }, 'idle:work');
        add('cook', base - 4, { recipe: has('potato', 2) && has('herbs') ? 'stew' : has('perch') && has('herbs') ? 'fish_soup' : has('egg', 2) ? 'omelette' : undefined }, 'cook');
        add('restock', base - 8, {}, 'restock');
        openShop(base - 2);
        if (!has('potato', 2) && openNow('store') && v.money > 30) add('buy', base - 12, { item: 'potato', qty: 4, place: 'store' }, 'buy:potato');
        if (!has('herbs') && openNow('clinic') && v.money > 20) add('buy', base - 14, { item: 'herbs', qty: 2 }, 'buy:herbs');
        if (!has('perch') && openNow('dock') && v.money > 20) add('buy', base - 14, { item: 'perch', qty: 2, place: 'dock' }, 'buy:fish');
        add('tell_story', base - 16, {}, 'tell_story');
        break;
      }
      case 'shopkeeper': {
        openShop(base + 8);
        add('restock', base - 2, {}, 'restock');
        add('set_price', base - 20, {}, 'set_price');
        if (h >= 18) add('close_shop', base + 4, {}, 'close_shop');
        if (v.stats.boardDay !== world.time.dayIndex) add('check_board', base - 22, {}, 'check_board');
        add('idle', base - 12, { reason: 'minding the counter', minutes: 20, place: v.workplace }, 'idle:work');
        add('look_around', base - 45, {}, 'look_around');
        add('craft', base - 24, { recipe: 'candle' }, 'craft:candle');
        break;
      }
      case 'librarian': {
        add('catalogue_books', base, {}, 'catalogue_books');
        add('write_book', base - 2, {}, 'write_book');
        add('idle', base - 18, { reason: 'minding the desk', minutes: 20, place: v.workplace }, 'idle:work');
        add('teach', base - 6, {}, 'teach');
        add('read', base - 12, {}, 'read');
        openShop(base + 2);
        if (h >= 17) add('close_shop', base - 10, {}, 'close_shop');
        break;
      }
      case 'carpenter': {
        add('craft_furniture', base + 2, {}, 'craft_furniture');
        add('build', base - 1, {}, 'build');
        add('idle', base - 18, { reason: 'sanding something', minutes: 20, place: v.workplace }, 'idle:work');
        add('chop', base - 3 + (!has('wood', 4) ? 12 : 0) - (bad ? 15 : 0), {}, 'chop');
        add('repair_structure', base - 8, {}, 'repair_structure');
        if (!has('nails') && openNow('smithy') && v.money > 20) add('buy', base - 10, { item: 'nails', qty: 2, place: 'smithy' }, 'buy:nails');
        openShop(base - 6);
        if (count((id) => item(id).kind === 'furniture' || id === 'toy_boat') >= 3) add('sell', base - 8, { item: v.inventory.filter((s) => item(s.id).kind === 'furniture' || s.id === 'toy_boat')[0]?.id }, 'sell:furniture');
        add('restock', base - 14, {}, 'restock');
        break;
      }
      default: add('forage', base - 10, {}, 'forage');
    }
  }

  /* --------------------------------------------------------- helpers */
  private giftFor(v: Villager, o: Villager): { id: ItemId; appeal: number } | null {
    let best: { id: ItemId; appeal: number } | null = null;
    for (const s of v.inventory) {
      const d = item(s.id);
      if (d.kind === 'tool' || d.kind === 'seed') continue;
      if (d.kind === 'material' && this.usesMaterial(v, s.id)) continue;
      let a = 0;
      for (const t of d.tags) { if (o.personality.likes.includes(t)) a += 0.5; if (o.personality.dislikes.includes(t)) a -= 0.6; }
      if (o.personality.likes.includes(d.id)) a += 0.7;
      if (d.kind === 'gift') a += 0.2;
      if (a < 0.4) continue;
      if (s.qty < 2 && d.price > 30 && (v.relationships[o.id]?.romance ?? 0) < 20) a -= 0.2;
      if (!best || a > best.appeal) best = { id: s.id, appeal: Math.min(1, a) };
    }
    return best;
  }
  private usesMaterial(v: Villager, id: ItemId): boolean {
    switch (v.profession) {
      case 'baker': return ['flour', 'honey', 'berries', 'egg', 'milk'].includes(id);
      case 'blacksmith': return ['copper_ore', 'iron_ore', 'copper_bar', 'iron_bar', 'wood', 'nails', 'candle'].includes(id);
      case 'carpenter': return ['wood', 'nails', 'cloth'].includes(id);
      case 'doctor': return ['herbs', 'honey', 'cloth'].includes(id);
      case 'innkeeper': return ['potato', 'herbs', 'perch', 'egg', 'apple'].includes(id);
      case 'farmer': return ['fertiliser', 'wool'].includes(id);
      default: return false;
    }
  }
  private tradeFor(v: Villager, o: Villager): { give: ItemId; want: ItemId } | null {
    const want = o.inventory.find((s) => item(s.id).kind !== 'tool' && this.usesMaterial(v, s.id) && !v.inventory.some((x) => x.id === s.id && x.qty >= 3));
    if (!want) return null;
    const give = v.inventory.find((s) => item(s.id).kind !== 'tool' && !this.usesMaterial(v, s.id) && s.qty >= 2 && item(s.id).price >= item(want.id).price * 0.8);
    if (!give) return null;
    return { give: give.id, want: want.id };
  }
  private grievance(v: Villager, o: Villager, rng: SeededRng): string {
    const m = v.memory.filter((x) => x.about?.includes(o.id) && x.tags.includes('unpleasant')).sort((a, b) => b.t - a.t)[0];
    if (m) { const t = m.text.toLowerCase(); if (/fence|promise/.test(t)) return 'the fence'; if (/owe|debt|coin|money|price/.test(t)) return 'money'; if (/gossip|told|said/.test(t)) return 'what you said about me'; if (/noise|loud|music/.test(t)) return 'the noise'; }
    const dis = v.personality.dislikes.find((d) => o.personality.traits.includes(d) || (d === 'laziness' && o.personality.traits.includes('lazy')) || (d === 'gossip' && o.personality.traits.includes('gossip')) || (d === 'nosy' && o.personality.traits.includes('nosy')));
    if (dis) return dis === 'laziness' ? 'your laziness' : dis === 'gossip' ? 'your gossiping' : dis === 'nosy' ? 'your nosiness' : dis;
    return rng.pick(['the way you talk to people', 'last week', 'manners', 'the state of the square', 'whose turn it was']);
  }
  private activityFor(v: Villager, o: Villager, world: DecisionContext['world'], rng: SeededRng): string {
    const both = v.personality.likes.filter((l) => o.personality.likes.includes(l));
    if (both.includes('ale') || both.includes('social')) return 'a drink';
    if (both.includes('music')) return 'some music';
    if (both.includes('stars') && world.weather.kind === 'sunny') return 'stargazing';
    if (both.includes('fish')) return 'fishing';
    return rng.pick(['a drink', 'supper', 'a game of dice', 'a walk']);
  }
  private bestPartner(v: Villager, nearby: Villager[]): Villager | undefined {
    let best: Villager | undefined, bs = -1e9;
    for (const o of nearby) { const s = (v.relationships[o.id]?.affinity ?? 0) + (v.relationships[o.id]?.romance ?? 0) * 2; if (s > bs) { bs = s; best = o; } }
    return best;
  }
  private someoneElse(v: Villager, o: Villager, sim: DecisionContext['sim'], rng: SeededRng): VillagerId | undefined {
    const others = sim.villagers.filter((x) => x.id !== v.id && x.id !== o.id);
    if (!others.length) return undefined;
    // prefer people the speaker is curious about: a crush, a rival, or someone they have not talked to lately
    const ranked = others.map((x) => ({ x, s: Math.abs(v.relationships[x.id]?.affinity ?? 0) / 10 + (v.relationships[x.id]?.romance ?? 0) / 8 + rng.range(0, 3) })).sort((a, b) => b.s - a.s);
    return ranked[0].x.id;
  }

  private thought(v: Villager, c: Cand, ctx: DecisionContext): string {
    const rng = this.rng;
    const sim = ctx.sim;
    const n = v.needs;
    const w = ctx.world.weather.kind;
    const target = c.args.target ?? c.args.villager ?? c.args.for;
    const tv = typeof target === 'string' ? sim.villager(target) : undefined;
    const placeId = typeof c.args.place === 'string' ? c.args.place : typeof c.args.area === 'string' ? c.args.area : undefined;
    const slots: Slots = {
      target: tv ? first(tv) : typeof target === 'string' ? target : 'someone',
      place: placeId ? ctx.world.place(placeId)?.name ?? placeId : rng.pick(['the square', 'the lake', 'the Owl']),
      item: typeof c.args.item === 'string' ? item(c.args.item).name.toLowerCase() : 'something',
      crop: typeof c.args.crop === 'string' ? item(c.args.crop).name.toLowerCase() : rng.pick(CROPS.filter((x) => x.seasons.includes(ctx.world.season)).map((x) => x.name.toLowerCase())) ?? 'seeds',
      recipe: typeof c.args.recipe === 'string' ? String(c.args.recipe).replace(/_/g, ' ') : 'something',
      weather: WEATHER_PHRASE[w] ? rng.pick(WEATHER_PHRASE[w]) : w, season: ctx.world.season, time: timeOfDay(ctx.world.time.hour), work: PROFESSION_WORK[v.profession] ?? 'work',
      reason: typeof c.args.reason === 'string' ? c.args.reason : 'nothing',
    };
    let bank = THOUGHTS[c.tool] ?? ['On with it.'];
    // needs-driven flavour
    const lows: [string, number][] = [['hunger', n.hunger], ['energy', n.energy], ['social', n.social], ['fun', n.fun], ['comfort', n.comfort], ['purpose', n.purpose]];
    lows.sort((a, b) => a[1] - b[1]);
    if (lows[0][1] < 30 && rng.chance(0.4) && ['eat', 'sleep', 'nap', 'rest', 'chat', 'visit', 'drink', 'read', 'stroll', 'bathe'].includes(c.tool)) bank = NEED_THOUGHTS[lows[0][0]] ?? bank;
    return voice(v, fill(rng.pick(bank), slots), rng);
  }
}

function bestSkill(v: Villager): keyof Villager['skills'] {
  let best: keyof Villager['skills'] = 'charm', bs = -1;
  for (const [k, val] of Object.entries(v.skills)) if (val > bs) { bs = val; best = k as keyof Villager['skills']; }
  return best;
}
