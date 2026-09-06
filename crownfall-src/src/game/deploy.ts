import { dist, fromAngle, add, type Vec } from '../engine/math.ts';
import { areaDamage } from './combat.ts';
import { ARENA_H, ARENA_W, POSSESS, RIVER_BOT, RIVER_TOP } from './constants.ts';
import { inWater, resolveGround } from './terrain.ts';
import { other, type CardDef, type Team } from './types.ts';
import { World, type PendingSpell } from './world.ts';

export interface DeployCheck { ok: boolean; reason?: string; nearHero?: boolean }

/** Own half, plus the enemy half-lanes whose princess tower has fallen. */
export function deployZoneAllowed(w: World, team: Team, pos: Vec): boolean {
  const ownSide = team === 0 ? pos.y >= RIVER_BOT + 0.3 : pos.y <= RIVER_TOP - 0.3;
  if (ownSide) return true;
  const enemyHalf = team === 0 ? pos.y <= RIVER_TOP - 0.3 && pos.y >= 5.0 : pos.y >= RIVER_BOT + 0.3 && pos.y <= ARENA_H - 5.0;
  if (!enemyHalf) return false;
  const left = pos.x < ARENA_W / 2;
  const alive = w.towers(other(team)).some((t) => t.towerType === 'princess' && (t.pos.x < ARENA_W / 2) === left);
  return !alive;
}

export function canDeploy(w: World, team: Team, card: CardDef, pos: Vec): DeployCheck {
  const p = w.players[team];
  if (w.phase === 'countdown') return { ok: false, reason: 'Get ready!' };
  if (p.elixir < card.cost - 1e-6) return { ok: false, reason: 'Not enough elixir' };
  if (pos.x < 0 || pos.x > ARENA_W || pos.y < 0 || pos.y > ARENA_H) return { ok: false, reason: 'Outside the arena' };
  if (card.kind === 'spell') return { ok: true };
  const r = card.radius;
  if (inWater(pos, r * 0.5)) return { ok: false, reason: 'Cannot deploy in water' };
  for (const e of w.alive()) {
    if (e.kind === 'unit') continue;
    if (dist(pos, e.pos) < e.radius + r + 0.15) return { ok: false, reason: 'Blocked by a building' };
  }
  const hero = w.hero(team);
  const nearHero = !!hero && dist(pos, hero.pos) <= POSSESS.summonRadius;
  if (!nearHero && !deployZoneAllowed(w, team, pos)) return { ok: false, reason: 'Outside your territory' };
  return { ok: true, nearHero };
}

/** Spread `n` spawn positions around a point. */
export function formation(pos: Vec, n: number, radius: number): Vec[] {
  if (n === 1) return [{ ...pos }];
  const gap = radius * 2 + 0.12;
  if (n === 2) return [{ x: pos.x - gap / 2, y: pos.y }, { x: pos.x + gap / 2, y: pos.y }];
  if (n === 3) return [{ x: pos.x, y: pos.y - gap * 0.55 }, { x: pos.x - gap / 2, y: pos.y + gap * 0.45 }, { x: pos.x + gap / 2, y: pos.y + gap * 0.45 }];
  const out: Vec[] = [];
  let remaining = n, ring = 0;
  if (n > 8) { out.push({ ...pos }); remaining--; }
  while (remaining > 0) {
    ring++;
    const count = Math.min(remaining, ring * 6);
    const rr = ring * gap * 0.95;
    for (let i = 0; i < count; i++) out.push(add(pos, fromAngle((i / count) * Math.PI * 2 + ring * 0.4, rr)));
    remaining -= count;
  }
  return out;
}

/** Try to play the card at `handIndex`. Returns false (and emits an 'invalid' event) if not allowed. */
export function deployCard(w: World, team: Team, handIndex: number, pos: Vec): boolean {
  const p = w.players[team];
  const card = p.hand[handIndex];
  if (!card) return false;
  const check = canDeploy(w, team, card, pos);
  if (!check.ok) { w.emit({ type: 'invalid', text: check.reason, team, pos }); return false; }
  p.elixir -= card.cost;
  p.stats.elixirSpent += card.cost;
  p.stats.unitsDeployed += 1;
  w.cycleCard(p, handIndex);
  placeCard(w, team, card, pos);
  return true;
}

