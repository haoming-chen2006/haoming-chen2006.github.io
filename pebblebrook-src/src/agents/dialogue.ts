/**
 * Template dialogue: topic choice, kind-specific exchanges, reactions to the previous turn, player intents.
 */
import { item } from '../core/items.ts';
import type { ConversationContext, ConversationTurn, Emote, Memory, Rng, Villager, VillagerId } from '../core/types.ts';
import { CHAT_FOLLOWUPS, CHAT_OPENERS, CHAT_REPLIES, CHAT_REPLIES_2, CLOSERS, KINDS, SUBTOPICS, type Stance, type Subtopic } from './templates/lines.ts';
import { JOKES, NEWS_FALLBACK, OPINION_BY_LABEL, PLAYER_LINES, WANTS_BY_PROFESSION, type PStance } from './templates/player.ts';
import { cap, fill, firstPerson, lower, pronounise, PROFESSION_WORK, timeOfDay, voice, WEATHER_PHRASE, type Slots } from './templates/voice.ts';

export interface DialogueState { lastJoke: Map<VillagerId, number>; lastSubtopic: Map<VillagerId, string> }
export const newDialogueState = (): DialogueState => ({ lastJoke: new Map(), lastSubtopic: new Map() });

type Tone = NonNullable<ConversationTurn['tone']>;
const first = (v: Villager): string => v.name.split(' ')[0];
const lowerFirst = lower;
const endDot = (s: string): string => (/[.!?]$/.test(s) ? s : s + '.');

function splitTopic(topic: string): [string, string] { const i = topic.indexOf(':'); return i < 0 ? [topic, ''] : [topic.slice(0, i), topic.slice(i + 1)]; }

/** How the speaker feels about the listener right now. */
export function stanceOf(speaker: Villager, listener: VillagerId): Stance {
  const r = speaker.relationships[listener];
  const aff = r?.affinity ?? 0;
  if (aff >= 22) return 'warm';
  if (aff <= -15) return 'cold';
  if (speaker.status.includes('angry') && speaker.mood < -0.2) return 'cold';
  if (speaker.mood > 0.15 && speaker.personality.agreeableness > 0.55) return 'warm';
  if (speaker.mood < -0.5 && speaker.personality.agreeableness < 0.5) return 'cold';
  return 'neutral';
}

function toneFor(v: Villager, stance: Stance, kind: string, rng: Rng, listener: VillagerId): Tone {
  if (kind === 'argue') return v.personality.agreeableness > 0.7 && stance !== 'cold' ? 'sad' : 'angry';
  if (v.status.includes('angry') && stance === 'cold') return 'angry';
  const r = v.relationships[listener];
  if (stance === 'warm' && (r?.romance ?? 0) >= 18 && ['chat', 'compliment', 'tease', 'invite', 'visit', 'festival'].includes(kind) && (v.personality.traits.includes('romantic') || v.personality.traits.includes('flirt') || rng.chance(0.35))) return 'flirty';
  if (kind === 'tease' || ((v.personality.traits.includes('dry humour') || v.personality.traits.includes('storyteller') || v.personality.traits.includes('easy-going')) && v.mood > 0 && rng.chance(0.4))) return 'joking';
  if (v.mood < -0.45) return 'sad';
  if (stance === 'warm') return 'warm';
  if (stance === 'cold') return 'cold';
  return 'neutral';
}

const DELTA: Record<Tone, number> = { warm: 0.5, flirty: 0.4, joking: 0.3, neutral: 0, cold: -0.5, angry: -1, sad: 0 };

function emoteFor(tone: Tone, kind: string, rng: Rng): Emote | undefined {
  if (tone === 'flirty' && rng.chance(0.5)) return 'love';
  if (tone === 'angry') return 'angry';
  if (tone === 'sad') return 'sad';
  if (kind === 'ask' || kind === 'ask_about') return rng.chance(0.5) ? 'question' : undefined;
  if (kind === 'gossip') return rng.chance(0.4) ? 'exclaim' : undefined;
  if (kind === 'dreams') return 'idea';
  if (tone === 'joking' || tone === 'warm') return rng.chance(0.3) ? 'happy' : undefined;
  return undefined;
}

