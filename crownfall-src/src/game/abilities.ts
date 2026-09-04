import { add, angleDiff, angleOf, dist, fromAngle, norm, scale, sub, type Vec } from '../engine/math.ts';
import { troopById } from './cards.ts';
import { areaDamage, damage, fireProjectile, heal } from './combat.ts';
import { clampArena, inWater, resolveGround, resolveObstacles } from './terrain.ts';
import type { Entity, Unit } from './types.ts';
import { canTarget, frozen, World } from './world.ts';

const DASH_SPEED = 14;

export const canUseAbility = (u: Unit): boolean => u.abilityCd <= 0 && u.abilityT <= 0 && !u.dashVel && !frozen(u) && u.deployT <= 0;

/** Clamp an aim point to a maximum distance from the unit. */
export function clampAim(from: Vec, aim: Vec, range: number): Vec {
  const d = dist(from, aim);
  if (d <= range) return { ...aim };
  return add(from, scale(norm(sub(aim, from)), range));
}

export function startDash(w: World, u: Unit, dir: Vec, distance: number, dmg: number, opts: { stun?: number; knockback?: number; buildingMult?: number; kind: 'dash' | 'ability' }): void {
  const d = dir.x === 0 && dir.y === 0 ? fromAngle(u.facing) : norm(dir);
  u.dashVel = scale(d, DASH_SPEED);
  u.dashT = distance / DASH_SPEED;
  u.dashHits.clear();
  u.dashDamage = dmg;
  u.dashStun = opts.stun ?? 0;
  u.dashKnockback = opts.knockback ?? 0;
  u.dashBuildingMult = opts.buildingMult ?? 1;
  u.dashKind = opts.kind;
  u.facing = angleOf(d);
  u.charging = false; u.moveT = 0;
}

