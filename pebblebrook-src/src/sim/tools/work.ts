import { CROPS, CROP_BY_ID, RECIPES, item } from '../../core/items.ts';
import type { Effect, ItemId, PlotState, SkillName, ToolDef, Villager, WorldObject } from '../../core/types.ts';
import { asCore, type SimCore } from '../core.ts';

/** The real world exposes resource helpers beyond the World contract; use them when present so its bookkeeping stays right. */
type RichWorld = { harvest?: (id: string) => { item: ItemId; qty: number } | null; chop?: (id: string) => { item: ItemId; qty: number } | null; pickFruit?: (id: string) => { item: ItemId; qty: number } | null; mine?: (id: string) => { item: ItemId; qty: number; broke: boolean } | null; gather?: (id: string) => { item: ItemId; qty: number } | null };
const rich = (s: SimCore): RichWorld => s.world as unknown as RichWorld;
import { fullRestock, stockOf } from '../economy.ts';
import { chron, done, fail, first, hasAll, itemName, memFor, missing, need, needNear, needPlace, num, placeWithFacility, rate, recipe, rel, say, sfx, skillTime, str } from './util.ts';
import { resolveItem } from './economy.ts';

/* ------------------------------------------------------------------- farming */

function plotsAt(sim: SimCore, place: string): WorldObject[] { return sim.world.objectsAt(place, 'plot'); }

function pickPlot(sim: SimCore, v: Villager, args: Record<string, unknown>, pred: (p: PlotState, o: WorldObject) => boolean): { obj: WorldObject; plot: PlotState } | undefined {
  const farm = v.profession === 'farmer' ? v.workplace : 'player_farm';
  if (args.plot !== undefined && args.plot !== '') {
    const o = sim.world.object(String(args.plot));
    const p = o ? sim.world.plot(o.id) : undefined;
    if (o && p && pred(p, o)) return { obj: o, plot: p };
  }
  const cands: { obj: WorldObject; plot: PlotState }[] = [];
  for (const o of plotsAt(sim, farm)) {
    const p = sim.world.plot(o.id);
    if (p && (!p.owner || p.owner === v.id) && pred(p, o)) cands.push({ obj: o, plot: p });
  }
  if (!cands.length) return undefined;
  cands.sort((a, b) => ((a.obj.pos.x - v.pos.x) ** 2 + (a.obj.pos.y - v.pos.y) ** 2) - ((b.obj.pos.x - v.pos.x) ** 2 + (b.obj.pos.y - v.pos.y) ** 2));
  return cands[0];
}

/** Walk to a tile next to an object (outdoors), then re-run the tool. */
function nearObject(v: Villager, sim: SimCore, o: WorldObject, tool: string, args: Record<string, unknown>, label: string) {
  const d = Math.max(Math.abs(v.pos.x - o.pos.x), Math.abs(v.pos.y - o.pos.y));
  if (!v.inside && (d <= 1.2 || (args._at === o.id && d <= 3.5))) return null;
  const stand = sim.world.walkable(o.pos.x, o.pos.y) ? o.pos : sim.world.nearestWalkable(o.pos, 3);
  return sim.travel(v, { pos: stand }, { tool, args: { ...args, _at: o.id } }, label);
}

const seasonalSeeds = (v: Villager, sim: SimCore): ItemId[] => CROPS.filter((c) => c.seasons.includes(sim.world.season) && sim.has(v, c.seed, 1)).map((c) => c.seed);