function baseSlots(v: Villager, listenerName: string, ctx: ConversationContext): Slots {
  const w = ctx.world.weather.kind;
  const t = ctx.world.time;
  const listener = ctx.listener === 'player' ? undefined : ctx.listener;
  const like = listener ? listener.personality.likes.find((l) => !['sunny', 'rain', 'storm', 'fog', 'snow', 'quiet', 'social', 'festive', 'news', 'money', 'order', 'calm', 'honest work', 'superstition'].includes(l)) : undefined;
  return {
    // both slots name the person being spoken to: openers say {listener}, replies answer {speaker}
    speaker: listenerName, listener: listenerName, player: ctx.sim.player.name,
    weather: WEATHER_PHRASE[w]?.[Math.floor(ctx.sim.rng.next() * (WEATHER_PHRASE[w]?.length ?? 1))] ?? w, season: t.season, time: timeOfDay(t.hour), day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][t.weekday],
    work: PROFESSION_WORK[listener?.profession ?? v.profession] ?? 'work', mywork: PROFESSION_WORK[v.profession] ?? 'work',
    place: ctx.sim.rng.pick(['the Owl', 'the square', 'the lake', 'the hill']), dream: v.personality.dream, likes: like ?? 'the weather',
    item: listener ? (listener.inventory.find((s) => item(s.id).kind !== 'tool') ? item(listener.inventory.find((s) => item(s.id).kind !== 'tool')!.id).name.toLowerCase() : 'thing') : 'thing',
  };
}

/** A notable memory the speaker could mention as news (not about the listener). */
function newsFor(v: Villager, listener: VillagerId, now: number): Memory | undefined {
  const c = v.memory.filter((m) => m.importance >= 3 && now - m.t < 2 * 1440 && m.kind !== 'reflection' && m.kind !== 'plan' && !(m.about ?? []).includes(listener) && !m.tags.includes('talk'));
  c.sort((a, b) => b.importance + (now - a.t) / 1440 - (a.importance + (now - b.t) / 1440));
  return c[0];
}

function pickSubtopic(v: Villager, listener: Villager, ctx: ConversationContext, detail: string, st: DialogueState): { sub: Subtopic; news?: Memory } {
  const rng = ctx.sim.rng;
  if ((SUBTOPICS as readonly string[]).includes(detail)) return { sub: detail as Subtopic };
  const now = ctx.world.time.minute;
  const w = ctx.world.weather.kind;
  const cands: { sub: Subtopic; w: number; news?: Memory }[] = [];
  const news = newsFor(v, listener.id, now);
  if (news) cands.push({ sub: 'news', w: 3 + (v.personality.traits.includes('gossip') ? 3 : 0) + news.importance * 0.4, news });
  if (v.needs.energy < 35) cands.push({ sub: 'tired', w: 3 });
  cands.push({ sub: 'weather', w: w === 'sunny' || w === 'cloudy' ? 1.5 : 3 });
  cands.push({ sub: 'work', w: 1.5 + v.personality.conscientiousness * 2 });
  cands.push({ sub: 'food', w: 1 + (v.needs.hunger < 50 ? 2 : 0) + (v.profession === 'baker' || v.profession === 'innkeeper' ? 1.5 : 0) });
  cands.push({ sub: 'village', w: 1.5 });
  const aff = v.relationships[listener.id]?.affinity ?? 0;
  if (aff >= 20) cands.push({ sub: 'dreams', w: 1 + v.personality.openness * 2 });
  cands.push({ sub: 'plans', w: ctx.world.time.hour >= 15 ? 2.5 : 1 });
  if (v.profession === 'fisher' || v.personality.likes.includes('fish') || v.personality.likes.includes('stars')) cands.push({ sub: 'river', w: 2 });
  if (ctx.world.festivalToday() || ctx.sim.events.some((e) => e.kind === 'festival')) cands.push({ sub: 'festival', w: 4 });
  else if (v.personality.likes.includes('festive')) cands.push({ sub: 'festival', w: 1.2 });
  if (listener.personality.likes.length) cands.push({ sub: 'likes', w: 1.2 + (aff >= 10 ? 1 : 0) });
  const r = v.relationships[listener.id];
  if (r && now - r.lastTalked < 1440 && r.familiarity > 20) cands.push({ sub: 'memory', w: 1 });
  if (v.money < 80 || v.id === 'hal' || v.personality.likes.includes('money')) cands.push({ sub: 'money', w: 1.5 });
  const last = st.lastSubtopic.get(v.id);
  for (const c of cands) if (c.sub === last) c.w *= 0.3;
  const total = cands.reduce((a, b) => a + b.w, 0);
  let x = rng.next() * total;
  for (const c of cands) { x -= c.w; if (x <= 0) { st.lastSubtopic.set(v.id, c.sub); return { sub: c.sub, news: c.news }; } }
  return { sub: 'village' };
}

