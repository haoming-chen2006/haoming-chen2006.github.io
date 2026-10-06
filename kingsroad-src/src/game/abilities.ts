import { datan2 } from '../engine/dmath.ts';
import { add, angleDiff, angleOf, dist, fromAngle, norm, scale, sub, type Vec } from '../engine/math.ts';
import { areaDamage, damage, fireProjectile, heal } from './combat.ts';
import { clearLine, inWall } from './map.ts';
import { clampArena, resolveGround, resolveObstacles } from './terrain.ts';
import type { AbilityDef, Entity, Unit } from './types.ts';
import { canTarget, frozen, World } from './world.ts';
import { onSkillCast, skillGateOpen } from './passives.ts';

const DASH_SPEED = 14;

export const skillAt = (u: Unit, i: number): AbilityDef | undefined => u.def.skills[i];
export const skillReady = (u: Unit, i: number): boolean => {
  const a = skillAt(u, i);
  return !!a && u.skillRank[i] > 0 && u.skillCd[i] <= 0 && u.mana >= a.mana && u.abilityT <= 0 && !u.dashVel && !frozen(u) && u.deployT <= 0 && u.recallT <= 0 && skillGateOpen(u, i);
};
export const canUseAbility = (u: Unit): boolean => skillReady(u, 0);

/** Damage of a skill at the unit's current rank, including ratios. */
export function skillDamage(w: World, u: Unit, a: AbilityDef, rank: number): number {
  const d = w.stats(u);
  const base = (a.damage ?? 0) + (a.damageGrowth ?? 0) * Math.max(0, rank - 1);
  const ratio = a.ratio ?? 0;
  const scaleStat = a.type === 'magic' ? d.power : d.attack;
  return base + ratio * scaleStat * (a.type === 'magic' ? 1 : 0.8);
}
function skillHeal(w: World, u: Unit, a: AbilityDef, rank: number): number {
  const d = w.stats(u);
  return (a.heal ?? 0) * (1 + 0.25 * (rank - 1)) + (a.healRatio ?? 0) * d.power;
}

/** Clamp an aim point to a maximum distance from the unit. */
export function clampAim(from: Vec, aim: Vec, range: number): Vec {
  const d = dist(from, aim);
  if (d <= range) return { ...aim };
  return add(from, scale(norm(sub(aim, from)), range));
}

export function startDash(_w: World, u: Unit, dir: Vec, distance: number, dmg: number, opts: { stun?: number; knockback?: number; buildingMult?: number; kind: 'dash' | 'ability'; execute?: number; type?: 'physical' | 'magic' | 'true'; slow?: number; slowT?: number }): void {
  const d = dir.x === 0 && dir.y === 0 ? fromAngle(u.facing) : norm(dir);
  u.dashVel = scale(d, DASH_SPEED);
  u.dashT = distance / DASH_SPEED;
  u.dashHits.clear();
  u.dashDamage = dmg;
  u.dashStun = opts.stun ?? 0;
  u.dashKnockback = opts.knockback ?? 0;
  u.dashBuildingMult = opts.buildingMult ?? 1;
  u.dashKind = opts.kind;
  u.dashExecute = opts.execute ?? 0;
  u.dashType = opts.type ?? 'physical';
  (u as never as { dashSlow: number }).dashSlow = opts.slow ?? 0;
  (u as never as { dashSlowT: number }).dashSlowT = opts.slowT ?? 0;
  u.facing = angleOf(d);
  u.charging = false; u.moveT = 0;
}

