/**
 * Villager↔villager conversations: alternating brain.converse() turns, memories on both sides, relationship
 * deltas, bus events. Local brains resolve turns synchronously; async brains mark the conversation pending.
 */
import type { Brain, ConversationContext, ConversationState, ConversationTurn, Memory, Villager, VillagerId } from '../core/types.ts';
import type { SimCore } from './core.ts';
import { gossipCopy, gossipable, knows, lowerFirst, retrieve } from './memory.ts';
import { interactionDelta } from './relationships.ts';

export interface ConvRuntime {
  state: ConversationState;
  maxTurns: number;
  nextTurnAt: number;
  pending: boolean;
  kind: string;
  detail: string;
  initiator: VillagerId;
  /** for gossip: the memory copied to the listener */
  gossip?: Memory;
  accepted?: boolean;
}

const TURN_GAP = 2.2;

type SyncBrain = Brain & { converseSync?: (ctx: ConversationContext) => ConversationTurn };

export class ConversationManager {
  private sim: SimCore;
  private live = new Map<string, ConvRuntime>();
  private seq = 0;
  private brainFor: (v: Villager) => Brain;
  private onEnd: (v: Villager) => void;
  private async: { conv: ConvRuntime; turn: ConversationTurn }[] = [];

  constructor(sim: SimCore, brainFor: (v: Villager) => Brain, onEnd: (v: Villager) => void) {
    this.sim = sim; this.brainFor = brainFor; this.onEnd = onEnd;
  }

  get(id: string): ConvRuntime | undefined { return this.live.get(id); }
  all(): ConvRuntime[] { return [...this.live.values()]; }

  start(a: Villager, b: Villager, topic = 'chat'): ConversationState | null {
    const sim = this.sim;
    if (a.id === b.id) return null;
    const ra = sim.rt(a), rb = sim.rt(b);
    if (ra.conversation || rb.conversation) return null;
    if (sim.isAsleep(b) || sim.isAsleep(a)) return null;
    // willingness: rivals sometimes refuse, unless it is an apology or an argument
    const [kind, detailRaw] = splitTopic(topic);
    let detail = detailRaw;
    const rel = b.relationships[a.id];
    if (rel && rel.affinity < -35 && kind !== 'apologize' && kind !== 'argue' && kind !== 'comfort' && sim.rng.chance(0.6)) {
      sim.say(b, sim.rng.pick(['Not now.', 'I have nothing to say to you.', 'Busy.']), a.id, 'cold');
      sim.remember(a, { kind: 'observation', text: `${first(b)} brushed ${first(a)} off`, importance: 3, tags: ['social', 'refused', 'unpleasant'], about: [b.id] });
      sim.adjustRelationship(a, b.id, { affinity: -1.5 });
      return null;
    }
    const id = `c${(this.seq++).toString(36)}_${sim.now}`;
    const state: ConversationState = { id, participants: [a.id, b.id], turns: [], place: a.inside ?? sim.currentPlace(a)?.id, startedAt: sim.now, topic };
    const rt: ConvRuntime = { state, maxTurns: this.turnsFor(a, b, kind), nextTurnAt: sim.now, pending: false, kind, detail, initiator: a.id };
    if (kind === 'gossip') {
      const about = detail && sim.villager(detail) ? detail : undefined;
      let m: Memory | null = null;
      if (about) {
        const ms = retrieve(a, { about: [about] }, 8, sim.now).filter((x) => x.about?.includes(about) && x.importance >= 2 && x.kind !== 'reflection' && x.kind !== 'plan' && !knows(b, x.text) && !x.about.includes(b.id));
        m = ms[0] ?? null;
      }
      if (!m) m = gossipable(a, b.id, sim.now, sim.rng);
      if (m) { rt.gossip = m; detail = m.about?.find((x) => x !== a.id) ?? detail; rt.detail = detail; state.topic = `gossip:${detail}:${m.id}`; }
      else { rt.kind = 'chat'; rt.detail = 'news'; state.topic = 'chat:news'; }
    }
    if (kind === 'invite') {
      const [activity] = detail.split('|');
      const back = b.relationships[a.id];
      const comp = (back?.affinity ?? 0) / 40 + b.personality.extraversion * 0.6 + (b.personality.likes.some((l) => activity.includes(l)) ? 0.5 : 0) + b.mood * 0.4 + sim.rng.range(-0.3, 0.3);
      rt.accepted = comp > 0.35;
      state.topic = `invite:${detail}|${rt.accepted ? 'yes' : 'no'}`;
    }
    if (kind === 'apologize') {
      rt.accepted = b.personality.agreeableness > 0.45 || (b.relationships[a.id]?.affinity ?? 0) > 5 || sim.rng.chance(0.4);
      state.topic = `apologize:${rt.accepted ? 'yes' : 'no'}`;
    }
    this.live.set(id, rt);
    sim.conversations.push(state);
    ra.conversation = id; rb.conversation = id;
    ra.lastConversationAt = sim.now; rb.lastConversationAt = sim.now;
    this.faceEachOther(a, b);
    sim.bus.emit({ type: 'conversation', state, phase: 'start' });
    // first turn immediately
    this.requestTurn(rt);
    return state;
  }