/** yes/no: how the listener receives this kind of approach. Deterministic so both sides agree. */
function receives(listener: Villager, speaker: Villager, kind: string, topic: string): 'yes' | 'no' {
  const r = listener.relationships[speaker.id];
  const aff = r?.affinity ?? 0;
  const p = listener.personality;
  switch (kind) {
    case 'invite': return topic.endsWith('|yes') ? 'yes' : 'no';
    case 'apologize': return topic.endsWith(':yes') ? 'yes' : 'no';
    case 'argue': return p.agreeableness < 0.6 || aff < 0 || p.neuroticism > 0.55 || p.traits.includes('proud') ? 'yes' : 'no';
    case 'gossip': return p.dislikes.includes('gossip') && aff < 30 ? 'no' : 'yes';
    case 'tease': return (r?.familiarity ?? 0) > 10 && aff > 5 && listener.mood > -0.3 ? 'yes' : 'no';
    case 'comfort': return listener.mood < 0 || p.agreeableness > 0.5 || aff > 20 ? 'yes' : 'no';
    case 'ask_about': return aff > 5 && !p.dislikes.includes('gossip') ? 'yes' : 'no';
    case 'compliment': return aff <= -15 || (p.traits.includes('shrewd') && aff < 10) ? 'no' : 'yes';
    default: return aff <= -15 ? 'no' : 'yes';
  }
}