export function placeCard(w: World, team: Team, card: CardDef, pos: Vec): void {
  const p = w.players[team];
  if (card.kind === 'spell') {
    w.pendingSpells.push({ def: card, team, pos: { ...pos }, t: card.delay });
    w.addEffect({ type: 'ring', pos: { ...pos }, dur: card.delay + 0.1, radius: card.radius, color: card.look.color });
    if (card.effect === 'meteor') w.addEffect({ type: 'meteor', pos: { ...pos }, dur: card.delay, radius: card.radius, color: card.look.color });
    w.emit({ type: 'spell', card, pos, team });
    return;
  }
  if (card.kind === 'building') {
    const b = w.spawnBuilding(card, team, pos);
    p.lastDeployId = b.id;
    w.addEffect({ type: 'spawn', pos: { ...pos }, dur: 0.5, radius: card.radius + 0.4, color: card.look.color });
    w.emit({ type: 'deploy', card, pos, team });
    return;
  }
  const spots = formation(pos, card.count, card.radius);
  let first = -1;
  for (const s of spots) {
    const sp = card.flying ? s : resolveGround(s, card.radius);
    const u = w.spawnUnit(card, team, sp);
    if (first < 0) first = u.id;
    w.addEffect({ type: 'spawn', pos: { ...sp }, dur: 0.5, radius: card.radius + 0.3, color: card.look.color });
  }
  p.lastDeployId = first;
  w.emit({ type: 'deploy', card, pos, team });
}

export function resolvePendingSpells(w: World, dt: number): void {
  if (w.pendingSpells.length === 0) return;
  const keep: PendingSpell[] = [];
  for (const s of w.pendingSpells) {
    s.t -= dt;
    if (s.t <= 0) castSpell(w, s); else keep.push(s);
  }
  w.pendingSpells = keep;
}

function castSpell(w: World, s: PendingSpell): void {
  const d = s.def;
  const base = { towerMult: d.towerMult, hitsAir: d.hitsAir, from: s.pos };
  switch (d.effect) {
    case 'meteor':
      areaDamage(w, s.team, s.pos, d.radius, d.damage, { ...base, knockback: d.knockback });
      w.addEffect({ type: 'burst', pos: { ...s.pos }, dur: 0.6, radius: d.radius, color: d.look.color });
      w.addEffect({ type: 'shockwave', pos: { ...s.pos }, dur: 0.5, radius: d.radius + 0.5, color: d.look.accent });
      w.addEffect({ type: 'crater', pos: { ...s.pos }, dur: 8, radius: d.radius * 0.6, color: '#4a3a2a' });
      w.addEffect({ type: 'smoke', pos: { ...s.pos }, dur: 1.5, radius: d.radius * 0.8, color: '#555' });
      break;
    case 'volley':
      areaDamage(w, s.team, s.pos, d.radius, d.damage, base);
      w.addEffect({ type: 'volley', pos: { ...s.pos }, dur: 0.6, radius: d.radius, color: d.look.color });
      break;
    case 'shock':
      areaDamage(w, s.team, s.pos, d.radius, d.damage, { ...base, stun: d.stun });
      w.addEffect({ type: 'burst', pos: { ...s.pos }, dur: 0.3, radius: d.radius, color: d.look.color });
      for (let i = 0; i < 5; i++) w.addEffect({ type: 'lightning', pos: { x: s.pos.x + (w.rng.next() - 0.5) * d.radius * 2, y: s.pos.y - 3 }, to: { x: s.pos.x + (w.rng.next() - 0.5) * d.radius * 2, y: s.pos.y + (w.rng.next() - 0.5) * d.radius }, dur: 0.25, radius: 0.1, color: '#e8fbff' });
      break;
    case 'frost': {
      const hits = areaDamage(w, s.team, s.pos, d.radius, d.damage, base);
      for (const e of hits) e.status.freeze = Math.max(e.status.freeze, d.freeze ?? 0);
      w.addEffect({ type: 'frost', pos: { ...s.pos }, dur: d.freeze ?? 3, radius: d.radius, color: d.look.color });
      break;
    }
    case 'frenzy':
      if (d.rage) w.zones.push({ kind: 'frenzy', pos: { ...s.pos }, radius: d.radius, t: d.rage.duration, team: s.team, speed: d.rage.speed, attack: d.rage.attack });
      w.addEffect({ type: 'ring', pos: { ...s.pos }, dur: 0.6, radius: d.radius, color: d.look.color });
      break;
  }
  w.emit({ type: 'spell', card: d, pos: s.pos, team: s.team, big: d.effect === 'meteor' });
}

export function updateZones(w: World, dt: number): void {
  if (w.zones.length === 0) return;
  for (const z of w.zones) {
    z.t -= dt;
    for (const e of w.alliesOf(z.team)) {
      if (dist(e.pos, z.pos) <= z.radius + e.radius) {
        e.status.rage = Math.max(e.status.rage, 0.5);
        e.status.rageSpeed = z.speed;
        e.status.rageAttack = z.attack;
      }
    }
  }
  w.zones = w.zones.filter((z) => z.t > 0);
}