  private turnsFor(a: Villager, b: Villager, kind: string): number {
    const rng = this.sim.rng;
    const social = (a.personality.extraversion + b.personality.extraversion) / 2;
    const aff = ((a.relationships[b.id]?.affinity ?? 0) + (b.relationships[a.id]?.affinity ?? 0)) / 2;
    let n = 2 + Math.round(social * 2 + Math.max(0, aff) / 40 + rng.range(0, 1.5));
    if (kind === 'greet') n = 2;
    if (kind === 'argue') n = Math.max(3, n);
    return Math.max(2, Math.min(6, n));
  }

  private faceEachOther(a: Villager, b: Villager): void {
    const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y;
    if (Math.abs(dx) >= Math.abs(dy)) { a.facing = dx >= 0 ? 'right' : 'left'; b.facing = dx >= 0 ? 'left' : 'right'; }
    else { a.facing = dy >= 0 ? 'down' : 'up'; b.facing = dy >= 0 ? 'up' : 'down'; }
  }

  /** Advance every live conversation whose next turn is due. */
  tick(): void {
    const sim = this.sim;
    for (const q of this.async.splice(0)) if (this.live.has(q.conv.state.id)) this.applyTurn(q.conv, q.turn);
    for (const rt of [...this.live.values()]) {
      if (rt.pending) { if (sim.now - rt.nextTurnAt > 15) this.end(rt, 'timeout'); continue; }
      if (rt.state.done) continue;
      const [a, b] = rt.state.participants.map((id) => sim.villager(id as VillagerId));
      if (!a || !b) { this.end(rt, 'missing'); continue; }
      if (sim.isAsleep(a) || sim.isAsleep(b)) { this.end(rt, 'asleep'); continue; }
      if (sim.now >= rt.nextTurnAt) this.requestTurn(rt);
    }
  }

  private requestTurn(rt: ConvRuntime): void {
    const sim = this.sim;
    const idx = rt.state.turns.length;
    const speakerId = rt.state.participants[idx % 2] as VillagerId;
    const listenerId = rt.state.participants[(idx + 1) % 2] as VillagerId;
    const speaker = sim.villager(speakerId), listener = sim.villager(listenerId);
    if (!speaker || !listener) { this.end(rt, 'missing'); return; }
    const ctx: ConversationContext = {
      speaker, listener, listenerName: first(listener), history: rt.state.turns, relationship: speaker.relationships[listenerId] ?? null,
      relevant: retrieve(speaker, { about: [listenerId, ...(rt.detail && sim.villager(rt.detail) ? [rt.detail] : [])], text: rt.detail, tags: [rt.kind] }, 6, sim.now),
      topic: rt.state.topic, sim, world: sim.world,
    };
    const brain = this.brainFor(speaker) as SyncBrain;
    if (brain.converseSync) {
      let turn: ConversationTurn;
      try { turn = brain.converseSync(ctx); } catch (e) { turn = { speaker: speakerId, text: '...', end: true }; void e; }
      this.applyTurn(rt, turn);
      return;
    }
    rt.pending = true;
    rt.nextTurnAt = sim.now;
    brain.converse(ctx).then((turn) => { this.async.push({ conv: rt, turn }); }).catch(() => { this.async.push({ conv: rt, turn: { speaker: speakerId, text: 'Mm.', end: true } }); });
  }

