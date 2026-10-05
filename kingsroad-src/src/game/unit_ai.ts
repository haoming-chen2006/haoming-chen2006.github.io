import { dexp } from '../engine/dmath.ts';
import { add, angleOf, dist, len, norm, scale, sub, type Vec } from '../engine/math.ts';
import { updateAbilityMotion } from './abilities.ts';
import { attackDamage, fireProjectile, heal, meleeHit, tickStatus } from './combat.ts';
import { inFountain, lanePoint, laneProgress, laneLength, clearLine, findPath } from './map.ts';
import { clampArena, resolveGround, resolveObstacles } from './terrain.ts';
import { NEUTRAL, type Entity, type Team, type Unit } from './types.ts';
import { attackSpeedMult, canTarget, frozen, speedMult, World } from './world.ts';

/** Per-tick bookkeeping for every unit, then AI for the ones nobody controls. */
export function updateUnits(w: World, dt: number): void {
  for (const u of w.units()) {
    tickStatus(w, u, dt);
    if (u.dead) continue;
    if (u.deployT > 0) { u.deployT -= dt; continue; }
    u.attackCd -= dt;
    for (let i = 0; i < u.skillCd.length; i++) if (u.skillCd[i] > 0) u.skillCd[i] -= dt;
    u.abilityCd = u.skillCd[0];
    if (u.dashCd > 0) u.dashCd -= dt;
    if (u.flashCd > 0) u.flashCd -= dt;
    if (u.buffT > 0) { u.buffT -= dt; if (u.buffT <= 0) { u.buffSpeed = 1; u.buffAttack = 1; } }
    if (u.isHero) regen(w, u, dt);
    if (u.vel.x !== 0 || u.vel.y !== 0) {
      u.pos = add(u.pos, scale(u.vel, dt));
      u.vel = scale(u.vel, dexp(-9 * dt));
      if (len(u.vel) < 0.05) u.vel = { x: 0, y: 0 };
    }
    if (updateAbilityMotion(w, u, dt)) continue;
    if (u.isHero) continue; // heroes are driven by hero.ts (player) or bot.ts
    if (frozen(u)) { u.charging = false; u.moveT = 0; continue; }
    if (u.def.kind === 'minion') minionStep(w, u, dt);
    else monsterStep(w, u, dt);
  }
  separate(w);
}

function regen(w: World, u: Unit, dt: number): void {
  const d = w.stats(u);
  const fountain = u.team !== NEUTRAL && inFountain(u.pos, u.team as Team);
  const hpr = fountain ? u.maxHp * 0.12 : d.hpRegen * (w.time - u.lastAttackT > 5 ? 1 : 0.5);
  if (u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + hpr * dt);
  const mpr = fountain ? u.maxMana * 0.15 : d.manaRegen;
  if (u.mana < u.maxMana) u.mana = Math.min(u.maxMana, u.mana + mpr * dt);
  if (u.shield > 0 && !fountain) u.shield = Math.max(0, u.shield - u.maxHp * 0.01 * dt);
}

/** Closest enemy a unit can reach/see, preferring the current target; minions prefer minions over heroes. */
export function acquireTarget(w: World, u: Unit, sight = u.def.sight): Entity | undefined {
  const cur = w.get(u.targetId);
  if (cur && canTarget(u.def.targets, cur) && dist(u.pos, cur.pos) - cur.radius <= sight + 1 && w.canSee(u.team, cur, u.pos) && !(cur.kind === 'tower' && !cur.active)) return cur;
  let best: Entity | undefined, bd = Infinity;
  for (const e of w.enemiesOf(u.team)) {
    if (!canTarget(u.def.targets, e)) continue;
    if (e.kind === 'unit' && (e.deployT > 0 || (e.team === NEUTRAL && u.def.kind === 'minion') || e.status.invulnT > 0)) continue;
    if (e.kind === 'tower' && (!e.active || u.def.kind === 'monster')) continue;
    if (e.kind === 'unit' && e.def.kind === 'monster' && u.def.kind === 'monster') continue;
    if (!w.canSee(u.team, e, u.pos)) continue;
    let d = dist(u.pos, e.pos) - e.radius;
    if (d > sight) continue;
    // minions prefer minions, then heroes, then towers
    if (u.def.kind === 'minion') { if (e.kind === 'unit' && e.isHero) d += 2.5; if (e.kind === 'tower') d += 4; }
    if (d < bd) { bd = d; best = e; }
  }
  u.targetId = best ? best.id : -1;
  return best;
}

export function performAttack(w: World, u: Unit, target: Entity): void {
  const d = w.stats(u);
  u.attackCd = d.hitSpeed / attackSpeedMult(u);
  u.attackAnim = 1;
  u.lastAttackT = w.time;
  const { dmg, crit } = attackDamage(w, u);
  if (u.def.projectile) {
    const lob = u.def.projectile === 'bomb' || u.def.projectile === 'rock';
    fireProjectile(w, {
      team: u.team, from: { x: u.pos.x, y: u.pos.y }, style: u.def.projectile, speed: u.def.projectileSpeed ?? 9, damage: dmg, type: u.def.attackType, sourceId: u.id,
      targetId: target.id, mode: lob ? 'lob' : 'homing', lobTo: target.pos, splash: u.def.splash, splashAir: true, hero: u.isHero, radius: crit ? 0.3 : 0.2,
    });
    w.emit({ type: 'ranged', pos: u.pos, style: u.def.projectile, hero: u.isHero });
  } else meleeHit(w, u, target, dmg, { crit });
}

