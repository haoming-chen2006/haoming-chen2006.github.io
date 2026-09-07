import { RECIPES, item } from '../../core/items.ts';
import type { Effect, ItemId, ToolDef, Villager } from '../../core/types.ts';
import { asCore, type SimCore } from '../core.ts';
import { chron, done, fail, first, hasAll, itemName, missing, need, needPlace, num, placeWithFacility, rate, recipe, sfx, str } from './util.ts';
import { resolveItem } from './economy.ts';
import { eatItem } from './life.ts';

const s = asCore;

export const CRAFT_TOOLS: ToolDef[] = [
  {
    name: 'craft', category: 'craft',
    description: 'Make something by hand from a recipe: cloth, candles, bandages, a scarf, flour, or anything at a station you can reach.',
    params: { type: 'object', properties: { recipe: { type: 'string', description: RECIPES.map((r) => r.id).join(' | ') } }, required: ['recipe'] },
    available(v, view) {
      const sim = s(view);
      return RECIPES.some((r) => hasAll(sim, v, r.inputs) && (!r.skill || v.skills[r.skill.name] >= r.skill.level) && (r.station === 'anywhere' || !!placeWithFacility(v, sim, r.station)));
    },
    execute(v, view, args) {
      const sim = s(view);
      let r = recipe(str(args, 'recipe'));
      if (!r) {
        const ok = RECIPES.filter((x) => hasAll(sim, v, x.inputs) && (!x.skill || v.skills[x.skill.name] >= x.skill.level) && (x.station === 'anywhere' || !!placeWithFacility(v, sim, x.station)));
        if (!ok.length) return fail(`${first(v)} has nothing to craft with`);
        r = sim.rng.pick(ok);
      }
      if (r.skill && v.skills[r.skill.name] < r.skill.level) return fail(`${first(v)} is not skilled enough for ${r.name}`);
      const miss = missing(sim, v, r.inputs);
      if (miss.length) return fail(`${first(v)} needs ${miss.map((m) => `${m.qty} ${itemName(m.id).toLowerCase()}`).join(', ')} for ${r.name}`);
      if (r.station !== 'anywhere') {
        const place = placeWithFacility(v, sim, r.station);
        if (!place) return fail(`nowhere with a ${r.station}`);
        const walk = needPlace(v, sim, place.id, 'craft', { recipe: r.id }, !!place.interior);
        if (walk) return walk;
      }
      const skill = r.station === 'forge' || r.station === 'workbench' ? 'crafting' : r.station === 'oven' || r.station === 'kitchen' ? 'cooking' : 'crafting';
      return done(`${first(v)} made ${r.result.qty} ${r.name.toLowerCase()}`, Math.round(r.minutes * (1 - 0.03 * v.skills[skill])), [
        { kind: 'take', items: r.inputs, when: 'start' }, { kind: 'give', items: [{ ...r.result }] }, rate({ purpose: 8, fun: v.personality.likes.includes('crafting') ? 6 : 2, energy: -2 }), { kind: 'skill', skill, xp: 0.2 }, sfx(r.station === 'forge' || r.station === 'workbench' ? 'hammer' : 'write'), { kind: 'stat', key: 'crafted' },
      ], 2);
    },
  },
  {
    name: 'use_item', category: 'craft',
    description: 'Use an item: eat or drink it, take a medicine, read a book, use fertiliser on a plot, rub a horseshoe for luck.',
    params: { type: 'object', properties: { item: { type: 'string' } }, required: ['item'] },
    available: (v) => v.inventory.some((st) => { const d = item(st.id); return !!d.edible || d.kind === 'medicine' || d.kind === 'book' || st.id === 'horseshoe' || st.id === 'fertiliser'; }),
    execute(v, view, args) {
      const sim = s(view);
      const id = resolveItem(args.item);
      if (!id || !sim.has(v, id)) return fail(`${first(v)} has no ${str(args, 'item')}`);
      const d = item(id);
      if (d.kind === 'medicine') {
        const injured = v.status.includes('injured');
        return done(`${first(v)} used ${d.name.toLowerCase()}`, 5, [{ kind: 'take', items: [{ id, qty: 1 }] }, { kind: 'health', delta: id === 'tonic' ? 30 : 15 }, { kind: 'status', remove: id === 'bandage' || injured ? ['injured', 'sick'] : ['sick'] }, { kind: 'fn', fn: (ss: SimCore, me: Villager) => { ss.rt(me).flagUntil.sick = 0; } }, sfx('heal'), { kind: 'stat', key: 'medicine_used' }], 2);
      }
      if (d.edible) return done(`${first(v)} ${d.kind === 'drink' ? 'drank' : 'ate'} ${d.name.toLowerCase()}`, 8, eatItem(sim, v, id), 1);
      if (d.kind === 'book') return done(`${first(v)} read ${d.name.toLowerCase()}`, 30, [rate({ fun: 20, purpose: 4 }), { kind: 'skill', skill: 'lore', xp: 0.15 }, { kind: 'stat', key: 'books_read' }], 1);
      if (id === 'horseshoe') return done(`${first(v)} rubbed the horseshoe for luck`, 1, [{ kind: 'mood', delta: 0.08 }, need({ comfort: 4 }), { kind: 'stat', key: 'luck' }], 1);
      if (id === 'fertiliser') {
        const plot = sim.world.objectsAt(v.profession === 'farmer' ? v.workplace : 'player_farm', 'plot').find((o) => { const p = sim.world.plot(o.id); return p && p.state === 'planted' && !o.data.fertilised; });
        if (!plot) return fail('no planted plot to fertilise');
        return done(`${first(v)} fertilised a plot`, 5, [{ kind: 'take', items: [{ id, qty: 1 }] }, { kind: 'object', id: plot.id, data: { fertilised: true } }, { kind: 'plot', id: plot.id, state: { growth: Math.min(1, (sim.world.plot(plot.id)?.growth ?? 0) + 0.15) } }, rate({ purpose: 6 }), { kind: 'stat', key: 'fertilised' }], 1);
      }
      return fail(`${first(v)} cannot use ${d.name.toLowerCase()} like that`);
    },
  },
  {
    name: 'pick_up', category: 'craft',
    description: 'Pick up something lying nearby (a forage spot, a dropped item, a windfall).',
    params: { type: 'object', properties: { object: { type: 'string' } } },
    available: (v, view) => !v.inside && s(view).world.objectsNear(v.pos, 3).some((o) => (o.kind === 'forage' && (typeof o.data.qty !== 'number' || o.data.qty > 0)) || ((o.kind === 'crate' || o.kind === 'barrel') && typeof o.data.item === 'string')),
    execute(v, view, args) {
      const sim = s(view);
      const near = sim.world.objectsNear(v.pos, 3).filter((o) => (o.kind === 'forage' && (typeof o.data.qty !== 'number' || o.data.qty > 0)) || ((o.kind === 'crate' || o.kind === 'barrel') && typeof o.data.item === 'string'));
      const o = (args.object !== undefined && args.object !== '' ? sim.world.object(String(args.object)) : undefined) ?? near[0];
      if (!o) return fail('nothing here to pick up');
      const id = (typeof o.data.item === 'string' ? o.data.item : sim.rng.pick(['berries', 'mushroom', 'wildflower'])) as ItemId;
      const qty = typeof o.data.qty === 'number' ? Math.max(1, Math.min(1, o.data.qty)) : 1;
      return done(`${first(v)} picked up ${itemName(id).toLowerCase()}`, 1, [{ kind: 'give', items: [{ id, qty }] }, { kind: 'object', id: o.id, data: o.kind === 'forage' ? { qty: Math.max(0, (typeof o.data.qty === 'number' ? o.data.qty : 1) - qty) } : { item: undefined } }, need({ fun: 2 }), { kind: 'stat', key: 'picked_up' }], 1);
    },
  },
  {
    name: 'drop', category: 'craft',
    description: 'Throw something away.',
    params: { type: 'object', properties: { item: { type: 'string' }, qty: { type: 'number' } }, required: ['item'] },
    available: (v) => v.inventory.length > 25,
    execute(v, view, args) {
      const sim = s(view);
      const id = resolveItem(args.item);
      if (!id || !sim.has(v, id)) return fail(`${first(v)} has no ${str(args, 'item')}`);
      const qty = Math.max(1, Math.round(num(args, 'qty', 1)));
      return done(`${first(v)} threw away ${qty} ${itemName(id).toLowerCase()}`, 1, [{ kind: 'take', items: [{ id, qty }] }], 1);
    },
  },
  {
    name: 'plant_flower', category: 'craft',
    description: 'Plant a flower somewhere pretty — by your door, in the square, in the meadow.',
    params: { type: 'object', properties: { place: { type: 'string' } } },
    available: (v, view) => (s(view).has(v, 'wildflower') || s(view).has(v, 'sunflower_seed')) && s(view).world.time.isDaylight && !['rain', 'storm', 'snow'].includes(s(view).world.weather.kind),
    execute(v, view, args) {
      const sim = s(view);
      const id: ItemId = sim.has(v, 'sunflower_seed') ? 'sunflower_seed' : 'wildflower';
      if (!sim.has(v, id)) return fail(`${first(v)} has nothing to plant`);
      const target = (args.place !== undefined && args.place !== '' ? sim.resolvePlace(args.place)?.id : undefined) ?? sim.rng.pick([v.home, 'square', 'meadow'].filter((p) => sim.world.place(p)));
      const walk = needPlace(v, sim, target, 'plant_flower', { place: target }, false);
      if (walk) return walk;
      const bed = sim.world.objectsAt(target, 'flowerbed')[0];
      const effects: Effect[] = [{ kind: 'take', items: [{ id, qty: 1 }] }, rate({ fun: 12, purpose: 8, comfort: 4 }), { kind: 'memory', text: `${first(v)} planted a flower at ${sim.placeName(target)}`, importance: 2, tags: ['flower', 'nature', 'pleasant'], place: target }, { kind: 'stat', key: 'flowers_planted' }, sfx('plant')];
      if (bed) effects.push({ kind: 'object', id: bed.id, data: { flowers: (typeof bed.data.flowers === 'number' ? bed.data.flowers : 0) + 1 } });
      if (target === 'square') effects.push(chron(`${first(v)} planted flowers in the square.`, 2, [v.id], 'square'));
      return done(`${first(v)} planted a flower at ${sim.placeName(target)}`, 8, effects, 1);
    },
  },
];