export const FARM_TOOLS: ToolDef[] = [
  {
    name: 'till', category: 'work', professions: ['farmer'],
    description: 'Till an empty plot at the farm so it can be planted.',
    params: { type: 'object', properties: { plot: { type: 'string', description: 'plot object id; default: nearest empty plot' } } },
    available: (v, view) => sim(view).has(v, 'hoe') && !!pickPlot(sim(view), v, {}, (p) => p.state === 'empty'),
    execute(v, view, args) {
      const s = sim(view);
      if (!s.has(v, 'hoe')) return fail(`${first(v)} has no hoe`);
      const pick = pickPlot(s, v, args, (p) => p.state === 'empty');
      if (!pick) return fail('no empty plot to till');
      const walk = nearObject(v, s, pick.obj, 'till', { plot: pick.obj.id }, 'going to the plots');
      if (walk) return walk;
      return done(`${first(v)} tilled a plot at the farm`, skillTime(8, v.skills.farming), [
        { kind: 'plot', id: pick.obj.id, state: { state: 'tilled', watered: false, growth: 0, stage: 0, daysSincePlant: 0, crop: undefined, owner: v.id } },
        rate({ energy: -6, purpose: 10 }), { kind: 'skill', skill: 'farming', xp: 0.15 }, sfx('till'), { kind: 'stat', key: 'plots_tilled' },
      ], 2);
    },
  },
  {
    name: 'plant', category: 'work', professions: ['farmer'],
    description: 'Plant seeds in a tilled plot. Picks a seed that suits the season if none is given.',
    params: { type: 'object', properties: { plot: { type: 'string' }, crop: { type: 'string', description: 'crop or seed id' } } },
    available: (v, view) => seasonalSeeds(v, sim(view)).length > 0 && !!pickPlot(sim(view), v, {}, (p) => p.state === 'tilled'),
    execute(v, view, args) {
      const s = sim(view);
      const pick = pickPlot(s, v, args, (p) => p.state === 'tilled');
      if (!pick) return fail('no tilled plot to plant');
      let seed: ItemId | undefined;
      if (args.crop !== undefined && args.crop !== '') {
        const id = resolveItem(args.crop);
        const crop = id ? CROP_BY_ID[id] ?? CROPS.find((c) => c.seed === id) : undefined;
        if (!crop) return fail(`${str(args, 'crop')} is not a crop`);
        if (!crop.seasons.includes(s.world.season)) return fail(`${crop.name} does not grow in ${s.world.season}`);
        seed = crop.seed;
      } else {
        const seeds = seasonalSeeds(v, s);
        if (!seeds.length) return fail('no seeds for this season');
        // prefer the most valuable crop we have seeds for
        seeds.sort((a, b) => item(CROPS.find((c) => c.seed === b)!.id).price - item(CROPS.find((c) => c.seed === a)!.id).price);
        seed = seeds[0];
      }
      if (!s.has(v, seed, 1)) return fail(`${first(v)} has no ${itemName(seed)}`);
      const crop = CROPS.find((c) => c.seed === seed)!;
      const walk = nearObject(v, s, pick.obj, 'plant', { plot: pick.obj.id, crop: crop.id }, 'going to the plots');
      if (walk) return walk;
      return done(`${first(v)} planted ${crop.name.toLowerCase()} at the farm`, 5, [
        { kind: 'take', items: [{ id: seed, qty: 1 }], when: 'start' },
        { kind: 'plot', id: pick.obj.id, state: { state: 'planted', crop: crop.id, growth: 0, stage: 0, daysSincePlant: 0, watered: s.world.weather.kind === 'rain' || s.world.weather.kind === 'storm', owner: v.id } },
        rate({ energy: -4, purpose: 10 }), { kind: 'skill', skill: 'farming', xp: 0.2 }, sfx('plant'), { kind: 'stat', key: 'planted' },
      ], 2);
    },
  },
  {
    name: 'water', category: 'work', professions: ['farmer'],
    description: 'Water a planted plot (pointless in the rain).',
    params: { type: 'object', properties: { plot: { type: 'string' } } },
    available: (v, view) => sim(view).has(v, 'watering_can') && !['rain', 'storm'].includes(sim(view).world.weather.kind) && !!pickPlot(sim(view), v, {}, (p) => p.state === 'planted' && !p.watered),
    execute(v, view, args) {
      const s = sim(view);
      if (!s.has(v, 'watering_can')) return fail(`${first(v)} has no watering can`);
      if (['rain', 'storm'].includes(s.world.weather.kind)) return fail('the rain is watering everything already');
      const pick = pickPlot(s, v, args, (p) => p.state === 'planted' && !p.watered);
      if (!pick) return fail('every plot is watered');
      const walk = nearObject(v, s, pick.obj, 'water', { plot: pick.obj.id }, 'going to the plots');
      if (walk) return walk;
      // water a few neighbouring plots in one go
      const others = plotsAt(s, v.workplace).filter((o) => o.id !== pick.obj.id && Math.abs(o.pos.x - pick.obj.pos.x) + Math.abs(o.pos.y - pick.obj.pos.y) <= 3).filter((o) => { const p = s.world.plot(o.id); return p && p.state === 'planted' && !p.watered; }).slice(0, 3);
      const effects: Effect[] = [{ kind: 'plot', id: pick.obj.id, state: { watered: true } }, rate({ energy: -3, purpose: 8 }), { kind: 'skill', skill: 'farming', xp: 0.08 }, sfx('water'), { kind: 'stat', key: 'watered', n: 1 + others.length }];
      for (const o of others) effects.push({ kind: 'plot', id: o.id, state: { watered: true } });
      const crop = pick.plot.crop ? CROP_BY_ID[pick.plot.crop]?.name.toLowerCase() : 'the crops';
      return done(`${first(v)} watered the ${crop}${others.length ? ' and the plots around it' : ''}`, 4 + others.length * 2, effects, 2);
    },
  },
  {
    name: 'harvest', category: 'work', professions: ['farmer'],
    description: 'Harvest a plot whose crop is ready.',
    params: { type: 'object', properties: { plot: { type: 'string' } } },
    available: (v, view) => !!pickPlot(sim(view), v, {}, (p) => p.state === 'planted' && p.growth >= 1),
    execute(v, view, args) {
      const s = sim(view);
      const pick = pickPlot(s, v, args, (p) => p.state === 'planted' && p.growth >= 1);
      if (!pick) return fail('nothing is ready to harvest');
      const walk = nearObject(v, s, pick.obj, 'harvest', { plot: pick.obj.id }, 'going to the plots');
      if (walk) return walk;
      const crop = pick.plot.crop ? CROP_BY_ID[pick.plot.crop] : undefined;
      if (!crop) return fail('that plot has nothing in it');
      const bonus = s.rng.chance(0.15 + v.skills.farming * 0.03) ? 1 : 0;
      const qty = crop.yieldQty + bonus;
      const quality = (v.skills.farming >= 8 && s.rng.chance(0.4) ? 3 : v.skills.farming >= 4 && s.rng.chance(0.5) ? 2 : 1) as 1 | 2 | 3;
      const after: Partial<PlotState> = crop.regrowDays
        ? { growth: Math.max(0, 1 - crop.regrowDays / crop.days), daysSincePlant: Math.max(0, crop.days - crop.regrowDays), stage: Math.max(0, crop.stages - 2), watered: false }
        : { state: 'tilled', crop: undefined, growth: 0, daysSincePlant: 0, stage: 0, watered: false };
      const viaWorld = typeof rich(s).harvest === 'function';
      return done(`${first(v)} harvested ${qty} ${crop.name.toLowerCase()}${bonus ? ' — a good one' : ''}`, 6, [
        ...(viaWorld ? [{ kind: 'fn', fn: (ss: SimCore, me: Villager) => { const r = rich(ss).harvest!(pick.obj.id); ss.give(me, r ? { id: r.item, qty: r.qty + bonus, quality } : { id: crop.id, qty, quality }); } } as Effect] : [{ kind: 'plot', id: pick.obj.id, state: after } as Effect, { kind: 'give', items: [{ id: crop.id, qty, quality }] } as Effect]),
        rate({ energy: -4, purpose: 14, fun: 4 }), { kind: 'skill', skill: 'farming', xp: 0.35 }, sfx('harvest'), { kind: 'stat', key: 'harvested', n: qty },
        chron(`${first(v)} brought in ${qty} ${crop.name.toLowerCase()} from the farm.`, 3, [v.id], v.workplace),
      ], 3);
    },
  },
  {
    name: 'tend_animals', category: 'work', professions: ['farmer'],
    description: 'Feed and look after the animals in the barn; collect milk, eggs, wool.',
    params: { type: 'object', properties: {} },
    available: (v, view) => { const s = sim(view); const barn = s.world.place('barn') ?? s.world.place(v.workplace); if (!barn) return false; const animals = s.world.objectsAt(barn.id, 'animal'); return animals.length === 0 ? (v.stats.tendedDay ?? -1) !== s.world.time.dayIndex : animals.some((a) => a.data.fedDay !== s.world.time.dayIndex); },
    execute(v, view) {
      const s = sim(view);
      const barn = s.world.place('barn') ?? s.world.place(v.workplace);
      if (!barn) return fail('there is no barn');
      const walk = needPlace(v, s, barn.id, 'tend_animals', {}, !!barn.interior);
      if (walk) return walk;
      const animals = s.world.objectsAt(barn.id, 'animal');
      const today = s.world.time.dayIndex;
      const effects: Effect[] = [rate({ energy: -4, purpose: 10, fun: 3 }), { kind: 'skill', skill: 'farming', xp: 0.1 }, { kind: 'stat', key: 'animals_tended' }, { kind: 'fn', fn: (_s: SimCore, me: Villager) => { me.stats.tendedDay = today; } }];
      const produce: Record<string, number> = {};
      if (animals.length === 0) {
        if (v.stats.tendedDay === today) return fail('the animals have been seen to already');
        produce.milk = 2; produce.egg = 3; if (s.world.time.weekday === 2) produce.wool = 2;
      } else {
        let any = false;
        for (const a of animals) {
          if (a.data.fedDay === today) continue;
          any = true;
          effects.push({ kind: 'object', id: a.id, data: { fedDay: today, fed: true } });
          const kind = String(a.data.kind ?? a.data.species ?? 'hen');
          const prod = typeof a.data.produce === 'string' ? a.data.produce : kind === 'cow' ? 'milk' : kind === 'sheep' ? 'wool' : 'egg';
          if (prod === 'wool' && s.world.time.weekday % 3 !== 0) continue;
          produce[prod] = (produce[prod] ?? 0) + 1;
        }
        if (!any) return fail('the animals have been fed already');
      }
      const items = Object.entries(produce).map(([id, qty]) => ({ id, qty }));
      if (items.length) effects.push({ kind: 'give', items });
      const list = items.map((i) => `${i.qty} ${itemName(i.id).toLowerCase()}`).join(', ');
      return done(`${first(v)} fed the animals${list ? ' and collected ' + list : ''}`, 25, effects, 2);
    },
  },
];

/* --------------------------------------------------------------------- fishing */

export const FISH_TOOLS: ToolDef[] = [
  {
    name: 'fish', category: 'work',
    description: 'Fish at a spot on the dock, river or lake. Needs a fishing rod. Rain brings the fish up.',
    params: { type: 'object', properties: { spot: { type: 'string', description: 'fishspot object id or place (dock|river|lake)' } } },
    available: (v, view) => sim(view).has(v, 'fishing_rod') && sim(view).world.objects.some((o) => o.kind === 'fishspot'),
    execute(v, view, args) {
      const s = sim(view);
      if (!s.has(v, 'fishing_rod')) return fail(`${first(v)} has no fishing rod`);
      let spot: WorldObject | undefined;
      if (args.spot !== undefined && args.spot !== '') {
        spot = s.world.object(String(args.spot));
        if (!spot) { const p = s.resolvePlace(args.spot); if (p) spot = s.world.objectsAt(p.id, 'fishspot')[0] ?? s.world.objectsNear(p.anchor, 8, 'fishspot')[0]; }
      }
      if (!spot) {
        const spots = s.world.objects.filter((o) => o.kind === 'fishspot');
        if (!spots.length) return fail('no fishing spots');
        const pref = v.profession === 'fisher' ? spots.filter((o) => o.place === v.workplace) : [];
        const pool = pref.length && s.rng.chance(0.6) ? pref : spots;
        spot = pool.reduce((best, o) => (dist(o.pos, v.pos) + s.rng.range(0, 6) < dist(best.pos, v.pos) ? o : best), pool[0]);
      }
      const walk = nearObject(v, s, spot, 'fish', { spot: spot.id }, 'heading to the water');
      if (walk) return walk;
      const table = s.fishFor();
      const skill = v.skills.fishing;
      const rain = ['rain', 'storm'].includes(s.world.weather.kind);
      const catchChance = 0.55 + skill * 0.035 + (rain ? 0.15 : 0);
      const effects: Effect[] = [rate({ energy: -1.5, purpose: 8, fun: v.personality.likes.includes('fish') || v.profession === 'fisher' ? 8 : 4, comfort: rain ? -3 : 1 }), { kind: 'skill', skill: 'fishing', xp: 0.25 }, sfx('splash'), { kind: 'stat', key: 'fishing_trips' }];
      const override = spot.data.fish as ItemId[] | undefined;
      const minutes = skillTime(30, skill) + s.rng.int(0, 10);
      if (!s.rng.chance(catchChance)) {
        return done(`${first(v)} fished at ${s.placeName(spot.place)} and caught nothing`, minutes, effects, 1);
      }
      let fish: ItemId;
      if (override && override.length) fish = s.rng.pick(override);
      else {
        const total = table.reduce((a, b) => a + b.weight, 0);
        let r = s.rng.next() * total; fish = table[table.length - 1].id;
        for (const t of table) { r -= t.weight; if (r <= 0) { fish = t.id; break; } }
      }
      const qty = skill >= 6 && s.rng.chance(0.3) ? 2 : 1;
      const pearl = fish === 'salmon' && s.rng.chance(0.08);
      effects.push({ kind: 'give', items: [{ id: fish, qty }] }, { kind: 'stat', key: 'fish_caught', n: qty });
      if (pearl) effects.push({ kind: 'give', items: [{ id: 'pearl', qty: 1 }] }, chron(`${first(v)} found a river pearl in a salmon. Talk of the dock.`, 6, [v.id]));
      if (fish === 'salmon') effects.push(chron(`${first(v)} landed a salmon at ${s.placeName(spot.place)}.`, 4, [v.id], spot.place), emote('exclaim'));
      return done(`${first(v)} caught ${qty > 1 ? qty + ' ' : 'a '}${itemName(fish).toLowerCase()} at ${s.placeName(spot.place)}${pearl ? ' — with a pearl inside' : ''}`, minutes, effects, fish === 'salmon' ? 4 : 2);
    },
  },
];