function minionStep(w: World, u: Unit, dt: number): void {
  const target = acquireTarget(w, u);
  if (target) {
    const d = dist(u.pos, target.pos) - target.radius;
    if (d <= u.def.range) {
      u.facing = angleOf(sub(target.pos, u.pos));
      if (u.attackCd <= 0) performAttack(w, u, target);
      return;
    }
    if (d <= u.def.sight) { moveToward(w, u, target.pos, dt); return; }
  }
  // follow the lane
  const path = w.laneFor(u.team as Team, u.lane);
  const prog = laneProgress(path, u.pos);
  u.laneIndex = Math.max(u.laneIndex, prog);
  let next = Math.min(path.length - 1, u.laneIndex + 0.35);
  let wp = lanePoint(path, next);
  // at the end of the lane, head for the crystal
  if (next >= path.length - 1 - 1e-6) wp = w.crystalPos(u.team === 0 ? 1 : 0);
  if (dist(wp, u.pos) < 0.4 && next < path.length - 1) { u.laneIndex = next; next = Math.min(path.length - 1, u.laneIndex + 0.35); wp = lanePoint(path, next); }
  moveToward(w, u, wp, dt, false);
}

function monsterStep(w: World, u: Unit, dt: number): void {
  const m = u.def.monster!;
  const home = u.home ?? u.pos;
  // leash: go home and heal when dragged too far or when nobody fights it
  const farFromHome = dist(u.pos, home) > m.leash;
  if (farFromHome || u.leashT > 0) {
    u.leashT = farFromHome ? 2 : Math.max(0, u.leashT - dt);
    u.targetId = -1;
    if (dist(u.pos, home) > 0.3) { moveToward(w, u, home, dt); heal(w, u, u.maxHp * 0.25 * dt, true); }
    else { u.leashT = 0; if (u.hp < u.maxHp) heal(w, u, u.maxHp * 0.5 * dt, true); }
    return;
  }
  // only retaliate: monsters attack whoever attacked them (or allies nearby), within sight
  let target: Entity | undefined;
  const cur = w.get(u.targetId);
  if (cur && !cur.dead && dist(cur.pos, u.pos) < m.leash + 2) target = cur;
  else {
    // pick the closest recent attacker
    let bd = Infinity;
    for (const r of u.lastHurtBy) {
      const e = w.get(r.id);
      if (!e || w.time - r.t > 4) continue;
      const d = dist(e.pos, u.pos);
      if (d < bd) { bd = d; target = e; }
    }
    if (!target) {
      // camp mates share aggro
      for (const a of w.units(NEUTRAL)) {
        if (a.camp !== u.camp || a === u) continue;
        const t = w.get(a.targetId);
        if (t && dist(t.pos, u.pos) < m.leash) { target = t; break; }
      }
    }
    u.targetId = target ? target.id : -1;
  }
  if (!target) { if (dist(u.pos, home) > 0.5) moveToward(w, u, home, dt); else if (u.hp < u.maxHp && w.time - u.lastAttackT > 6) heal(w, u, u.maxHp * 0.3 * dt, true); return; }
  const d = dist(u.pos, target.pos) - target.radius;
  u.facing = angleOf(sub(target.pos, u.pos));
  if (d <= u.def.range) { if (u.attackCd <= 0) performAttack(w, u, target); }
  else moveToward(w, u, target.pos, dt);
}

export function moveToward(w: World, u: Unit, dest: Vec, dt: number, pathfind = true): void {
  let wp = dest;
  if (pathfind && !u.flying && !clearLine(u.pos, dest, u.radius)) {
    u.pathT -= dt;
    if (!u.path.length || u.pathT <= 0 || dist(u.path[u.path.length - 1], dest) > 1.5) { u.path = findPath(u.pos, dest, u.radius); u.pathT = 0.6; }
    while (u.path.length > 1 && dist(u.pos, u.path[0]) < 0.35) u.path.shift();
    wp = u.path[0] ?? dest;
  }
  const dir = norm(sub(wp, u.pos));
  if (dir.x === 0 && dir.y === 0) return;
  const spd = w.stats(u).speed * speedMult(u);
  u.pos = add(u.pos, scale(dir, spd * dt));
  u.facing = angleOf(dir);
  u.moveT += dt;
}

/** Soft collision between units plus terrain/obstacle resolution. */
function separate(w: World): void {
  const units = [...w.units()];
  for (let i = 0; i < units.length; i++) {
    const a = units[i];
    if (a.dashVel) continue;
    for (let j = i + 1; j < units.length; j++) {
      const b = units[j];
      if (b.dashVel || a.flying !== b.flying) continue;
      const minD = a.radius + b.radius;
      const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y;
      if (Math.abs(dx) > minD || Math.abs(dy) > minD) continue;
      const d2 = dx * dx + dy * dy;
      if (d2 >= minD * minD || d2 === 0) {
        if (d2 === 0) { a.pos.x -= 0.01; b.pos.x += 0.01; }
        continue;
      }
      const d = Math.sqrt(d2);
      const push = (minD - d) * 0.5 * 0.7;
      const nx = dx / d, ny = dy / d;
      const wa = a.isHero ? 0.4 : b.isHero ? 1.6 : 1;
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
    if (!u.possessed && u.deployT <= 0 && u.attackCd < 0 && u.targetId === -1 && u.def.kind === 'minion') {
      if (dist(u.pos, u.lastPos) < 0.01) u.stuckT += 1 / 60; else u.stuckT = 0;
      if (u.stuckT > 1.0) { u.pos.x += (w.rng.next() - 0.5) * 0.6; u.pos.y += (w.rng.next() - 0.5) * 0.6; u.stuckT = 0; }
    }
    u.lastPos = { ...u.pos };
  }
}

/** Total path length of a lane; used by bots to judge how far a wave has pushed. */
export const laneTotal = (path: Vec[]): number => laneLength(path);
