import { item } from '../../core/items.ts';
import type { Effect, ToolDef, Villager } from '../../core/types.ts';
import { asCore, type SimCore } from '../core.ts';
import { gossipable } from '../memory.ts';
import { giftAppeal } from '../relationships.ts';
import { approachable, chron, done, emote, fail, first, itemName, memFor, need, needNear, num, rate, rel, say, sfx, str } from './util.ts';

/** Resolve a target villager arg, failing with a readable message. */
function target(sim: SimCore, v: Villager, args: Record<string, unknown>, key = 'target'): Villager | string {
  const raw = args[key];
  if (raw === undefined || raw === null || raw === '') {
    // pick the best companion nearby
    const c = sim.bestCompanion(v);
    return c ?? 'nobody is nearby to talk to';
  }
  const t = sim.resolveVillager(raw);
  if (!t) return `no villager called ${String(raw)}`;
  if (t.id === v.id) return 'cannot target yourself';
  return t;
}

/** Most conversation-style social tools share this shape. */
function conversationTool(name: string, description: string, topicOf: (v: Villager, t: Villager, args: Record<string, unknown>, sim: SimCore) => string, extraAvailable?: (v: Villager, sim: SimCore, others: Villager[]) => boolean, extraParams: Record<string, unknown> = {}): ToolDef {
  return {
    name, category: 'social', description,
    params: { type: 'object', properties: { target: { type: 'string', description: 'villager id or name' }, ...extraParams } },
    available(v, view) {
      const sim = asCore(view);
      if (sim.isAsleep(v) || sim.rt(v).conversation) return false;
      const others = sim.villagersNear(v.pos, 9).filter((o) => o.id !== v.id && approachable(sim, o));
      if (!others.length) return false;
      return extraAvailable ? extraAvailable(v, sim, others) : true;
    },
    execute(v, view, args) {
      const sim = asCore(view);
      const t = target(sim, v, args);
      if (typeof t === 'string') return fail(t);
      if (sim.isAsleep(t)) return fail(`${first(t)} is asleep`);
      if (sim.rt(t).conversation) {
        // they are mid-conversation: hang about for a couple of minutes and try again (twice)
        const retry = typeof args._retry === 'number' ? args._retry : 0;
        if (retry >= 2 || !sim.near(v, t, 6)) return fail(`${first(t)} is already talking to someone`);
        v.queue.unshift({ tool: name, args: { ...args, target: t.id, _retry: retry + 1 } });
        return done(`${first(v)} waited for ${first(t)} to finish talking`, 2.5, [{ kind: 'label', label: `waiting for ${first(t)}` }], 0);
      }
      const walk = needNear(v, sim, t, name, { ...args, target: t.id });
      if (walk) return walk;
      const topic = topicOf(v, t, args, sim);
      return { ok: true, message: `${first(v)} started talking to ${first(t)}`, durationMin: 30, importance: 1, effects: [{ kind: 'conversation', with: t.id, topic }] };
    },
  };
}

const GREETINGS = {
  warm: ['Morning, {name}!', 'Hello there, {name}.', 'Good to see you, {name}!', '{name}! Just who I hoped to run into.', 'Afternoon, {name}.', 'Evening, {name}. Fine night for it.'],
  neutral: ['Morning.', 'Hello, {name}.', 'Afternoon.', '{name}.', 'Evening.'],
  cold: ['{name}.', '...Morning.', 'Hm.', 'Oh. It is you.'],
};
const REPLIES = {
  warm: ['And to you!', 'Hello yourself!', 'There you are!', 'Good to see you too.', 'Lovely day, is it not?'],
  neutral: ['Morning.', 'Hello.', 'Afternoon.', 'Mm.'],
  cold: ['Mm.', '...', 'Yes.', 'Busy.'],
};

