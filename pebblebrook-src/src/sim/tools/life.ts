import { item } from '../../core/items.ts';
import type { Effect, ItemId, ToolDef, Villager } from '../../core/types.ts';
import { asCore, type SimCore } from '../core.ts';
import { buyPrice, removeStock, stockOf } from '../economy.ts';
import { sleepHourOf, wakeHourOf } from '../villager.ts';
import { chron, done, fail, first, itemName, memFor, need, needPlace, rate, rel, sfx, str } from './util.ts';
import { eventMult, resolveItem } from './economy.ts';

const s = asCore;

function edibles(v: Villager): ItemId[] { return v.inventory.filter((st) => item(st.id).edible && item(st.id).kind !== 'drink' && item(st.id).kind !== 'medicine').map((st) => st.id); }
function drinks(v: Villager): ItemId[] { return v.inventory.filter((st) => item(st.id).kind === 'drink').map((st) => st.id); }

/** Which of the villager's foods they would rather eat: liked tags first, then the most filling. */
function favourite(v: Villager, ids: ItemId[]): ItemId {
  const score = (id: ItemId): number => { const d = item(id); let sc = (d.edible?.hunger ?? 0) / 10; for (const t of d.tags) { if (v.personality.likes.includes(t)) sc += 2; if (v.personality.dislikes.includes(t)) sc -= 3; } if (v.personality.likes.includes(id)) sc += 3; return sc; };
  return [...ids].sort((a, b) => score(b) - score(a))[0];
}

function eatEffects(v: Villager, id: ItemId): Effect[] {
  const d = item(id);
  const e = d.edible ?? { hunger: 5 };
  const liked = d.tags.some((t) => v.personality.likes.includes(t)) || v.personality.likes.includes(id);
  const disliked = d.tags.some((t) => v.personality.dislikes.includes(t)) || v.personality.dislikes.includes(id);
  return [
    { kind: 'take', items: [{ id, qty: 1 }], when: 'start' },
    need({ hunger: e.hunger, energy: e.energy ?? 0, fun: (e.fun ?? 0) + (liked ? 6 : 0) - (disliked ? 5 : 0), comfort: d.tags.includes('comfort') ? 5 : 2 }),
    ...(e.health ? [{ kind: 'health', delta: e.health } as Effect] : []),
    { kind: 'mood', delta: liked ? 0.06 : disliked ? -0.05 : 0.02 }, sfx(d.kind === 'drink' ? 'drink' : 'eat'), { kind: 'stat', key: 'meals' },
  ];
}

const FOOD_SHOPS: string[] = ['tavern', 'bakery', 'store'];

