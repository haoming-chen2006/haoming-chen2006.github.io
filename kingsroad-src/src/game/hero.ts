import { angleDiff, angleOf, dist, fromAngle, norm, sub, type Vec } from '../engine/math.ts';
import { skillReady, startDash, useSkill } from './abilities.ts';
import { attackDamage, damage, fireProjectile, meleeHit } from './combat.ts';
import { onAttackFire } from './passives.ts';
import { POSSESS, RECALL_TIME } from './constants.ts';
import { ITEMS, isBoots } from './items.ts';
import { inFountain, inWall, spawnPoint } from './map.ts';
import { clampArena, resolveGround, resolveObstacles } from './terrain.ts';
import { NEUTRAL, type Entity, type Seat, type Team, type Unit } from './types.ts';
import { attackSpeedMult, frozen, speedMult, World } from './world.ts';

/** What a human (or a hero bot) wants its hero to do this tick. */
export interface HeroCommand {
  move: Vec;
  aim: Vec;
  attack: boolean;
  /** Skill index to cast this tick (-1 none). */
  skill: number;
  dash: boolean;
  flash: boolean;
  recall: boolean;
  buy: string | null; // item id to buy
  levelSkill: number; // skill index to put a point into (-1 = auto)
  ability?: boolean; // legacy alias for skill 0
  release?: boolean;
}

export const idleCommand = (): HeroCommand => ({ move: { x: 0, y: 0 }, aim: { x: 28, y: 28 }, attack: false, skill: -1, dash: false, flash: false, recall: false, buy: null, levelSkill: -1 });

export function canPossess(): boolean { return false; }
export function possessCandidate(): Unit | undefined { return undefined; }
export function possess(): boolean { return false; }
export function release(): void { /* heroes cannot be released in this game */ }

/** Spend skill points automatically (or on a chosen skill). */
export function levelSkills(w: World, u: Unit, chosen = -1): void {
  const seat = w.seatOf(u);
  if (!seat) return;
  while (seat.skillPoints > 0) {
    let i = chosen;
    if (i < 0) {
      const order = u.def.skillOrder ?? [0, 1, 0, 2, 0, 0, 1, 2, 0, 1, 1, 2, 1, 1, 2];
      const spent = seat.skillRank.reduce((a, b) => a + b, 0);
      i = order[Math.min(order.length - 1, spent)];
    }
    // ultimate (2) only at 4 / 8 / 12; others max 5
    const level = seat.level;
    const maxRank = i === 2 ? Math.min(3, Math.floor((level) / 4)) : 5;
    if (seat.skillRank[i] >= maxRank) { if (chosen >= 0) break; const alt = [0, 1, 2].find((k) => seat.skillRank[k] < (k === 2 ? Math.min(3, Math.floor(level / 4)) : 5)); if (alt === undefined) break; i = alt; }
    seat.skillRank[i] += 1; seat.skillPoints -= 1;
    u.skillRank = [...seat.skillRank]; u.skillPoints = seat.skillPoints;
    if (chosen >= 0) break;
  }
}

export function buyItem(w: World, u: Unit, id: string): boolean {
  const seat = w.seatOf(u);
  const it = ITEMS[id];
  if (!seat || !it || seat.items.length >= 6 || seat.gold < it.cost || seat.items.includes(id)) return false;
  if (isBoots(id) && seat.items.some((x) => isBoots(x))) return false;
  seat.gold -= it.cost; seat.items.push(id);
  u.items = [...seat.items]; u.gold = seat.gold;
  w.refreshDerived(u);
  u.hp = Math.min(u.maxHp, u.hp + (it.hp ?? 0));
  w.emit({ type: 'buy', team: u.team, pos: u.pos, text: it.name, seat });
  return true;
}

/** Buy the next item of the recommended build if affordable. */
export function autoBuy(w: World, u: Unit): void {
  const seat = w.seatOf(u);
  if (!seat || !seat.autoBuy) return;
  for (const id of u.def.build ?? []) {
    if (seat.items.includes(id)) continue;
    buyItem(w, u, id);
    break;
  }
}

/** Seat bookkeeping: respawn timers and dead-hero state. */
export function updateSeats(w: World, dt: number): void {
  for (const p of w.players) for (const s of p.seats) {
    if (s.heroId >= 0) {
      const h = w.getUnit(s.heroId);
      if (h) { s.gold = h.gold; continue; }
      s.heroId = -1;
    }
    if (s.respawnT > 0) { s.respawnT -= dt; if (s.respawnT <= 0) { const h = w.spawnHero(s); w.emit({ type: 'respawn', team: h.team, pos: h.pos, seat: s }); } }
  }
}