export const SOCIAL_TOOLS: ToolDef[] = [
  {
    name: 'say', category: 'social',
    description: 'Say something out loud to someone nearby (or to no one in particular).',
    params: { type: 'object', properties: { target: { type: 'string' }, text: { type: 'string' }, tone: { type: 'string', enum: ['warm', 'neutral', 'cold', 'flirty', 'angry', 'sad', 'joking'] } }, required: ['text'] },
    available: (v, view) => !asCore(view).isAsleep(v),
    execute(v, view, args) {
      const sim = asCore(view);
      const text = str(args, 'text').trim();
      if (!text) return fail('nothing to say');
      const t = args.target !== undefined && args.target !== '' ? sim.resolveVillager(args.target) : undefined;
      const to = args.target === 'player' ? 'player' : t?.id;
      const effects: Effect[] = [say(text, to, str(args, 'tone', 'neutral'))];
      const listeners = sim.audience(v, 4);
      for (const l of listeners) effects.push(memFor(l.id, `${first(v)} said: "${text}"`, 2, ['said', 'social'], [v.id]));
      return done(`${first(v)} said "${text}"`, 0.5, effects, 1);
    },
  },
  {
    name: 'greet', category: 'social',
    description: 'Greet someone nearby; they greet back.',
    params: { type: 'object', properties: { target: { type: 'string' } } },
    available(v, view) {
      const sim = asCore(view);
      if (sim.isAsleep(v) || sim.rt(v).conversation) return false;
      const hour = sim.world.time.hour;
      return sim.villagersNear(v.pos, 6).some((o) => o.id !== v.id && !sim.isAsleep(o) && (sim.rt(v).greeted[o.id] ?? -1) !== hour + sim.world.time.dayIndex * 24);
    },
    execute(v, view, args) {
      const sim = asCore(view);
      const t = target(sim, v, args);
      if (typeof t === 'string') return fail(t);
      if (!sim.near(v, t, 6)) return fail(`${first(t)} is not close enough to greet`);
      if (sim.isAsleep(t)) return fail(`${first(t)} is asleep`);
      const r = v.relationships[t.id];
      const tone = (r?.affinity ?? 0) >= 20 ? 'warm' : (r?.affinity ?? 0) <= -15 ? 'cold' : v.personality.extraversion > 0.6 ? 'warm' : 'neutral';
      const back = t.relationships[v.id];
      const btone = (back?.affinity ?? 0) >= 20 ? 'warm' : (back?.affinity ?? 0) <= -15 ? 'cold' : 'neutral';
      const line = sim.rng.pick(GREETINGS[tone]).replace('{name}', first(t));
      const reply = sim.rng.pick(REPLIES[btone]);
      const stamp = sim.world.time.hour + sim.world.time.dayIndex * 24;
      sim.rt(v).greeted[t.id] = stamp;
      sim.rt(t).greeted[v.id] = stamp;
      v.facing = t.pos.x > v.pos.x ? 'right' : t.pos.x < v.pos.x ? 'left' : t.pos.y > v.pos.y ? 'down' : 'up';
      return done(`${first(v)} greeted ${first(t)}`, 1, [
        say(line, t.id, tone), { kind: 'say', who: t.id, text: reply, to: v.id, tone: btone },
        rel(t.id, 'greet', { mutual: true }), need({ social: 3 }), { kind: 'need', who: t.id, social: 2 },
        memFor(t.id, `${first(v)} said hello`, 1, ['greet', 'social'], [v.id]),
      ], 1);
    },
  },
  conversationTool('chat', 'Have a conversation with someone about a topic (or whatever comes up).', (_v, _t, args) => (str(args, 'topic') ? `chat:${str(args, 'topic')}` : 'chat'), undefined, { topic: { type: 'string', description: 'weather | work | food | village | dreams | family | plans | the river | festival | anything' } }),
  conversationTool('gossip', 'Share a rumour about someone else with a friend.', (v, t, args, sim) => {
    const about = args.about !== undefined ? sim.resolveVillager(args.about)?.id : undefined;
    const m = about ? undefined : gossipable(v, t.id, sim.now, sim.rng);
    return `gossip:${about ?? m?.about?.find((a) => a !== v.id) ?? ''}`;
  }, (v, sim) => !!gossipable(v, '', sim.now, sim.rng), { about: { type: 'string', description: 'villager the rumour concerns' } }),
  conversationTool('ask', 'Ask someone a question.', (_v, _t, args) => `ask:${str(args, 'question', 'how are things')}`, undefined, { question: { type: 'string' } }),
  conversationTool('compliment', 'Pay someone a compliment.', () => 'compliment', (v) => v.mood > -0.5),
  conversationTool('tease', 'Rib someone good-naturedly (or not so good-naturedly).', () => 'tease', (v, sim, others) => others.some((o) => (v.relationships[o.id]?.familiarity ?? 0) > 5) && !sim.isAsleep(v)),
  conversationTool('apologize', 'Apologise to someone you have wronged.', () => 'apologize', (v, sim, others) => others.some((o) => needsApology(v, o.id, sim))),
  conversationTool('argue', 'Pick a fight about something.', (_v, _t, args) => `argue:${str(args, 'about', 'everything')}`, (v, _sim, others) => v.mood < 0.1 || v.status.includes('angry') || others.some((o) => (v.relationships[o.id]?.affinity ?? 0) < -5), { about: { type: 'string' } }),
  conversationTool('comfort', 'Comfort someone who is having a hard time.', () => 'comfort', (_v, _sim, others) => others.some((o) => o.mood < -0.25 || o.status.includes('sick') || o.status.includes('grieving') || o.status.includes('angry'))),
  conversationTool('invite', 'Invite someone to do something together later.', (_v, _t, args) => `invite:${str(args, 'activity', 'a drink')}|${str(args, 'place', 'tavern')}|${num(args, 'hour', 20)}`, (v) => v.personality.extraversion > 0.2, { activity: { type: 'string' }, place: { type: 'string' }, hour: { type: 'number' } }),
  {
    name: 'gift', category: 'social',
    description: 'Give an item from your inventory to someone.',
    params: { type: 'object', properties: { target: { type: 'string' }, item: { type: 'string' } }, required: ['target', 'item'] },
    available(v, view) {
      const sim = asCore(view);
      return v.inventory.length > 0 && !sim.isAsleep(v) && sim.villagersNear(v.pos, 9).some((o) => o.id !== v.id && !sim.isAsleep(o));
    },
    execute(v, view, args) {
      const sim = asCore(view);
      const t = target(sim, v, args);
      if (typeof t === 'string') return fail(t);
      const id = str(args, 'item');
      if (!sim.has(v, id, 1)) return fail(`${first(v)} has no ${itemName(id)} to give`);
      if (sim.isAsleep(t)) return fail(`${first(t)} is asleep`);
      const walk = needNear(v, sim, t, 'gift', { ...args, target: t.id });
      if (walk) return walk;
      const appeal = giftAppeal(t, id);
      const name = itemName(id).toLowerCase();
      const reaction = giftReaction(t, appeal, itemName(id), first(v), sim);
      const importance = appeal > 0.5 ? 7 : appeal < -0.2 ? 5 : 4;
      const tone = appeal > 0.5 ? 'pleasant' : appeal < -0.2 ? 'unpleasant' : 'pleasant';
      const effects: Effect[] = [
        { kind: 'take', items: [{ id, qty: 1 }] }, { kind: 'give', items: [{ id, qty: 1 }], to: t.id },
        rel(t.id, 'gift', { appeal, mutual: true, note: `gave ${name}`, backNote: `received ${name}` }),
        { kind: 'say', who: t.id, text: reaction, to: v.id, tone: appeal > 0.3 ? 'warm' : appeal < -0.2 ? 'cold' : 'neutral' },
        emote(appeal > 0.5 ? 'love' : appeal > 0 ? 'happy' : appeal < -0.2 ? 'sad' : 'none', t.id),
        memFor(t.id, `${first(v)} gave ${first(t)} ${withArticle(name)}${appeal > 0.5 ? ' — a favourite' : appeal < -0.2 ? ', not a welcome one' : ''}`, importance, ['gift', 'received', 'social', tone], [v.id]),
        need({ social: 6, fun: 3 }), { kind: 'need', who: t.id, social: 5, fun: appeal > 0 ? 8 : 0 },
        { kind: 'mood', who: t.id, delta: appeal * 0.25 }, sfx('gift'), { kind: 'stat', key: 'gifts' },
      ];
      if (Math.abs(appeal) > 0.4 || item(id).price > 40) effects.push(chron(`${first(v)} gave ${first(t)} ${withArticle(name)}${appeal > 0.5 ? '. ' + first(t) + ' was delighted' : appeal < -0.2 ? '. ' + first(t) + ' did not hide the disappointment' : ''}.`, appeal > 0.5 ? 5 : 3, [v.id, t.id]));
      return done(`${first(v)} gave ${first(t)} ${withArticle(name)}${appeal > 0.5 ? ', which went down very well' : appeal < -0.2 ? ', which did not go down well' : ''}`, 1, effects, importance);
    },
  },
  {
    name: 'propose', category: 'social',
    description: 'Ask someone to be your partner. Only sensible when you are both deeply fond of each other.',
    params: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] },
    available(v, view) {
      const sim = asCore(view);
      return Object.entries(v.relationships).some(([id, r]) => r.romance >= 75 && r.affinity >= 60 && r.familiarity >= 55 && r.label !== 'partner' && !!sim.villager(id) && (v.stats[`crush_${id}`] ?? sim.world.time.dayIndex) <= sim.world.time.dayIndex - 5);
    },
    execute(v, view, args) {
      const sim = asCore(view);
      const t = target(sim, v, args);
      if (typeof t === 'string') return fail(t);
      const r = v.relationships[t.id];
      if (!r || r.romance < 75 || r.affinity < 60 || (v.stats[`crush_${t.id}`] ?? sim.world.time.dayIndex) > sim.world.time.dayIndex - 5) return fail(`${first(v)} is not nearly sure enough about ${first(t)} for that`);
      if (r.label === 'partner') return fail('they are already partners');
      const walk = needNear(v, sim, t, 'propose', { ...args, target: t.id });
      if (walk) return walk;
      const back = t.relationships[v.id];
      const yes = !!back && back.romance >= 45 && back.affinity >= 45 && back.familiarity >= 30;
      const q = sim.rng.pick([`${first(t)}... I have been carrying this around for weeks. Would you have me?`, `I am no good at speeches, ${first(t)}. Be with me. Properly.`, `${first(t)}, I would rather be a fool in front of you than sensible anywhere else. Say yes?`]);
      const a = yes ? sim.rng.pick(['Yes. Yes! I thought you would never ask.', 'You absolute idiot. Of course.', 'Yes. And you are telling Cerys, not me.']) : sim.rng.pick(['I... I am so sorry. I cannot. Not yet.', 'You deserve someone surer than me. I am sorry.', 'I care for you. But not like that. I am sorry.']);
      const effects: Effect[] = [say(q, t.id, 'flirty'), { kind: 'say', who: t.id, text: a, to: v.id, tone: yes ? 'warm' : 'sad' }, emote(yes ? 'love' : 'sad'), emote(yes ? 'love' : 'sad', t.id), { kind: 'stat', key: 'proposals' }];
      if (yes) {
        effects.push(rel(t.id, 'proposal_yes', { mutual: true, note: 'proposed - yes!', backNote: 'said yes to a proposal' }),
          { kind: 'fn', fn: (s: SimCore, me: Villager) => { me.relationships[t.id].label = 'partner'; const o = s.villager(t.id); if (o) o.relationships[me.id].label = 'partner'; } },
          { kind: 'status', add: ['celebrating'], minutes: 600 }, { kind: 'status', who: t.id, add: ['celebrating'], minutes: 600 },
          memFor(t.id, `${first(v)} proposed and ${first(t)} said yes. They are partners now`, 10, ['proposal', 'romance', 'pleasant', 'social'], [v.id]),
          chron(`${first(v)} proposed to ${first(t)} — and ${first(t)} said yes. Pebblebrook has a wedding to plan.`, 10, [v.id, t.id]), sfx('cheer'),
          { kind: 'memory', who: sim.villagers.filter((o) => o.id !== v.id && o.id !== t.id).map((o) => o.id), text: `Word is ${first(v)} and ${first(t)} are to be married`, importance: 7, tags: ['proposal', 'romance', 'gossip', 'heard'], about: [v.id, t.id], secondhand: true, source: t.id });
      } else {
        effects.push(rel(t.id, 'proposal_no', { mutual: true, note: 'proposed - refused', backNote: 'turned down a proposal', backDelta: { affinity: -2, romance: -5, trust: 1 } }),
          memFor(t.id, `${first(v)} proposed and ${first(t)} had to say no`, 8, ['proposal', 'romance', 'unpleasant', 'social'], [v.id]),
          chron(`${first(v)} proposed to ${first(t)}. ${first(t)} said no.`, 8, [v.id, t.id]), { kind: 'mood', delta: -0.5 });
      }
      return done(yes ? `${first(v)} proposed to ${first(t)} and they said YES` : `${first(v)} proposed to ${first(t)} and was turned down`, 3, effects, 10);
    },
  },
  {
    name: 'hug', category: 'social',
    description: 'Hug someone you are close to.',
    params: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] },
    available(v, view) {
      const sim = asCore(view);
      return !sim.isAsleep(v) && sim.villagersNear(v.pos, 6).some((o) => o.id !== v.id && !sim.isAsleep(o) && ((v.relationships[o.id]?.affinity ?? 0) >= 30 || (o.mood < -0.3 && v.personality.agreeableness > 0.6)));
    },
    execute(v, view, args) {
      const sim = asCore(view);
      const t = target(sim, v, args);
      if (typeof t === 'string') return fail(t);
      const r = v.relationships[t.id];
      const rb = t.relationships[v.id];
      if ((r?.affinity ?? 0) < 30 && !(t.mood < -0.3 && v.personality.agreeableness > 0.6)) return fail(`${first(v)} and ${first(t)} are not close enough for that`);
      const walk = needNear(v, sim, t, 'hug', { ...args, target: t.id }, 1.6);
      if (walk) return walk;
      const welcome = (rb?.affinity ?? 0) >= 10;
      const effects: Effect[] = [emote(welcome ? 'love' : 'sweat'), emote(welcome ? 'happy' : 'question', t.id), rel(t.id, welcome ? 'hug' : 'refused', { mutual: true }), need({ social: 8, comfort: 6 }), { kind: 'need', who: t.id, social: welcome ? 8 : 0, comfort: welcome ? 6 : -2 }, memFor(t.id, welcome ? `${first(v)} hugged ${first(t)}` : `${first(v)} went in for a hug and ${first(t)} was not ready for it`, welcome ? 4 : 3, ['hug', 'social', welcome ? 'pleasant' : 'awkward'], [v.id]), { kind: 'stat', key: 'hugs' }];
      if (welcome) effects.push({ kind: 'say', who: t.id, text: sim.rng.pick(['Oh! Well. Hello.', 'What is this for? Not that I mind.', 'Come here, you.']), to: v.id, tone: 'warm' });
      else effects.push({ kind: 'say', who: t.id, text: sim.rng.pick(['Ah. Right. Okay.', 'Personal space, please.']), to: v.id, tone: 'neutral' });
      return done(welcome ? `${first(v)} hugged ${first(t)}` : `${first(v)} hugged ${first(t)}, who went stiff as a board`, 1, effects, 3);
    },
  },
  {
    name: 'dance', category: 'social',
    description: 'Dance — with a partner if one is nearby, alone if not. Best at the tavern, the square, or a festival.',
    params: { type: 'object', properties: { target: { type: 'string' } } },
    available(v, view) {
      const sim = asCore(view);
      const p = sim.currentPlace(v);
      return !sim.isAsleep(v) && !!p && ['tavern', 'square', 'festival_grounds', 'meadow'].includes(p.id) && (v.mood > -0.2 || v.status.includes('drunk'));
    },
    execute(v, view, args) {
      const sim = asCore(view);
      let t: Villager | undefined;
      if (args.target !== undefined && args.target !== '') { const r = target(sim, v, args); if (typeof r === 'string') return fail(r); t = r; }
      const effects: Effect[] = [rate({ fun: 30, social: 12, energy: -8 }), sfx('music'), emote('music'), { kind: 'stat', key: 'dances' }];
      if (t) {
        if (!sim.near(v, t, 3)) return fail(`${first(t)} is too far away to dance with`);
        if (sim.isAsleep(t)) return fail(`${first(t)} is asleep`);
        const willing = (t.relationships[v.id]?.affinity ?? 0) > -10 && (t.mood > -0.3 || t.status.includes('drunk'));
        if (!willing) return done(`${first(v)} asked ${first(t)} to dance and got a shake of the head`, 1, [emote('sad'), rel(t.id, 'refused'), memFor(t.id, `${first(v)} asked ${first(t)} to dance; ${first(t)} declined`, 3, ['dance', 'social', 'awkward'], [v.id])], 3);
        effects.push(rel(t.id, 'dance', { mutual: true }), { kind: 'need', who: t.id, fun: 15, social: 8 }, memFor(t.id, `${first(v)} and ${first(t)} danced together`, 5, ['dance', 'social', 'pleasant', 'romance'], [v.id]), emote('music', t.id), chron(`${first(v)} and ${first(t)} danced at ${sim.placeName(sim.currentPlace(v)?.id)}.`, 4, [v.id, t.id]), say(sim.rng.pick(['Come on, one dance!', 'Up you get — this song is too good to sit through.', 'Dance with me, {n}.']).replace('{n}', first(t)), t.id, 'warm'));
        return done(`${first(v)} danced with ${first(t)}`, 12, effects, 5);
      }
      const audience = sim.audience(v, 5);
      for (const a of audience) effects.push(memFor(a.id, `${first(v)} danced ${a.mood > 0 ? 'and it was a joy to watch' : 'with more enthusiasm than skill'}`, 2, ['dance', 'social'], [v.id]), { kind: 'need', who: a.id, fun: 3 });
      return done(`${first(v)} danced${audience.length ? ' while the others watched' : ' alone'}`, 8, effects, 3);
    },
  },
  {
    name: 'tell_story', category: 'social',
    description: 'Tell a story to whoever is around.',
    params: { type: 'object', properties: { about: { type: 'string' } } },
    available(v, view) { const sim = asCore(view); return !sim.isAsleep(v) && !sim.rt(v).conversation && sim.audience(v, 5).length > 0; },
    execute(v, view, args) {
      const sim = asCore(view);
      const audience = sim.audience(v, 5);
      if (!audience.length) return fail('nobody around to tell it to');
      const story = str(args, 'about') || sim.rng.pick(STORIES);
      const good = v.skills.charm + (v.personality.traits.includes('storyteller') ? 3 : 0) + sim.rng.range(-2, 2) > 4;
      const effects: Effect[] = [say(storyOpening(story, sim), undefined, 'joking'), rate({ fun: 20, social: 16, purpose: 4 }), { kind: 'skill', skill: 'charm', xp: 0.3 }, sfx('laugh'), { kind: 'stat', key: 'stories' }];
      for (const a of audience) {
        const likes = a.personality.likes.includes('stories');
        effects.push({ kind: 'need', who: a.id, fun: good ? 8 : 3, social: 5 }, rel(a.id, 'story', { mutual: true, backDelta: { affinity: (good ? 2.5 : 0.5) + (likes ? 1 : 0), familiarity: 2 } }), memFor(a.id, `${first(v)} told a story about ${story}${good ? ' — a good one' : ''}`, good ? 4 : 2, ['story', 'social', good ? 'pleasant' : 'social'], [v.id]));
      }
      if (good && audience.length >= 2) effects.push(chron(`${first(v)} held the room at ${sim.placeName(sim.currentPlace(v)?.id)} with a story about ${story}.`, 4, [v.id, ...audience.map((a) => a.id)]));
      return done(`${first(v)} told ${audience.length === 1 ? first(audience[0]) : 'everyone'} a story about ${story}`, 12, effects, 3);
    },
  },
  {
    name: 'play_music', category: 'social',
    description: 'Play a tune (a whistle, a fiddle, a drum on the table) for whoever is around.',
    params: { type: 'object', properties: { song: { type: 'string' } } },
    available: (v, view) => !asCore(view).isAsleep(v) && (v.personality.likes.includes('music') || v.skills.charm >= 5) && !asCore(view).rt(v).conversation,
    execute(v, view, args) {
      const sim = asCore(view);
      const audience = sim.audience(v, 6);
      const song = str(args, 'song') || sim.rng.pick(SONGS);
      const effects: Effect[] = [rate({ fun: 24, purpose: 6, social: audience.length ? 10 : 0 }), sfx('music'), emote('music'), { kind: 'skill', skill: 'charm', xp: 0.25 }, { kind: 'status', add: ['inspired'], minutes: 120 }, { kind: 'stat', key: 'songs' }];
      for (const a of audience) {
        const likes = a.personality.likes.includes('music');
        const hates = a.personality.dislikes.includes('noise') || a.personality.dislikes.includes('loud');
        effects.push({ kind: 'need', who: a.id, fun: hates ? -2 : likes ? 10 : 5 }, rel(a.id, 'together', { mutual: true, backDelta: { affinity: hates ? -1 : likes ? 3 : 1.5, familiarity: 1.5 } }), memFor(a.id, `${first(v)} played "${song}"${likes ? ' — ' + first(a) + ' could have listened all night' : hates ? ' — too loud for ' + first(a) : ''}`, likes ? 4 : 2, ['music', 'social', hates ? 'unpleasant' : 'pleasant'], [v.id]));
        if (likes) effects.push(emote('music', a.id));
      }
      if (audience.length >= 2) effects.push(chron(`${first(v)} played "${song}" at ${sim.placeName(sim.currentPlace(v)?.id)}.`, 3, [v.id]));
      return done(`${first(v)} played "${song}"${audience.length ? ' for ' + (audience.length === 1 ? first(audience[0]) : 'the room') : ' to nobody in particular'}`, 18, effects, 3);
    },
  },
];