export const LIFE_TOOLS: ToolDef[] = [
  {
    name: 'eat', category: 'life',
    description: 'Eat something from your inventory, or buy a meal at the tavern or bakery.',
    params: { type: 'object', properties: { item: { type: 'string', description: 'item to eat; default: your favourite thing you have, else buy a meal' } } },
    available(v, view) { const sim = s(view); return !sim.isAsleep(v); },
    execute(v, view, args) {
      const sim = s(view);
      const wanted = args.item !== undefined && args.item !== '' ? resolveItem(args.item) : undefined;
      if (wanted && sim.has(v, wanted) && item(wanted).edible) return done(`${first(v)} ate ${itemName(wanted).toLowerCase()}`, 10, eatEffects(v, wanted), 1);
      const own = edibles(v);
      if (own.length && !wanted) { const id = favourite(v, own); return done(`${first(v)} ate ${itemName(id).toLowerCase()}${sim.currentPlace(v) ? ' at ' + sim.placeName(sim.currentPlace(v)?.id) : ''}`, 10, eatEffects(v, id), 1); }
      // buy a meal
      const shops = FOOD_SHOPS.map((p) => sim.shops.get(p)!).filter((sh) => sh && sim.isOpen(sim.world.place(sh.place)!) && sh.owner !== v.id && sh.stock.some((st) => item(st.id).edible && item(st.id).kind !== 'drink' && buyPrice(sh, st.id, 1) <= v.money));
      const ownShop = [...sim.shops.values()].find((sh) => sh.owner === v.id && sh.stock.some((st) => item(st.id).edible && item(st.id).kind !== 'drink'));
      if (ownShop && (!shops.length || sim.rng.chance(0.7))) {
        const walk = needPlace(v, sim, ownShop.place, 'eat', args);
        if (walk) return walk;
        const id = favourite(v, ownShop.stock.filter((st) => item(st.id).edible && item(st.id).kind !== 'drink').map((st) => st.id));
        removeStock(ownShop, id, 1);
        return done(`${first(v)} ate ${itemName(id).toLowerCase()} from the shelf at ${sim.placeName(ownShop.place)}`, 10, eatEffects(v, id).filter((e) => e.kind !== 'take'), 1);
      }
      if (!shops.length) {
        // pantry scraps at home, so nobody starves when the shops are shut
        const walk = needPlace(v, sim, v.home, 'eat', args);
        if (walk) return walk;
        return done(`${first(v)} scraped together a meal from the pantry`, 10, [need({ hunger: 18, fun: -3, comfort: 2 }), sfx('eat'), { kind: 'stat', key: 'meals' }], 1);
      }
      shops.sort((a, b) => dist(sim.world.place(a.place)!.anchor, v.pos) - dist(sim.world.place(b.place)!.anchor, v.pos));
      const shop = shops[0];
      const walk = needPlace(v, sim, shop.place, 'eat', args);
      if (walk) return walk;
      const choices = shop.stock.filter((st) => item(st.id).edible && item(st.id).kind !== 'drink' && buyPrice(shop, st.id, eventMult(sim, st.id)) <= v.money).map((st) => st.id);
      if (!choices.length) return fail(`${first(v)} cannot afford anything at ${sim.placeName(shop.place)}`);
      const id = wanted && choices.includes(wanted) ? wanted : favourite(v, choices);
      const price = buyPrice(shop, id, eventMult(sim, id));
      removeStock(shop, id, 1);
      const owner = shop.owner ? sim.villager(shop.owner) : undefined;
      const effects = eatEffects(v, id).filter((e) => e.kind !== 'take');
      effects.push({ kind: 'money', delta: -price }, sfx('coin'), { kind: 'stat', key: 'buys' });
      if (owner) effects.push({ kind: 'money', who: owner.id, delta: Math.round(price * 0.8) }, memFor(owner.id, `${first(v)} had ${itemName(id).toLowerCase()} at ${sim.placeName(shop.place)}`, 1, ['trade', 'work'], [v.id]));
      if (owner && sim.atPlace(owner, shop.place)) effects.push(rel(owner.id, 'trade', { mutual: true }), { kind: 'need', social: 3 });
      return done(`${first(v)} ate ${itemName(id).toLowerCase()} at ${sim.placeName(shop.place)} (${price} coins)`, 12, effects, 1);
    },
  },
  {
    name: 'drink', category: 'life',
    description: 'Have a drink: ale or cider at the tavern, tea or coffee from your own supplies.',
    params: { type: 'object', properties: { item: { type: 'string', enum: ['ale', 'cider', 'tea', 'coffee', 'milk'] } } },
    available(v, view) { const sim = s(view); if (sim.isAsleep(v)) return false; if (drinks(v).length) return true; const tav = sim.world.place('tavern'); return !!tav && sim.isOpen(tav) && v.money >= 8; },
    execute(v, view, args) {
      const sim = s(view);
      const wanted = args.item !== undefined && args.item !== '' ? resolveItem(args.item) : undefined;
      const boozy = (id: ItemId) => id === 'ale' || id === 'cider';
      const drunkEffect = (id: ItemId): Effect[] => {
        if (!boozy(id)) return [];
        const rt = sim.rt(v);
        const count = (rt.flagUntil.drinks ?? 0) > sim.now ? (v.stats.drinksRecent ?? 0) + 1 : 1;
        return [{ kind: 'fn', fn: (ss: SimCore, me: Villager) => { ss.rt(me).flagUntil.drinks = ss.now + 120; me.stats.drinksRecent = count; } }, ...(count >= 2 ? [{ kind: 'status', add: ['drunk'], minutes: 150 } as Effect, { kind: 'need', comfort: -3 } as Effect] : [])];
      };
      const own = drinks(v);
      if (wanted && sim.has(v, wanted)) return done(`${first(v)} drank ${itemName(wanted).toLowerCase()}`, 6, [...eatEffects(v, wanted), ...drunkEffect(wanted)], 1);
      const tav = sim.world.place('tavern');
      const tavOpen = !!tav && sim.isOpen(tav);
      const wantsBooze = !v.personality.dislikes.includes('ale') && (v.personality.likes.includes('ale') || v.personality.likes.includes('cider') || sim.hourFloat() >= 17);
      if (own.length && !(tavOpen && wantsBooze && v.money >= 10 && sim.rng.chance(0.5))) { const id = favourite(v, own); return done(`${first(v)} drank ${itemName(id).toLowerCase()}`, 6, [...eatEffects(v, id), ...drunkEffect(id)], 1); }
      if (!tav || !tavOpen) return fail('nothing to drink and the tavern is shut');
      const shop = sim.shops.get('tavern')!;
      if (shop.owner === v.id) {
        const walk = needPlace(v, sim, 'tavern', 'drink', args);
        if (walk) return walk;
        const id: ItemId = wanted ?? 'ale';
        removeStock(shop, id, 1);
        return done(`${first(v)} had ${itemName(id).toLowerCase()} from the tap`, 6, [...eatEffects(v, id).filter((e) => e.kind !== 'take'), ...drunkEffect(id)], 1);
      }
      const walk = needPlace(v, sim, 'tavern', 'drink', args);
      if (walk) return walk;
      const pref: ItemId = wanted ?? (v.personality.dislikes.includes('ale') ? 'tea' : v.personality.likes.includes('cider') ? 'cider' : 'ale');
      const id: ItemId = stockOf(shop, pref) > 0 ? pref : stockOf(shop, 'ale') > 0 ? 'ale' : stockOf(shop, 'cider') > 0 ? 'cider' : 'tea';
      const price = buyPrice(shop, id, eventMult(sim, id));
      if (v.money < price) return fail(`${first(v)} cannot afford a drink`);
      removeStock(shop, id, 1);
      const owner = sim.villager('finn');
      const effects: Effect[] = [...eatEffects(v, id).filter((e) => e.kind !== 'take'), ...drunkEffect(id), { kind: 'money', delta: -price }, sfx('coin'), rate({ social: 10 }), { kind: 'stat', key: 'buys' }];
      if (owner) { effects.push({ kind: 'money', who: owner.id, delta: Math.round(price * 0.8) }); if (sim.atPlace(owner, 'tavern')) effects.push(rel(owner.id, 'chat', { mutual: true, backDelta: { affinity: 1, familiarity: 1.5 } }), memFor(owner.id, `${first(v)} came in for ${itemName(id).toLowerCase()}`, 1, ['tavern', 'work'], [v.id])); }
      return done(`${first(v)} had ${itemName(id).toLowerCase()} at the Drowsy Owl`, 15, effects, 1);
    },
  },
  {
    name: 'sleep', category: 'life',
    description: 'Go to bed at home and sleep until morning.',
    params: { type: 'object', properties: {} },
    available: (v, view) => !s(view).isAsleep(v),
    execute(v, view) {
      const sim = s(view);
      const walk = needPlace(v, sim, v.home, 'sleep', {});
      if (walk) return walk;
      const h = sim.hourFloat();
      const wake = wakeHourOf(v.plan);
      const sleepH = sleepHourOf(v.plan);
      if (v.needs.energy >= 90 && h >= wake - 0.6 && h < 12) return fail(`${first(v)} is already up and rested`);
      let untilH = wake;
      if (h < wake && h < 12) untilH = wake; else untilH = wake + 24;
      let minutes = Math.max(30, Math.round((untilH - h) * 60));
      if (v.needs.energy < 40 && minutes < 300) minutes = Math.max(minutes, 300);
      if (h >= 3 && h < sleepH - 1 && h < 20 && v.needs.energy > 35 && v.needs.energy < 90) minutes = 90; // a daytime lie-down, not a full night
      const home = sim.world.place(v.home);
      const comfortable = (home?.facilities.includes('bed') ?? true) && v.needs.comfort > 30;
      return done(`${first(v)} slept${comfortable ? ' well' : ' badly'}`, minutes, [
        { kind: 'sleep' }, { kind: 'fn', when: 'start', fn: (ss: SimCore, me: Villager) => { const rt = ss.rt(me); rt.sleptAtHome[ss.world.time.dayIndex] = true; } }, rate({ energy: comfortable ? 12 : 8, comfort: 3, hunger: -1.2, social: 0, fun: 0, purpose: 0 }), { kind: 'wake' }, { kind: 'status', remove: ['tired', 'drunk', 'wet'] }, { kind: 'health', delta: comfortable ? 6 : 2 }, { kind: 'stat', key: 'nights_slept' }, sfx('sleep'),
      ], 1);
    },
  },
  {
    name: 'nap', category: 'life',
    description: 'Have a nap wherever you are (a bench, a chair by the fire, the grass).',
    params: { type: 'object', properties: { place: { type: 'string' } } },
    available: (v, view) => !s(view).isAsleep(v) && v.needs.energy < 60 && s(view).hourFloat() >= 9 && s(view).hourFloat() < 21,
    execute(v, view, args) {
      const sim = s(view);
      if (args.place !== undefined && args.place !== '') { const p = sim.resolvePlace(args.place); if (p) { const walk = needPlace(v, sim, p.id, 'nap', {}); if (walk) return walk; } }
      const where = sim.placeName(sim.currentPlace(v)?.id);
      const outdoors = !v.inside;
      const rainy = outdoors && ['rain', 'storm', 'snow'].includes(sim.world.weather.kind);
      if (rainy) return fail('too wet to nap out here');
      return done(`${first(v)} napped ${v.inside ? 'in' : 'at'} ${where}`, 40 + sim.rng.int(0, 30), [
        { kind: 'sleep' }, rate({ energy: 18, comfort: outdoors ? 2 : 6 }), { kind: 'wake' }, { kind: 'status', remove: ['tired'] }, { kind: 'stat', key: 'naps' }, sfx('sleep'), { kind: 'emote', emote: 'sleepy' },
      ], 1);
    },
  },
  {
    name: 'rest', category: 'life',
    description: 'Sit down and rest for a while.',
    params: { type: 'object', properties: {} },
    available: (v, view) => !s(view).isAsleep(v),
    execute(v, view) {
      const sim = s(view);
      const where = sim.placeName(sim.currentPlace(v)?.id);
      return done(`${first(v)} sat and rested ${v.inside ? 'in' : 'at'} ${where}`, 15 + sim.rng.int(0, 10), [rate({ energy: 10, comfort: 12, fun: -1 }), { kind: 'stat', key: 'rests' }], 1);
    },
  },
  {
    name: 'bathe', category: 'life',
    description: 'Wash: at home, or a dip at the lake or river in warm weather.',
    params: { type: 'object', properties: {} },
    available: (v, view) => !s(view).isAsleep(v) && (v.needs.comfort < 70 || v.status.includes('wet')) && s(view).hourFloat() >= 6 && s(view).hourFloat() < 23,
    execute(v, view) {
      const sim = s(view);
      const warm = sim.world.season === 'summer' && sim.world.weather.kind === 'sunny' && sim.hourFloat() >= 10 && sim.hourFloat() < 18;
      const target = warm && sim.rng.chance(0.4) && sim.world.place('lake') ? 'lake' : v.home;
      const walk = needPlace(v, sim, target, 'bathe', {});
      if (walk) return walk;
      return done(`${first(v)} ${target === 'lake' ? 'washed off in the lake' : 'had a wash at home'}`, 20, [need({ comfort: 30 }), { kind: 'status', remove: ['wet'] }, rate({ energy: 2 }), sfx('splash'), { kind: 'stat', key: 'baths' }], 1);
    },
  },
  {
    name: 'stroll', category: 'life',
    description: 'Take a walk somewhere pleasant: the lake, the meadow, the orchard, the hill, the river.',
    params: { type: 'object', properties: { place: { type: 'string' } } },
    available: (v, view) => !s(view).isAsleep(v) && !['storm', 'snow'].includes(s(view).world.weather.kind),
    execute(v, view, args) {
      const sim = s(view);
      const spots = ['lake', 'meadow', 'orchard', 'hill', 'river', 'forest', 'square'].filter((id) => sim.world.place(id));
      let target = args.place !== undefined && args.place !== '' ? sim.resolvePlace(args.place)?.id : undefined;
      if (!target) { const liked = spots.filter((id) => v.personality.likes.some((l) => id.includes(l) || (l === 'stars' && id === 'hill') || (l === 'fish' && id === 'river') || (l === 'flower' && id === 'meadow'))); target = sim.rng.pick(liked.length && sim.rng.chance(0.6) ? liked : spots); }
      if (!target) return fail('nowhere to stroll');
      if (!sim.atPlace(v, target) || args._arrived !== true) return sim.travel(v, { place: target, enter: false }, { tool: 'stroll', args: { place: target, _arrived: true } }, `strolling to ${sim.placeName(target)}`);
      const nice = sim.world.weather.kind === 'sunny' || (sim.world.weather.kind === 'rain' && v.personality.likes.includes('rain'));
      const obs = sim.rng.pick(STROLL_OBSERVATIONS[target] ?? STROLL_OBSERVATIONS.default);
      const effects: Effect[] = [rate({ fun: 20, comfort: nice ? 10 : 2, purpose: 2, energy: -2 }), { kind: 'memory', text: `${first(v)} ${obs}`, importance: nice ? 3 : 2, tags: ['stroll', 'nature', nice ? 'pleasant' : 'quiet', target] }, { kind: 'stat', key: 'strolls' }];
      if (nice && sim.rng.chance(0.4)) effects.push({ kind: 'mood', delta: 0.08 });
      const company = sim.villagersNear(v.pos, 4).filter((o) => o.id !== v.id && !sim.isAsleep(o));
      for (const c of company) effects.push(rel(c.id, 'together', { mutual: true }));
      return done(`${first(v)} strolled around ${sim.placeName(target)}${company.length ? ' with ' + company.map((c) => first(c)).join(' and ') : ''}`, 18 + sim.rng.int(0, 12), effects, 2);
    },
  },
  {
    name: 'pray', category: 'life',
    description: 'Spend a quiet moment at the chapel shrine.',
    params: { type: 'object', properties: {} },
    available: (v, view) => !!s(view).world.place('chapel') && !s(view).isAsleep(v) && (v.personality.traits.includes('superstitious') || v.personality.traits.includes('idealist') || v.personality.neuroticism > 0.5 || v.status.includes('grieving') || v.status.includes('sick') || s(view).rng.chance(0.02)),
    execute(v, view) {
      const sim = s(view);
      const walk = needPlace(v, sim, 'chapel', 'pray', {});
      if (walk) return walk;
      const deep = v.personality.traits.includes('superstitious') || v.personality.traits.includes('idealist');
      return done(`${first(v)} sat a while at the chapel${deep ? ' and asked for luck' : ''}`, 15, [rate({ comfort: 24, purpose: deep ? 20 : 10, fun: 4 }), { kind: 'mood', delta: 0.06 }, { kind: 'stat', key: 'prayers' }, { kind: 'memory', text: sim.rng.pick([`${first(v)} lit a candle at the shrine`, `${first(v)} asked the shrine for a quiet week`, `${first(v)} sat in the chapel and let the day settle`]), importance: 2, tags: ['chapel', 'calm', 'pleasant'] }], 1);
    },
  },
  {
    name: 'read', category: 'life',
    description: 'Read a book — your own, or one at the library.',
    params: { type: 'object', properties: {} },
    available: (v, view) => !s(view).isAsleep(v) && (v.inventory.some((st) => item(st.id).kind === 'book') || (!!s(view).world.place('library') && s(view).isOpen(s(view).world.place('library')!))) && (v.personality.openness > 0.4 || v.personality.likes.includes('books') || v.needs.fun < 50),
    execute(v, view) {
      const sim = s(view);
      const has = v.inventory.some((st) => item(st.id).kind === 'book');
      if (!has) { const walk = needPlace(v, sim, 'library', 'read', {}); if (walk) return walk; }
      const bookish = v.personality.likes.includes('books') || v.personality.likes.includes('poetry') || v.personality.likes.includes('lore');
      const title = sim.rng.pick(READING);
      const inspired = bookish && sim.rng.chance(0.4);
      const effects: Effect[] = [rate({ fun: bookish ? 26 : 14, comfort: 6, social: -1, purpose: 3 }), { kind: 'skill', skill: 'lore', xp: 0.15 }, { kind: 'memory', text: `${first(v)} read ${title}`, importance: bookish ? 3 : 2, tags: ['books', 'read', 'pleasant'] }, { kind: 'stat', key: 'books_read' }];
      if (inspired) effects.push({ kind: 'status', add: ['inspired'], minutes: 180 }, { kind: 'emote', emote: 'idea' });
      return done(`${first(v)} read ${title}${has ? '' : ' at the library'}`, 35 + sim.rng.int(0, 15), effects, 1);
    },
  },
  {
    name: 'garden', category: 'life',
    description: 'Potter about in your garden at home.',
    params: { type: 'object', properties: {} },
    available: (v, view) => !s(view).isAsleep(v) && s(view).world.time.isDaylight && !['rain', 'storm', 'snow'].includes(s(view).world.weather.kind),
    execute(v, view) {
      const sim = s(view);
      const walk = needPlace(v, sim, v.home, 'garden', {}, false);
      if (walk) return walk;
      const find = sim.rng.chance(0.35);
      const found: ItemId = sim.rng.pick(['wildflower', 'herbs', 'wildflower', 'berries']);
      const effects: Effect[] = [rate({ purpose: 12, fun: 8, comfort: 4, energy: -3 }), { kind: 'skill', skill: 'farming', xp: 0.08 }, { kind: 'stat', key: 'gardening' }];
      if (find) effects.push({ kind: 'give', items: [{ id: found, qty: 1 }] });
      return done(`${first(v)} pottered in the garden${find ? ' and picked ' + itemName(found).toLowerCase() : ''}`, 30, effects, 1);
    },
  },
  {
    name: 'decorate_home', category: 'life',
    description: 'Put a piece of furniture or a decoration up at home.',
    params: { type: 'object', properties: { item: { type: 'string' } } },
    available: (v) => v.inventory.some((st) => item(st.id).kind === 'furniture' || st.id === 'wildflower' || st.id === 'candle' || st.id === 'sunflower'),
    execute(v, view, args) {
      const sim = s(view);
      const cands = v.inventory.filter((st) => item(st.id).kind === 'furniture' || st.id === 'wildflower' || st.id === 'candle' || st.id === 'sunflower').map((st) => st.id);
      const id = (args.item !== undefined && args.item !== '' ? resolveItem(args.item) : undefined) ?? cands[0];
      if (!id || !sim.has(v, id)) return fail(`${first(v)} has nothing to decorate with`);
      const walk = needPlace(v, sim, v.home, 'decorate_home', { item: id });
      if (walk) return walk;
      const big = item(id).kind === 'furniture';
      return done(`${first(v)} put ${big ? 'the new ' : ''}${itemName(id).toLowerCase()} ${big ? 'in the front room' : 'on the windowsill'}`, 15, [
        { kind: 'take', items: [{ id, qty: 1 }] }, need({ comfort: big ? 25 : 10, fun: big ? 10 : 4, purpose: 5 }), { kind: 'fn', fn: (_s: SimCore, me: Villager) => { me.stats.homeComfort = (me.stats.homeComfort ?? 0) + (big ? 3 : 1); } }, { kind: 'memory', text: `${first(v)}'s house has ${itemName(id).toLowerCase()} in it now. It looks right`, importance: big ? 4 : 2, tags: ['home', 'cozy', 'pleasant'] }, { kind: 'stat', key: 'decorated' },
        ...(big ? [chron(`${first(v)} put a new ${itemName(id).toLowerCase()} in at home.`, 2, [v.id], v.home)] : []),
      ], big ? 3 : 1);
    },
  },
  {
    name: 'visit', category: 'life',
    description: 'Call on a place — someone\'s home, the library, the tavern — and see who is about.',
    params: { type: 'object', properties: { place: { type: 'string' } }, required: ['place'] },
    available: (v, view) => !s(view).isAsleep(v),
    execute(v, view, args) {
      const sim = s(view);
      const p = sim.resolvePlace(args.place);
      if (!p) return fail(`no place called ${str(args, 'place')}`);
      if (p.kind === 'home' && p.owner && p.owner !== v.id) {
        const owner = sim.villager(p.owner);
        if (owner) {
          if ((owner.relationships[v.id]?.affinity ?? 0) < 0) return fail(`${first(owner)} would not welcome ${first(v)}`);
          if (!sim.atPlace(owner, p.id)) return fail(`${first(owner)} is not at home`);
          if (sim.isAsleep(owner)) return fail(`${first(owner)} is asleep`);
        }
      }
      if (p.kind === 'shop' && !sim.isOpen(p)) return fail(`${p.name} is closed`);
      if (!sim.atPlace(v, p.id) || args._arrived !== true) return sim.travel(v, { place: p.id, enter: true }, { tool: 'visit', args: { place: p.id, _arrived: true } }, `visiting ${p.name}`);
      const here = sim.villagers.filter((o) => o.id !== v.id && sim.atPlace(o, p.id) && !sim.isAsleep(o));
      const effects: Effect[] = [rate({ social: here.length ? 12 : 3, fun: 8, comfort: 4 }), { kind: 'stat', key: 'visits' }];
      if (p.owner && p.owner !== v.id && here.some((o) => o.id === p.owner)) effects.push({ kind: 'conversation', with: p.owner, topic: 'visit' }, memFor(p.owner, `${first(v)} came by ${p.name} to visit`, 3, ['visit', 'social', 'pleasant'], [v.id]), sfx('knock'));
      else if (here.length) effects.push({ kind: 'conversation', with: here[0].id, topic: 'chat' });
      return done(`${first(v)} visited ${p.name}${here.length ? ' and found ' + here.map((o) => first(o)).join(', ') + ' there' : ', but nobody was about'}`, here.length ? 30 : 12, effects, here.length ? 2 : 1);
    },
  },
  {
    name: 'watch_stars', category: 'life',
    description: 'Lie back somewhere dark and watch the stars. Clear nights only.',
    params: { type: 'object', properties: { place: { type: 'string' } } },
    available: (v, view) => !s(view).isAsleep(v) && !s(view).world.time.isDaylight && s(view).hourFloat() >= 19 && ['sunny', 'cloudy'].includes(s(view).world.weather.kind) && (v.personality.likes.includes('stars') || v.personality.openness > 0.5 || v.status.includes('inLove') || s(view).rng.chance(0.15)),
    execute(v, view, args) {
      const sim = s(view);
      const spots = ['hill', 'lake', 'meadow', 'dock', 'square'].filter((id) => sim.world.place(id));
      const target = (args.place !== undefined && args.place !== '' ? sim.resolvePlace(args.place)?.id : undefined) ?? (v.personality.likes.includes('stars') && spots.includes('hill') ? 'hill' : sim.rng.pick(spots));
      if (!target) return fail('nowhere to watch from');
      if (!sim.atPlace(v, target) || args._arrived !== true) return sim.travel(v, { place: target, enter: false }, { tool: 'watch_stars', args: { place: target, _arrived: true } }, `heading up to ${sim.placeName(target)}`);
      const company = sim.villagersNear(v.pos, 4).filter((o) => o.id !== v.id && !sim.isAsleep(o));
      const loves = v.personality.likes.includes('stars');
      const effects: Effect[] = [rate({ fun: loves ? 30 : 18, comfort: -3, purpose: 6 }), { kind: 'mood', delta: 0.1 }, { kind: 'memory', text: `${first(v)} watched the stars from ${sim.placeName(target)}${company.length ? ' with ' + company.map((c) => first(c)).join(' and ') : ''}. ${sim.rng.pick(['The sky was enormous', 'A shooting star, or a trick of the eye', 'The Plough was right over the mine', 'Cold, and worth it'])}`, importance: company.length ? 5 : 3, tags: ['stars', 'nature', 'pleasant', 'romance'], about: company.map((c) => c.id) }, { kind: 'stat', key: 'stargazing' }];
      if (loves) effects.push({ kind: 'status', add: ['inspired'], minutes: 240 });
      for (const c of company) effects.push(rel(c.id, 'together', { mutual: true, backDelta: { affinity: 2, familiarity: 2, romance: 2 } }), memFor(c.id, `${first(c)} and ${first(v)} watched the stars together from ${sim.placeName(target)}`, 5, ['stars', 'social', 'pleasant', 'romance'], [v.id]));
      if (company.length) effects.push(chron(`${first(v)} and ${company.map((c) => first(c)).join(' and ')} watched the stars from ${sim.placeName(target)}.`, 4, [v.id, ...company.map((c) => c.id)], target));
      return done(`${first(v)} watched the stars from ${sim.placeName(target)}${company.length ? ' with ' + company.map((c) => first(c)).join(' and ') : ''}`, 30, effects, 3);
    },
  },
  {
    name: 'swim', category: 'life',
    description: 'Swim in the lake. Summer, daylight, and not in a storm.',
    params: { type: 'object', properties: {} },
    available: (v, view) => !s(view).isAsleep(v) && !!s(view).world.place('lake') && (s(view).world.season === 'summer' || s(view).world.weather.temperature >= 22) && s(view).world.time.isDaylight && ['sunny', 'cloudy'].includes(s(view).world.weather.kind),
    execute(v, view, args) {
      const sim = s(view);
      if (!sim.atPlace(v, 'lake') || args._arrived !== true) return sim.travel(v, { place: 'lake', enter: false }, { tool: 'swim', args: { _arrived: true } }, 'heading to the lake for a swim');
      const company = sim.villagersNear(v.pos, 5).filter((o) => o.id !== v.id && !sim.isAsleep(o));
      const effects: Effect[] = [rate({ fun: 34, comfort: 20, energy: -12 }), { kind: 'status', remove: ['wet'] }, sfx('splash'), { kind: 'memory', text: `${first(v)} swam in the lake${company.length ? ' with ' + company.map((c) => first(c)).join(' and ') : ''}`, importance: 3, tags: ['swim', 'nature', 'pleasant', 'summer'], about: company.map((c) => c.id) }, { kind: 'stat', key: 'swims' }];
      for (const c of company) effects.push(rel(c.id, 'together', { mutual: true }));
      if (sim.rng.chance(0.3)) effects.push(chron(`${first(v)} went swimming in the lake${company.length ? ' with ' + company.map((c) => first(c)).join(' and ') : ''}.`, 3, [v.id, ...company.map((c) => c.id)], 'lake'));
      return done(`${first(v)} swam in the lake`, 25, effects, 2);
    },
  },
];