/** Trigger the unit's signature ability toward `aim`. Returns false if unavailable. */
export function useAbility(w: World, u: Unit, aim: Vec): boolean {
  if (!canUseAbility(u)) return false;
  const a = u.def.ability;
  const dirRaw = sub(aim, u.pos);
  const dir = dirRaw.x === 0 && dirRaw.y === 0 ? fromAngle(u.facing) : norm(dirRaw);
  const color = a.color ?? '#ffffff';
  const hitsAir = u.def.targets !== 'ground' || u.possessed;
  switch (a.kind) {
    case 'dashStrike':
      startDash(w, u, dir, a.range ?? 3, a.damage ?? 0, { stun: a.stun, knockback: a.knockback, buildingMult: a.buildingMult, kind: 'ability' });
      break;
    case 'aoeSelf':
      areaDamage(w, u.team, u.pos, a.radius ?? 2, a.damage ?? 0, { source: u, stun: a.stun, knockback: a.knockback, from: u.pos, hitsAir });
      w.addEffect({ type: 'shockwave', pos: { ...u.pos }, dur: 0.5, radius: a.radius ?? 2, color });
      w.addEffect({ type: 'crater', pos: { ...u.pos }, dur: 4, radius: 0.9, color: '#5a4a3a' });
      break;
    case 'aoeAim': {
      const at = clampAim(u.pos, aim, a.range ?? 5);
      if (u.def.projectile === 'bomb') {
        fireProjectile(w, { team: u.team, from: u.pos, style: 'bomb', speed: 7, damage: a.damage ?? 0, sourceId: u.id, mode: 'lob', lobTo: at, splash: a.radius ?? 2, splashAir: true, hero: true, knockback: a.knockback, radius: 0.35 });
      } else if (a.burn) {
        areaDamage(w, u.team, at, a.radius ?? 2, a.damage ?? 0, { source: u, burn: a.burn, hitsAir });
        w.addEffect({ type: 'burst', pos: at, dur: 0.6, radius: a.radius ?? 2, color });
        for (let i = 0; i < 10; i++) w.addEffect({ type: 'flame', pos: { x: at.x + (w.rng.next() - 0.5) * (a.radius ?? 2) * 1.6, y: at.y + (w.rng.next() - 0.5) * (a.radius ?? 2) * 1.6 }, dur: 0.6 + w.rng.next() * 0.5, radius: 0.35, color, vel: { x: 0, y: -1 } });
      } else {
        areaDamage(w, u.team, at, a.radius ?? 2, a.damage ?? 0, { source: u, knockback: a.knockback, hitsAir });
        w.addEffect({ type: 'volley', pos: at, dur: 0.5, radius: a.radius ?? 2, color });
      }
      break;
    }
    case 'lineShot':
      fireProjectile(w, { team: u.team, from: u.pos, style: u.def.projectile ?? 'bolt', speed: 22, damage: a.damage ?? 0, sourceId: u.id, mode: 'linear', dir, maxDist: a.range ?? 8, pierce: true, hero: true, radius: 0.3 });
      w.addEffect({ type: 'beam', pos: { ...u.pos }, to: add(u.pos, scale(dir, a.range ?? 8)), dur: 0.25, radius: 0.12, color });
      break;
    case 'spreadShot': {
      const n = a.count ?? 3, spread = a.spread ?? 0.6;
      const base = angleOf(dir);
      for (let i = 0; i < n; i++) {
        const ang = base + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread);
        fireProjectile(w, { team: u.team, from: u.pos, style: u.def.projectile ?? 'spear', speed: 13, damage: a.damage ?? 0, sourceId: u.id, mode: 'linear', dir: fromAngle(ang), maxDist: a.range ?? 6, hero: true, radius: 0.2 });
      }
      break;
    }
    case 'cone':
      u.abilityT = a.duration ?? 1.5; u.abilityTick = 0; u.abilityDir = dir;
      break;
    case 'spin':
      u.abilityT = a.duration ?? 2; u.abilityTick = 0;
      u.buffT = a.duration ?? 2; u.buffSpeed = a.buff?.speed ?? 1.3; u.buffAttack = 1;
      break;
    case 'blink': {
      let to = clampAim(u.pos, aim, a.range ?? 5);
      to = clampArena(to, u.radius);
      if (!u.flying) { to = resolveObstacles(to, u.radius, w.alive(), u); if (inWater(to, u.radius)) to = resolveGround(to, u.radius); }
      w.addEffect({ type: 'blink', pos: { ...u.pos }, to: { ...to }, dur: 0.35, radius: u.radius, color });
      u.pos = to;
      u.facing = angleOf(dir);
      u.critNext = a.critMult ?? 2;
      break;
    }
    case 'leap': {
      const to = clampAim(u.pos, aim, a.range ?? 5);
      const d = dist(u.pos, to);
      startDash(w, u, dir, Math.max(0.5, d), 0, { kind: 'ability' });
      u.dashVel = scale(u.dashVel!, 1); // leap moves at dash speed
      break;
    }
    case 'summon': {
      const def = troopById(a.unit ?? u.def.id);
      const n = a.count ?? 2;
      for (let i = 0; i < n; i++) {
        const ang = u.facing + Math.PI + ((i / n) - 0.5) * Math.PI * 1.2;
        let pos = add(u.pos, fromAngle(ang, u.radius + def.radius + 0.35));
        pos = u.flying ? clampArena(pos, def.radius) : resolveGround(pos, def.radius);
        const s = w.spawnUnit(def, u.team, pos, { deployTime: 0.3 });
        s.lane = u.lane;
        w.addEffect({ type: 'spawn', pos: { ...pos }, dur: 0.4, radius: def.radius + 0.3, color });
      }
      w.emit({ type: 'summon', pos: u.pos, team: u.team });
      break;
    }
    case 'selfBuff':
      u.buffT = a.duration ?? 4; u.buffSpeed = a.buff?.speed ?? 1.3; u.buffAttack = a.buff?.attack ?? 1.3;
      w.addEffect({ type: 'ring', pos: { ...u.pos }, dur: 0.5, radius: 1.2, color });
      break;
    case 'healBurst':
      for (const e of w.within(u.pos, a.radius ?? 3, (x) => x.team === u.team && x.kind === 'unit')) heal(w, e, a.heal ?? 200);
      u.shield = Math.max(u.shield, a.shield ?? 0);
      w.addEffect({ type: 'heal', pos: { ...u.pos }, dur: 0.8, radius: a.radius ?? 3, color });
      w.addEffect({ type: 'ring', pos: { ...u.pos }, dur: 0.6, radius: a.radius ?? 3, color: '#9dffb0' });
      break;
    case 'chain': {
      let last: Entity = u;
      const hit = new Set<number>();
      for (let i = 0; i < (a.count ?? 4); i++) {
        let best: Entity | null = null, bd = Infinity;
        for (const e of w.enemiesOf(u.team)) {
          if (hit.has(e.id) || (e.flying && !hitsAir)) continue;
          const d = dist(e.pos, last.pos);
          if (d <= (a.range ?? 4) && d < bd) { bd = d; best = e; }
        }
        if (!best) break;
        hit.add(best.id);
        w.addEffect({ type: 'lightning', pos: { ...last.pos }, to: { ...best.pos }, dur: 0.35, radius: 0.15, color });
        damage(w, best, a.damage ?? 0, { source: u, stun: a.stun });
        last = best;
      }
      if (hit.size === 0) { u.abilityCd = 0.5; w.text(u.pos, 'No targets', '#ffffff', 0.5); return false; }
      w.addEffect({ type: 'ring', pos: { ...u.pos }, dur: 0.4, radius: 1.0, color });
      break;
    }
  }
  u.abilityCd = a.cooldown;
  u.attackAnim = 1;
  w.emit({ type: 'ability', pos: u.pos, team: u.team, text: a.name });
  return true;
}

