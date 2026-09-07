/**
 * Relationship dynamics: affinity/trust/romance/familiarity, labels at thresholds, compatibility from
 * personality and likes, event-driven deltas.
 */
import { clamp } from '../core/index.ts';
import { item } from '../core/items.ts';
import type { ItemId, RelationLabel, Relationship, Villager, VillagerId } from '../core/types.ts';

export function newRelationship(affinity = 0): Relationship {
  return { affinity, trust: 20 + Math.max(0, affinity) * 0.5, romance: 0, familiarity: Math.max(5, Math.abs(affinity) * 0.6), label: 'stranger', notes: [], lastTalked: -9999 };
}

export function relationOf(v: Villager, other: VillagerId | 'player'): Relationship {
  let r = v.relationships[other];
  if (!r) { r = newRelationship(0); v.relationships[other] = r; }
  return r;
}

/** Labels, evaluated in priority order. Romance and rivalry override friendship. */
export function labelFor(r: Relationship, current: RelationLabel): RelationLabel {
  if (current === 'family' || current === 'partner') return current;
  if (r.romance >= 65 && r.affinity >= 50) return 'crush';
  if (r.affinity <= -30) return 'rival';
  if (r.romance >= 40 && r.affinity >= 30) return 'crush';
  if (r.affinity >= 60 && r.familiarity >= 40) return 'close friend';
  if (r.affinity >= 25 && r.familiarity >= 15) return 'friend';
  if (r.familiarity >= 8 || r.affinity > 10 || r.affinity < -10) return 'acquaintance';
  return 'stranger';
}

/** How naturally two villagers get on: personality distance + shared likes − clashes. −1..1 */
export function compatibility(a: Villager, b: Villager): number {
  const pa = a.personality, pb = b.personality;
  let c = 0;
  c += 0.25 * (pa.agreeableness + pb.agreeableness - 1);
  c -= 0.3 * Math.abs(pa.openness - pb.openness);
  c -= 0.15 * Math.abs(pa.extraversion - pb.extraversion);
  c -= 0.2 * ((pa.neuroticism + pb.neuroticism) / 2 - 0.5);
  const shared = pa.likes.filter((l) => pb.likes.includes(l)).length;
  c += 0.12 * Math.min(3, shared);
  const clash = pa.likes.filter((l) => pb.dislikes.includes(l)).length + pb.likes.filter((l) => pa.dislikes.includes(l)).length;
  c -= 0.1 * Math.min(3, clash);
  // traits others dislike
  if (pb.dislikes.includes('gossip') && pa.traits.includes('gossip')) c -= 0.15;
  if (pa.dislikes.includes('gossip') && pb.traits.includes('gossip')) c -= 0.15;
  if (pb.dislikes.includes('loud') && pa.traits.includes('loud')) c -= 0.15;
  if (pa.dislikes.includes('loud') && pb.traits.includes('loud')) c -= 0.15;
  if (pb.dislikes.includes('laziness') && pa.traits.includes('lazy')) c -= 0.15;
  if (pa.dislikes.includes('laziness') && pb.traits.includes('lazy')) c -= 0.15;
  if (pb.dislikes.includes('nosy') && pa.traits.includes('nosy')) c -= 0.15;
  if (pa.dislikes.includes('nosy') && pb.traits.includes('nosy')) c -= 0.15;
  return clamp(c, -1, 1);
}

/** How much a villager would like a gift: -1 (hates) .. 1 (loves). */
export function giftAppeal(v: Villager, id: ItemId): number {
  const def = item(id);
  const p = v.personality;
  let s = 0;
  for (const t of def.tags) { if (p.likes.includes(t)) s += 0.5; if (p.dislikes.includes(t)) s -= 0.6; }
  if (p.likes.includes(def.id)) s += 0.7;
  if (p.dislikes.includes(def.id)) s -= 0.7;
  if (def.kind === 'gift') s += 0.2;
  if (def.price >= 60) s += 0.15;
  if (def.kind === 'material' && s === 0) s -= 0.15;
  if (def.kind === 'seed' && s === 0) s -= 0.2;
  return clamp(s, -1, 1);
}

export interface RelDelta { affinity?: number; trust?: number; romance?: number; familiarity?: number }