/** Cast skill `i` toward `aim`. Returns false if unavailable. */
export function useSkill(w: World, u: Unit, i: number, aim: Vec): boolean {
  if (!skillReady(u, i)) return false;
  const a = u.def.skills[i];
  const rank = u.skillRank[i];
  const dmg = skillDamage(w, u, a, rank);
  const dirRaw = sub(aim, u.pos);
  const dir = dirRaw.x === 0 && dirRaw.y === 0 ? fromAngle(u.facing) : norm(dirRaw);
  const color = a.color ?? '#ffffff';
  const type = a.type ?? 'physical';
  const crowned = u.crowned;
  const common = { source: u, type, hero: u.isHero, skill: true, crowned };
  const radiusBonus = crowned ? 1 : 0;
  switch (a.kind) {
    case 'dashStrike':
      startDash(w, u, dir, a.range ?? 3, dmg * (crowned ? 1.5 : 1), { stun: (a.stun ?? 0) + (crowned ? 0.5 : 0), knockback: a.knockback, buildingMult: a.buildingMult, kind: 'ability', execute: a.execute, type, slow: a.slow, slowT: a.slowT });
      (u as never as { dashSkill: boolean }).dashSkill = true;
      break;
    case 'aoeSelf':
      if (a.heal) {
        // Sanctuary-style zone
        w.zones.push({ kind: 'sanctuary', pos: { ...u.pos }, radius: a.radius ?? 3, t: a.duration ?? 4, team: u.team, speed: 1, attack: 1, heal: skillHeal(w, u, a, rank), slow: a.slow, sourceId: u.id, tick: a.tick ?? 0.5 });
        w.addEffect({ type: 'ring', pos: { ...u.pos }, dur: 0.8, radius: a.radius ?? 3, color });
      } else {
        areaDamage(w, u.team, u.pos, (a.radius ?? 2) + radiusBonus, dmg, { ...common, stun: a.stun, knockback: a.knockback, from: u.pos, slow: a.slow, slowT: a.slowT });
        w.addEffect({ type: 'shockwave', pos: { ...u.pos }, dur: 0.5, radius: (a.radius ?? 2) + radiusBonus, color });
        if (a.stun && a.stun >= 1.2 && !a.slow) w.addEffect({ type: 'crater', pos: { ...u.pos }, dur: 4, radius: 0.9, color: '#5a4a3a' });
        if (a.slow) w.addEffect({ type: 'frost', pos: { ...u.pos }, dur: 0.8, radius: a.radius ?? 2, color });
      }
      break;
    case 'aoeAim': {
      const at = clampAim(u.pos, aim, a.range ?? 5);
      if (a.duration && a.tick) {
        // sustained zone: blizzard / arrow storm
        w.zones.push({ kind: 'blizzard', pos: at, radius: (a.radius ?? 2) + radiusBonus, t: a.duration * (crowned ? 1.5 : 1), team: u.team, speed: 1, attack: 1, dps: dmg / a.tick * (crowned ? 1.5 : 1), slow: a.slow, sourceId: u.id, tick: a.tick });
        w.addEffect({ type: 'ring', pos: { ...at }, dur: 0.6, radius: a.radius ?? 2, color });
      } else if (a.burn && (a.damage ?? 0) >= 500) {
        // meteor: short delay then a big impact
        w.effects.push({ type: 'meteor', pos: { ...at }, t: 0, dur: 0.9, radius: (a.radius ?? 2) + radiusBonus, color, team: u.team, text: String(u.id), size: dmg * (crowned ? 1.5 : 1), angle: (a.stun ?? 0) + (crowned ? 0.6 : 0) });
      } else if (a.burn) {
        fireProjectile(w, { team: u.team, from: u.pos, style: 'fireball', speed: 13, damage: dmg, type, sourceId: u.id, mode: 'lob', lobTo: at, splash: (a.radius ?? 2) + radiusBonus, splashAir: true, hero: true, burn: a.burn, radius: 0.35, skill: true, crowned });
        if (crowned) w.zones.push({ kind: 'blizzard', pos: at, radius: 2, t: 3, team: u.team, speed: 1, attack: 1, dps: dmg * 0.15, sourceId: u.id, tick: 0.5 }); // lava pool
      } else {
        areaDamage(w, u.team, at, (a.radius ?? 2) + radiusBonus, dmg, { ...common, knockback: a.knockback, stun: a.stun, slow: a.slow, slowT: a.slowT });
        w.addEffect({ type: a.stun ? 'lightning' : 'volley', pos: at, to: a.stun ? { x: at.x, y: at.y - 6 } : undefined, dur: 0.5, radius: a.radius ?? 2, color });
        w.addEffect({ type: 'shockwave', pos: { ...at }, dur: 0.5, radius: a.radius ?? 2, color });
      }
      break;
    }
    case 'lineShot':
      fireProjectile(w, { team: u.team, from: u.pos, style: u.def.projectile ?? 'bolt', speed: 22, damage: dmg, type, sourceId: u.id, mode: 'linear', dir, maxDist: (a.range ?? 8) + radiusBonus * 3, pierce: true, hero: true, radius: 0.3 + radiusBonus * 0.3, stun: a.stun, slow: a.slow, slowT: a.slowT, skill: true, crowned });
      w.addEffect({ type: 'beam', pos: { ...u.pos }, to: add(u.pos, scale(dir, a.range ?? 8)), dur: 0.25, radius: 0.12, color });
      break;
    case 'spreadShot': {
      const n = (a.count ?? 3) + (crowned ? 2 : 0), spread = a.spread ?? 0.6;
      const base = angleOf(dir);
      for (let k = 0; k < n; k++) {
        const ang = base + (n === 1 ? 0 : (k / (n - 1) - 0.5) * spread);
        fireProjectile(w, { team: u.team, from: u.pos, style: u.def.projectile ?? 'spear', speed: 13, damage: dmg, type, sourceId: u.id, mode: 'linear', dir: fromAngle(ang), maxDist: a.range ?? 6, hero: true, radius: 0.2, skill: true, crowned });
      }
      break;
    }
    case 'cone':
      u.abilityT = a.duration ?? 1.5; u.abilityTick = 0; u.abilityDir = dir; u.activeSkill = i;
      break;
    case 'spin':
      u.abilityT = a.duration ?? 2; u.abilityTick = 0; u.activeSkill = i;
      u.buffT = a.duration ?? 2; u.buffSpeed = a.buff?.speed ?? 1.15; u.buffAttack = 1;
      break;
    case 'blink': {
      let to = clampAim(u.pos, aim, a.range ?? 5);
      to = clampArena(to, u.radius);
      if (inWall(to, u.radius)) to = resolveGround(to, u.radius);
      to = resolveObstacles(to, u.radius, w.alive(), u);
      w.addEffect({ type: 'blink', pos: { ...u.pos }, to: { ...to }, dur: 0.35, radius: u.radius, color });
      u.pos = to;
      u.facing = angleOf(dir);
      u.critNext = a.critMult ?? 2;
      break;
    }
    case 'leap': {
      let to = clampAim(u.pos, aim, a.range ?? 5);
      if (!clearLine(u.pos, to, u.radius)) { /* leaps hop walls, landing spot must be free */ if (inWall(to, u.radius)) to = resolveGround(to, u.radius); }
      const d = dist(u.pos, to);
      startDash(w, u, dir, Math.max(0.5, d), 0, { kind: 'ability' });
      (u as never as { leapSkill: number }).leapSkill = i;
      (u as never as { leapDamage: number }).leapDamage = dmg;
      u.flying = true; // pass over walls while airborne
      break;
    }
    case 'summon':
      break;
    case 'globalShot':
      // a slow, thick arrow that crosses the whole map and stops at the first enemy hero
      fireProjectile(w, { team: u.team, from: u.pos, style: 'sun', speed: 16, damage: dmg, type, sourceId: u.id, mode: 'linear', dir, maxDist: a.range ?? 60, pierce: false, hero: true, radius: a.radius ?? 0.7, stun: a.stun, skill: true, heroOnly: true });
      w.addEffect({ type: 'beam', pos: { ...u.pos }, to: add(u.pos, scale(dir, 12)), dur: 0.5, radius: 0.25, color });
      break;
    case 'multiStrike':
      u.empowerN = a.count ?? 3; u.empowerSkill = i; u.empowerT = a.duration ?? 6;
      u.buffT = a.duration ?? 6; u.buffSpeed = a.buff?.speed ?? 1; u.buffAttack = 1;
      w.addEffect({ type: 'ring', pos: { ...u.pos }, dur: 0.5, radius: 1.2, color });
      break;
    case 'selfBuff':
      u.buffT = a.duration ?? 4; u.buffSpeed = a.buff?.speed ?? 1.2; u.buffAttack = a.buff?.attack ?? 1;
      if (a.shield) u.shield = Math.max(u.shield, a.shield * (1 + 0.3 * (rank - 1)) + w.stats(u).maxHp * 0.08);
      w.addEffect({ type: 'ring', pos: { ...u.pos }, dur: 0.5, radius: 1.2, color });
      if (a.shield) w.addEffect({ type: 'shield', pos: { ...u.pos }, dur: 0.6, radius: u.radius + 0.5, color });
      break;
    case 'healBurst': {
      const amount = skillHeal(w, u, a, rank);
      const seat = w.seatOf(u);
      for (const e of w.within(u.pos, Math.max(0.5, a.radius ?? 3), (x) => x.team === u.team && x.kind === 'unit' && x.isHero)) {
        if (e.kind !== 'unit') continue;
        // 赤血狂暴-style self heals scale with missing health
        const amt = (a.radius ?? 3) < 1 ? amount * (1 + (1 - u.hp / u.maxHp) * 1.5) : amount;
        const h = heal(w, e, amt); if (seat) seat.stats.healing += h;
        if (a.allyShield && e !== u) e.shield = Math.max(e.shield, a.allyShield * (1 + 0.3 * (rank - 1)));
        if (a.cleanse) { e.status.stun = 0; e.status.slow = 0; e.status.slowT = 0; e.status.freeze = 0; e.status.ccImmuneT = 1.5; }
        if (a.buff && e !== u && e.buffT <= 0) { e.buffT = 1.6; e.buffSpeed = a.buff.speed; e.buffAttack = 1; }
      }
      u.shield = Math.max(u.shield, (a.shield ?? 0) * (1 + 0.3 * (rank - 1)));
      w.addEffect({ type: 'heal', pos: { ...u.pos }, dur: 0.8, radius: a.radius ?? 3, color });
      w.addEffect({ type: 'ring', pos: { ...u.pos }, dur: 0.6, radius: a.radius ?? 3, color: '#9dffb0' });
      w.emit({ type: 'heal', team: u.team, pos: u.pos });
      break;
    }
    case 'chain': {
      let last: Entity = u;
      const hit = new Set<number>();
      for (let k = 0; k < (a.count ?? 4) + (crowned ? 2 : 0); k++) {
        let best: Entity | null = null, bd = Infinity;
        for (const e of w.enemiesOf(u.team)) {
          if (hit.has(e.id) || e.kind !== 'unit') continue;
          if ((a.count ?? 4) === 1 && !e.isHero) continue; // 元气弹 locks onto heroes
          const d = dist(e.pos, last.pos);
          if (d <= (a.range ?? 4) && d < bd) { bd = d; best = e; }
        }
        if (!best) break;
        hit.add(best.id);
        w.addEffect({ type: 'lightning', pos: { ...last.pos }, to: { ...best.pos }, dur: 0.35, radius: 0.15, color });
        damage(w, best, dmg, { ...common, stun: a.stun, slow: a.slow, slowT: a.slowT, execute: a.execute });
        last = best;
      }
      if (hit.size === 0) { u.skillCd[i] = 0.5; if (u.possessed) w.text(u.pos, '@fx.noTargets', '#ffffff', 0.5); return false; }
      w.addEffect({ type: 'ring', pos: { ...u.pos }, dur: 0.4, radius: 1.0, color });
      break;
    }
  }
  if (a.invuln) { u.status.invulnT = Math.max(u.status.invulnT, a.invuln); w.addEffect({ type: 'shield', pos: { ...u.pos }, dur: a.invuln, radius: u.radius + 0.5, color }); }
  onSkillCast(w, u, i);
  u.mana -= a.mana;
  if (crowned) { u.crowned = false; u.crown = 0; w.addEffect({ type: 'crown', pos: { ...u.pos }, dur: 0.8, radius: 1.2, color: '#ffd700', team: u.team }); }
  (u as never as { activeCrowned: boolean }).activeCrowned = crowned;
  u.skillCd[i] = a.cooldown * (1 - w.stats(u).cooldown) * (crowned ? 0.6 : 1);
  u.abilityCd = u.skillCd[0];
  u.attackAnim = 1;
  u.lastAttackT = w.time;
  w.emit({ type: 'ability', pos: u.pos, team: u.team, text: a.name, skill: a, hero: u.isHero });
  return true;
}