export function converse(ctx: ConversationContext, rng: Rng, st: DialogueState): ConversationTurn {
  const v = ctx.speaker;
  if (ctx.listener === 'player') return playerTurn(ctx, rng, st);
  const listener = ctx.listener;
  const [kind0, detail] = splitTopic(ctx.topic ?? 'chat');
  const kind = KINDS[kind0] ? kind0 : 'chat';
  const idx = ctx.history.length;
  const stance = stanceOf(v, listener.id);
  const tone = toneFor(v, stance, kind, rng, listener.id);
  const slots = baseSlots(v, first(listener), ctx);
  let text = '';
  let remember: ConversationTurn['remember'];
  let topicOut: string | undefined;
  let end = false;
  const step = Math.min(idx, 4);
  if (kind === 'chat') {
    let sub: Subtopic;
    if (idx === 0) {
      const pick = pickSubtopic(v, listener, ctx, detail, st);
      sub = pick.sub;
      if (pick.news) { slots.news = endDot(cap(firstPerson(pick.news.text, first(v)))); remember = { text: `${first(v)} mentioned that ${lowerFirst(pronounise(pick.news.text, first(v)))}`, importance: Math.max(2, pick.news.importance - 1), tags: ['heard', 'news', ...pick.news.tags.filter((t) => t !== 'pleasant' && t !== 'unpleasant')] }; }
      else if (sub === 'news') sub = 'village';
    } else {
      const opener = ctx.history[0];
      sub = (SUBTOPICS as readonly string[]).includes(opener.topic ?? '') ? (opener.topic as Subtopic) : 'village';
    }
    topicOut = sub;
    if (step === 0) text = rng.pick(CHAT_OPENERS[sub]);
    else if (step === 1) text = rng.pick(CHAT_REPLIES[sub][stance]);
    else if (step === 2) text = rng.pick(CHAT_FOLLOWUPS[sub]);
    else if (step === 3) text = rng.pick(CHAT_REPLIES_2[stance]);
    else { text = rng.pick(CLOSERS[stance]); end = true; }
    if (sub === 'dreams' && step === 0) remember = { text: `${first(v)} confided a dream: ${lowerFirst(v.personality.dream)}`, importance: 4, tags: ['dream', 'confided', 'pleasant'] };
  } else {
    const bank = KINDS[kind];
    const initiator = ctx.history.length % 2 === 0 ? v : listener;
    const other = initiator === v ? listener : v;
    const yn = receives(initiator === v ? listener : v, initiator === v ? v : listener, kind, ctx.topic ?? '');
    void other;
    // kind-specific slots
    if (kind === 'gossip') {
      const [about, memId] = detail.split(':');
      const subjectV = about ? ctx.sim.villager(about) : undefined;
      slots.subject = subjectV ? first(subjectV) : 'someone';
      const m = memId ? v.memory.find((x) => x.id === memId) ?? listener.memory.find((x) => x.source === v.id && x.tags.includes('gossip')) : undefined;
      slots.news = m ? endDot(cap(firstPerson(m.text.replace(/^.*? told me that /, ''), first(v)))) : 'Well. Things have happened.';
    }
    if (kind === 'ask') slots.question = detail ? endDot(detail[0].toUpperCase() + detail.slice(1)) + (detail.includes('?') ? '' : '') : 'How are things, really?';
    if (kind === 'argue') slots.topic = detail || 'everything';
    if (kind === 'invite') { const [activity, placeId, hour] = detail.split('|'); slots.activity = activity || 'a drink'; slots.place = ctx.world.place(placeId ?? '')?.name ?? placeId ?? 'the Owl'; slots.hour = String(Math.floor(Number(hour) || 20)); }
    if (kind === 'ask_about') { const sv = ctx.sim.villager(detail); slots.subject = sv ? first(sv) : detail || 'them'; }
    if (kind === 'visit') slots.place = ctx.world.place(v.inside ?? '')?.name ?? 'here';
    if (step === 0) text = rng.pick(bank.open);
    else if (step === 1) text = rng.pick(bank.reply[yn]);
    else if (step === 2) text = rng.pick(bank.follow[yn]);
    else if (step === 3) text = rng.pick(bank.reply2[yn]);
    else { text = rng.pick(bank.close); end = true; }
    if (idx === 0 && kind === 'compliment') remember = { text: `${first(v)} paid ${first(listener)} a compliment: "${fill(text, slots)}"`, importance: 3, tags: ['compliment', 'pleasant'] };
    if (idx === 0 && kind === 'argue') remember = { text: `${first(v)} started a row about ${slots.topic}`, importance: 4, tags: ['argued', 'unpleasant'] };
    if (idx === 0 && kind === 'ask') remember = { text: `${first(v)} asked: ${slots.question}`, importance: 2, tags: ['asked'] };
    if (idx === 1 && kind === 'ask_about' && yn === 'yes') { const sv = ctx.sim.villager(detail); const m = sv ? v.memory.filter((x) => x.about?.includes(sv.id) && x.importance >= 3 && !x.tags.includes('talk')).sort((a, b) => b.importance - a.importance)[0] : undefined; if (m) { text = text + ' ' + endDot(firstPerson(m.text, first(v))); remember = { text: `${first(v)} told ${first(listener)} that ${lowerFirst(pronounise(m.text, first(v)))}`, importance: Math.max(2, m.importance - 1), tags: ['heard', 'gossip', ...m.tags.filter((t) => t !== 'talk')] }; } }
  }
  if (idx >= 5) end = true;
  const line = voice(v, fill(text, slots), rng);
  return { speaker: v.id, text: line, tone, end, remember, affinityDelta: DELTA[tone] + (kind === 'argue' ? -0.5 : 0), emote: emoteFor(tone, kind === 'chat' ? topicOut ?? 'chat' : kind, rng), topic: topicOut };
}