const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const emote = (kind: string): Effect => ({ kind: 'emote', emote: kind });

/* ---------------------------------------------------------------- mine / forest */

const ORE_TABLE: { id: ItemId; w: number }[] = [{ id: 'stone', w: 38 }, { id: 'copper_ore', w: 34 }, { id: 'iron_ore', w: 20 }, { id: 'gold_ore', w: 6 }, { id: 'gem', w: 2 }];

export const GATHER_TOOLS: ToolDef[] = [
  {
    name: 'mine', category: 'work',
    description: 'Break rock in the mine for stone, ore and the odd gem. Needs a pickaxe.',
    params: { type: 'object', properties: { rock: { type: 'string', description: 'rock object id; default: nearest rock with ore left' } } },
    available: (v, view) => sim(view).has(v, 'pickaxe') && rocks(sim(view)).length > 0 && (v.profession === 'miner' || v.skills.mining >= 2),
    execute(v, view, args) {
      const s = sim(view);
      if (!s.has(v, 'pickaxe')) return fail(`${first(v)} has no pickaxe`);
      let rock = args.rock !== undefined && args.rock !== '' ? s.world.object(String(args.rock)) : undefined;
      if (!rock) { const rs = rocks(s); if (!rs.length) return fail('the rock face is picked clean for today'); rock = rs.reduce((b, o) => (dist(o.pos, v.pos) < dist(b.pos, v.pos) ? o : b), rs[0]); }
      const walk = nearObject(v, s, rock, 'mine', { rock: rock.id }, 'heading into the mine');
      if (walk) return walk;
      const hp = typeof rock.data.hp === 'number' ? rock.data.hp : 3;
      let ore: ItemId;
      if (typeof rock.data.ore === 'string' && item(rock.data.ore).kind !== 'misc') ore = rock.data.ore as ItemId;
      else { const total = ORE_TABLE.reduce((a, b) => a + b.w, 0) + v.skills.mining * 2; let r = s.rng.next() * total; ore = 'stone'; for (const t of ORE_TABLE) { r -= t.w + (t.id === 'gold_ore' || t.id === 'gem' ? v.skills.mining * 0.5 : 0); if (r <= 0) { ore = t.id; break; } } }
      const qty = ore === 'gem' ? 1 : 1 + (s.rng.chance(0.3 + v.skills.mining * 0.04) ? 1 : 0);
      const viaWorld = typeof rich(s).mine === 'function';
      const effects: Effect[] = [
        ...(viaWorld ? [{ kind: 'fn', fn: (ss: SimCore, me: Villager) => { const r = rich(ss).mine!(rock.id); if (r && r.qty > 0) ss.give(me, { id: r.item, qty: r.qty + qty - 1 }); else ss.give(me, { id: ore, qty }); } } as Effect] : [{ kind: 'give', items: [{ id: ore, qty }] } as Effect, { kind: 'object', id: rock.id, data: { hp: hp - 1 } } as Effect]),
        rate({ energy: -8, purpose: 12, comfort: -3, fun: v.personality.likes.includes('mining') ? 4 : 0 }), { kind: 'skill', skill: 'mining', xp: 0.3 }, sfx('mine'), { kind: 'stat', key: 'mined', n: qty }];
      let msg = `${first(v)} mined ${qty} ${itemName(ore).toLowerCase()}`;
      if (ore === 'gem') { effects.push(chron(`${first(v)} came up from the mine with a gemstone.`, 6, [v.id], 'mine'), emote('exclaim'), need({ fun: 15 })); msg = `${first(v)} struck a gemstone in the mine`; }
      if (ore === 'gold_ore' && v.stats.goldDay !== s.world.time.dayIndex) { effects.push(chron(`${first(v)} found gold ore in the mine.`, 5, [v.id], 'mine'), emote('exclaim'), { kind: 'fn', fn: (_s: SimCore, me: Villager) => { me.stats.goldDay = s.world.time.dayIndex; } }); }
      if (s.rng.chance(0.015)) { effects.push({ kind: 'status', add: ['injured'], minutes: 1440 }, { kind: 'health', delta: -20 }, chron(`${first(v)} was hurt by a rockfall in the mine.`, 6, [v.id], 'mine'), emote('sweat')); msg += ' — and took a rockfall to the shoulder'; }
      return done(msg, skillTime(28, v.skills.mining) + s.rng.int(0, 8), effects, ore === 'gem' ? 6 : ore === 'gold_ore' ? 4 : 2);
    },
  },
  {
    name: 'forage', category: 'work',
    description: 'Gather berries, mushrooms, herbs and wildflowers where they grow.',
    params: { type: 'object', properties: { area: { type: 'string', description: 'forest | meadow | orchard | hill' } } },
    available: (v, view) => forageSpots(sim(view)).length > 0 && !sim(view).isAsleep(v),
    execute(v, view, args) {
      const s = sim(view);
      let spots = forageSpots(s);
      if (args.area !== undefined && args.area !== '') { const p = s.resolvePlace(args.area); if (p) { const inArea = spots.filter((o) => o.place === p.id); if (inArea.length) spots = inArea; } }
      if (!spots.length) return fail('nothing left to forage today');
      const spot = spots.reduce((b, o) => (dist(o.pos, v.pos) + s.rng.range(0, 8) < dist(b.pos, v.pos) ? o : b), spots[0]);
      const walk = nearObject(v, s, spot, 'forage', { spot: spot.id }, 'going foraging');
      if (walk) return walk;
      const isTree = spot.kind === 'tree';
      const id = isTree ? 'apple' : typeof spot.data.item === 'string' ? (spot.data.item as ItemId) : s.rng.pick(['berries', 'mushroom', 'herbs', 'wildflower'] as ItemId[]);
      const qty = isTree ? Math.max(1, Math.min(2, Number(spot.data.fruit) || 1)) : typeof spot.data.qty === 'number' ? Math.max(1, Math.min(2, spot.data.qty)) : 1;
      const rw = rich(s);
      const viaWorld = isTree ? typeof rw.pickFruit === 'function' : typeof rw.gather === 'function';
      const effects: Effect[] = [
        ...(viaWorld ? [{ kind: 'fn', fn: (ss: SimCore, me: Villager) => { const r = isTree ? rich(ss).pickFruit!(spot.id) : rich(ss).gather!(spot.id); if (r && r.qty > 0) ss.give(me, { id: r.item, qty: r.qty }); } } as Effect]
          : [{ kind: 'give', items: [{ id, qty }] } as Effect, { kind: 'object', id: spot.id, data: isTree ? { fruit: Math.max(0, (Number(spot.data.fruit) || 0) - qty) } : { qty: Math.max(0, (typeof spot.data.qty === 'number' ? spot.data.qty : 1) - qty), takenDay: s.world.time.dayIndex } } as Effect]),
        rate({ energy: -2, fun: 6, purpose: 5 }), { kind: 'skill', skill: 'farming', xp: 0.08 }, { kind: 'stat', key: 'foraged', n: qty }];
      return done(`${first(v)} gathered ${qty} ${itemName(id).toLowerCase()} ${s.rng.pick(['in', 'near', 'around'])} ${s.placeName(spot.place)}`, 8 + s.rng.int(0, 4), effects, 2);
    },
  },
  {
    name: 'chop', category: 'work',
    description: 'Chop a tree for wood. Needs an axe.',
    params: { type: 'object', properties: { tree: { type: 'string' } } },
    available: (v, view) => (sim(view).has(v, 'axe') || v.profession === 'carpenter') && trees(sim(view)).length > 0,
    execute(v, view, args) {
      const s = sim(view);
      if (!s.has(v, 'axe') && v.profession !== 'carpenter') return fail(`${first(v)} has no axe`);
      let tree = args.tree !== undefined && args.tree !== '' ? s.world.object(String(args.tree)) : undefined;
      if (!tree) { const ts = trees(s); if (!ts.length) return fail('no trees with wood to spare'); tree = ts.reduce((b, o) => (dist(o.pos, v.pos) < dist(b.pos, v.pos) ? o : b), ts[0]); }
      const walk = nearObject(v, s, tree, 'chop', { tree: tree.id }, 'heading to the forest');
      if (walk) return walk;
      const wood = typeof tree.data.wood === 'number' ? tree.data.wood : 3;
      const qty = Math.min(wood, 2) + (s.rng.chance(0.3 + v.skills.crafting * 0.03) ? 1 : 0);
      const viaWorld = typeof rich(s).chop === 'function';
      return done(`${first(v)} chopped ${qty} wood in the forest`, skillTime(20, v.skills.crafting), [
        ...(viaWorld ? [{ kind: 'fn', fn: (ss: SimCore, me: Villager) => { let got = 0; for (let i = 0; i < qty; i++) { const r = rich(ss).chop!(tree.id); if (!r) break; got += r.qty; } if (got > 0) ss.give(me, { id: 'wood', qty: got }); } } as Effect] : [{ kind: 'give', items: [{ id: 'wood', qty }] } as Effect, { kind: 'object', id: tree.id, data: { wood: Math.max(0, wood - qty), choppedDay: s.world.time.dayIndex } } as Effect]), rate({ energy: -8, purpose: 8 }), { kind: 'skill', skill: 'crafting', xp: 0.12 }, sfx('chop'), { kind: 'stat', key: 'wood_chopped', n: qty },
      ], 2);
    },
  },
];

