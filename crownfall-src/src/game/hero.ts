import { angleDiff, angleOf, dist, fromAngle, norm, sub, type Vec } from '../engine/math.ts';
import { startDash, useAbility } from './abilities.ts';
import { fireProjectile, meleeHit } from './combat.ts';
import { POSSESS } from './constants.ts';
import { clampArena, resolveGround } from './terrain.ts';
import type { Entity, Team, Unit } from './types.ts';
import { attackSpeedMult, frozen, speedMult, World } from './world.ts';

export interface HeroCommand {
  move: Vec;
  aim: Vec;
  attack: boolean;
  ability: boolean;
  dash: boolean;
  release: boolean;
}

export const idleCommand = (): HeroCommand => ({ move: { x: 0, y: 0 }, aim: { x: 9, y: 16 }, attack: false, ability: false, dash: false, release: false });

export function canPossess(w: World, team: Team, u: Unit | undefined): u is Unit {
  const p = w.players[team];
  return !!u && !u.dead && u.team === team && u.def.possessable && p.heroId < 0 && p.possessCd <= 0 && u.deployT <= 0 && !u.possessed;
}

export function possess(w: World, team: Team, unitId: number): boolean {
  const u = w.getUnit(unitId);
  if (!canPossess(w, team, u)) return false;
  const p = w.players[team];
  u.possessed = true;
  p.heroId = u.id;
  p.stats.possessions += 1;
  p.harvested = 0;
  if (!u.soulbound) {
    u.soulbound = true;
    const bonus = Math.round(u.def.hp * POSSESS.hpBonus);
    u.maxHp += bonus;
    u.hp += bonus;
  }
  u.targetId = -1;
  u.charging = false;
  u.moveT = 0;
  w.addEffect({ type: 'soul', pos: { ...u.pos }, dur: 0.7, radius: 1.0, color: '#ffe27a', team });
  w.addEffect({ type: 'ring', pos: { ...u.pos }, dur: 0.6, radius: 1.6, color: '#ffe27a' });
  w.emit({ type: 'possess', pos: u.pos, team });
  return true;
}

export function release(w: World, team: Team): void {
  const p = w.players[team];
  const u = w.hero(team);
  p.heroId = -1;
  p.possessCd = POSSESS.cooldownAfterRelease;
  if (!u) return;
  u.possessed = false;
  u.targetId = -1;
  u.abilityT = 0;
  w.addEffect({ type: 'soul', pos: { ...u.pos }, dur: 0.7, radius: 0.8, color: '#ffe27a', team });
  w.emit({ type: 'release', pos: u.pos, team });
}

/** Closest possessable troop to a world point, within range. */
export function possessCandidate(w: World, team: Team, at: Vec, range = POSSESS.possessRange): Unit | undefined {
  let best: Unit | undefined, bd = Infinity;
  for (const u of w.units(team)) {
    if (!u.def.possessable || u.deployT > 0) continue;
    const d = dist(u.pos, at) - u.radius;
    if (d <= range && d < bd) { bd = d; best = u; }
  }
  return best;
}

export function updateHero(w: World, team: Team, cmd: HeroCommand, dt: number): void {
  const u = w.hero(team);
  if (!u) return;
  if (cmd.release) { release(w, team); return; }
  const aimRaw = sub(cmd.aim, u.pos);
  const aimDir = aimRaw.x === 0 && aimRaw.y === 0 ? fromAngle(u.facing) : norm(aimRaw);
  if (u.abilityT > 0 && u.def.ability.kind === 'cone') u.abilityDir = aimDir;
  if (u.dashVel) return;
  if (frozen(u)) return;
  const moving = cmd.move.x !== 0 || cmd.move.y !== 0;
  const sustainedSlow = u.abilityT > 0 && u.def.ability.kind === 'cone' ? 0.5 : 1;
  if (moving) {
    const spd = u.def.speed * speedMult(u) * POSSESS.speedMult * sustainedSlow;
    u.pos = { x: u.pos.x + cmd.move.x * spd * dt, y: u.pos.y + cmd.move.y * spd * dt };
    u.pos = u.flying ? clampArena(u.pos, u.radius) : resolveGround(u.pos, u.radius);
    u.moveT += dt;
    if (u.def.charge && !u.charging && u.moveT >= u.def.charge.delay) { u.charging = true; w.addEffect({ type: 'ring', pos: { ...u.pos }, dur: 0.4, radius: 0.9, color: '#ffe680' }); }
  } else u.moveT = 0;
  u.facing = angleOf(aimDir);
  if (cmd.dash && u.dashCd <= 0) {
    startDash(w, u, moving ? cmd.move : aimDir, POSSESS.dashDist, 0, { kind: 'dash' });
    u.dashCd = POSSESS.dashCooldown;
    w.emit({ type: 'dash', pos: u.pos, team });
    return;
  }
  if (cmd.ability) useAbility(w, u, cmd.aim);
  const spinning = u.abilityT > 0 && u.def.ability.kind === 'spin';
  if (cmd.attack && u.attackCd <= 0 && !spinning) heroAttack(w, u, cmd.aim, aimDir);
}

function heroAttack(w: World, u: Unit, aim: Vec, dir: Vec): void {
  u.attackCd = u.def.hitSpeed / attackSpeedMult(u);
  u.attackAnim = 1;
  let dmg = u.def.damage * u.critNext;
  const crit = u.critNext > 1;
  u.critNext = 1;
  if (u.charging && u.def.charge) { dmg *= u.def.charge.dmgMult; u.charging = false; u.moveT = 0; }
  const d = u.def;
  if (d.projectile) {
    const maxDist = Math.min(Math.max(1, dist(u.pos, aim)), d.range + 1.5);
    const from = { x: u.pos.x + dir.x * u.radius * 0.6, y: u.pos.y + dir.y * u.radius * 0.6 };
    if (d.projectile === 'bomb') {
      const to = { x: u.pos.x + dir.x * maxDist, y: u.pos.y + dir.y * maxDist };
      fireProjectile(w, { team: u.team, from, style: 'bomb', speed: d.projectileSpeed ?? 7, damage: dmg, sourceId: u.id, mode: 'lob', lobTo: to, splash: d.splash, splashAir: true, hero: true });
    } else {
      fireProjectile(w, {
        team: u.team, from, style: d.projectile, speed: (d.projectileSpeed ?? 9) * 1.15, damage: dmg, sourceId: u.id, mode: 'linear', dir, maxDist,
        splash: d.splash, splashAir: true, hero: true, chain: d.chain, radius: d.splash > 0 ? 0.3 : 0.22,
      });
    }
    w.emit({ type: 'ranged', pos: u.pos, style: d.projectile });
    return;
  }
  // melee: pick the closest enemy roughly in front of the hero
  let best: Entity | null = null, bd = Infinity;
  const reach = d.range + 0.25;
  for (const e of w.enemiesOf(u.team)) {
    if (e.flying && !u.flying && d.targets === 'ground' && !u.possessed) continue;
    const ed = dist(e.pos, u.pos) - e.radius;
    if (ed > reach) continue;
    const ang = angleOf(sub(e.pos, u.pos));
    if (Math.abs(angleDiff(u.facing, ang)) > 1.35 && ed > 0.15) continue;
    if (ed < bd) { bd = ed; best = e; }
  }
  if (best) meleeHit(w, u, best, dmg, { crit });
  else w.addEffect({ type: 'slash', pos: { ...u.pos }, dur: 0.18, radius: d.range + u.radius + 0.2, color: '#ffffff88', angle: u.facing, arc: 1.4 });
}
