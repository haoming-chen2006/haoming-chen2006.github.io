import type { ToolDef, Villager } from '../../core/types.ts';
import { asCore, type SimCore } from '../core.ts';
import { gossipCopy, knows, retrieve } from '../memory.ts';
import { done, fail, first, needNear, needPlace, str } from './util.ts';

const s = asCore;

export const INFO_TOOLS: ToolDef[] = [
  {
    name: 'look_around', category: 'info',
    description: 'Take stock of where you are and who is about.',
    params: { type: 'object', properties: {} },
    available: (v, view) => !s(view).isAsleep(v),
    execute(v, view) {
      const sim = s(view);
      const place = sim.currentPlace(v);
      const near = sim.villagersNear(v.pos, 8).filter((o) => o.id !== v.id);
      const w = sim.world.weather.kind;
      const who = near.length ? near.map((o) => `${first(o)}${o.action ? ' (' + o.action.label + ')' : ''}`).join(', ') : 'nobody';
      const text = `${first(v)} looked around ${place ? place.name : 'outside'}: ${w} out, ${who} about`;
      return done(text, 1, [{ kind: 'memory', text, importance: 1, tags: ['look', place?.id ?? 'outside', w], about: near.map((o) => o.id), place: place?.id }, { kind: 'stat', key: 'looks' }], 0);
    },
  },
  {
    name: 'check_board', category: 'info',
    description: 'Read the notice board in the square: requests, events, news.',
    params: { type: 'object', properties: {} },
    available: (v, view) => !s(view).isAsleep(v) && !!(s(view).world.place('board') ?? s(view).world.place('square')),
    execute(v, view) {
      const sim = s(view);
      const board = sim.world.place('board') ?? sim.world.place('square')!;
      const walk = needPlace(v, sim, board.id, 'check_board', {}, false);
      if (walk) return walk;
      const open = sim.requests.filter((r) => !r.done && r.expiresAt > sim.now && r.by !== v.id && !r.acceptedBy);
      const events = sim.events.filter((e) => e.endsAt > sim.now);
      const bits: string[] = [];
      if (open.length) bits.push(open.map((r) => `${sim.short(r.by)} wants ${r.text}`).join('; '));
      if (events.length) bits.push(events.map((e) => e.name).join('; '));
      const text = bits.length ? `${first(v)} read the board: ${bits.join('. ')}` : `${first(v)} read the board: nothing new`;
      return done(text, 2, [{ kind: 'memory', text, importance: open.length ? 3 : 1, tags: ['board', 'requests', ...(open.length ? ['request'] : [])], about: open.map((r) => r.by).filter((b) => b !== 'player') }, { kind: 'stat', key: 'board_checks' }, { kind: 'fn', fn: (ss: SimCore, me: Villager) => { me.stats.boardDay = ss.world.time.dayIndex; } }], 1);
    },
  },
  {
    name: 'check_weather', category: 'info',
    description: 'Look at the sky and think about tomorrow.',
    params: { type: 'object', properties: {} },
    available: (v, view) => !v.inside && !s(view).isAsleep(v),
    execute(v, view) {
      const sim = s(view);
      const w = sim.world.weather;
      const text = `${first(v)} checked the sky: ${w.kind} now, ${w.forecast} tomorrow`;
      const effects = [{ kind: 'memory', text, importance: w.forecast === 'storm' ? 4 : 1, tags: ['weather', w.kind, w.forecast], place: undefined } as { kind: string; [k: string]: unknown }, { kind: 'stat', key: 'weather_checks' }];
      if (w.forecast === 'storm' && v.personality.conscientiousness > 0.6) effects.push({ kind: 'goal', add: { text: 'get things under cover before the storm', priority: 6 } });
      return done(text, 1, effects, 1);
    },
  },
  {
    name: 'recall', category: 'info',
    description: 'Think back: retrieve memories relevant to a query.',
    params: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    available: (v) => v.memory.length > 5,
    execute(v, view, args) {
      const sim = s(view);
      const q = str(args, 'query');
      if (!q) return fail('recall what?');
      const about = sim.villagers.filter((o) => q.toLowerCase().includes(first(o).toLowerCase())).map((o) => o.id);
      const ms = retrieve(v, { text: q, about, tags: q.toLowerCase().split(/\W+/) }, 3, sim.now);
      const text = ms.length ? `${first(v)} thought about ${q}: ${ms.map((m) => m.text).join('; ')}` : `${first(v)} could not remember anything about ${q}`;
      return done(text, 1, [{ kind: 'stat', key: 'recalls' }], 0);
    },
  },
  {
    name: 'ask_about', category: 'info',
    description: 'Ask someone what they know about a third villager or a topic.',
    params: { type: 'object', properties: { target: { type: 'string' }, about: { type: 'string' } }, required: ['target', 'about'] },
    available: (v, view) => !s(view).isAsleep(v) && !s(view).rt(v).conversation && s(view).villagersNear(v.pos, 8).some((o) => o.id !== v.id && !s(view).isAsleep(o) && !s(view).rt(o).conversation),
    execute(v, view, args) {
      const sim = s(view);
      const t = sim.resolveVillager(args.target);
      if (!t || t.id === v.id) return fail('no such villager to ask');
      if (sim.isAsleep(t)) return fail(`${first(t)} is asleep`);
      const aboutV = sim.resolveVillager(args.about);
      const walk = needNear(v, sim, t, 'ask_about', { target: t.id, about: aboutV?.id ?? str(args, 'about') });
      if (walk) return walk;
      if (aboutV) {
        const ms = retrieve(t, { about: [aboutV.id] }, 6, sim.now).filter((m) => m.about?.includes(aboutV.id) && m.importance >= 2 && !knows(v, m.text));
        if (!ms.length) return done(`${first(v)} asked ${first(t)} about ${first(aboutV)}, but ${first(t)} had nothing to tell`, 3, [{ kind: 'conversation', with: t.id, topic: `ask_about:${aboutV.id}` }], 1);
        const m = ms[0];
        const copy = gossipCopy(m, t.id, first(t), sim.now);
        return done(`${first(v)} asked ${first(t)} about ${first(aboutV)} and learned: ${m.text}`, 3, [{ ...copy, kind: 'memory', memKind: 'gossip' }, { kind: 'conversation', with: t.id, topic: `ask_about:${aboutV.id}` }, { kind: 'stat', key: 'asked_about' }], 2);
      }
      return done(`${first(v)} asked ${first(t)} about ${str(args, 'about')}`, 3, [{ kind: 'conversation', with: t.id, topic: `ask:${str(args, 'about')}` }], 1);
    },
  },
];