function rocks(s: SimCore): WorldObject[] { return s.world.objects.filter((o) => o.kind === 'rock' && !o.data.depleted && (typeof o.data.hp !== 'number' || o.data.hp > 0) && (o.place === 'mine' || !o.place || s.world.placeAt(o.pos)?.id === 'mine')); }
function trees(s: SimCore): WorldObject[] { return s.world.objects.filter((o) => o.kind === 'tree' && (typeof o.data.wood !== 'number' || o.data.wood > 0) && o.data.type !== 'apple' && (o.place === 'forest' || o.place === 'orchard' || !o.place || o.place === 'hill' || o.place === 'meadow')); }
function forageSpots(s: SimCore): WorldObject[] { return s.world.objects.filter((o) => (o.kind === 'forage' && (typeof o.data.qty !== 'number' || o.data.qty > 0) && o.data.item !== null) || (o.kind === 'tree' && typeof o.data.fruit === 'number' && o.data.fruit > 0)); }

/* -------------------------------------------------------------- crafting jobs */

function craftJob(name: string, description: string, station: 'forge' | 'oven' | 'kitchen' | 'workbench', professions: Villager['profession'][] | undefined, skill: SkillName, sfxName: string, verb: string): ToolDef {
  const recipesFor = () => RECIPES.filter((r) => r.station === station);
  return {
    name, category: 'work', professions, description,
    params: { type: 'object', properties: { recipe: { type: 'string', description: recipesFor().map((r) => r.id).join(' | ') } }, required: ['recipe'] },
    available(v, view) {
      const s = sim(view);
      if (!placeWithFacility(v, s, station)) return false;
      return recipesFor().some((r) => hasAll(s, v, r.inputs) && (!r.skill || v.skills[r.skill.name] >= r.skill.level));
    },
    execute(v, view, args) {
      const s = sim(view);
      let r = recipe(str(args, 'recipe'));
      if (!r) { const ok = recipesFor().filter((x) => hasAll(s, v, x.inputs) && (!x.skill || v.skills[x.skill.name] >= x.skill.level)); if (!ok.length) return fail(`${first(v)} has nothing to ${verb} with`); r = s.rng.pick(ok); }
      if (r.station !== station) return fail(`${r.name} is not made at the ${station}`);
      if (r.skill && v.skills[r.skill.name] < r.skill.level) return fail(`${first(v)} is not skilled enough for ${r.name}`);
      const miss = missing(s, v, r.inputs);
      if (miss.length) return fail(`${first(v)} needs ${miss.map((m) => `${m.qty} ${itemName(m.id).toLowerCase()}`).join(', ')} for ${r.name}`);
      const place = placeWithFacility(v, s, station);
      if (!place) return fail(`nowhere with a ${station}`);
      const walk = needPlace(v, s, place.id, name, { recipe: r.id }, !!place.interior);
      if (walk) return walk;
      const lvl = v.skills[skill];
      const bonus = lvl >= 5 && s.rng.chance(0.2) ? 1 : 0;
      return done(`${first(v)} ${verb === 'bake' ? 'baked' : verb === 'cook' ? 'cooked' : verb === 'forge' ? 'forged' : 'made'} ${r.result.qty + bonus} ${r.name.toLowerCase()} at ${place.name}`, skillTime(r.minutes, lvl), [
        { kind: 'take', items: r.inputs, when: 'start' }, { kind: 'give', items: [{ id: r.result.id, qty: r.result.qty + bonus }] },
        rate({ energy: station === 'forge' ? -7 : -3, purpose: 10, fun: v.personality.likes.includes('crafting') || (station === 'oven' && v.profession === 'baker') ? 5 : 1, comfort: station === 'forge' ? -2 : 2 }),
        { kind: 'skill', skill, xp: 0.25 }, sfx(sfxName), { kind: 'stat', key: `${verb}_count` },
      ], 2);
    },
  };
}

export const CRAFTJOB_TOOLS: ToolDef[] = [
  craftJob('forge', 'Smelt or forge something at the smithy: bars, nails, horseshoes, tools, lanterns.', 'forge', ['blacksmith'], 'crafting', 'hammer', 'forge'),
  craftJob('bake', 'Bake bread, sweet rolls or a pie at the bakery oven.', 'oven', ['baker'], 'cooking', 'oven', 'bake'),
  craftJob('cook', 'Cook a meal at a kitchen (home, the tavern).', 'kitchen', undefined, 'cooking', 'oven', 'cook'),
  craftJob('craft_furniture', 'Make furniture at the carpenter\'s workbench: chairs, bookshelves, birdhouses, toy boats, rods.', 'workbench', ['carpenter'], 'crafting', 'hammer', 'craft'),
  {
    name: 'repair', category: 'work', professions: ['blacksmith'],
    description: 'Repair a villager\'s worn tool at the smithy for a fee.',
    params: { type: 'object', properties: { item: { type: 'string' }, for: { type: 'string', description: 'villager whose tool it is' } } },
    available: (v, view) => sim(view).villagers.some((o) => o.id !== v.id && o.inventory.some((st) => item(st.id).kind === 'tool') && (o.stats.toolWear ?? 0) >= 4),
    execute(v, view, args) {
      const s = sim(view);
      const cands = s.villagers.filter((o) => o.id !== v.id && o.inventory.some((st) => item(st.id).kind === 'tool') && (o.stats.toolWear ?? 0) >= 4);
      const t = args.for !== undefined && args.for !== '' ? s.resolveVillager(args.for) : cands[0];
      if (!t) return fail('nobody has a tool that needs repairing');
      const tool = args.item !== undefined && args.item !== '' ? resolveItem(args.item) : t.inventory.find((st) => item(st.id).kind === 'tool')?.id;
      if (!tool || !s.has(t, tool)) return fail(`${first(t)} has no such tool`);
      const walk = needPlace(v, s, v.workplace, 'repair', { item: tool, for: t.id });
      if (walk) return walk;
      const fee = Math.min(t.money, 15);
      return done(`${first(v)} repaired ${first(t)}'s ${itemName(tool).toLowerCase()}`, 25, [
        { kind: 'fn', fn: (_s: SimCore, _me: Villager) => { t.stats.toolWear = 0; } }, { kind: 'money', delta: fee }, { kind: 'money', who: t.id, delta: -fee }, rate({ energy: -5, purpose: 10 }), { kind: 'skill', skill: 'crafting', xp: 0.15 }, sfx('hammer'),
        rel(t.id, 'help', { mutual: true, backDelta: { affinity: 4, trust: 4, familiarity: 2 } }), memFor(t.id, `${first(v)} repaired ${first(t)}'s ${itemName(tool).toLowerCase()} for ${fee} coins`, 3, ['helped', 'work', 'pleasant'], [v.id]), { kind: 'stat', key: 'repairs' },
      ], 3);
    },
  },
];