const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

const READING = ['a book of river poems', 'the almanac for the year', 'a history of the mine', 'a travelogue about the coast', 'the same chapter three times', 'a well-thumbed romance', 'a treatise on soil', 'a book of ghost stories', 'a cookbook with butter on every page', 'an old letter folded into a book', 'the parish records', 'a book about the stars'];

const STROLL_OBSERVATIONS: Record<string, string[]> = {
  lake: ['walked the lake shore and watched the light on the water', 'skipped stones at the lake', 'saw a heron at the lake, perfectly still', 'sat on the jetty and dangled their feet'],
  meadow: ['walked through the meadow, grass to the knee', 'lay in the meadow and watched the clouds', 'found the first wildflowers in the meadow', 'saw a hare bolt across the meadow'],
  orchard: ['walked under the apple trees', 'listened to the bees in the orchard', 'found a windfall apple in the orchard grass', 'sat against a tree in the orchard'],
  hill: ['climbed the hill and looked down on the whole village', 'watched the chimney smoke from the hill', 'felt the wind on the hill', 'saw the river shining from the hill'],
  river: ['walked along the river and watched the water go by', 'saw a trout rise in the river', 'crossed the bridge and back for no reason', 'listened to the river'],
  forest: ['walked in the forest where it goes quiet', 'heard a woodpecker in the forest', 'found mushrooms in the forest and left them', 'walked until the path ran out'],
  square: ['sat by the well and watched the village go by', 'read the notice board without meaning to', 'stopped to chat by the well', 'watched the sparrows around the bakery'],
  default: ['went for a walk and felt better for it', 'walked with no particular place in mind', 'wandered and thought about nothing'],
};

export const eatItem = (sim: SimCore, v: Villager, id: ItemId): Effect[] => { void sim; return eatEffects(v, id); };