/* ------------------------------------------------------------ player */

function pStance(v: Villager): PStance {
  const r = v.relationships.player;
  const aff = r?.affinity ?? 0;
  if (aff <= -15 || r?.label === 'rival') return 'rival';
  if (aff >= 25 || ['friend', 'close friend', 'crush', 'partner'].includes(r?.label ?? '')) return 'friend';
  if ((r?.familiarity ?? 0) >= 5 || aff > 5) return 'acquaintance';
  return 'stranger';
}

export function classifyLine(line: string, sim: ConversationContext['sim']): string {
  const l = line.toLowerCase();
  for (const o of sim.villagers) if (l.includes(o.name.split(' ')[0].toLowerCase())) return `ask_about:${o.id}`;
  if (/\b(dream|wish|hope|future)\b/.test(l)) return 'chat:dreams';
  if (/\b(bye|goodbye|see you|farewell|later)\b/.test(l)) return 'goodbye';
  if (/\b(hello|hi|hey|morning|evening|greetings)\b/.test(l)) return 'greet';
  if (/\b(joke|funny|laugh)\b/.test(l)) return 'joke';
  if (/\b(help|need anything|can i do|errand|favour|favor|task|request)\b/.test(l)) return 'help';
  if (/\b(trade|buy|sell|price|coins?|swap)\b/.test(l)) return 'trade';
  if (/\b(gossip|rumou?rs?|news|heard|secrets?)\b/.test(l)) return 'gossip';
  if (/\b(your day|how are you|how's it|hows it|how goes|been up to)\b/.test(l)) return 'day';
  if (/\b(weather|rain|sun|storm|fog|snow|sky)\b/.test(l)) return 'chat:weather';
  if (/\b(work|job|busy|farm|forge|bak|fish|shop|library|mine)\b/.test(l)) return 'chat:work';
  if (/\b(love|like you|beautiful|handsome|wonderful|great job|well done|amazing|brilliant)\b/.test(l)) return 'compliment';
  if (/\b(festival|fair|feast|lantern)\b/.test(l)) return 'chat:festival';
  if (/\b(eat|food|bread|stew|hungry|pie)\b/.test(l)) return 'chat:food';
  if (/\?$/.test(l.trim())) return 'ask';
  return 'free';
}

function playerTurn(ctx: ConversationContext, rng: Rng, st: DialogueState): ConversationTurn {
  const v = ctx.speaker;
  const sim = ctx.sim;
  const now = ctx.world.time.minute;
  let intent = ctx.playerIntent && ctx.playerIntent !== 'free' && ctx.playerIntent !== 'chat' && ctx.playerIntent !== 'say' ? ctx.playerIntent : classifyLine(ctx.playerLine ?? '', sim);
  if (intent === 'about') intent = `ask_about:${(ctx.playerLine ?? '').trim()}`;
  const stance = pStance(v);
  const slots = baseSlots(v, sim.player.name, ctx);
  slots.player = sim.player.name;
  let text = '';
  let end = false;
  let delta = 0;
  let remember: ConversationTurn['remember'];
  let emote: Emote | undefined;
  let tone: Tone = stance === 'friend' ? 'warm' : stance === 'rival' ? 'cold' : 'neutral';
  const pick = (key: string): string => rng.pick(PLAYER_LINES[key]?.[stance] ?? PLAYER_LINES.free[stance]);
  if (intent.startsWith('chat:')) {
    const sub = intent.slice(5) as Subtopic;
    const s2: Stance = stance === 'friend' ? 'warm' : stance === 'rival' ? 'cold' : 'neutral';
    text = rng.pick(CHAT_REPLIES[sub]?.[s2] ?? CHAT_REPLIES.village[s2]);
    delta = 0.3;
  } else if (intent.startsWith('ask_about:')) {
    const id = intent.slice(10);
    const other = sim.villager(id);
    if (!other) { text = pick('free'); }
    else if (other.id === v.id) { text = rng.pick(['Me? What have you heard? No — do not tell me.', 'Asking me about myself. Bold. I am exactly what you see.', 'I am a ' + v.profession + ', and I keep my own counsel. Mostly.', 'Ha. Ask the others. They will tell you more than I would.']); delta = 0.3; emote = 'question'; }
    else {
      const r = v.relationships[other.id];
      slots.subject = first(other);
      const label = r?.label ?? 'stranger';
      let op = fill(rng.pick(OPINION_BY_LABEL[label] ?? OPINION_BY_LABEL.acquaintance), slots);
      const m = v.memory.filter((x) => x.about?.includes(other.id) && x.importance >= 3 && !x.about.includes('player')).sort((a, b) => b.importance + (now - a.t) / -1440 - (a.importance + (now - b.t) / -1440))[0];
      if (m && stance !== 'rival') { op += ' ' + endDot(rng.pick(['Only the other day: ', 'Case in point: ', 'For instance — ', 'Mind you, ']) + lowerFirst(firstPerson(m.text, first(v)))); remember = undefined; }
      slots.opinion = op;
      text = pick('ask_about');
      if (label === 'crush' && rng.chance(0.5)) emote = 'love';
    }
    delta = 0.2;
  } else {
    switch (intent) {
      case 'greet': text = pick('greet'); delta = 0.4; emote = stance === 'friend' ? 'happy' : undefined; break;
      case 'day': {
        const m = v.memory.filter((x) => x.importance >= 2 && now - x.t < 1440 && x.kind !== 'reflection' && !x.tags.includes('player')).sort((a, b) => b.importance - a.importance || b.t - a.t)[0];
        slots.news = m ? endDot(lowerFirst(firstPerson(m.text, first(v)))) : rng.pick(NEWS_FALLBACK);
        text = pick('day'); delta = 0.3;
        if (v.action) slots.action = v.action.label;
        break;
      }
      case 'gossip': {
        const g = v.memory.filter((x) => x.importance >= 3 && x.about?.length && !x.about.includes('player') && now - x.t < 4 * 1440 && x.kind !== 'reflection' && x.kind !== 'plan').sort((a, b) => b.importance - a.importance || b.t - a.t);
        const m = g[Math.min(g.length - 1, Math.floor(rng.next() * Math.min(3, g.length)))];
        slots.gossip = m ? endDot(m.text) : rng.pick(['Nothing worth repeating, honestly.', 'Quiet week. Give it time.', 'If I hear anything you will be the second to know.']);
        text = pick('gossip');
        if (m && stance !== 'rival') remember = { text: `${first(v)} told ${sim.player.name} that ${lowerFirst(pronounise(m.text, first(v)))}`, importance: 2, tags: ['gossip', 'told'] };
        delta = v.personality.traits.includes('gossip') ? 0.8 : v.personality.dislikes.includes('gossip') ? -0.6 : 0.2;
        if (m) emote = 'exclaim';
        break;
      }
      case 'help': {
        const open = sim.requests.find((r) => r.by === v.id && !r.done && r.expiresAt > now);
        if (open) slots.want = `I put a note on the board: ${open.text}, for ${open.reward.money ?? 0} coins. That still stands.`;
        else {
          const wants = WANTS_BY_PROFESSION[v.profession] ?? WANTS_BY_PROFESSION.none;
          const w = rng.pick(wants);
          const need = requestFor(v.profession, rng);
          if (need && stance !== 'rival' && v.money >= need.reward + 5 && rng.chance(0.5)) {
            const req = sim.postRequest(v.id, need.text, { money: need.reward }, need.needs);
            slots.want = `${w[0].toUpperCase() + w.slice(1)} In fact, I will put it on the board properly: ${req.text}, ${need.reward} coins to whoever brings it.`;
          } else slots.want = w[0].toUpperCase() + w.slice(1);
        }
        text = pick('help'); delta = 0.5; break;
      }
      case 'joke': {
        const lastJ = st.lastJoke.get(v.id) ?? -1;
        let j = Math.floor(rng.next() * JOKES.length);
        if (j === lastJ) j = (j + 1) % JOKES.length;
        st.lastJoke.set(v.id, j);
        slots.joke = JOKES[j];
        text = pick('joke');
        delta = v.personality.openness > 0.4 || v.mood > 0 ? 1 : 0.2;
        emote = stance === 'rival' ? undefined : 'happy';
        if (stance !== 'rival') tone = 'joking';
        break;
      }
      case 'compliment': text = pick('compliment'); delta = stance === 'rival' ? 0.3 : 1.5; emote = stance === 'rival' ? 'question' : 'happy'; if (stance === 'friend' && (v.relationships.player?.romance ?? 0) > 15) { tone = 'flirty'; emote = 'love'; } break;
      case 'trade': {
        const spare = v.inventory.filter((s) => item(s.id).kind !== 'tool' && s.qty >= 2).sort((a, b) => b.qty - a.qty)[0];
        const want = (WANTS_BY_PROFESSION[v.profession] ?? [])[0];
        slots.sell = spare ? `I have ${item(spare.id).name.toLowerCase()} to spare${want ? ', and ' + lowerFirst(want).replace(/\.$/, '') : ''}.` : want ? want[0].toUpperCase() + want.slice(1) : 'Not much on me today.';
        text = pick('trade'); delta = 0.3; break;
      }
      case 'goodbye': text = pick('goodbye'); end = true; delta = 0.2; break;
      case 'ask': { const s2 = stance === 'rival' ? 'no' : 'yes'; text = rng.pick(KINDS.ask.reply[s2]); delta = 0.2; emote = 'question'; break; }
      case 'free': default: text = pick('free'); delta = 0.1; break;
    }
  }
  if (!text) text = pick('free');
  const line = voice(v, fill(text, slots), rng);
  return { speaker: v.id, text: line, tone, end, remember, affinityDelta: delta, emote };
}

function requestFor(profession: string, rng: Rng): { text: string; reward: number; needs: { id: string; qty: number }[] } | null {
  const table: Record<string, { text: string; reward: number; needs: { id: string; qty: number }[] }[]> = {
    farmer: [{ text: '4 nails for the gate', reward: 30, needs: [{ id: 'nails', qty: 4 }] }, { text: '3 wood for the fence', reward: 20, needs: [{ id: 'wood', qty: 3 }] }],
    blacksmith: [{ text: '3 iron ore', reward: 60, needs: [{ id: 'iron_ore', qty: 3 }] }, { text: '3 copper ore', reward: 40, needs: [{ id: 'copper_ore', qty: 3 }] }],
    baker: [{ text: '2 flour', reward: 30, needs: [{ id: 'flour', qty: 2 }] }, { text: '3 wild berries for a pie', reward: 30, needs: [{ id: 'berries', qty: 3 }] }, { text: '1 honey', reward: 30, needs: [{ id: 'honey', qty: 1 }] }],
    fisher: [{ text: '2 herbs for the soup', reward: 20, needs: [{ id: 'herbs', qty: 2 }] }],
    doctor: [{ text: '3 herbs for tonics', reward: 30, needs: [{ id: 'herbs', qty: 3 }] }, { text: '1 honey', reward: 28, needs: [{ id: 'honey', qty: 1 }] }],
    innkeeper: [{ text: '2 potatoes for the stew', reward: 30, needs: [{ id: 'potato', qty: 2 }] }, { text: '1 perch for fish soup', reward: 25, needs: [{ id: 'perch', qty: 1 }] }],
    miner: [{ text: '2 bandages', reward: 25, needs: [{ id: 'bandage', qty: 2 }] }],
    shopkeeper: [{ text: '2 honey for candles', reward: 45, needs: [{ id: 'honey', qty: 2 }] }, { text: '2 wool', reward: 35, needs: [{ id: 'wool', qty: 2 }] }],
    librarian: [{ text: '1 book, any book', reward: 30, needs: [{ id: 'book', qty: 1 }] }],
    carpenter: [{ text: '4 wood', reward: 20, needs: [{ id: 'wood', qty: 4 }] }, { text: '2 nails', reward: 15, needs: [{ id: 'nails', qty: 2 }] }],
  };
  const opts = table[profession];
  return opts ? rng.pick(opts) : null;
}