/* -------------------------------------------------------------------- doctor */

export const CARE_TOOLS: ToolDef[] = [
  {
    name: 'treat', category: 'work', professions: ['doctor'],
    description: 'Treat a sick or injured villager with a tonic or bandage.',
    params: { type: 'object', properties: { villager: { type: 'string' } } },
    available: (v, view) => sim(view).villagers.some((o) => o.id !== v.id && (o.status.includes('sick') || o.status.includes('injured') || o.health < 50)) && (sim(view).has(v, 'tonic') || sim(view).has(v, 'bandage') || sim(view).has(v, 'herbs')),
    execute(v, view, args) {
      const s = sim(view);
      const sick = s.villagers.filter((o) => o.id !== v.id && (o.status.includes('sick') || o.status.includes('injured') || o.health < 50));
      const t = args.villager !== undefined && args.villager !== '' ? s.resolveVillager(args.villager) : sick.sort((a, b) => a.health - b.health)[0];
      if (!t) return fail('nobody needs treating');
      if (!(t.status.includes('sick') || t.status.includes('injured') || t.health < 50)) return fail(`${first(t)} is perfectly healthy`);
      const med: ItemId | undefined = t.status.includes('injured') && s.has(v, 'bandage') ? 'bandage' : s.has(v, 'tonic') ? 'tonic' : s.has(v, 'herbs') ? 'herbs' : s.has(v, 'bandage') ? 'bandage' : undefined;
      if (!med) return fail(`${first(v)} has nothing to treat ${first(t)} with`);
      if (s.isAsleep(t) && !s.atPlace(t, t.home)) return fail(`${first(t)} is asleep`);
      const walk = s.atPlace(t, v.workplace) ? null : needNear(v, s, t, 'treat', { villager: t.id });
      if (walk) return walk;
      const fee = Math.min(t.money, 20);
      const heal = med === 'tonic' ? 35 : med === 'bandage' ? 25 : 15;
      return done(`${first(v)} treated ${first(t)} with ${itemName(med).toLowerCase()}`, 20, [
        { kind: 'take', items: [{ id: med, qty: 1 }], when: 'start' }, { kind: 'health', who: t.id, delta: heal }, { kind: 'status', who: t.id, remove: ['sick', 'injured'] }, { kind: 'fn', fn: (ss: SimCore) => { ss.rt(t).flagUntil.sick = 0; } },
        { kind: 'money', delta: fee }, { kind: 'money', who: t.id, delta: -fee }, rate({ energy: -3, purpose: 14 }), { kind: 'skill', skill: 'medicine', xp: 0.3 }, sfx('heal'),
        rel(t.id, 'treated', { mutual: true }), memFor(t.id, `${first(v)} treated ${first(t)} and they felt much better`, 5, ['helped', 'sick', 'pleasant'], [v.id]), { kind: 'need', who: t.id, comfort: 15 }, { kind: 'stat', key: 'patients' },
        chron(`${first(v)} treated ${first(t)}${t.status.includes('injured') ? "'s injury" : "'s cold"}.`, 4, [v.id, t.id]),
        { kind: 'say', who: t.id, text: s.rng.pick(['Thank you, doctor.', 'Already feel less like death. Thank you.', 'What do I owe you? No — take it.']), to: v.id, tone: 'warm' },
      ], 4);
    },
  },
  {
    name: 'check_up', category: 'work', professions: ['doctor'],
    description: 'Give someone a quick check-up and a word of advice.',
    params: { type: 'object', properties: { villager: { type: 'string' } } },
    available: (v, view) => sim(view).villagersNear(v.pos, 8).some((o) => o.id !== v.id && !sim(view).isAsleep(o) && (v.stats[`checked_${o.id}`] ?? -1) !== sim(view).world.time.dayIndex),
    execute(v, view, args) {
      const s = sim(view);
      const near = s.villagersNear(v.pos, 8).filter((o) => o.id !== v.id && !s.isAsleep(o) && (v.stats[`checked_${o.id}`] ?? -1) !== s.world.time.dayIndex);
      const t = args.villager !== undefined && args.villager !== '' ? s.resolveVillager(args.villager) : near.sort((a, b) => a.health - b.health)[0];
      if (!t) return fail('nobody to check on');
      if (s.isAsleep(t)) return fail(`${first(t)} is asleep`);
      const walk = needNear(v, s, t, 'check_up', { villager: t.id });
      if (walk) return walk;
      const advice = t.needs.energy < 40 ? 'sleep more' : t.needs.hunger < 40 ? 'eat properly' : t.status.includes('drunk') ? 'drink less' : t.needs.comfort < 40 ? 'stay warm and dry' : 'keep doing whatever you are doing';
      return done(`${first(v)} checked ${first(t)} over and told them to ${advice}`, 8, [
        { kind: 'fn', fn: (_s: SimCore, me: Villager) => { me.stats[`checked_${t.id}`] = s.world.time.dayIndex; } }, { kind: 'health', who: t.id, delta: 4 }, rate({ purpose: 8, social: 6 }), { kind: 'skill', skill: 'medicine', xp: 0.1 },
        say(s.rng.pick([`Let me look at you, ${first(t)}. Hm. You should ${advice}.`, `${first(t)}. Tongue out. Yes. You need to ${advice}.`, `Sorry — doctor's habit. You need to ${advice}, you know.`]), t.id, 'warm'),
        rel(t.id, 'chat', { mutual: true, backDelta: { affinity: 1.5, trust: 2, familiarity: 2 } }), memFor(t.id, `${first(v)} gave ${first(t)} a once-over and said to ${advice}`, 2, ['social', 'medicine'], [v.id]), { kind: 'need', who: t.id, social: 3 }, { kind: 'stat', key: 'checkups' },
      ], 2);
    },
  },
];

/* --------------------------------------------------------------------- shops */

function myShop(s: SimCore, v: Villager) { for (const sh of s.shops.values()) if (sh.owner === v.id) return sh; return undefined; }