export function updateHero(w: World, u: Unit, cmd: HeroCommand, dt: number): void {
  if (u.dead) return;
  const seat = w.seatOf(u);
  if (seat && seat.skillPoints > 0) levelSkills(w, u, cmd.levelSkill);
  if (cmd.buy) buyItem(w, u, cmd.buy);
  else if (u.autoBuy) autoBuy(w, u);
  if (cmd.recall && u.recallT <= 0 && !u.dashVel && !inFountain(u.pos, u.team as Team)) { u.recallT = RECALL_TIME; w.emit({ type: 'recall', team: u.team, pos: u.pos, hero: u.possessed }); }
  if (u.recallT > 0) {
    const moving = cmd.move.x !== 0 || cmd.move.y !== 0;
    if (moving || cmd.attack || cmd.skill >= 0 || cmd.dash || frozen(u)) u.recallT = 0;
    else {
      u.recallT -= dt;
      if (w.rng.chance(dt * 8)) w.addEffect({ type: 'recall', pos: { x: u.pos.x + (w.rng.next() - 0.5) * 0.8, y: u.pos.y + (w.rng.next() - 0.5) * 0.8 }, dur: 0.7, radius: 0.25, color: '#9fe3ff', vel: { x: 0, y: -2 } });
      if (u.recallT <= 0) {
        w.addEffect({ type: 'blink', pos: { ...u.pos }, to: spawnPoint(u.team as Team), dur: 0.5, radius: u.radius, color: '#9fe3ff' });
        u.pos = spawnPoint(u.team as Team);
        u.targetId = -1;
        w.emit({ type: 'recall', team: u.team, pos: u.pos, big: true, hero: u.possessed });
      }
      return;
    }
  }
  const aimRaw = sub(cmd.aim, u.pos);
  const aimDir = aimRaw.x === 0 && aimRaw.y === 0 ? fromAngle(u.facing) : norm(aimRaw);
  if (u.abilityT > 0 && u.activeSkill >= 0 && u.def.skills[u.activeSkill].kind === 'cone') u.abilityDir = aimDir;
  if (u.dashVel) return;
  if (frozen(u)) return;
  const moving = cmd.move.x !== 0 || cmd.move.y !== 0;
  const sustainedSlow = u.abilityT > 0 && u.activeSkill >= 0 && u.def.skills[u.activeSkill].kind === 'cone' ? 0.5 : 1;
  if (moving) {
    const spd = w.stats(u).speed * speedMult(u) * POSSESS.speedMult * sustainedSlow;
    let next = { x: u.pos.x + cmd.move.x * spd * dt, y: u.pos.y + cmd.move.y * spd * dt };
    // slide along walls
    // already overlapping something (spawn jitter against the crystal): any step is allowed so the hero can walk out
    if (inWall(next, u.radius) && !inWall(u.pos, u.radius)) {
      const nx = { x: next.x, y: u.pos.y }, ny = { x: u.pos.x, y: next.y };
      if (!inWall(nx, u.radius)) next = nx;
      else if (!inWall(ny, u.radius)) next = ny;
      else {
        // head-on into a round obstacle (tower, crystal): slide around it along the nearest free deflection
        next = u.pos;
        const base = angleOf(cmd.move);
        for (const off of [1.2, -1.2, Math.PI / 2, -Math.PI / 2, 2.0, -2.0]) {
          const dir = fromAngle(base + off, spd * dt * 0.8);
          const cand = { x: u.pos.x + dir.x, y: u.pos.y + dir.y };
          if (!inWall(cand, u.radius)) { next = cand; break; }
        }
      }
    }
    u.pos = u.flying ? clampArena(next, u.radius) : resolveGround(next, u.radius);
    u.pos = resolveObstacles(u.pos, u.radius, w.alive(), u);
    u.moveT += dt;
  } else u.moveT = 0;
  u.facing = angleOf(aimDir);
  if (cmd.dash && u.dashCd <= 0) {
    startDash(w, u, moving ? cmd.move : aimDir, POSSESS.dashDist, 0, { kind: 'dash' });
    u.dashCd = POSSESS.dashCooldown;
    w.emit({ type: 'dash', pos: u.pos, team: u.team, hero: u.possessed });
    return;
  }
  if (cmd.flash && u.flashCd <= 0) {
    let to = { x: u.pos.x + aimDir.x * POSSESS.flashDist, y: u.pos.y + aimDir.y * POSSESS.flashDist };
    if (moving) to = { x: u.pos.x + cmd.move.x * POSSESS.flashDist, y: u.pos.y + cmd.move.y * POSSESS.flashDist };
    to = clampArena(to, u.radius);
    if (inWall(to, u.radius)) to = resolveGround(to, u.radius);
    w.addEffect({ type: 'blink', pos: { ...u.pos }, to: { ...to }, dur: 0.35, radius: u.radius, color: '#ffe27a' });
    u.pos = to; u.flashCd = POSSESS.flashCooldown;
    w.emit({ type: 'flash', pos: u.pos, team: u.team, hero: u.possessed });
    return;
  }
  const skill = cmd.skill >= 0 ? cmd.skill : cmd.ability ? 0 : -1;
  if (skill >= 0) {
    if (!useSkill(w, u, skill, cmd.aim) && u.possessed) {
      const a = u.def.skills[skill];
      if (a && u.skillRank[skill] === 0) w.emit({ type: 'invalid', team: u.team, text: '@toast.skillLocked' });
      else if (a && u.mana < a.mana && u.skillCd[skill] <= 0) w.emit({ type: 'invalid', team: u.team, text: '@toast.noMana' });
    }
  }
  const spinning = u.abilityT > 0 && u.activeSkill >= 0 && u.def.skills[u.activeSkill].kind === 'spin';
  if (cmd.attack && u.attackCd <= 0 && !spinning) heroAttack(w, u, cmd.aim, aimDir);
}