const STORIES = ['the great salmon', 'the winter the river froze solid', 'the miner who came up with a gem in his teeth', 'the bard who never left', 'the night the tavern roof blew off', 'old Pennywort and the tax man', 'the ghost in the library', 'the wolf that ate the mayor\'s hat', 'the cow that walked to market', 'the year the pumpkins grew too big for the cart', 'the storm of the century', 'a fish that swallowed a wedding ring'];
const SONGS = ['The Drowsy Owl', 'River Take Me Home', 'Pennywort\'s Ledger', 'Three Coins Down', 'The Miner\'s Lullaby', 'Cerys\' Reel', 'Lantern Night', 'The Turnip Song', 'Salt and Pine', 'Sunday Up the Hill'];

function storyOpening(story: string, sim: SimCore): string {
  return sim.rng.pick([`Did I ever tell you about ${story}?`, `Right. Gather in. This is about ${story}.`, `So — ${story}. Everybody says it is a story. It is not.`, `You will not believe this one. ${story[0].toUpperCase()}${story.slice(1)}.`]);
}

function withArticle(name: string): string {
  const n = name.toLowerCase();
  if (/s$/.test(n) && !/ss$/.test(n) && !['seeds', 'nails', 'herbs', 'berries'].some((w) => n.endsWith(w))) return name;
  if (['seeds', 'nails', 'herbs', 'berries', 'flour', 'wood', 'stone', 'wool', 'cloth', 'milk', 'honey', 'bread', 'ale', 'cider', 'tea', 'coffee', 'stew', 'corn', 'wheat'].some((w) => n.endsWith(w))) return 'some ' + name;
  return (/^[aeiou]/.test(n) ? 'an ' : 'a ') + name;
}