export const SHOP_TOOLS: ToolDef[] = [
  {
    name: 'open_shop', category: 'work', professions: ['shopkeeper', 'baker', 'innkeeper', 'blacksmith', 'doctor', 'carpenter', 'librarian', 'fisher'],
    description: 'Open your shop for the day and put your own goods on the shelves.',
    params: { type: 'object', properties: {} },
    available(v, view) { const s = sim(view); const sh = myShop(s, v); if (!sh) return false; const h = s.hourFloat(); return !(sh.open && (v.stats.shopDay ?? -1) === s.world.time.dayIndex) && h >= 6 && h < 20; },
    execute(v, view) {
      const s = sim(view);
      const sh = myShop(s, v);
      if (!sh) return fail(`${first(v)} has no shop`);
      const walk = needPlace(v, s, sh.place, 'open_shop', {});
      if (walk) return walk;
      const moved: { id: ItemId; qty: number }[] = [];
      for (const st of v.inventory) {
        const base = sh.base.find((b) => b.id === st.id);
        if (base && item(st.id).kind !== 'tool') { const keep = item(st.id).edible ? 1 : 0; const q = Math.max(0, st.qty - keep); if (q > 0) moved.push({ id: st.id, qty: q }); }
      }
      const place = s.world.place(sh.place)!;
      return done(`${first(v)} opened ${place.name}${moved.length ? ' and stocked the shelves' : ''}`, 5, [
        { kind: 'fn', fn: (ss: SimCore, me: Villager) => { sh.open = true; me.stats.shopDay = ss.world.time.dayIndex; } }, { kind: 'take', items: moved }, { kind: 'shop', place: sh.place, add: moved }, rate({ purpose: 10 }), sfx('bell'), { kind: 'stat', key: 'shop_opened' },
      ], 1);
    },
  },
  {
    name: 'close_shop', category: 'work', professions: ['shopkeeper', 'baker', 'innkeeper', 'blacksmith', 'doctor', 'carpenter', 'librarian', 'fisher'],
    description: 'Close up the shop for the day and count the takings.',
    params: { type: 'object', properties: {} },
    available(v, view) { const s = sim(view); const sh = myShop(s, v); return !!sh && sh.open && s.hourFloat() >= 16; },
    execute(v, view) {
      const s = sim(view);
      const sh = myShop(s, v);
      if (!sh || !sh.open) return fail('the shop is not open');
      const walk = needPlace(v, s, sh.place, 'close_shop', {});
      if (walk) return walk;
      const sold = sh.sold;
      const place = s.world.place(sh.place)!;
      const good = sold >= 6;
      return done(`${first(v)} closed ${place.name} — ${sold === 0 ? 'not a single sale' : sold + ' sales'} today`, 6, [
        { kind: 'fn', fn: (ss: SimCore) => { sh.open = false; sh.closedDay = ss.world.time.dayIndex; sh.sold = 0; sh.bought = 0; } }, rate({ purpose: good ? 8 : 2 }), need({ fun: good ? 3 : -2 }), sfx('bell'), { kind: 'stat', key: 'shop_closed' },
        { kind: 'memory', text: good ? `${place.name} had a good day: ${sold} sales` : sold === 0 ? `Not one customer at ${place.name} today` : `A slow day at ${place.name}: ${sold} sales`, importance: good || sold === 0 ? 4 : 2, tags: ['work', 'money', good ? 'pleasant' : sold === 0 ? 'unpleasant' : 'work'] },
      ], 1);
    },
  },
  {
    name: 'restock', category: 'work', professions: ['shopkeeper', 'baker', 'innkeeper', 'blacksmith', 'doctor', 'carpenter', 'librarian', 'fisher'],
    description: 'Restock the shelves from your own stores (costs money for bought-in goods).',
    params: { type: 'object', properties: {} },
    available(v, view) { const s = sim(view); const sh = myShop(s, v); if (!sh) return false; const buysIn = sh.place === 'store' || sh.place === 'tavern'; if (buysIn) return sh.base.some((b) => stockOf(sh, b.id) < Math.ceil(b.qty * 0.5)) && v.money >= 10; return v.inventory.some((st) => sh.base.some((b) => b.id === st.id) && item(st.id).kind !== 'tool' && st.qty > 1); },
    execute(v, view) {
      const s = sim(view);
      const sh = myShop(s, v);
      if (!sh) return fail(`${first(v)} has no shop`);
      const walk = needPlace(v, s, sh.place, 'restock', {});
      if (walk) return walk;
      // first move own produce, then buy in the rest up to what money allows
      const moved: { id: ItemId; qty: number }[] = [];
      for (const st of v.inventory) { const base = sh.base.find((b) => b.id === st.id); if (base && item(st.id).kind !== 'tool' && st.qty > 1) moved.push({ id: st.id, qty: st.qty - 1 }); }
      const place = s.world.place(sh.place)!;
      return done(`${first(v)} restocked ${place.name}`, 20, [
        { kind: 'take', items: moved }, { kind: 'shop', place: sh.place, add: moved },
        { kind: 'fn', fn: (ss: SimCore, me: Villager) => { if (sh.place !== 'store' && sh.place !== 'tavern') return; const before = sh.stock.map((x) => ({ ...x })); const added = fullRestock(sh); let cost = 0; for (const b of sh.stock) { const prev = before.find((x) => x.id === b.id)?.qty ?? 0; const d = b.qty - prev; if (d > 0) cost += d * item(b.id).price * 0.3; } cost = Math.round(cost); if (cost > me.money) { const f = me.money / cost; for (const b of sh.stock) { const prev = before.find((x) => x.id === b.id)?.qty ?? 0; const d = b.qty - prev; if (d > 0) b.qty = prev + Math.floor(d * f); } cost = Math.floor(me.money); } me.money -= cost; me.stats.moneySpent = (me.stats.moneySpent ?? 0) + cost; void added; void ss; }, when: 'end' },
        rate({ purpose: 8, energy: -3 }), { kind: 'stat', key: 'restocks' },
      ], 1);
    },
  },
  {
    name: 'set_price', category: 'work', professions: ['shopkeeper', 'baker', 'innkeeper', 'blacksmith', 'doctor', 'carpenter', 'librarian', 'fisher'],
    description: 'Set your own price for an item in your shop (between 60% and 180% of its usual price).',
    params: { type: 'object', properties: { item: { type: 'string' }, price: { type: 'number' } }, required: ['item', 'price'] },
    available(v, view) { const s = sim(view); const sh = myShop(s, v); return !!sh && sh.stock.length > 0 && v.stats.priceDay !== s.world.time.dayIndex && (v.personality.traits.includes('shrewd') || v.personality.traits.includes('penny-pinching') || v.personality.likes.includes('money') || s.rng.chance(0.01)); },
    execute(v, view, args) {
      const s = sim(view);
      const sh = myShop(s, v);
      if (!sh) return fail(`${first(v)} has no shop`);
      const id = resolveItem(args.item) ?? s.rng.pick(sh.stock).id;
      const base = item(id).price;
      const price = Math.round(Math.max(base * 0.6, Math.min(base * 1.8, num(args, 'price', base * (1 + s.rng.range(-0.1, 0.25))))));
      const walk = needPlace(v, s, sh.place, 'set_price', { item: id, price });
      if (walk) return walk;
      return done(`${first(v)} set the price of ${itemName(id).toLowerCase()} to ${price} coins`, 3, [{ kind: 'shop', place: sh.place, price: { id, price } }, rate({ purpose: 6 }), { kind: 'stat', key: 'prices_set' }, { kind: 'fn', fn: (ss: SimCore, me: Villager) => { me.stats.priceDay = ss.world.time.dayIndex; } }], 1);
    },
  },
];

/* ------------------------------------------------------------------- tavern */