/**
 * Advance dashes and sustained abilities. Returns true when the unit is mid-dash and should not
 * be moved by anything else this tick.
 */
export function updateAbilityMotion(w: World, u: Unit, dt: number): boolean {
  if (u.dashVel) {
    u.pos = add(u.pos, scale(u.dashVel, dt));
    u.dashT -= dt;
    u.facing = angleOf(u.dashVel);
    let stop = false;
    if (!u.flying && inWater(u.pos, u.radius)) { u.pos = resolveGround(u.pos, u.radius); stop = true; }
    u.pos = clampArena(u.pos, u.radius);
    if (u.dashDamage > 0) {
      for (const e of w.enemiesOf(u.team)) {
        if (u.dashHits.has(e.id) || (e.flying && !u.flying && u.def.targets === 'ground')) continue;
        if (dist(e.pos, u.pos) <= e.radius + u.radius + 0.15) {
          u.dashHits.add(e.id);
          damage(w, e, u.dashDamage, { source: u, stun: u.dashStun, knockback: u.dashKnockback, from: u.pos, buildingMult: u.dashBuildingMult });
          if (e.kind !== 'unit') stop = true; // slam into a structure
        }
      }
    } else if (!u.flying) {
      for (const e of w.alive()) if (e.kind !== 'unit' && dist(e.pos, u.pos) <= e.radius + u.radius) stop = true;
    }
    if (w.rng.chance(dt * 40)) w.addEffect({ type: 'smoke', pos: { ...u.pos }, dur: 0.35, radius: u.radius * 0.8, color: u.def.ability.color ?? '#fff' });
    if (u.dashT <= 0 || stop) finishDash(w, u);
    return true;
  }
  if (u.abilityT > 0) {
    const a = u.def.ability;
    u.abilityT -= dt;
    u.abilityTick -= dt;
    if (u.abilityTick <= 0) {
      u.abilityTick = a.tick ?? 0.3;
      const hitsAir = u.def.targets !== 'ground' || u.possessed;
      if (a.kind === 'cone') {
        const range = a.range ?? 3, half = (a.spread ?? 0.8) / 2, base = angleOf(u.abilityDir);
        for (const e of w.enemiesOf(u.team)) {
          if (e.flying && !hitsAir) continue;
          const d = dist(e.pos, u.pos) - e.radius;
          if (d > range) continue;
          const ang = angleOf(sub(e.pos, u.pos));
          const tol = Math.atan2(e.radius, Math.max(0.3, d));
          if (Math.abs(angleDiff(base, ang)) <= half + tol) damage(w, e, a.damage ?? 0, { source: u, burn: a.burn });
        }
        w.addEffect({ type: 'cone', pos: { ...u.pos }, dur: 0.3, radius: range, color: a.color ?? '#ffb347', angle: base, arc: half * 2 });
        u.facing = base;
      } else if (a.kind === 'spin') {
        for (const e of w.within(u.pos, a.radius ?? 1.5, (x) => x.team !== u.team && (hitsAir || !x.flying) && canTarget(u.possessed ? 'both' : u.def.targets, x))) {
          damage(w, e, a.damage ?? 0, { source: u });
        }
        w.addEffect({ type: 'slash', pos: { ...u.pos }, dur: 0.3, radius: (a.radius ?? 1.5) + 0.2, color: a.color ?? '#fff', angle: w.time * 12, arc: Math.PI * 2 });
      }
    }
    if (u.abilityT <= 0 && a.kind === 'spin') { u.buffT = 0; u.buffSpeed = 1; }
  }
  return false;
}

function finishDash(w: World, u: Unit): void {
  const a = u.def.ability;
  u.dashVel = null;
  u.dashT = 0;
  if (u.dashKind === 'ability' && a.kind === 'leap') {
    areaDamage(w, u.team, u.pos, a.radius ?? 1.5, a.damage ?? 0, { source: u, knockback: 0.8, from: u.pos });
    w.addEffect({ type: 'shockwave', pos: { ...u.pos }, dur: 0.45, radius: a.radius ?? 1.5, color: a.color ?? '#fff' });
    w.emit({ type: 'hit', pos: u.pos, style: 'rock' });
  }
  u.dashKind = 'none';
  u.dashDamage = 0;
}
