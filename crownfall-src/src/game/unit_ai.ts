import { add, angleOf, dist, len, norm, scale, sub, type Vec } from '../engine/math.ts';
import { updateAbilityMotion } from './abilities.ts';
import { fireProjectile, heal, meleeHit, tickStatus } from './combat.ts';
import { clampArena, nextWaypoint, pathDistance, resolveGround, resolveObstacles } from './terrain.ts';
import type { Entity, Unit } from './types.ts';
import { attackSpeedMult, canTarget, frozen, speedMult, World } from './world.ts';

export function updateUnits(w: World, dt: number): void {
  for (const u of w.units()) {
    tickStatus(w, u, dt);
    if (u.dead) continue;
    if (u.deployT > 0) { u.deployT -= dt; continue; }
    u.attackCd -= dt;
    if (u.abilityCd > 0) u.abilityCd -= dt;
    if (u.dashCd > 0) u.dashCd -= dt;
    if (u.buffT > 0) { u.buffT -= dt; if (u.buffT <= 0) { u.buffSpeed = 1; u.buffAttack = 1; } }
    if (u.vel.x !== 0 || u.vel.y !== 0) {
      u.pos = add(u.pos, scale(u.vel, dt));
      u.vel = scale(u.vel, Math.exp(-9 * dt));
      if (len(u.vel) < 0.05) u.vel = { x: 0, y: 0 };
    }
    if (u.def.healAura) healAura(w, u, dt);
    if (updateAbilityMotion(w, u, dt)) continue;
    if (u.possessed) continue;
    if (frozen(u)) { u.charging = false; u.moveT = 0; continue; }
    aiStep(w, u, dt);
  }
  separate(w);
}

function healAura(w: World, u: Unit, dt: number): void {
  const aura = u.def.healAura!;
  for (const a of w.alliesOf(u.team)) {
    if (a.kind !== 'unit' || a === u || a.hp >= a.maxHp) continue;
    if (dist(a.pos, u.pos) <= aura.radius) {
      heal(w, a, aura.hps * dt);
      if (w.rng.chance(dt * 2)) w.addEffect({ type: 'heal', pos: { x: a.pos.x + (w.rng.next() - 0.5) * 0.5, y: a.pos.y }, dur: 0.6, radius: 0.15, color: '#9dffb0', vel: { x: 0, y: -1 } });
    }
  }
}

function reachDist(u: Unit, e: Entity): number {
  const straight = dist(u.pos, e.pos) - e.radius;
  if (u.flying || straight <= u.def.range) return straight;
  return pathDistance(u.pos, e.pos, false) - e.radius;
}

export function acquireTarget(w: World, u: Unit): Entity | undefined {
  const tg = u.def.targets;
  const cur = w.get(u.targetId);
  if (cur && canTarget(tg, cur) && !(cur.kind === 'unit' && cur.deployT > 0)) {
    if (tg === 'buildings' || reachDist(u, cur) <= u.def.sight + 1.0) return cur;
  }
  let best: Entity | undefined;
  let bd = Infinity;
  if (tg === 'buildings') {
    for (const e of w.enemiesOf(u.team)) {
      if (e.kind === 'unit') continue;
      const d = pathDistance(u.pos, e.pos, u.flying);
      if (d < bd) { bd = d; best = e; }
    }
  } else {
    for (const e of w.enemiesOf(u.team)) {
      if (!canTarget(tg, e)) continue;
      if (e.kind === 'unit' && e.deployT > 0) continue;
      const d = reachDist(u, e);
      if (d <= u.def.sight && d < bd) { bd = d; best = e; }
    }
  }
  if (best) {
    if (best.id !== u.targetId) { u.targetId = best.id; u.attackCd = Math.max(u.attackCd, u.def.loadTime); }
  } else u.targetId = -1;
  return best;
}