/** Legacy entry point: cast skill 0. */
export const useAbility = (w: World, u: Unit, aim: Vec): boolean => useSkill(w, u, 0, aim);

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
    const leaping = (u as never as { leapSkill?: number }).leapSkill !== undefined;
    if (!leaping && inWall(u.pos, u.radius)) { u.pos = resolveGround(u.pos, u.radius); stop = true; }
    u.pos = clampArena(u.pos, u.radius);
    if (u.dashDamage > 0) {
      const ds = u as never as { dashSlow?: number; dashSlowT?: number };
      for (const e of w.enemiesOf(u.team)) {
        if (u.dashHits.has(e.id) || e.kind !== 'unit') continue;
        if (dist(e.pos, u.pos) <= e.radius + u.radius + 0.15) {
          u.dashHits.add(e.id);
          damage(w, e, u.dashDamage, { source: u, hero: u.isHero, type: u.dashType, stun: u.dashStun, knockback: u.dashKnockback, from: u.pos, buildingMult: u.dashBuildingMult, execute: u.dashExecute, slow: ds.dashSlow, slowT: ds.dashSlowT, skill: true });
        }
      }
    }
    if (!leaping) for (const e of w.alive()) if (e.kind !== 'unit' && dist(e.pos, u.pos) <= e.radius + u.radius) stop = true;
    if (w.rng.chance(dt * 40)) w.addEffect({ type: 'smoke', pos: { ...u.pos }, dur: 0.35, radius: u.radius * 0.8, color: u.def.skills[0]?.color ?? '#fff' });
    if (u.dashT <= 0 || stop) finishDash(w, u);
    return true;
  }
  if (u.abilityT > 0 && u.activeSkill >= 0) {
    const a = u.def.skills[u.activeSkill];
    const rank = u.skillRank[u.activeSkill];
    const dmg = skillDamage(w, u, a, rank);
    u.abilityT -= dt;
    u.abilityTick -= dt;
    if (u.abilityTick <= 0) {
      u.abilityTick = a.tick ?? 0.3;
      if (a.kind === 'cone') {
        const range = a.radius ?? 3, half = (a.spread ?? 0.8) / 2, base = angleOf(u.abilityDir);
        for (const e of w.enemiesOf(u.team)) {
          if (e.kind !== 'unit') continue;
          const d = dist(e.pos, u.pos) - e.radius;
          if (d > range) continue;
          const ang = angleOf(sub(e.pos, u.pos));
          const tol = datan2(e.radius, Math.max(0.3, d));
          if (Math.abs(angleDiff(base, ang)) <= half + tol) damage(w, e, dmg, { source: u, hero: u.isHero, type: a.type, burn: a.burn, knockback: a.knockback, from: u.pos, skill: true, crowned: (u as never as { activeCrowned?: boolean }).activeCrowned });
        }
        w.addEffect({ type: 'cone', pos: { ...u.pos }, dur: 0.3, radius: range, color: a.color ?? '#ffb347', angle: base, arc: half * 2 });
        u.facing = base;
      } else if (a.kind === 'spin') {
        for (const e of w.within(u.pos, a.radius ?? 1.5, (x) => x.team !== u.team && x.kind === 'unit' && canTarget('both', x))) damage(w, e, dmg, { source: u, hero: u.isHero, type: a.type, skill: true, crowned: (u as never as { activeCrowned?: boolean }).activeCrowned });
        w.addEffect({ type: 'slash', pos: { ...u.pos }, dur: 0.3, radius: (a.radius ?? 1.5) + 0.2, color: a.color ?? '#fff', angle: w.time * 12, arc: Math.PI * 2 });
      }
    }
    if (u.abilityT <= 0) { if (a.kind === 'spin') { u.buffT = 0; u.buffSpeed = 1; } u.activeSkill = -1; }
  }
  return false;
}