function giftReaction(t: Villager, appeal: number, name: string, giver: string, sim: SimCore): string {
  const p = t.personality;
  if (appeal > 0.5) return sim.rng.pick([`${name}! How did you know? Thank you, ${giver}!`, `Oh — I love this. Truly. Thank you.`, `You remembered. ${name}. I will not forget this.`, `${giver}, this is perfect. Come here.`]);
  if (appeal > 0.1) return sim.rng.pick([`Thank you, that is kind of you.`, `Oh! ${name}. Thank you, ${giver}.`, `That is thoughtful. Thank you.`, `Well now. Thank you.`]);
  if (appeal > -0.2) return sim.rng.pick([`Oh. A ${name.toLowerCase()}. Thanks.`, `Thank you. I will... find a use for it.`, p.agreeableness > 0.6 ? `That is kind. Thank you.` : `Hm. Thanks, I suppose.`]);
  return sim.rng.pick([`${name}? You know I cannot stand these.`, `Oh. Well. Thank you, I suppose.`, p.agreeableness > 0.7 ? `That is... thoughtful. Thank you.` : `Is this a joke, ${giver}?`]);
}

function needsApology(v: Villager, other: string, sim: SimCore): boolean {
  let argued = -1, apologised = -1;
  for (const m of v.memory) {
    if (m.about?.includes(other)) {
      if (m.tags.includes('argued') && m.t > argued && sim.now - m.t < 3 * 1440) argued = m.t;
      if (m.tags.includes('apology') && m.t > apologised) apologised = m.t;
    }
  }
  return argued > apologised && (v.personality.agreeableness > 0.45 || (v.relationships[other]?.affinity ?? 0) > 20);
}