export function nearestEnemyStructure(w: World, u: Unit): Entity | undefined {
  let best: Entity | undefined, bd = Infinity;
  for (const e of w.enemiesOf(u.team)) {
    if (e.kind === 'unit') continue;
    const d = pathDistance(u.pos, e.pos, u.flying);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function aiStep(w: World, u: Unit, dt: number): void {
  const target = acquireTarget(w, u);
  if (target) {
    const d = dist(u.pos, target.pos) - target.radius;
    if (d <= u.def.range) {
      u.facing = angleOf(sub(target.pos, u.pos));
      u.moveT = 0;
      if (u.attackCd <= 0) performAttack(w, u, target);
    } else moveToward(w, u, target.pos, dt);
  } else {
    const s = nearestEnemyStructure(w, u);
    if (s) moveToward(w, u, s.pos, dt);
  }
}

export function performAttack(w: World, u: Unit, target: Entity): void {
  u.attackCd = u.def.hitSpeed / attackSpeedMult(u);
  u.attackAnim = 1;
  let dmg = u.def.damage * u.critNext;
  const crit = u.critNext > 1;
  u.critNext = 1;
  if (u.charging && u.def.charge) { dmg *= u.def.charge.dmgMult; u.charging = false; u.moveT = 0; w.addEffect({ type: 'shockwave', pos: { ...target.pos }, dur: 0.3, radius: 1.0, color: '#ffe680' }); }
  if (u.def.projectile) {
    const lob = u.def.projectile === 'bomb';
    fireProjectile(w, {
      team: u.team, from: { x: u.pos.x, y: u.pos.y - u.radius * 0.5 }, style: u.def.projectile, speed: u.def.projectileSpeed ?? 9, damage: dmg, sourceId: u.id,
      targetId: target.id, mode: lob ? 'lob' : 'homing', lobTo: target.pos, splash: u.def.splash, splashAir: u.def.splashAir,
      hitsAir: u.def.targets !== 'ground', hitsGround: u.def.targets !== 'air', chain: u.def.chain, hero: u.possessed,
    });
    w.emit({ type: 'ranged', pos: u.pos, style: u.def.projectile });
  } else meleeHit(w, u, target, dmg, { crit });
}

export function moveToward(w: World, u: Unit, dest: Vec, dt: number): void {
  const wp = nextWaypoint(u.pos, dest, u.flying, u.radius);
  const dir = norm(sub(wp, u.pos));
  if (dir.x === 0 && dir.y === 0) return;
  const spd = u.def.speed * speedMult(u);
  u.pos = add(u.pos, scale(dir, spd * dt));
  u.facing = angleOf(dir);
  u.moveT += dt;
  if (u.def.charge && !u.charging && u.moveT >= u.def.charge.delay) {
    u.charging = true;
    w.addEffect({ type: 'ring', pos: { ...u.pos }, dur: 0.4, radius: 0.9, color: '#ffe680' });
  }
}

/** Soft collision between units plus terrain/obstacle resolution. */
function separate(w: World): void {
  const units = [...w.units()];
  for (let i = 0; i < units.length; i++) {
    const a = units[i];
    for (let j = i + 1; j < units.length; j++) {
      const b = units[j];
      if (a.flying !== b.flying) continue;
      const minD = a.radius + b.radius;
      const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y;
      const d2 = dx * dx + dy * dy;
      if (d2 >= minD * minD || d2 === 0) {
        if (d2 === 0) { a.pos.x -= 0.01; b.pos.x += 0.01; }
        continue;
      }
      const d = Math.sqrt(d2);
      const push = (minD - d) * 0.5 * 0.7;
      const nx = dx / d, ny = dy / d;
      // heroes shove harder than they get shoved
      const wa = a.possessed ? 0.3 : b.possessed ? 1.7 : 1;
      const wb = 2 - wa;
      a.pos.x -= nx * push * wa; a.pos.y -= ny * push * wa;
      b.pos.x += nx * push * wb; b.pos.y += ny * push * wb;
    }
  }
  for (const u of units) {
    if (u.flying) u.pos = clampArena(u.pos, u.radius);
    else {
      u.pos = resolveObstacles(u.pos, u.radius, w.alive(), u);
      u.pos = resolveGround(u.pos, u.radius);
    }
    // stuck detection: nudge sideways if a moving unit hasn't made progress
    if (!u.possessed && u.deployT <= 0 && u.attackCd < 0 && u.targetId === -1) {
      if (dist(u.pos, u.lastPos) < 0.01) u.stuckT += 1 / 60; else u.stuckT = 0;
      if (u.stuckT > 1.0) { u.pos.x += (w.rng.next() - 0.5) * 0.6; u.stuckT = 0; }
    }
    u.lastPos = { ...u.pos };
  }
}