/** Deltas for standard interactions; compatibility and mood soften or sharpen them. */
export function interactionDelta(kind: string, a: Villager, b: Villager | null, extra: { appeal?: number; mood?: number } = {}): RelDelta {
  const comp = b ? compatibility(a, b) : 0;
  const mood = extra.mood ?? a.mood;
  const warm = 1 + comp * 0.5 + mood * 0.3;
  switch (kind) {
    case 'chat': return { affinity: 0.9 * warm, familiarity: 3, trust: 0.5 };
    case 'greet': return { affinity: 0.25 * warm, familiarity: 0.8 };
    case 'gossip': return { affinity: 0.7 * warm, familiarity: 2.5, trust: 0.8 };
    case 'story': return { affinity: 2 * warm, familiarity: 2.5, trust: 0.4 };
    case 'compliment': return { affinity: 2 * warm, familiarity: 1.5, romance: 1.5 };
    case 'tease': return { affinity: comp > 0 ? 1.5 : -2, familiarity: 2, romance: comp > 0.2 ? 1 : 0 };
    case 'argue': return { affinity: -6 - Math.max(0, -comp) * 3, trust: -3, familiarity: 2 };
    case 'apologize': return { affinity: 4, trust: 4, familiarity: 1 };
    case 'comfort': return { affinity: 4 * warm, trust: 4, familiarity: 2, romance: 1 };
    case 'hug': return { affinity: 3, trust: 2, familiarity: 2, romance: 2 };
    case 'dance': return { affinity: 3, familiarity: 3, romance: 3 };
    case 'flirt': return { affinity: 1.5, romance: 4 * warm, familiarity: 2 };
    case 'gift': { const ap = extra.appeal ?? 0; return ap < -0.2 ? { affinity: -5, familiarity: 1 } : { affinity: 4 + ap * 11, trust: 2 + ap * 3, familiarity: 2, romance: ap > 0.3 ? 2 + ap * 3 : 0.5 }; }
    case 'help': return { affinity: 6, trust: 6, familiarity: 3 };
    case 'promise_kept': return { affinity: 4, trust: 8, familiarity: 1 };
    case 'promise_broken': return { affinity: -4, trust: -10 };
    case 'invite': return { affinity: 2, familiarity: 2, romance: 0.5 };
    case 'together': return { affinity: 1, familiarity: 2 };
    case 'trade': return { affinity: 1, trust: 2, familiarity: 1.5 };
    case 'insult': return { affinity: -8, trust: -4 };
    case 'refused': return { affinity: -2, familiarity: 0.5 };
    case 'proposal_yes': return { affinity: 20, trust: 15, romance: 30, familiarity: 10 };
    case 'proposal_no': return { affinity: -5, romance: -20, trust: -3 };
    case 'treated': return { affinity: 5, trust: 6, familiarity: 2 };
    case 'taught': return { affinity: 3, trust: 3, familiarity: 3 };
    default: return { affinity: 0.5, familiarity: 1 };
  }
}

/** Applies a delta with the dynamics: romance needs familiarity and mutual affinity; trust is slow. */
export function applyDelta(r: Relationship, d: RelDelta, other?: Relationship | null): { affinityChange: number; before: RelationLabel; after: RelationLabel } {
  const before = r.label;
  const a0 = r.affinity;
  if (d.affinity) r.affinity = clamp(r.affinity + d.affinity * (d.affinity > 0 && r.affinity > 60 ? 0.6 : 1), -100, 100);
  if (d.trust) r.trust = clamp(r.trust + d.trust * 0.8, 0, 100);
  if (d.familiarity) r.familiarity = clamp(r.familiarity + d.familiarity, 0, 100);
  if (d.romance) {
    // romance grows only with familiarity, positive affinity and (when known) the other's warmth
    const gate = r.familiarity < 10 ? 0.15 : r.affinity < 10 ? 0.2 : Math.min(1, r.familiarity / 70);
    const mutual = other ? (other.affinity > 20 ? 1 : 0.5) : 0.8;
    const dr = d.romance > 0 ? d.romance * gate * mutual * 0.45 : d.romance;
    r.romance = clamp(r.romance + dr, 0, 100);
  }
  r.label = labelFor(r, r.label);
  return { affinityChange: r.affinity - a0, before, after: r.label };
}

/** Slow daily drift: affinity towards its "natural" value, romance fades without contact. */
export function dailyDrift(r: Relationship, daysSinceTalk: number): void {
  if (daysSinceTalk > 3) {
    r.familiarity = Math.max(0, r.familiarity - 0.5);
    if (r.romance > 0 && r.label !== 'partner') r.romance = Math.max(0, r.romance - 1.5);
  }
  if (r.affinity > 0) r.affinity -= 0.6; else if (r.affinity < 0) r.affinity += 0.4; // grudges soften a little faster than warmth fades
  r.label = labelFor(r, r.label);
}

export const LABEL_ORDER: RelationLabel[] = ['rival', 'stranger', 'acquaintance', 'friend', 'close friend', 'crush', 'partner', 'family'];