function finishDash(w: World, u: Unit): void {
  const ext = u as never as { leapSkill?: number; leapDamage?: number };
  u.dashVel = null;
  u.dashT = 0;
  if (ext.leapSkill !== undefined) {
    const a = u.def.skills[ext.leapSkill];
    u.flying = u.def.flying;
    u.pos = resolveGround(u.pos, u.radius);
    const victims = areaDamage(w, u.team, u.pos, a.radius ?? 1.5, ext.leapDamage ?? 0, { source: u, hero: u.isHero, type: a.type, knockback: a.knockback ?? 0.6, from: u.pos, stun: a.stun, skill: true, crowned: (u as never as { activeCrowned?: boolean }).activeCrowned });
    if (a.maxHpPct) for (const v of victims) if (v.kind === 'unit' && v.isHero) damage(w, v, v.maxHp * a.maxHpPct, { source: u, hero: true, type: 'true', chain: true, noVamp: true });
    w.addEffect({ type: 'shockwave', pos: { ...u.pos }, dur: 0.45, radius: a.radius ?? 1.5, color: a.color ?? '#fff' });
    w.emit({ type: 'hit', pos: u.pos, style: 'rock' });
    ext.leapSkill = undefined;
  }
  u.dashKind = 'none';
  u.dashDamage = 0;
}