export const TAVERN_TOOLS: ToolDef[] = [
  {
    name: 'serve_drinks', category: 'work', professions: ['innkeeper'],
    description: 'Work the bar: pour for whoever is in, keep the stories flowing.',
    params: { type: 'object', properties: {} },
    available: (v, view) => sim(view).hourFloat() >= 11,
    execute(v, view) {
      const s = sim(view);
      const walk = needPlace(v, s, v.workplace, 'serve_drinks', {});
      if (walk) return walk;
      const guests = s.villagers.filter((o) => o.id !== v.id && s.atPlace(o, v.workplace) && !s.isAsleep(o));
      const effects: Effect[] = [rate({ purpose: 8, social: 8, energy: -3 }), { kind: 'skill', skill: 'charm', xp: 0.1 }, sfx('drink'), { kind: 'stat', key: 'bar_shifts' }, { kind: 'fn', fn: () => { const sh = myShop(s, v); if (sh) sh.open = true; } }];
      let takings = 0;
      for (const g of guests) {
        const drink: ItemId = g.personality.dislikes.includes('ale') ? 'tea' : g.personality.likes.includes('cider') ? 'cider' : 'ale';
        const price = drink === 'tea' ? 6 : drink === 'cider' ? 10 : 8;
        if (g.money < price) continue;
        takings += price;
        effects.push({ kind: 'money', who: g.id, delta: -price }, { kind: 'need', who: g.id, fun: 7, hunger: 4, social: 5 }, rel(g.id, 'chat', { mutual: true, backDelta: { affinity: 1.5, familiarity: 2 } }), memFor(g.id, `${first(v)} poured ${first(g)} ${drink === 'tea' ? 'a tea' : drink === 'cider' ? 'a cider' : 'an ale'} at the Owl`, 2, ['tavern', 'social', 'drink'], [v.id]));
        if (drink === 'ale' && s.rng.chance(0.25)) effects.push({ kind: 'status', who: g.id, add: ['drunk'], minutes: 120 });
      }
      effects.push({ kind: 'money', delta: takings });
      const msg = guests.length ? `${first(v)} served drinks to ${guests.map((g) => first(g)).join(', ')}` : `${first(v)} polished glasses behind an empty bar`;
      return done(msg, 35, effects, guests.length ? 2 : 1);
    },
  },
  {
    name: 'host_evening', category: 'work', professions: ['innkeeper'],
    description: 'Make a proper evening of it at the tavern: music, stories, a round on the house. Draws people in.',
    params: { type: 'object', properties: {} },
    available: (v, view) => sim(view).hourFloat() >= 18.5 && sim(view).hourFloat() < 23 && !sim(view).events.some((e) => e.place === v.workplace && e.endsAt > sim(view).now),
    execute(v, view) {
      const s = sim(view);
      const walk = needPlace(v, s, v.workplace, 'host_evening', {});
      if (walk) return walk;
      const place = s.world.place(v.workplace)!;
      const name = s.rng.pick(['Song night', 'Story night', 'A round on the house', 'Dice and cider', 'The Owl\'s open evening']);
      return done(`${first(v)} hosted ${name.toLowerCase()} at ${place.name}`, 75, [
        { kind: 'fn', when: 'start', fn: (ss: SimCore, me: Villager) => { ss.events.push({ id: `evening_${ss.now}`, name: `${name} at ${place.name}`, kind: 'social', startedAt: ss.now, endsAt: ss.now + 150, place: place.id, text: `${first(me)} is hosting ${name.toLowerCase()} at ${place.name}. Everyone welcome.`, data: { host: me.id } }); for (const o of ss.villagers) if (o.id !== me.id && !ss.isAsleep(o) && (o.relationships[me.id]?.affinity ?? 0) > -20) ss.remember(o, { kind: 'event', text: `${first(me)} is hosting ${name.toLowerCase()} at ${place.name} tonight`, importance: 4, tags: ['event', 'tavern', 'social', 'invite'], about: [me.id], place: place.id }); } },
        rate({ purpose: 10, social: 14, fun: 10, energy: -5 }), { kind: 'money', delta: -15 }, { kind: 'skill', skill: 'charm', xp: 0.3 }, sfx('music'), { kind: 'stat', key: 'evenings_hosted' },
        chron(`${first(v)} hosted ${name.toLowerCase()} at ${place.name}.`, 5, [v.id], place.id),
        { kind: 'fn', fn: (ss: SimCore, me: Villager) => { const guests = ss.villagers.filter((o: Villager) => o.id !== me.id && ss.atPlace(o, place.id)); for (const g of guests) { ss.remember(g, { kind: 'observation', text: `${first(g)} spent the evening at ${place.name} — ${first(me)}'s ${name.toLowerCase()}`, importance: 4, tags: ['tavern', 'social', 'pleasant', 'fun'], about: [me.id], place: place.id }); g.needs.fun = Math.min(100, g.needs.fun + 12); g.needs.social = Math.min(100, g.needs.social + 10); ss.adjustRelationship(g, me.id, { affinity: 2.5, familiarity: 2 }); ss.adjustRelationship(me, g.id, { affinity: 1.5, familiarity: 2 }); } if (guests.length >= 3) ss.log(`${place.name} was full tonight: ${guests.map((g: Villager) => first(g)).join(', ')}.`, 4, [me.id, ...guests.map((g: Villager) => g.id)], place.id); } },
      ], 3);
    },
  },
];

/* ------------------------------------------------------------------- library */

export const LIBRARY_TOOLS: ToolDef[] = [
  {
    name: 'teach', category: 'work',
    description: 'Teach someone a skill you know well.',
    params: { type: 'object', properties: { villager: { type: 'string' }, skill: { type: 'string', enum: ['farming', 'fishing', 'mining', 'cooking', 'crafting', 'charm', 'lore', 'medicine'] } } },
    available(v, view) {
      const s = sim(view);
      const best = Object.entries(v.skills).sort((a, b) => b[1] - a[1])[0];
      if (!best || best[1] < 5) return false;
      return s.villagersNear(v.pos, 8).some((o) => o.id !== v.id && !s.isAsleep(o) && (o.skills[best[0] as SkillName] ?? 0) < best[1] - 2 && (o.relationships[v.id]?.affinity ?? 0) > -10);
    },
    execute(v, view, args) {
      const s = sim(view);
      const skill = (['farming', 'fishing', 'mining', 'cooking', 'crafting', 'charm', 'lore', 'medicine'].includes(str(args, 'skill')) ? str(args, 'skill') : Object.entries(v.skills).sort((a, b) => b[1] - a[1])[0][0]) as SkillName;
      if (v.skills[skill] < 5) return fail(`${first(v)} does not know enough ${skill} to teach it`);
      const near = s.villagersNear(v.pos, 8).filter((o) => o.id !== v.id && !s.isAsleep(o) && (o.skills[skill] ?? 0) < v.skills[skill] - 2);
      const t = args.villager !== undefined && args.villager !== '' ? s.resolveVillager(args.villager) : near.sort((a, b) => (a.skills[skill] ?? 0) - (b.skills[skill] ?? 0))[0];
      if (!t) return fail('nobody nearby to teach');
      if (s.isAsleep(t)) return fail(`${first(t)} is asleep`);
      if ((t.relationships[v.id]?.affinity ?? 0) < -10) return fail(`${first(t)} would not take lessons from ${first(v)}`);
      const walk = needNear(v, s, t, 'teach', { villager: t.id, skill });
      if (walk) return walk;
      const keen = t.personality.openness > 0.6 || t.personality.likes.includes(skill);
      return done(`${first(v)} taught ${first(t)} a little ${skill}`, 30, [
        { kind: 'fn', fn: (ss: SimCore) => { ss.addSkill(t, skill, keen ? 0.6 : 0.35); } }, rate({ purpose: 10, social: 8 }), { kind: 'skill', skill, xp: 0.05 }, { kind: 'skill', skill: 'charm', xp: 0.1 },
        say(s.rng.pick([`Here — let me show you a trick with ${skill}.`, `You are holding that wrong. Watch.`, `The secret to ${skill}? Patience. And this.`]), t.id, 'warm'),
        rel(t.id, 'taught', { mutual: true, backDelta: { affinity: keen ? 4 : 2, trust: 3, familiarity: 3 } }), { kind: 'need', who: t.id, purpose: 8, fun: keen ? 6 : 1, social: 6 },
        memFor(t.id, `${first(v)} taught ${first(t)} something about ${skill}${keen ? ' — fascinating' : ''}`, keen ? 4 : 3, ['taught', 'helped', 'social', 'pleasant', skill], [v.id]), { kind: 'stat', key: 'lessons' },
        chron(`${first(v)} gave ${first(t)} a lesson in ${skill}.`, 3, [v.id, t.id]),
      ], 3);
    },
  },
  {
    name: 'catalogue_books', category: 'work', professions: ['librarian'],
    description: 'Sort, shelve and catalogue the library.',
    params: { type: 'object', properties: {} },
    available: () => true,
    execute(v, view) {
      const s = sim(view);
      const walk = needPlace(v, s, v.workplace, 'catalogue_books', {});
      if (walk) return walk;
      const find = s.rng.chance(0.08);
      const found: ItemId = s.rng.pick(['poetry', 'map_fragment', 'book']);
      const effects: Effect[] = [rate({ purpose: 9, fun: v.personality.likes.includes('books') ? 4 : -1, energy: -2 }), { kind: 'skill', skill: 'lore', xp: 0.15 }, sfx('write'), { kind: 'stat', key: 'catalogued' }];
      if (find) effects.push({ kind: 'give', items: [{ id: found, qty: 1 }] }, { kind: 'memory', text: `Tucked behind the folios: ${itemName(found).toLowerCase()} nobody had catalogued`, importance: 5, tags: ['work', 'mystery', 'pleasant', 'books'] }, chron(`${first(v)} found ${found === 'map_fragment' ? 'an old map fragment' : 'a forgotten ' + itemName(found).toLowerCase()} behind the library shelves.`, 4, [v.id], v.workplace));
      return done(find ? `${first(v)} catalogued the shelves and found ${itemName(found).toLowerCase()} nobody had recorded` : `${first(v)} catalogued ${s.rng.pick(['the histories', 'the poetry shelf', 'the almanacs', 'the returns pile', 'the natural philosophy section'])}`, 40, effects, find ? 4 : 1);
    },
  },
  {
    name: 'write_book', category: 'work',
    description: 'Work on your own book. Five sessions finish a volume.',
    params: { type: 'object', properties: { title: { type: 'string' } } },
    available: (v) => v.skills.lore >= 5 || v.personality.likes.includes('poetry') || v.personality.traits.includes('artistic'),
    execute(v, view, args) {
      const s = sim(view);
      const place = v.profession === 'librarian' ? v.workplace : v.home;
      const walk = needPlace(v, s, place, 'write_book', args);
      if (walk) return walk;
      const progress = (v.stats.bookProgress ?? 0) + 1;
      const title = str(args, 'title') || (v.stats.bookTitleSeed !== undefined ? BOOK_TITLES[v.stats.bookTitleSeed % BOOK_TITLES.length] : BOOK_TITLES[s.rng.int(0, BOOK_TITLES.length - 1)]);
      const finished = progress >= 5;
      const effects: Effect[] = [{ kind: 'fn', fn: (_s: SimCore, me: Villager) => { me.stats.bookProgress = finished ? 0 : progress; if (me.stats.bookTitleSeed === undefined) me.stats.bookTitleSeed = BOOK_TITLES.indexOf(title) < 0 ? 0 : BOOK_TITLES.indexOf(title); } }, rate({ purpose: 10, fun: 6, energy: -2, social: -1 }), { kind: 'skill', skill: 'lore', xp: 0.3 }, sfx('write'), { kind: 'status', add: ['inspired'], minutes: 120 }, { kind: 'stat', key: 'writing_sessions' }];
      if (finished) effects.push({ kind: 'give', items: [{ id: v.personality.likes.includes('poetry') ? 'poetry' : 'book', qty: 1 }] }, chron(`${first(v)} finished writing "${title}".`, 6, [v.id]), need({ fun: 15, purpose: 20 }), emote('exclaim'));
      return done(finished ? `${first(v)} finished "${title}"` : `${first(v)} wrote ${s.rng.pick(['a page', 'two pages', 'half a chapter', 'a paragraph, and crossed it out, and wrote it again'])} of "${title}"`, 50, effects, finished ? 7 : 2);
    },
  },
];