  private applyTurn(rt: ConvRuntime, turn: ConversationTurn): void {
    const sim = this.sim;
    rt.pending = false;
    const idx = rt.state.turns.length;
    const speakerId = rt.state.participants[idx % 2] as VillagerId;
    const listenerId = rt.state.participants[(idx + 1) % 2] as VillagerId;
    const speaker = sim.villager(speakerId), listener = sim.villager(listenerId);
    if (!speaker || !listener) { this.end(rt, 'missing'); return; }
    turn.speaker = speakerId;
    rt.state.turns.push(turn);
    sim.say(speaker, turn.text, listenerId, turn.tone);
    if (turn.emote && turn.emote !== 'none') sim.emote(speaker, turn.emote);
    if (turn.remember) sim.remember(listener, { kind: 'conversation', text: turn.remember.text, importance: turn.remember.importance, tags: [...new Set([...turn.remember.tags, 'talk', 'social'])], about: [speakerId], place: rt.state.place });
    if (turn.affinityDelta) sim.adjustRelationship(listener, speakerId, { affinity: turn.affinityDelta, familiarity: 0.5 });
    // gossip lands on the first turn
    if (rt.gossip && idx === 0) {
      const copy = gossipCopy(rt.gossip, speakerId, first(speaker), sim.now);
      sim.remember(listener, copy);
      const subject = rt.gossip.about?.find((x) => x !== speakerId);
      if (subject) {
        const bad = rt.gossip.tags.includes('unpleasant') || rt.gossip.tags.includes('argued') || rt.gossip.tags.includes('drunk');
        const good = rt.gossip.tags.includes('pleasant') || rt.gossip.tags.includes('helped');
        if (bad) sim.adjustRelationship(listener, subject, { affinity: -1.5 });
        else if (good) sim.adjustRelationship(listener, subject, { affinity: 1 });
      }
      if (listener.personality.dislikes.includes('gossip')) sim.adjustRelationship(listener, speakerId, { affinity: -1.5 });
      if (speaker.personality.traits.includes('gossip')) speaker.needs.fun = Math.min(100, speaker.needs.fun + 5);
      sim.bus.emit({ type: 'memory', who: listenerId, memory: listener.memory[listener.memory.length - 1] });
    }
    sim.bus.emit({ type: 'conversation', state: rt.state, phase: 'turn' });
    rt.nextTurnAt = sim.now + TURN_GAP;
    if (turn.end || rt.state.turns.length >= rt.maxTurns) this.end(rt, 'done');
  }

  /** End a conversation, writing summary memories and the relationship outcome. */
  end(rt: ConvRuntime, reason: string): void {
    const sim = this.sim;
    if (!this.live.has(rt.state.id)) return;
    this.live.delete(rt.state.id);
    rt.state.done = true;
    const idx = sim.conversations.indexOf(rt.state);
    if (idx >= 0) sim.conversations.splice(idx, 1);
    const [a, b] = rt.state.participants.map((id) => sim.villager(id as VillagerId));
    const turns = rt.state.turns.length;
    if (a && b && turns > 0 && reason !== 'refused') this.outcome(rt, a, b);
    for (const v of [a, b]) {
      if (!v) continue;
      const r = sim.rt(v);
      r.conversation = null;
      v.stats.conversations = (v.stats.conversations ?? 0) + 1;
      this.onEnd(v);
    }
    sim.bus.emit({ type: 'conversation', state: rt.state, phase: 'end' });
  }