/** Zones (sanctuary, blizzard) and delayed meteors. */
export function updateZones(w: World, dt: number): void {
  for (const z of w.zones) {
    z.t -= dt;
    const tick = (z as never as { acc?: number });
    tick.acc = (tick.acc ?? 0) + dt;
    if (tick.acc < (z.tick ?? 0.5)) continue;
    tick.acc = 0;
    const src = z.sourceId !== undefined ? w.get(z.sourceId) : undefined;
    if (z.kind === 'sanctuary') {
      const seat = src && src.kind === 'unit' ? w.seatOf(src) : undefined;
      for (const e of w.within(z.pos, z.radius, (x) => x.team === z.team && x.kind === 'unit' && x.isHero)) { const h = heal(w, e, (z.heal ?? 0) * (z.tick ?? 0.5), true); if (seat) seat.stats.healing += h; }
      for (const e of w.within(z.pos, z.radius, (x) => x.team !== z.team && x.kind === 'unit')) { e.status.slow = Math.max(e.status.slow, z.slow ?? 0.3); e.status.slowT = Math.max(e.status.slowT, 0.6); }
      w.addEffect({ type: 'heal', pos: { ...z.pos }, dur: 0.5, radius: z.radius, color: '#fff8dc' });
    } else if (z.kind === 'blizzard') {
      for (const e of w.within(z.pos, z.radius, (x) => x.team !== z.team && x.kind === 'unit')) damage(w, e, (z.dps ?? 0) * (z.tick ?? 0.5), { source: src, hero: true, type: 'magic', slow: z.slow, slowT: 1, skill: true });
      w.addEffect({ type: 'frost', pos: { x: z.pos.x + (w.rng.next() - 0.5) * z.radius, y: z.pos.y + (w.rng.next() - 0.5) * z.radius }, dur: 0.5, radius: z.radius * 0.6, color: '#bfe8ff' });
    }
  }
  w.zones = w.zones.filter((z) => z.t > 0);
  for (const e of w.effects) {
    if (e.type !== 'meteor' || e.t + dt < e.dur || (e as never as { done?: boolean }).done) continue;
    (e as never as { done?: boolean }).done = true;
    const src = w.get(Number(e.text));
    areaDamage(w, e.team ?? 0, e.pos, e.radius, e.size ?? 0, { source: src, hero: true, type: 'magic', burn: 60, stun: e.angle, from: e.pos, knockback: 0.8, skill: true });
    w.addEffect({ type: 'burst', pos: { ...e.pos }, dur: 0.7, radius: e.radius, color: e.color });
    w.addEffect({ type: 'crater', pos: { ...e.pos }, dur: 8, radius: e.radius * 0.5, color: '#4a3a2a' });
    w.emit({ type: 'spell', pos: e.pos, team: e.team, text: 'meteor' });
  }
}