export function heroAttack(w: World, u: Unit, aim: Vec, dir: Vec): void {
  const st = w.stats(u);
  u.attackCd = st.hitSpeed / attackSpeedMult(u);
  u.attackAnim = 1;
  u.lastAttackT = w.time;
  const d = u.def;
  // hero passives that trigger on the swing (每第 N 次普攻 …)
  const fire = onAttackFire(w, u);
  if (fire.critMult > 1 && u.critNext <= 1) u.critNext = fire.critMult;
  let { dmg, crit } = attackDamage(w, u);
  dmg *= fire.bonus;
  let stun = fire.stun;
  let splash = d.splash;
  // 强化普攻 from a skill (如意金箍棒 / 多重箭矢): the next N attacks are empowered
  if (u.empowerN > 0 && u.empowerSkill >= 0) {
    const a = d.skills[u.empowerSkill];
    dmg *= a.buff?.attack ?? 1.5;
    if (a.stun) stun = Math.max(stun, a.stun);
    if (a.radius) splash = Math.max(splash, a.radius);
    u.empowerN -= 1;
    if (u.empowerN <= 0) { u.empowerSkill = -1; u.empowerT = 0; }
    w.addEffect({ type: 'ring', pos: { ...u.pos }, dur: 0.25, radius: 0.9, color: a.color ?? '#fff' });
  }
  // 宗师之力 / 冰痕之握: the first attack after a skill
  let itemSlow = 0;
  if (u.empowerT > 0 && u.empowerSkill < 0) {
    if (u.items.includes('zongshi_zhili')) { dmg += 100 + st.attack * 0.4; u.empowerT = 0; }
    if (u.items.includes('binghen_zhiwo')) { dmg += 60 + st.maxHp * 0.02; itemSlow = 0.3; u.empowerT = 0; }
  }
  if (d.projectile) {
    const maxDist = Math.min(Math.max(1, dist(u.pos, aim)), d.range + 1.5);
    const from = { x: u.pos.x + dir.x * u.radius * 0.6, y: u.pos.y + dir.y * u.radius * 0.6 };
    const shoot = (dir2: Vec, mult: number, delayDist = 0) => fireProjectile(w, {
      team: u.team, from: { x: from.x - dir2.x * delayDist, y: from.y - dir2.y * delayDist }, style: d.projectile!, speed: (d.projectileSpeed ?? 9) * 1.15, damage: dmg * mult, type: d.attackType, sourceId: u.id, mode: 'linear', dir: dir2, maxDist,
      splash, splashAir: true, hero: true, radius: crit ? 0.32 : 0.22, stun, slow: itemSlow, slowT: itemSlow ? 1 : 0,
    });
    shoot(dir, 1);
    // 火力压制-style burst: extra shells trailing the first
    for (let k = 1; k <= fire.burst; k++) shoot(dir, d.passive?.value ?? 0.5, k * 0.5);
    w.emit({ type: 'ranged', pos: u.pos, style: d.projectile, hero: u.possessed });
    return;
  }
  let best: Entity | null = null, bd = Infinity;
  const reach = d.range + 0.25;
  for (const e of w.enemiesOf(u.team)) {
    if (e.kind === 'tower' && !e.active) continue;
    if (e.kind === 'unit' && e.status.invulnT > 0) continue;
    const ed = dist(e.pos, u.pos) - e.radius;
    if (ed > reach) continue;
    const ang = angleOf(sub(e.pos, u.pos));
    if (Math.abs(angleDiff(u.facing, ang)) > 1.35 && ed > 0.15) continue;
    if (ed < bd) { bd = ed; best = e; }
  }
  if (best) {
    if (splash > 0) {
      for (const e of w.within(best.pos, splash, (x) => x.team !== u.team && x.kind === 'unit')) if (e !== best) damage(w, e, dmg * 0.6, { source: u, type: d.attackType, hero: true });
    }
    meleeHit(w, u, best, dmg, { crit, stun: stun || undefined, slow: itemSlow || undefined, slowT: itemSlow ? 1 : undefined, from: u.pos, knockback: stun && fire.stun ? 0.4 : undefined });
  } else w.addEffect({ type: 'slash', pos: { ...u.pos }, dur: 0.18, radius: d.range + u.radius + 0.2, color: '#ffffff88', angle: u.facing, arc: 1.4 });
}

/** The seat's hero is alive and controllable. */
export const heroAlive = (w: World, seat: Seat): Unit | undefined => (seat.heroId >= 0 ? w.getUnit(seat.heroId) : undefined);
export const isNeutral = (e: Entity): boolean => e.team === NEUTRAL;
export { skillReady };