  private outcome(rt: ConvRuntime, a: Villager, b: Villager): void {
    const sim = this.sim;
    const kind = rt.kind;
    const detailName = rt.detail && sim.villager(rt.detail) ? first(sim.villager(rt.detail)!) : rt.detail;
    const place = rt.state.place;
    const turns = rt.state.turns.length;
    const lastTone = rt.state.turns[turns - 1]?.tone;
    const soured = rt.state.turns.filter((t) => t.tone === 'angry' || t.tone === 'cold').length >= 2;
    const both = [a, b] as const;
    const social = (v: Villager, n: number) => { v.needs.social = Math.min(100, v.needs.social + n * (0.6 + v.personality.extraversion * 0.8)); };
    let importance = 3;
    let tagsA: string[] = [kind, 'talk', 'social'];
    let textA = '', textB = '';
    let chronicle: { text: string; importance: number } | null = null;
    const topicWord = rt.detail && !sim.villager(rt.detail) ? rt.detail.split('|')[0] : '';
    switch (kind) {
      case 'chat': case 'ask': case 'visit': case 'event': case 'festival': case 'ask_about': {
        const what = kind === 'ask_about' && detailName ? `about ${detailName}` : topicWord ? `about ${topicWord}` : kind === 'visit' ? 'over a visit' : kind === 'festival' ? 'at the festival' : 'for a while';
        textA = `${first(a)} talked with ${first(b)} ${what}${soured ? '. It got tense' : turns >= 5 ? '. A proper talk' : ''}`;
        textB = `${first(b)} talked with ${first(a)} ${what}${soured ? '. It got tense' : turns >= 5 ? '. A proper talk' : ''}`;
        tagsA = ['chat', 'talk', 'social', soured ? 'unpleasant' : 'pleasant'];
        importance = soured ? 4 : turns >= 5 ? 3 : 2;
        this.applyBoth(a, b, soured ? 'tease' : 'chat');
        social(a, 10 + turns * 2); social(b, 10 + turns * 2);
        if (!soured) for (const v of both) v.needs.fun = Math.min(100, v.needs.fun + 4);
        break;
      }
      case 'gossip': {
        textA = `${first(a)} told ${first(b)} the news about ${detailName ?? 'someone'}`;
        textB = `${first(b)} heard the news about ${detailName ?? 'someone'} from ${first(a)}`;
        tagsA = ['gossip', 'talk', 'social'];
        importance = 3;
        this.applyBoth(a, b, 'gossip');
        social(a, 12); social(b, 10);
        a.needs.fun = Math.min(100, a.needs.fun + 6);
        if (rt.gossip && rt.gossip.importance >= 5) chronicle = { text: `${first(a)} told ${first(b)} that ${lowerFirst(rt.gossip.text).replace(/\.+$/, '')}.`, importance: 4 };
        break;
      }
      case 'compliment': {
        const flirty = rt.state.turns.some((t) => t.tone === 'flirty');
        textA = `${first(a)} complimented ${first(b)}${flirty ? ' and it came out flirtier than planned' : ''}`;
        textB = `${first(a)} paid ${first(b)} a compliment${flirty ? '. Was that flirting?' : ''}`;
        tagsA = ['compliment', 'talk', 'social', 'pleasant', ...(flirty ? ['flirt', 'romance'] : [])];
        importance = flirty ? 5 : 3;
        this.applyBoth(a, b, flirty ? 'flirt' : 'compliment');
        b.needs.fun = Math.min(100, b.needs.fun + 6); social(a, 8); social(b, 8);
        sim.rt(b).moodBoost = Math.min(1, sim.rt(b).moodBoost + 0.1);
        break;
      }
      case 'tease': {
        const took = (b.relationships[a.id]?.affinity ?? 0) > 10 || b.personality.agreeableness > 0.6 || b.personality.traits.includes('easy-going');
        textA = `${first(a)} teased ${first(b)}${took ? ' and they laughed' : ' and they did not find it funny'}`;
        textB = `${first(a)} teased ${first(b)}${took ? '. Fair enough' : '. Not funny'}`;
        tagsA = ['tease', 'talk', 'social', took ? 'pleasant' : 'unpleasant'];
        importance = took ? 2 : 4;
        if (took) { this.applyBoth(a, b, 'tease'); for (const v of both) v.needs.fun = Math.min(100, v.needs.fun + 6); }
        else { sim.adjustRelationship(b, a.id, { affinity: -3, familiarity: 1 }); sim.adjustRelationship(a, b.id, { affinity: -0.5, familiarity: 1 }); }
        social(a, 8); social(b, 6);
        break;
      }
      case 'argue': {
        textA = `${first(a)} argued with ${first(b)} about ${topicWord || 'everything'}`;
        textB = `${first(b)} argued with ${first(a)} about ${topicWord || 'everything'}`;
        tagsA = ['argued', 'talk', 'social', 'unpleasant'];
        importance = 6;
        this.applyBoth(a, b, 'argue');
        for (const v of both) { const r = sim.rt(v); if (v.personality.neuroticism > 0.35 || v.personality.traits.includes('proud')) { if (!v.status.includes('angry')) v.status.push('angry'); r.flagUntil.angry = sim.now + 120 + v.personality.neuroticism * 120; } r.moodBoost = Math.max(-1, r.moodBoost - 0.2); v.needs.social = Math.max(0, v.needs.social - 4); }
        chronicle = { text: `${first(a)} and ${first(b)} had a row about ${topicWord || 'everything'} at ${sim.placeName(place)}.`, importance: 5 };
        sim.bus.emit({ type: 'sfx', name: 'argue', pos: { ...a.pos } });
        break;
      }
      case 'apologize': {
        const ok = rt.accepted !== false;
        textA = ok ? `${first(a)} apologised to ${first(b)} and was forgiven` : `${first(a)} apologised to ${first(b)}, who was not ready to hear it`;
        textB = ok ? `${first(a)} apologised. ${first(b)} accepted` : `${first(a)} apologised. ${first(b)} was not ready to forgive`;
        tagsA = ['apology', 'talk', 'social', ok ? 'pleasant' : 'awkward'];
        importance = 5;
        if (ok) { this.applyBoth(a, b, 'apologize'); for (const v of both) { const i = v.status.indexOf('angry'); if (i >= 0) v.status.splice(i, 1); } }
        else { sim.adjustRelationship(a, b.id, { affinity: 1, trust: 1 }); sim.adjustRelationship(b, a.id, { affinity: 1.5, trust: 0.5 }); }
        chronicle = { text: ok ? `${first(a)} apologised to ${first(b)}. They are on speaking terms again.` : `${first(a)} tried to apologise to ${first(b)}. Too soon.`, importance: 4 };
        break;
      }
      case 'comfort': {
        textA = `${first(a)} sat with ${first(b)} through a rough patch`;
        textB = `${first(a)} was kind to ${first(b)} when it was needed`;
        tagsA = ['comfort', 'talk', 'social', 'pleasant', 'helped'];
        importance = 5;
        this.applyBoth(a, b, 'comfort');
        sim.rt(b).moodBoost = Math.min(1, sim.rt(b).moodBoost + 0.25);
        b.needs.comfort = Math.min(100, b.needs.comfort + 10); social(a, 8); social(b, 12);
        break;
      }
      case 'invite': {
        const [activity, placeId, hourStr] = rt.detail.split('|');
        const hour = Number(hourStr) || 20;
        const ok = rt.accepted !== false;
        const placeName = sim.placeName(placeId);
        textA = ok ? `${first(b)} agreed to ${activity} with ${first(a)} at ${placeName} at ${Math.floor(hour)}:00` : `${first(b)} turned down ${first(a)}'s invitation to ${activity}`;
        textB = ok ? `${first(b)} agreed to ${activity} with ${first(a)} at ${placeName} at ${Math.floor(hour)}:00` : `${first(b)} turned down ${first(a)}'s invitation to ${activity}`;
        tagsA = ['invite', 'talk', 'social', 'plan', ok ? 'pleasant' : 'awkward'];
        importance = ok ? 5 : 3;
        if (ok) {
          this.applyBoth(a, b, 'invite');
          const dayStart = (sim.world.time.dayIndex - 1) * 1440;
          let at = dayStart + hour * 60;
          if (at < sim.now + 30) at += 1440;
          const day = Math.floor(at / 1440) + 1;
          for (const [me, other] of [[a, b], [b, a]] as const) {
            if (!me.goals.some((g) => !g.done && g.text.startsWith(`meet ${other.id}`))) me.goals.push({ id: `meet_${other.id}_${at}`, text: `meet ${other.id} at ${placeId} at ${hour} on day ${day} for ${activity}`, priority: 7, createdAt: sim.now });
          }
          chronicle = { text: `${first(a)} and ${first(b)} are meeting for ${activity} at ${placeName}${day === sim.world.time.dayIndex ? ' tonight' : ' tomorrow'}.`, importance: 4 };
        } else { sim.adjustRelationship(a, b.id, { affinity: -1 }); sim.adjustRelationship(b, a.id, { familiarity: 1 }); }
        break;
      }
      default: {
        textA = `${first(a)} talked with ${first(b)}`; textB = `${first(b)} talked with ${first(a)}`;
        this.applyBoth(a, b, 'chat'); social(a, 8); social(b, 8);
      }
    }
    void lastTone;
    sim.remember(a, { kind: 'conversation', text: textA, importance, tags: tagsA, about: [b.id], place });
    sim.remember(b, { kind: 'conversation', text: textB, importance, tags: tagsA, about: [a.id], place });
    for (const v of both) { const r = v.relationships[v === a ? b.id : a.id]; if (r) r.lastTalked = sim.now; }
    if (chronicle) sim.log(chronicle.text, chronicle.importance, [a.id, b.id], place);
  }

  private applyBoth(a: Villager, b: Villager, interaction: string): void {
    this.sim.adjustRelationship(a, b.id, interactionDelta(interaction, a, b));
    this.sim.adjustRelationship(b, a.id, interactionDelta(interaction, b, a));
  }

  /** End the conversation a villager is in, if any. */
  leave(v: Villager, reason: string): void {
    const id = this.sim.rt(v).conversation;
    if (!id) return;
    const rt = this.live.get(id);
    if (rt) this.end(rt, reason);
    else this.sim.rt(v).conversation = null;
  }
}

export function splitTopic(topic: string): [string, string] {
  const i = topic.indexOf(':');
  if (i < 0) return [topic, ''];
  return [topic.slice(0, i), topic.slice(i + 1)];
}

const first = (v: Villager): string => v.name.split(' ')[0];
