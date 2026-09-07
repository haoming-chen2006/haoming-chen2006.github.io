import { CROPS, item } from '../../core/items.ts';
import type { Effect, ItemStack, ScheduleEntry, ToolDef, Villager } from '../../core/types.ts';
import { asCore, type SimCore } from '../core.ts';
import { chron, done, fail, first, hasAll, itemName, memFor, need, needNear, needPlace, num, rate, rel, say, sfx, str } from './util.ts';
import { resolveItem } from './economy.ts';

const s = asCore;

/** Requests a villager could plausibly fulfil: has the items, or produces that kind of thing. */
export function canFulfil(sim: SimCore, v: Villager, needs: ItemStack[]): boolean {
  if (!needs.length) return true;
  if (hasAll(sim, v, needs)) return true;
  return needs.every((n) => produces(v, n.id));
}
function produces(v: Villager, id: string): boolean {
  const d = item(id);
  switch (v.profession) {
    case 'farmer': return d.kind === 'crop' || ['milk', 'egg', 'wool'].includes(id);
    case 'fisher': return d.kind === 'fish';
    case 'miner': return d.kind === 'ore' || id === 'stone' || id === 'gem';
    case 'blacksmith': return ['nails', 'horseshoe', 'copper_bar', 'iron_bar', 'pickaxe', 'axe', 'hoe', 'lantern'].includes(id);
    case 'baker': return ['bread', 'sweet_roll', 'berry_pie'].includes(id);
    case 'carpenter': return id === 'wood' || d.kind === 'furniture' || id === 'toy_boat' || id === 'fishing_rod';
    case 'doctor': return d.kind === 'medicine' || id === 'herbs';
    case 'innkeeper': return ['stew', 'ale', 'cider', 'fish_soup'].includes(id);
    case 'librarian': return d.kind === 'book';
    case 'shopkeeper': return d.kind === 'seed' || ['candle', 'cloth', 'fertiliser'].includes(id);
    default: return false;
  }
}

