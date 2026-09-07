import type { ToolDef, Vec } from '../../core/types.ts';
import { asCore } from '../core.ts';
import { done, fail, first, num, rate, str } from './util.ts';

export const MOVE_TOOLS: ToolDef[] = [
  {
    name: 'go_to', category: 'move',
    description: 'Walk to a place, to a villager, or to a tile.',
    params: { type: 'object', properties: { place: { type: 'string', description: 'place id or name' }, villager: { type: 'string', description: 'villager id or name' }, x: { type: 'number' }, y: { type: 'number' } } },
    available: () => true,
    execute(v, view, args) {
      const sim = asCore(view);
      if (args.place !== undefined) {
        const p = sim.resolvePlace(args.place);
        if (!p) return fail(`no place called ${String(args.place)}`);
        if (sim.atPlace(v, p.id)) return done(`${first(v)} is already at ${p.name}`, 0, [], 1);
        return sim.travel(v, { place: p.id, enter: true }, null, `walking to ${p.name}`);
      }
      if (args.villager !== undefined) {
        const t = sim.resolveVillager(args.villager);
        if (!t) return fail(`no villager called ${String(args.villager)}`);
        if (sim.near(v, t, 2)) return done(`${first(v)} is already with ${first(t)}`, 0, [], 1);
        return sim.travel(v, { villager: t.id }, null, `walking over to ${first(t)}`);
      }
      const x = num(args, 'x', -1), y = num(args, 'y', -1);
      if (x < 0 || y < 0) return fail('go_to needs a place, a villager, or x,y');
      return sim.travel(v, { pos: { x: Math.round(x), y: Math.round(y) } }, null, 'walking');
    },
  },
  {
    name: 'wander', category: 'move',
    description: 'Amble to a random spot nearby (or within a named area) with no particular purpose.',
    params: { type: 'object', properties: { area: { type: 'string', description: 'place id or name to wander in; default: where you are' } } },
    available: (v, view) => !asCore(view).isAsleep(v),
    execute(v, view, args) {
      const sim = asCore(view);
      const area = args.area !== undefined ? sim.resolvePlace(args.area) : sim.currentPlace(v);
      let dest: Vec;
      if (area && area.tiles.length && !area.interior) {
        const tiles = area.tiles.filter((t) => sim.world.walkable(t.x, t.y));
        dest = tiles.length ? sim.rng.pick(tiles) : area.anchor;
      } else {
        const base = v.inside ? (sim.world.place(v.inside)?.door ?? v.pos) : v.pos;
        dest = sim.world.nearestWalkable({ x: Math.round(base.x + sim.rng.int(-5, 5)), y: Math.round(base.y + sim.rng.int(-5, 5)) }, 4);
      }
      const r = sim.travel(v, { pos: dest }, { tool: 'idle', args: { reason: 'looking about', minutes: 3 } }, area && !area.interior ? `wandering around ${area.name}` : 'wandering');
      if (r.ok) { r.message = `${first(v)} wandered ${area ? 'around ' + area.name : 'about'}`; r.effects = [...(r.effects ?? []), rate({ fun: 4 })]; }
      return r;
    },
  },
  {
    name: 'enter', category: 'move',
    description: 'Step inside a building (walks to its door first).',
    params: { type: 'object', properties: { place: { type: 'string', description: 'building id or name' } }, required: ['place'] },
    available: (v) => !v.inside,
    execute(v, view, args) {
      const sim = asCore(view);
      const p = sim.resolvePlace(args.place);
      if (!p) return fail(`no place called ${str(args, 'place')}`);
      if (!p.interior) return fail(`${p.name} is not a building`);
      if (v.inside === p.id) return done(`${first(v)} is already inside ${p.name}`, 0, [], 1);
      if (p.kind === 'home' && p.owner && p.owner !== v.id) {
        const owner = sim.villager(p.owner);
        const rel = owner?.relationships[v.id];
        if (owner && rel && rel.affinity < -10) return fail(`${first(owner)} would not want ${first(v)} in their house`);
      }
      if (p.kind === 'shop' && !sim.isOpen(p)) return fail(`${p.name} is closed`);
      const door = p.door ?? p.anchor;
      const dx = Math.abs(v.pos.x - door.x), dy = Math.abs(v.pos.y - door.y);
      if (dx + dy > 2.2) return sim.travel(v, { place: p.id, enter: true }, null, `going into ${p.name}`);
      return done(`${first(v)} went into ${p.name}`, 0.5, [{ kind: 'enter', place: p.id }], 1);
    },
  },
  {
    name: 'leave_building', category: 'move',
    description: 'Step outside through the door of the building you are in.',
    params: { type: 'object', properties: {} },
    available: (v) => !!v.inside,
    execute(v, view) {
      const sim = asCore(view);
      if (!v.inside) return fail(`${first(v)} is already outside`);
      const p = sim.world.place(v.inside);
      return done(`${first(v)} stepped out of ${p?.name ?? 'the building'}`, 0.5, [{ kind: 'leave' }], 1);
    },
  },
  {
    name: 'follow', category: 'move',
    description: 'Walk along with another villager for a while.',
    params: { type: 'object', properties: { villager: { type: 'string' }, minutes: { type: 'number', description: 'how long, default 20' } }, required: ['villager'] },
    available: (v, view) => asCore(view).villagersNear(v.pos, 12).some((o) => o.id !== v.id && !asCore(view).isAsleep(o)),
    execute(v, view, args) {
      const sim = asCore(view);
      const t = sim.resolveVillager(args.villager);
      if (!t) return fail(`no villager called ${str(args, 'villager')}`);
      if (t.id === v.id) return fail('cannot follow yourself');
      if (!sim.near(v, t, 2.5)) return sim.travel(v, { villager: t.id }, { tool: 'follow', args: { ...args, _arrived: true } }, `catching up with ${first(t)}`);
      const minutes = Math.max(5, Math.min(60, num(args, 'minutes', 20)));
      return { ok: true, message: `${first(v)} tagged along with ${first(t)} for a while`, durationMin: minutes, importance: 2, effects: [{ kind: 'label', label: `following ${first(t)}`, phase: 'follow', target: t.id }, rate({ social: 6, fun: 2 }), { kind: 'relationship', target: t.id, interaction: 'together', mutual: true }, { kind: 'memory', who: t.id, text: `${first(v)} followed ${first(t)} around for a while`, importance: 2, tags: ['social', 'together'], about: [v.id] }] };
    },
  },
  {
    name: 'go_home', category: 'move',
    description: 'Go home and step inside.',
    params: { type: 'object', properties: {} },
    available: (v) => v.inside !== v.home,
    execute(v, view) {
      const sim = asCore(view);
      if (v.inside === v.home) return done(`${first(v)} is already home`, 0, [], 1);
      return sim.travel(v, { place: v.home, enter: true }, null, 'heading home');
    },
  },
];