const BOOK_TITLES = ['A History of Pebblebrook', 'The River Book', 'Verses for the Lantern Night', 'What the Mine Remembers', 'Bread and Weather', 'The Drowsy Owl Almanac', 'Notes from the Hill'];

/* ---------------------------------------------------------------- carpenter */

const STRUCTURES: Record<string, { wood: number; nails: number; minutes: number; place: string; text: string }> = {
  fence: { wood: 4, nails: 1, minutes: 60, place: 'farm', text: 'a stretch of fence at the farm' },
  bench: { wood: 4, nails: 1, minutes: 70, place: 'square', text: 'a new bench for the square' },
  bandstand: { wood: 8, nails: 2, minutes: 120, place: 'square', text: 'part of the bandstand in the square' },
  shed: { wood: 6, nails: 2, minutes: 90, place: 'carpenter', text: 'a lean-to shed' },
  birdhouse_post: { wood: 3, nails: 1, minutes: 40, place: 'meadow', text: 'a birdhouse post in the meadow' },
  dock_plank: { wood: 3, nails: 1, minutes: 45, place: 'dock', text: 'new planks on the dock' },
  lantern_post: { wood: 3, nails: 1, minutes: 45, place: 'square', text: 'a lantern post for the square' },
};

export const BUILD_TOOLS: ToolDef[] = [
  {
    name: 'build', category: 'work', professions: ['carpenter'],
    description: 'Build a structure somewhere in the village: fence, bench, bandstand, shed, birdhouse_post, dock_plank, lantern_post.',
    params: { type: 'object', properties: { structure: { type: 'string', enum: Object.keys(STRUCTURES) } } },
    available: (v, view) => Object.values(STRUCTURES).some((st) => sim(view).has(v, 'wood', st.wood) && sim(view).has(v, 'nails', st.nails)),
    execute(v, view, args) {
      const s = sim(view);
      let key = str(args, 'structure').toLowerCase().replace(/\s+/g, '_');
      if (!STRUCTURES[key]) { const ok = Object.keys(STRUCTURES).filter((k) => s.has(v, 'wood', STRUCTURES[k].wood) && s.has(v, 'nails', STRUCTURES[k].nails)); if (!ok.length) return fail(`${first(v)} needs wood and nails to build`); key = v.personality.dream.includes('bandstand') && ok.includes('bandstand') && s.rng.chance(0.5) ? 'bandstand' : s.rng.pick(ok); }
      const st = STRUCTURES[key];
      if (!s.has(v, 'wood', st.wood) || !s.has(v, 'nails', st.nails)) return fail(`${first(v)} needs ${st.wood} wood and ${st.nails} nails for ${key.replace('_', ' ')}`);
      const place = s.world.place(st.place) ?? s.world.place(v.workplace)!;
      const walk = needPlace(v, s, place.id, 'build', { structure: key }, false);
      if (walk) return walk;
      const effects: Effect[] = [{ kind: 'take', items: [{ id: 'wood', qty: st.wood }, { id: 'nails', qty: st.nails }], when: 'start' }, rate({ energy: -7, purpose: 14, fun: 4 }), { kind: 'skill', skill: 'crafting', xp: 0.4 }, sfx('hammer'), { kind: 'stat', key: 'built' }, chron(`${first(v)} built ${st.text}.`, key === 'bandstand' ? 6 : 4, [v.id], place.id)];
      if (key === 'bandstand') effects.push({ kind: 'fn', fn: (_s: SimCore, me: Villager) => { me.stats.bandstand = (me.stats.bandstand ?? 0) + 1; } }, { kind: 'memory', text: 'One step closer to the bandstand. One day the first song.', importance: 6, tags: ['work', 'dream', 'pleasant'] });
      return done(`${first(v)} built ${st.text}`, skillTime(st.minutes, v.skills.crafting), effects, 3);
    },
  },
  {
    name: 'repair_structure', category: 'work', professions: ['carpenter'],
    description: 'Fix something up around the village: a door, a roof, the dock, a fence.',
    params: { type: 'object', properties: { place: { type: 'string' } } },
    available: (v, view) => sim(view).has(v, 'wood', 2),
    execute(v, view, args) {
      const s = sim(view);
      if (!s.has(v, 'wood', 2)) return fail(`${first(v)} needs 2 wood`);
      const p = args.place !== undefined && args.place !== '' ? s.resolvePlace(args.place) : s.rng.pick(s.world.places.filter((x) => x.kind !== 'nature' && x.id !== v.home && x.id !== v.workplace));
      if (!p) return fail('nowhere to repair');
      const walk = needPlace(v, s, p.id, 'repair_structure', { place: p.id }, false);
      if (walk) return walk;
      const owner = p.owner ? s.villager(p.owner) : undefined;
      const fee = owner ? Math.min(owner.money, 20) : 10;
      const what = s.rng.pick(['the door', 'a shutter', 'the step', 'a loose board', 'the gutter', 'the sign']);
      const effects: Effect[] = [{ kind: 'take', items: [{ id: 'wood', qty: 2 }], when: 'start' }, { kind: 'money', delta: fee }, rate({ energy: -5, purpose: 10 }), { kind: 'skill', skill: 'crafting', xp: 0.2 }, sfx('hammer'), { kind: 'stat', key: 'repairs' }];
      if (owner && owner.id !== v.id) effects.push({ kind: 'money', who: owner.id, delta: -fee }, rel(owner.id, 'help', { mutual: true }), memFor(owner.id, `${first(v)} fixed ${what} at ${p.name}`, 3, ['helped', 'pleasant'], [v.id]));
      return done(`${first(v)} fixed ${what} at ${p.name}`, 35, effects, 2);
    },
  },
];

const sim = asCore;
export const WORK_TOOLS: ToolDef[] = [...FARM_TOOLS, ...FISH_TOOLS, ...GATHER_TOOLS, ...CRAFTJOB_TOOLS, ...CARE_TOOLS, ...SHOP_TOOLS, ...TAVERN_TOOLS, ...LIBRARY_TOOLS, ...BUILD_TOOLS];