export const META_TOOLS: ToolDef[] = [
  {
    name: 'set_goal', category: 'meta',
    description: 'Set yourself a goal to pursue over the coming days.',
    params: { type: 'object', properties: { text: { type: 'string' }, priority: { type: 'number', description: '1..10' } }, required: ['text'] },
    available: (v) => v.goals.filter((g) => !g.done).length < 5,
    execute(v, view, args) {
      const text = str(args, 'text').trim();
      if (!text) return fail('a goal needs text');
      const priority = Math.max(1, Math.min(10, Math.round(num(args, 'priority', 5))));
      void view;
      return done(`${first(v)} resolved: ${text}`, 1, [{ kind: 'goal', add: { text, priority } }, { kind: 'memory', text: `${first(v)} decided: ${text}`, importance: Math.min(6, 2 + priority / 2), tags: ['goal', 'plan'], memKind: 'plan' }, need({ purpose: 4 }), { kind: 'stat', key: 'goals_set' }], 0);
    },
  },
  {
    name: 'remember', category: 'meta',
    description: 'Make a note of something worth remembering.',
    params: { type: 'object', properties: { note: { type: 'string' }, importance: { type: 'number' } }, required: ['note'] },
    available: () => true,
    execute(v, view, args) {
      void view;
      const note = str(args, 'note').trim();
      if (!note) return fail('nothing to note');
      const importance = Math.max(1, Math.min(10, Math.round(num(args, 'importance', 4))));
      const about = s(view).villagers.filter((o) => note.toLowerCase().includes(first(o).toLowerCase()) && o.id !== v.id).map((o) => o.id);
      return done(`${first(v)} noted: ${note}`, 0, [{ kind: 'memory', text: note, importance, tags: ['note'], about }, { kind: 'stat', key: 'notes' }], 0);
    },
  },
  {
    name: 'plan_day', category: 'meta',
    description: 'Rewrite the rest of today\'s plan as a list of {hour, block, place?, note?} entries.',
    params: { type: 'object', properties: { entries: { type: 'array', items: { type: 'object', properties: { hour: { type: 'number' }, block: { type: 'string' }, place: { type: 'string' }, note: { type: 'string' } } } } }, required: ['entries'] },
    available: () => true,
    execute(v, view, args) {
      const sim = s(view);
      const raw = Array.isArray(args.entries) ? (args.entries as unknown[]) : [];
      const entries: ScheduleEntry[] = [];
      for (const e of raw) {
        if (!e || typeof e !== 'object') continue;
        const o = e as Record<string, unknown>;
        const hour = typeof o.hour === 'number' ? o.hour : Number(o.hour);
        const block = typeof o.block === 'string' ? o.block : '';
        if (!Number.isFinite(hour) || !block) continue;
        entries.push({ hour: Math.max(0, Math.min(24.5, hour)), block, place: typeof o.place === 'string' ? sim.resolvePlace(o.place)?.id : undefined, note: typeof o.note === 'string' ? o.note : undefined });
      }
      if (!entries.length) return fail('no valid entries');
      entries.sort((a, b) => a.hour - b.hour);
      return done(`${first(v)} re-planned the day`, 1, [{ kind: 'fn', fn: (ss: SimCore, me: Villager) => { const h = ss.hourFloat(); const kept = (me.plan?.entries ?? []).filter((x: ScheduleEntry) => x.hour < h && !entries.some((n) => n.hour <= x.hour)); me.plan = { day: ss.world.time.dayIndex, entries: [...kept, ...entries].sort((a, b) => a.hour - b.hour), summary: 'Re-planned: ' + entries.map((x) => `${x.block} at ${x.hour}`).join(', ') }; } }, { kind: 'memory', text: `${first(v)} re-planned the day: ${entries.map((x) => x.block).join(', ')}`, importance: 2, tags: ['plan'], memKind: 'plan' }, { kind: 'stat', key: 'replans' }], 0);
    },
  },
  {
    name: 'post_request', category: 'meta',
    description: 'Post a request on the notice board: what you need, and what you will pay.',
    params: { type: 'object', properties: { text: { type: 'string' }, reward: { type: 'number' }, needs: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, qty: { type: 'number' } } } } }, required: ['text'] },
    available: (v, view) => v.money >= 15 && !s(view).requests.some((r) => r.by === v.id && !r.done && r.expiresAt > s(view).now),
    execute(v, view, args) {
      const sim = s(view);
      const board = sim.world.place('board') ?? sim.world.place('square');
      if (board) { const walk = needPlace(v, sim, board.id, 'post_request', args, false); if (walk) return walk; }
      let needs: ItemStack[] = [];
      if (Array.isArray(args.needs)) for (const n of args.needs as unknown[]) { if (n && typeof n === 'object') { const o = n as Record<string, unknown>; const id = resolveItem(o.id); if (id) needs.push({ id, qty: Math.max(1, Math.round(Number(o.qty) || 1)) }); } }
      let text = str(args, 'text').trim();
      if (!needs.length && !text) return fail('a request needs text or items');
      if (!text) text = needs.map((n) => `${n.qty} ${itemName(n.id).toLowerCase()}`).join(', ');
      const value = needs.reduce((a, n) => a + item(n.id).price * n.qty, 0);
      const reward = Math.max(5, Math.min(v.money, Math.round(num(args, 'reward', Math.max(10, value * 1.3)))));
      if (reward > v.money) return fail(`${first(v)} cannot promise ${reward} coins`);
      return done(`${first(v)} posted a request on the board: ${text} (reward ${reward})`, 4, [
        { kind: 'fn', fn: (ss: SimCore, me: Villager) => { ss.postRequest(me.id, text, { money: reward }, needs); } }, { kind: 'memory', text: `${first(v)} posted a request for ${text}, offering ${reward} coins`, importance: 3, tags: ['request', 'board', 'plan'], memKind: 'plan' }, rate({ purpose: 6 }), sfx('write'), { kind: 'stat', key: 'requests_posted' },
      ], 3);
    },
  },
  {
    name: 'accept_request', category: 'meta',
    description: 'Take on a request from the notice board.',
    params: { type: 'object', properties: { id: { type: 'string' } } },
    available: (v, view) => { const sim = s(view); return !sim.requests.some((r) => r.acceptedBy === v.id && !r.done) && sim.requests.some((r) => !r.done && !r.acceptedBy && r.by !== v.id && r.expiresAt > sim.now && canFulfil(sim, v, r.needs)); },
    execute(v, view, args) {
      const sim = s(view);
      const open = sim.requests.filter((r) => !r.done && !r.acceptedBy && r.by !== v.id && r.expiresAt > sim.now);
      const req = (args.id !== undefined && args.id !== '' ? open.find((r) => r.id === String(args.id)) : undefined) ?? open.filter((r) => canFulfil(sim, v, r.needs)).sort((a, b) => (b.reward.money ?? 0) - (a.reward.money ?? 0))[0];
      if (!req) return fail('no request to take on');
      if (!canFulfil(sim, v, req.needs)) return fail(`${first(v)} could not get hold of ${req.text}`);
      return done(`${first(v)} took on ${sim.short(req.by)}'s request: ${req.text}`, 2, [
        { kind: 'fn', fn: (ss: SimCore, me: Villager) => { req.acceptedBy = me.id; ss.bus.emit({ type: 'request', request: req, phase: 'accepted' }); } }, { kind: 'goal', add: { text: `fulfil request ${req.id}: ${req.text} for ${sim.short(req.by)}`, priority: 7 } },
        { kind: 'memory', text: `${first(v)} promised to get ${req.text} for ${sim.short(req.by)}`, importance: 4, tags: ['request', 'promise', 'plan'], about: req.by === 'player' ? [] : [req.by], memKind: 'plan' }, rate({ purpose: 8 }), { kind: 'stat', key: 'requests_accepted' },
        ...(req.by !== 'player' ? [memFor(req.by, `${first(v)} took on the request for ${req.text}`, 3, ['request', 'promise', 'pleasant'], [v.id])] : []),
        chron(`${first(v)} took on ${sim.short(req.by)}'s request for ${req.text}.`, 3, req.by === 'player' ? [v.id] : [v.id, req.by]),
      ], 3);
    },
  },
  {
    name: 'complete_request', category: 'meta',
    description: 'Deliver what a request asked for and collect the reward.',
    params: { type: 'object', properties: { id: { type: 'string' } } },
    available: (v, view) => { const sim = s(view); return sim.requests.some((r) => r.acceptedBy === v.id && !r.done && hasAll(sim, v, r.needs)); },
    execute(v, view, args) {
      const sim = s(view);
      const mine = sim.requests.filter((r) => r.acceptedBy === v.id && !r.done);
      const req = (args.id !== undefined && args.id !== '' ? mine.find((r) => r.id === String(args.id)) : undefined) ?? mine.find((r) => hasAll(sim, v, r.needs));
      if (!req) return fail('no request ready to complete');
      if (!hasAll(sim, v, req.needs)) return fail(`${first(v)} does not have everything for it yet`);
      const poster = req.by === 'player' ? undefined : sim.villager(req.by);
      if (poster) { if (sim.isAsleep(poster)) return fail(`${first(poster)} is asleep`); const walk = needNear(v, sim, poster, 'complete_request', { id: req.id }); if (walk) return walk; }
      else { const board = sim.world.place('board') ?? sim.world.place('square'); if (board) { const walk = needPlace(v, sim, board.id, 'complete_request', { id: req.id }, false); if (walk) return walk; } }
      const reward = req.reward.money ?? 0;
      const effects: Effect[] = [
        { kind: 'take', items: req.needs }, { kind: 'give', items: req.needs, to: req.by }, { kind: 'money', delta: reward }, ...(poster ? [{ kind: 'money', who: poster.id, delta: -Math.min(poster.money, reward) } as Effect] : [{ kind: 'money', who: 'player', delta: -reward } as Effect]),
        ...(req.reward.item ? [{ kind: 'give', items: [req.reward.item] } as Effect] : []),
        { kind: 'fn', fn: (ss: SimCore) => { req.done = true; ss.bus.emit({ type: 'request', request: req, phase: 'done' }); } }, { kind: 'goal', complete: req.id }, need({ purpose: 15, social: 5 }), sfx('coin'), { kind: 'stat', key: 'requests_done' },
        { kind: 'memory', text: `${first(v)} delivered ${req.text} to ${sim.short(req.by)} and got ${reward} coins`, importance: 5, tags: ['request', 'helped', 'promise', 'pleasant', 'money'], about: poster ? [poster.id] : [] },
        chron(`${first(v)} delivered ${req.text} to ${sim.short(req.by)}.`, 5, poster ? [v.id, poster.id] : [v.id]),
      ];
      if (poster) effects.push(rel(poster.id, 'promise_kept', { mutual: true, backInteraction: 'help', note: `delivered ${req.text}`, backNote: `brought ${req.text}` }), memFor(poster.id, `${first(v)} brought the ${req.text} ${first(poster)} asked for`, 6, ['request', 'helped', 'pleasant', 'promise'], [v.id]), { kind: 'say', who: poster.id, text: sim.rng.pick(['You found it! Thank you, truly.', 'I knew I could count on you.', 'Ah — perfect. Here is what I promised.']), to: v.id, tone: 'warm' }, say(sim.rng.pick([`Here — the ${req.text} you wanted.`, `${first(poster)}, I have your ${req.text}.`]), poster.id));
      return done(`${first(v)} delivered ${req.text} to ${sim.short(req.by)} and collected ${reward} coins`, 3, effects, 5);
    },
  },
  {
    name: 'organise_event', category: 'meta',
    description: 'Organise a get-together: a picnic, a bonfire, a game of dice, a singalong. Others hear of it and may come.',
    params: { type: 'object', properties: { kind: { type: 'string', enum: ['picnic', 'bonfire', 'dice', 'singalong', 'swim', 'stargazing', 'card night'] }, place: { type: 'string' }, hour: { type: 'number' } } },
    available: (v, view) => { const sim = s(view); return v.personality.extraversion > 0.35 && (v.stats.lastEventDay ?? -9) <= sim.world.time.dayIndex - 2 && sim.hourFloat() < 19 && !sim.events.some((e) => (e.data.host === v.id) && e.endsAt > sim.now); },
    execute(v, view, args) {
      const sim = s(view);
      const kinds: Record<string, { place: string; hour: number; text: string }> = {
        picnic: { place: 'meadow', hour: 13, text: 'a picnic' }, bonfire: { place: 'festival_grounds', hour: 20, text: 'a bonfire' }, dice: { place: 'tavern', hour: 20, text: 'a game of dice' }, singalong: { place: 'tavern', hour: 20.5, text: 'a singalong' }, swim: { place: 'lake', hour: 14, text: 'a swim' }, stargazing: { place: 'hill', hour: 21, text: 'stargazing' }, 'card night': { place: 'tavern', hour: 20, text: 'a card night' },
      };
      let kind = str(args, 'kind');
      if (!kinds[kind]) { const opts = Object.keys(kinds).filter((k) => (k !== 'swim' || sim.world.season === 'summer') && (k !== 'picnic' || (sim.world.weather.kind === 'sunny' && sim.hourFloat() < 12)) && (k !== 'stargazing' || ['sunny', 'cloudy'].includes(sim.world.weather.forecast))); kind = sim.rng.pick(opts.length ? opts : ['dice']); }
      const k = kinds[kind];
      const place = (args.place !== undefined && args.place !== '' ? sim.resolvePlace(args.place)?.id : undefined) ?? (sim.world.place(k.place) ? k.place : 'square');
      let hour = num(args, 'hour', k.hour);
      if (hour <= sim.hourFloat() + 0.5) hour = Math.max(k.hour, Math.ceil(sim.hourFloat() + 1));
      if (hour > 23) return fail('too late in the day to organise that');
      const dayStart = (sim.world.time.dayIndex - 1) * 1440;
      const start = dayStart + Math.round(hour * 60);
      const name = `${first(v)}'s ${k.text} at ${sim.placeName(place)}`;
      const invited = sim.villagers.filter((o) => o.id !== v.id && (v.relationships[o.id]?.affinity ?? 0) > -10);
      return done(`${first(v)} organised ${k.text} at ${sim.placeName(place)} for ${Math.floor(hour)}:00`, 5, [
        { kind: 'fn', fn: (ss: SimCore, me: Villager) => { me.stats.lastEventDay = ss.world.time.dayIndex; ss.events.push({ id: `social_${ss.now}_${me.id}`, name, kind: 'social', startedAt: start, endsAt: start + 120, place, text: `${first(me)} is getting people together for ${k.text} at ${ss.placeName(place)} around ${Math.floor(hour)}:00.`, data: { host: me.id, kind, hour } }); for (const o of invited) ss.remember(o, { kind: 'event', text: `${first(me)} is organising ${k.text} at ${ss.placeName(place)} at ${Math.floor(hour)}:00 today`, importance: 4, tags: ['event', 'invite', 'social', 'plan'], about: [me.id], place }); } },
        { kind: 'memory', text: `${first(v)} is putting on ${k.text} at ${sim.placeName(place)} at ${Math.floor(hour)}:00`, importance: 5, tags: ['event', 'plan', 'social'], memKind: 'plan' }, rate({ purpose: 10, social: 6 }), { kind: 'stat', key: 'events_organised' },
        chron(`${first(v)} is organising ${k.text} at ${sim.placeName(place)} at ${Math.floor(hour)}:00.`, 5, [v.id], place),
      ], 4);
    },
  },
  {
    name: 'attend_event', category: 'meta',
    description: 'Go to an event that is happening (a festival, a picnic, an evening at the tavern).',
    params: { type: 'object', properties: { id: { type: 'string' } } },
    available: (v, view) => { const sim = s(view); return sim.events.some((e) => e.endsAt > sim.now && e.startedAt <= sim.now + 30 && !!e.place && e.data.host !== v.id && (v.stats[`attended_${e.id}`] ?? 0) === 0); },
    execute(v, view, args) {
      const sim = s(view);
      const live = sim.events.filter((e) => e.endsAt > sim.now && e.startedAt <= sim.now + 30 && !!e.place && e.data.host !== v.id);
      const ev = (args.id !== undefined && args.id !== '' ? live.find((e) => e.id === String(args.id)) : undefined) ?? live.sort((a, b) => (b.kind === 'festival' ? 1 : 0) - (a.kind === 'festival' ? 1 : 0))[0];
      if (!ev || !ev.place) { if (args._arrived === true) return done(`${first(v)} turned up after it had wound down`, 3, [], 1); return fail('nothing is on right now'); }
      if (!sim.atPlace(v, ev.place) || args._arrived !== true) return sim.travel(v, { place: ev.place, enter: !!sim.world.place(ev.place)?.interior }, { tool: 'attend_event', args: { id: ev.id, _arrived: true } }, `going to ${ev.name}`);
      const others = sim.villagers.filter((o) => o.id !== v.id && sim.atPlace(o, ev.place!) && !sim.isAsleep(o));
      const host = typeof ev.data.host === 'string' ? sim.villager(ev.data.host) : undefined;
      const festival = ev.kind === 'festival';
      const effects: Effect[] = [{ kind: 'fn', fn: (_s: SimCore, me: Villager) => { me.stats[`attended_${ev.id}`] = 1; } }, rate({ fun: festival ? 24 : 18, social: 20, comfort: 4, hunger: -2 }), { kind: 'stat', key: 'events_attended' }, { kind: 'memory', text: `${first(v)} went to ${festival ? ev.name : ev.name[0].toLowerCase() + ev.name.slice(1)}${others.length ? ' — ' + others.map((o) => first(o)).join(', ') + ' were there' : ''}`, importance: festival ? 6 : 4, tags: ['event', 'social', 'pleasant', festival ? 'festival' : 'gathering'], about: others.map((o) => o.id), place: ev.place }];
      if (festival) effects.push({ kind: 'status', add: ['celebrating'], minutes: 240 }, { kind: 'emote', emote: 'happy' });
      for (const o of others) effects.push(rel(o.id, 'together', { mutual: true, backDelta: { affinity: 1.5, familiarity: 2 } }));
      if (host) effects.push(rel(host.id, 'invite', { mutual: true, backDelta: { affinity: 3, familiarity: 2, trust: 1 } }), memFor(host.id, `${first(v)} came to ${ev.name}`, 3, ['event', 'social', 'pleasant'], [v.id]));
      if (others.length) effects.push({ kind: 'conversation', with: sim.rng.pick(others).id, topic: festival ? 'festival' : 'event' });
      return done(`${first(v)} joined ${ev.name}`, festival ? 60 : 40, effects, festival ? 5 : 3);
    },
  },
  {
    name: 'idle', category: 'meta',
    description: 'Do nothing in particular for a few minutes.',
    params: { type: 'object', properties: { reason: { type: 'string' }, minutes: { type: 'number' } } },
    available: () => true,
    execute(v, view, args) {
      const sim = s(view);
      if (args.place !== undefined && args.place !== '') { const p = sim.resolvePlace(args.place); if (p) { const walk = needPlace(v, sim, p.id, 'idle', args, !!p.interior); if (walk) return walk; } }
      const minutes = Math.max(1, Math.min(30, num(args, 'minutes', 5 + sim.rng.int(0, 5))));
      const reason = str(args, 'reason', 'nothing much');
      const atWork = args.place !== undefined && args.place !== '';
      return done(`${first(v)} idled (${reason})`, minutes, [{ kind: 'label', label: reason === 'nothing much' ? 'idling' : reason }, rate(atWork ? { fun: -1, purpose: 7 } : { fun: -1 })], 0);
    },
  },
];

export const seedsForSeason = (season: string): string[] => CROPS.filter((c) => c.seasons.includes(season as 'spring')).map((c) => c.seed);
