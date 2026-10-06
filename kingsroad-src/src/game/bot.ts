import { dist, norm, sub, type Vec } from '../engine/math.ts';
import { skillReady } from './abilities.ts';
import { CAMPS, OBJECTIVES, mirrorPos, type LaneId } from './constants.ts';
import { idleCommand, type HeroCommand } from './hero.ts';
import { clearLine, findPath, inFountain, laneAdvance, lanePath, lanePoint, laneProgress, nearestFree, spawnPoint } from './map.ts';
import { NEUTRAL, type Entity, type Seat, type Team, type Unit } from './types.ts';
import type { World } from './world.ts';

export type Difficulty = 'easy' | 'normal' | 'hard';
export interface DifficultySpec { name: string; reaction: number; aggression: number; skillUse: number; accuracy: number; retreatHp: number; statMult: number }
export const DIFFICULTIES: Record<Difficulty, DifficultySpec> = {
  easy: { name: '@bot.easy', reaction: 0.9, aggression: 0.6, skillUse: 0.5, accuracy: 0.6, retreatHp: 0.45, statMult: 0.85 },
  normal: { name: '@bot.normal', reaction: 0.45, aggression: 0.85, skillUse: 0.8, accuracy: 0.8, retreatHp: 0.35, statMult: 1 },
  hard: { name: '@bot.hard', reaction: 0.2, aggression: 1.05, skillUse: 1, accuracy: 0.95, retreatHp: 0.28, statMult: 1.12 },
};

type Mode = 'lane' | 'jungle' | 'retreat' | 'recall' | 'fight' | 'help' | 'objective' | 'push' | 'group' | 'fountain';

interface Brain {
  mode: Mode;
  decideT: number;
  dest: Vec | null;
  targetId: number;
  path: Vec[];
  pathT: number;
  campIndex: number;
  wander: number;
  lastSkillT: number;
  /** Seconds spent chasing a fight target without landing a hit. */
  chaseT: number;
}

/** One brain per seat. */
export class BotHero {
  readonly team: Team;
  readonly spec: DifficultySpec;
  private brains = new Map<number, Brain>();
  constructor(team: Team, spec: DifficultySpec) { this.team = team; this.spec = spec; }

  private brain(seat: Seat): Brain {
    let b = this.brains.get(seat.index);
    if (!b) { b = { mode: 'lane', decideT: 0, dest: null, targetId: -1, path: [], pathT: 0, campIndex: 0, wander: 0, lastSkillT: -10, chaseT: 0 }; this.brains.set(seat.index, b); }
    return b;
  }

  /** Produce a command for one bot-controlled hero. */
  command(w: World, seat: Seat, u: Unit, dt: number): HeroCommand {
    const b = this.brain(seat);
    const cmd = idleCommand();
    cmd.aim = { x: u.pos.x + Math.cos(u.facing) * 4, y: u.pos.y + Math.sin(u.facing) * 4 };
    b.decideT -= dt;
    if (b.decideT <= 0) { b.decideT = this.spec.reaction * (0.6 + w.rng.next() * 0.8); this.decide(w, seat, u, b); }
    this.act(w, seat, u, b, cmd, dt);
    return cmd;
  }

  // ------------------------------------------------------------------ decisions (a few times per second)

  private decide(w: World, seat: Seat, u: Unit, b: Brain): void {
    const team = this.team;
    const hpFrac = u.hp / u.maxHp;
    const enemies = this.nearbyEnemyHeroes(w, u, 10);
    const allies = [...w.heroes(team)].filter((h) => h !== u && dist(h.pos, u.pos) < 10);
    const threat = enemies.reduce((s, e) => s + e.hp / Math.max(1, e.maxHp) * (1 + e.level * 0.05), 0);
    const strength = (hpFrac * (1 + u.level * 0.05)) + allies.reduce((s, a) => s + a.hp / a.maxHp * (1 + a.level * 0.05), 0);
    const underEnemyTower = this.enemyTowerNear(w, u, 7.5);
    const retreatHp = this.spec.retreatHp + (enemies.length ? 0.1 : 0) + (u.def.range <= 3 ? 0.1 : 0);

    if (inFountain(u.pos, team) && hpFrac < 0.97) { b.mode = 'fountain'; return; }
    // hysteresis: once retreating, keep going until healthy again or safely home
    if ((b.mode === 'retreat' || b.mode === 'recall') && hpFrac < retreatHp + 0.25 && !(enemies.length === 1 && enemies[0].hp / enemies[0].maxHp < 0.25 && hpFrac > 0.3)) {
      if (b.mode === 'retreat' && enemies.length === 0 && hpFrac < 0.5 && w.time - u.lastAttackT > 3 && u.damageTaken < 50) b.mode = 'recall';
      return;
    }
    if (hpFrac < retreatHp || (enemies.length >= 2 && threat > strength * 1.4 && !underEnemyTower && hpFrac < 0.7)) {
      b.mode = 'retreat';
      return;
    }
    // fight when an enemy hero is close and we are not clearly losing
    const target = this.pickFightTarget(w, u, enemies);
    const melee = u.def.range <= 3;
    const outnumbered = enemies.length >= 2 && allies.length === 0;
    // tanks front-line for someone: they only start fights with an ally close by (or a kill to finish)
    const tankAlone = u.def.role === 'tank' && allies.length === 0 && !!target && target.hp / target.maxHp > 0.3;
    if (target && !tankAlone && !(melee && outnumbered && target.hp / target.maxHp > 0.35) && (threat <= strength * (1.2 * this.spec.aggression) || hpFrac > 0.8)) {
      const victimUnderTower = this.enemyTowerNear(w, target, 7.5);
      const diveOk = target.hp / target.maxHp < 0.3 && hpFrac > 0.6;
      if (!victimUnderTower || diveOk || this.alliedMinionsNear(w, u, 6) >= 3) { if (b.mode !== 'fight' || b.targetId !== target.id) b.chaseT = 0; b.mode = 'fight'; b.targetId = target.id; return; }
    }
    // help an ally in trouble nearby
    const inTrouble = [...w.heroes(team)].find((h) => h !== u && h.damageTaken > 150 && dist(h.pos, u.pos) < 16);
    if (inTrouble && hpFrac > 0.5) { b.mode = 'help'; b.targetId = inTrouble.id; b.dest = { ...inTrouble.pos }; return; }
    // objectives: tyrant / overlord when teammates are around and it's up
    const obj = this.objectiveUp(w);
    if (obj && w.time > 150) {
      const near = [...w.heroes(team)].filter((h) => dist(h.pos, obj.pos) < 12).length;
      const myDist = dist(u.pos, obj.pos);
      if ((near >= 2 || seat.lane === 3) && myDist < 24 && hpFrac > 0.6) { b.mode = 'objective'; b.targetId = obj.id; b.dest = { ...obj.pos }; return; }
    }
    // late game: push when we have the numbers (enemy heroes dead or we outnumber them), else group mid
    const late = w.time > 600 || w.players[team === 0 ? 1 : 0].towersLost >= 3;
    const enemyAlive = [...w.heroes(team === 0 ? 1 : 0)].length;
    const allyAlive = [...w.heroes(team)].length;
    if ((late || w.time > 300) && (enemyAlive <= allyAlive - 2 || (late && w.players[team].kills > w.players[team === 0 ? 1 : 0].kills + 5) || (w.time > 1080 && hpFrac > 0.6)) && hpFrac > 0.45) { b.mode = 'push'; return; }
    if (late && seat.lane !== 3 && w.rng.chance(0.6)) { b.mode = 'group'; return; }
    b.mode = seat.lane === 3 && !late ? 'jungle' : 'lane';
  }

  private nearbyEnemyHeroes(w: World, u: Unit, r: number): Unit[] {
    const out: Unit[] = [];
    for (const e of w.heroes(this.team === 0 ? 1 : 0)) if (dist(e.pos, u.pos) <= r && w.canSee(this.team, e, u.pos) && e.status.invulnT <= 0) out.push(e);
    return out;
  }
  private enemyTowerNear(w: World, e: Entity, r: number): boolean {
    const foe = (e.team === 0 ? 1 : 0) as Team;
    for (const t of w.towers(foe)) if (t.active && dist(t.pos, e.pos) - e.radius <= r) return true;
    return false;
  }
  private alliedMinionsNear(w: World, u: Unit, r: number): number {
    let n = 0;
    for (const m of w.units(this.team)) if (!m.isHero && dist(m.pos, u.pos) <= r) n++;
    return n;
  }
  private pickFightTarget(_w: World, u: Unit, enemies: Unit[]): Unit | undefined {
    let best: Unit | undefined, bs = -Infinity;
    for (const e of enemies) {
      const d = dist(e.pos, u.pos);
      const score = (1 - e.hp / e.maxHp) * 3 + (e.def.role === 'marksman' || e.def.role === 'mage' ? 1 : 0) - d * 0.12;
      if (score > bs) { bs = score; best = e; }
    }
    return best;
  }
  private objectiveUp(w: World): Unit | undefined {
    for (const m of w.units(NEUTRAL)) if (m.def.monster?.boss) return m;
    return undefined;
  }

  // ------------------------------------------------------------------ acting (every tick)

  private act(w: World, seat: Seat, u: Unit, b: Brain, cmd: HeroCommand, dt: number): void {
    const team = this.team;
    switch (b.mode) {
      case 'fountain': return; // stand and heal
      case 'recall': {
        const enemies = this.nearbyEnemyHeroes(w, u, 9);
        if (enemies.length || this.enemyMinionsNear(w, u, 4)) { b.mode = 'retreat'; break; }
        if (u.recallT <= 0 && !inFountain(u.pos, team)) cmd.recall = true;
        return;
      }
      case 'retreat': {
        const dest = this.retreatPoint(w, u);
        this.moveTo(w, u, b, dest, cmd, dt);
        // kite: shoot back while retreating if ranged
        const foe = this.nearbyEnemyHeroes(w, u, u.def.range + 0.5)[0];
        if (foe && u.def.range > 3) { cmd.aim = this.lead(w, u, foe); cmd.attack = u.attackCd <= 0; }
        const chaser = this.nearbyEnemyHeroes(w, u, 4)[0];
        if (chaser && u.hp / u.maxHp < 0.3) { if (u.flashCd <= 0) cmd.flash = true; else if (u.dashCd <= 0) cmd.dash = true; }
        this.useEscapeSkill(w, u, cmd, dest);
        return;
      }
      case 'fight': {
        const t = w.getUnit(b.targetId);
        if (!t || t.dead || !w.canSee(team, t, u.pos) || dist(t.pos, u.pos) > 14) { b.mode = 'lane'; b.decideT = 0; break; }
        this.fight(w, u, b, t, cmd, dt);
        return;
      }
      case 'help': {
        const a = w.getUnit(b.targetId);
        if (!a || a.dead) { b.mode = 'lane'; break; }
        const foe = this.nearbyEnemyHeroes(w, u, 9)[0];
        if (foe) { b.mode = 'fight'; b.targetId = foe.id; this.fight(w, u, b, foe, cmd, dt); return; }
        this.moveTo(w, u, b, a.pos, cmd, dt);
        return;
      }
      case 'objective': {
        const m = w.getUnit(b.targetId);
        if (!m || m.dead) { b.mode = 'lane'; break; }
        const foe = this.nearbyEnemyHeroes(w, u, 7)[0];
        if (foe && foe.hp / foe.maxHp < 0.5) { b.mode = 'fight'; b.targetId = foe.id; this.fight(w, u, b, foe, cmd, dt); return; }
        this.attackUnit(w, u, b, m, cmd, dt);
        return;
      }
      case 'jungle': { this.jungle(w, seat, u, b, cmd, dt); return; }
      case 'push': {
        const foe = this.nearbyEnemyHeroes(w, u, 8)[0];
        if (foe && foe.hp / foe.maxHp < 0.6) { b.mode = 'fight'; b.targetId = foe.id; this.fight(w, u, b, foe, cmd, dt); return; }
        const tower = this.pushTarget(w, u);
        if (!tower) { b.mode = 'group'; break; }
        const d = dist(tower.pos, u.pos) - tower.radius;
        cmd.aim = { ...tower.pos };
        if (d <= u.def.range + 0.3) { cmd.attack = u.attackCd <= 0; if (u.def.role !== 'mage') this.useWaveSkillOnTower(w, u, cmd); }
        else this.moveTo(w, u, b, tower.pos, cmd, dt);
        return;
      }
      case 'group': {
        // group at the most advanced allied minion wave in mid, then push
        const front = this.laneFront(w, 1);
        const foe = this.nearbyEnemyHeroes(w, u, 8)[0];
        if (foe) { b.mode = 'fight'; b.targetId = foe.id; this.fight(w, u, b, foe, cmd, dt); return; }
        this.laneBehaviour(w, u, b, 1, front, cmd, dt);
        return;
      }
      default: {
        const lane = (seat.lane === 3 ? 1 : seat.lane) as LaneId;
        const front = this.laneFront(w, lane);
        this.laneBehaviour(w, u, b, lane, front, cmd, dt);
        return;
      }
    }
    // fallthrough after a mode change: do a light default step
    this.moveTo(w, u, b, b.dest ?? this.laneFront(w, (seat.lane === 3 ? 1 : seat.lane) as LaneId), cmd, dt);
  }

  /** The enemy structure to push: the active tower on the lane where our wave is deepest, else the nearest active one. */
  private pushTarget(w: World, u: Unit): Entity | undefined {
    const foe = (this.team === 0 ? 1 : 0) as Team;
    const towers = w.towers(foe).filter((t) => t.active);
    if (!towers.length) return undefined;
    let best: Entity | undefined, bd = Infinity;
    for (const t of towers) {
      const minions = this.alliedMinionsNear(w, t as never, 9);
      const d = dist(t.pos, u.pos) - minions * 6 + (t.tier === 'crystal' ? -10 : 0);
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }
  private useWaveSkillOnTower(w: World, u: Unit, cmd: HeroCommand): void {
    for (const i of [1, 0]) { const a = u.def.skills[i]; if (a && skillReady(u, i) && (a.kind === 'selfBuff' || a.kind === 'spin') && u.mana > u.maxMana * 0.4 && w.rng.chance(0.3)) { cmd.skill = i; return; } }
  }

  private enemyMinionsNear(w: World, u: Unit, r: number): number {
    let n = 0;
    for (const m of w.units((this.team === 0 ? 1 : 0) as Team)) if (!m.isHero && dist(m.pos, u.pos) <= r) n++;
    return n;
  }

  /** The point on a lane where our wave currently is (or our outermost standing tower). */
  private laneFront(w: World, lane: LaneId): Vec {
    const team = this.team;
    const path = lanePath(lane, team);
    let best = -1;
    for (const m of w.units(team)) {
      if (m.isHero || m.lane !== lane || m.def.kind !== 'minion') continue;
      const prog = laneProgress(path, m.pos);
      if (prog > best) best = prog;
    }
    // never go deeper than just outside the next enemy tower unless minions are there
    const foe = (team === 0 ? 1 : 0) as Team;
    // lane ids are per team (mirrored): the enemy's towers on this physical lane carry id 2 - lane
    const enemyTowers = w.towers(foe).filter((t) => t.lane === (2 - lane) && t.active);
    let cap = path.length - 1;
    for (const t of enemyTowers) { const tp = laneProgress(path, t.pos); cap = Math.min(cap, laneAdvance(path, tp, -9)); }
    if (best < 0) {
      // no wave: hold a little ahead of our most advanced tower on this lane
      const own = w.towers(team).filter((t) => t.lane === lane);
      let prog = laneAdvance(path, 0, 6);
      for (const t of own) prog = Math.max(prog, laneAdvance(path, laneProgress(path, t.pos), 3));
      return lanePoint(path, Math.min(prog, cap));
    }
    return lanePoint(path, Math.max(laneAdvance(path, 0, 3), Math.min(laneAdvance(path, best, -1.5), cap)));
  }

  private laneBehaviour(w: World, u: Unit, b: Brain, lane: LaneId, front: Vec, cmd: HeroCommand, dt: number): void {
    const team = this.team;
    const foe = (team === 0 ? 1 : 0) as Team;
    // enemy hero poke when safe
    const enemyHero = this.nearbyEnemyHeroes(w, u, u.def.range + 1.5).find((e) => !this.enemyTowerNear(w, e, 7.5));
    if (enemyHero && u.attackCd <= 0 && w.rng.chance(this.spec.aggression)) { cmd.aim = this.lead(w, u, enemyHero); cmd.attack = true; this.useSkills(w, u, enemyHero, cmd); }
    // enemy tower in range with our minions tanking: push it
    const tower = w.towers(foe).find((t) => t.active && dist(t.pos, u.pos) - t.radius <= u.def.range + 0.3);
    if (tower && this.alliedMinionsNear(w, tower as never, 7) >= 2 && !this.nearbyEnemyHeroes(w, u, 8).length) {
      const myHp = u.hp / u.maxHp;
      if (myHp > 0.45 || !this.towerTargetsMe(w, tower, u)) { cmd.aim = { ...tower.pos }; cmd.attack = u.attackCd <= 0; return; }
    }
    // farm: closest enemy minion in range (prefer last hits)
    let target: Unit | undefined, bs = -Infinity;
    for (const m of w.units(foe)) {
      if (m.isHero) continue;
      const d = dist(m.pos, u.pos) - m.radius;
      if (d > u.def.range + 0.3) continue;
      const lastHit = m.hp <= w.stats(u).attack * 1.1 ? 3 : 0;
      const score = lastHit - d * 0.2 + (m.def.minionType === 'siege' ? 0.5 : 0);
      if (score > bs) { bs = score; target = m; }
    }
    if (target && !cmd.attack) { cmd.aim = { ...target.pos }; cmd.attack = u.attackCd <= 0; if (u.def.role === 'mage' && this.alliedMinionsNear(w, u, 6) > 2) this.useWaveSkill(w, u, target, cmd); }
    // enemy jungle monster nearby and nothing else to do: take it
    const underEnemyTower = this.enemyTowerNear(w, u, 7.5);
    if (underEnemyTower && this.alliedMinionsNear(w, u, 5) < 2) { this.moveTo(w, u, b, this.retreatPoint(w, u), cmd, dt); return; }
    // supports: escort the lane partner and keep them healthy instead of farming
    let stand = u.def.range > 3 ? this.behind(w, front, lane, 2.2) : front;
    if (u.def.role === 'support') {
      const partner = this.lanePartner(w, u);
      if (partner) {
        if (target && partner.hp / partner.maxHp > 0.5 && dist(partner.pos, target.pos) < 7) { cmd.attack = false; target = undefined; }
        const toFront = norm(sub(front, partner.pos));
        stand = { x: partner.pos.x - toFront.x * 1.8, y: partner.pos.y - toFront.y * 1.8 };
        this.useSupportSkill(w, u, partner, cmd);
      }
    }
    // positioning: stay near the front, ranged stays a bit behind
    if (dist(u.pos, stand) > 1.6) this.moveTo(w, u, b, stand, cmd, dt);
    else if (target && dist(target.pos, u.pos) - target.radius > u.def.range) this.moveTo(w, u, b, target.pos, cmd, dt);
  }

  /** The allied hero a support should shadow: the closest carry (marksman first) within reach. */
  private lanePartner(w: World, u: Unit): Unit | undefined {
    let best: Unit | undefined, bs = Infinity;
    for (const h of w.heroes(this.team)) {
      if (h === u || h.recallT > 0) continue;
      const d = dist(h.pos, u.pos) - (h.def.role === 'marksman' ? 6 : h.def.role === 'mage' ? 2 : 0);
      if (d < 16 && d < bs) { bs = d; best = h; }
    }
    return best;
  }

  /** Heals and shields on a wounded partner; usable outside fights. */
  private useSupportSkill(w: World, u: Unit, partner: Unit, cmd: HeroCommand): void {
    if (cmd.skill >= 0 || !w.rng.chance(this.spec.skillUse)) return;
    const hurt = partner.hp / partner.maxHp < 0.55 || u.hp / u.maxHp < 0.5;
    for (const i of [0, 1, 2]) {
      const a = u.def.skills[i];
      if (!a || !skillReady(u, i)) continue;
      if (a.kind === 'healBurst' && hurt && dist(partner.pos, u.pos) <= (a.radius ?? 4)) { cmd.skill = i; return; }
      if (a.kind === 'aoeSelf' && a.heal && i === 2 && partner.hp / partner.maxHp < 0.4 && this.nearbyEnemyHeroes(w, u, 7).length && dist(partner.pos, u.pos) <= (a.radius ?? 4)) { cmd.skill = i; return; }
    }
  }

  private behind(_w: World, p: Vec, lane: LaneId, d: number): Vec {
    const path = lanePath(lane, this.team);
    const prog = laneProgress(path, p);
    return lanePoint(path, laneAdvance(path, prog, -d));
  }

  private towerTargetsMe(_w: World, tower: Entity, u: Unit): boolean { return tower.targetId === u.id; }

  private jungle(w: World, seat: Seat, u: Unit, b: Brain, cmd: HeroCommand, dt: number): void {
    const team = this.team;
    // gank: an enemy hero near one of our lanes, below half health, with allies nearby
    for (const e of w.heroes(team === 0 ? 1 : 0)) {
      if (e.hp / e.maxHp > 0.55 || dist(e.pos, u.pos) > 16 || this.enemyTowerNear(w, e, 7.5)) continue;
      if ([...w.heroes(team)].some((h) => h !== u && dist(h.pos, e.pos) < 8)) { b.mode = 'fight'; b.targetId = e.id; this.fight(w, u, b, e, cmd, dt); return; }
    }
    // nearest alive camp on our side (prefer buffs), else invade or farm a lane
    let best: Unit | undefined, bd = Infinity;
    for (const m of w.units(NEUTRAL)) {
      if (m.def.monster?.boss) continue;
      const own = m.camp?.startsWith(`${team}:`);
      const d = dist(m.pos, u.pos) + (own ? 0 : 12) - (m.def.monster?.buff ? 4 : 0);
      if (d < bd) { bd = d; best = m; }
    }
    if (best) { this.attackUnit(w, u, b, best, cmd, dt); return; }
    // nothing to farm: shadow the mid lane
    const front = this.laneFront(w, 1);
    this.laneBehaviour(w, u, b, 1, front, cmd, dt);
    void seat; void CAMPS; void OBJECTIVES;
  }

  private attackUnit(w: World, u: Unit, b: Brain, m: Unit, cmd: HeroCommand, dt: number): void {
    const d = dist(m.pos, u.pos) - m.radius;
    cmd.aim = { ...m.pos };
    if (d <= u.def.range) { cmd.attack = u.attackCd <= 0; if (m.def.monster?.boss || m.maxHp > 1500) this.useWaveSkill(w, u, m, cmd); }
    else this.moveTo(w, u, b, m.pos, cmd, dt);
  }

  private fight(w: World, u: Unit, b: Brain, t: Unit, cmd: HeroCommand, dt: number): void {
    const d = dist(t.pos, u.pos) - t.radius;
    cmd.aim = this.lead(w, u, t);
    const range = u.def.range;
    if (d <= range + 0.2) cmd.attack = u.attackCd <= 0;
    // melee that keeps getting kited gives up instead of eating free hits all the way to the enemy tower
    if (range <= 3) {
      b.chaseT = w.time - u.lastAttackT < 1 ? 0 : b.chaseT + dt;
      if (b.chaseT > 2.5 && t.hp / t.maxHp > 0.3) { b.mode = 'lane'; b.decideT = 0.6; b.chaseT = 0; this.moveTo(w, u, b, this.retreatPoint(w, u), cmd, dt); return; }
    }
    this.useSkills(w, u, t, cmd);
    // spacing: melee chase, ranged kite at ~80% range
    if (d > range + 0.2) this.moveTo(w, u, b, t.pos, cmd, dt);
    else if (range > 3 && d < range * 0.5) { const away = norm(sub(u.pos, t.pos)); cmd.move = away; }
    else if (range <= 3 && d < range * 0.3) { /* stay */ }
    // gap close
    if (d > range + 1.5 && d < 6 && u.dashCd <= 0 && w.rng.chance(this.spec.skillUse * 0.5)) cmd.dash = true;
  }

  /** Where to aim a projectile at a moving target. */
  private lead(w: World, u: Unit, t: Unit): Vec {
    const err = (1 - this.spec.accuracy) * 1.2;
    const speed = (u.def.projectileSpeed ?? 12) * 1.15;
    const tt = dist(t.pos, u.pos) / speed;
    const vel = sub(t.pos, t.lastPos);
    return { x: t.pos.x + vel.x * 60 * tt + (w.rng.next() - 0.5) * err, y: t.pos.y + vel.y * 60 * tt + (w.rng.next() - 0.5) * err };
  }

  /** Offensive skill use against a hero. */
  private useSkills(w: World, u: Unit, t: Unit, cmd: HeroCommand): void {
    if (w.time - (u as never as { lastBotSkill?: number }).lastBotSkill! < 0.35) return;
    if (!w.rng.chance(this.spec.skillUse)) return;
    const d = dist(t.pos, u.pos) - t.radius;
    const order = [2, 0, 1];
    for (const i of order) {
      const a = u.def.skills[i];
      if (!a || !skillReady(u, i)) continue;
      // keep the ult for a real fight
      if (i === 2 && t.hp / t.maxHp > 0.85 && this.nearbyEnemyHeroes(w, u, 8).length < 2) continue;
      let ok = false;
      switch (a.kind) {
        case 'dashStrike': case 'leap': ok = d > 1 && d <= (a.range ?? 4) + 0.5; break;
        case 'blink': ok = u.def.range <= 3 && d > u.def.range + 0.5 && d <= (a.range ?? 5) + u.def.range; break;
        case 'aoeAim': ok = d <= (a.range ?? 6) + 0.5; break;
        case 'lineShot': case 'spreadShot': ok = d <= (a.range ?? 6); break;
        case 'cone': ok = d <= (a.radius ?? 3) - 0.3; break;
        case 'aoeSelf': ok = a.heal ? u.hp / u.maxHp < 0.6 : d <= (a.radius ?? 2.5) - 0.2; break;
        case 'spin': ok = d <= (a.radius ?? 2) + 0.5; break;
        case 'selfBuff': ok = a.invuln ? (d <= u.def.range + 3 && (u.hp / u.maxHp < 0.6 || this.nearbyEnemyHeroes(w, u, 6).length >= 2)) : d <= u.def.range + 2; break;
        case 'healBurst': ok = a.cleanse ? [...w.heroes(this.team)].some((h) => dist(h.pos, u.pos) < (a.radius ?? 4) && (h.status.stun > 0 || h.status.slowT > 0.5)) : a.allyShield ? [...w.heroes(this.team)].some((h) => dist(h.pos, u.pos) < (a.radius ?? 4)) : u.hp / u.maxHp < 0.7 || [...w.heroes(this.team)].some((h) => dist(h.pos, u.pos) < (a.radius ?? 4) && h.hp / h.maxHp < 0.6); break;
        case 'chain': ok = d <= (a.range ?? 5); break;
        case 'globalShot': ok = t.isHero && d <= 18 && t.hp / t.maxHp < 0.6; break;
        case 'multiStrike': ok = d <= u.def.range + 2; break;
      }
      if (ok) { cmd.skill = i; cmd.aim = a.kind === 'blink' ? { x: t.pos.x - Math.cos(u.facing) * 0.5, y: t.pos.y - Math.sin(u.facing) * 0.5 } : this.lead(w, u, t); (u as never as { lastBotSkill?: number }).lastBotSkill = w.time; return; }
    }
  }

  /** Cheap skills for clearing waves / monsters. */
  private useWaveSkill(w: World, u: Unit, t: Unit, cmd: HeroCommand): void {
    if (!w.rng.chance(this.spec.skillUse * 0.4)) return;
    for (const i of [0, 1]) {
      const a = u.def.skills[i];
      if (!a || !skillReady(u, i) || u.mana < u.maxMana * 0.5) continue;
      if (a.kind === 'aoeAim' || a.kind === 'lineShot' || a.kind === 'spreadShot' || a.kind === 'chain') { cmd.skill = i; cmd.aim = { ...t.pos }; return; }
      if ((a.kind === 'spin' || a.kind === 'cone' || a.kind === 'aoeSelf') && !a.heal && dist(t.pos, u.pos) < (a.radius ?? 2)) { cmd.skill = i; cmd.aim = { ...t.pos }; return; }
    }
  }

  private useEscapeSkill(w: World, u: Unit, cmd: HeroCommand, dest: Vec): void {
    const chaser = this.nearbyEnemyHeroes(w, u, 5)[0];
    if (!chaser) return;
    for (const i of [0, 1, 2]) {
      const a = u.def.skills[i];
      if (!a || !skillReady(u, i)) continue;
      if (a.kind === 'blink' || a.kind === 'leap' || (a.kind === 'dashStrike' && i !== 2)) { cmd.skill = i; cmd.aim = dest; return; }
      if (a.kind === 'aoeSelf' && a.stun && dist(chaser.pos, u.pos) < (a.radius ?? 2)) { cmd.skill = i; return; }
      if (a.kind === 'healBurst' || (a.kind === 'selfBuff' && a.shield)) { cmd.skill = i; return; }
    }
    void w;
  }

  private retreatPoint(w: World, u: Unit): Vec {
    const team = this.team;
    let best: Vec = spawnPoint(team), bd = Infinity;
    for (const t of w.towers(team)) {
      const d = dist(t.pos, u.pos);
      // only towers that are "behind" us relative to the enemy base
      if (dist(t.pos, spawnPoint(team)) < dist(u.pos, spawnPoint(team)) - 1 && d < bd) { bd = d; best = { x: t.pos.x + (spawnPoint(team).x - t.pos.x) * 0.15, y: t.pos.y + (spawnPoint(team).y - t.pos.y) * 0.15 }; }
    }
    return best;
  }

  /** Steer toward a destination along a path, writing cmd.move. */
  private moveTo(w: World, u: Unit, b: Brain, dest: Vec, cmd: HeroCommand, dt: number): void {
    if (dist(u.pos, dest) < 0.25) return;
    let wp = dest;
    if (!clearLine(u.pos, dest, u.radius)) {
      b.pathT -= dt;
      if (!b.path.length || b.pathT <= 0 || !b.dest || dist(b.dest, dest) > 1.0) { b.path = findPath(u.pos, dest, u.radius); b.pathT = 0.7; b.dest = { ...dest }; }
      while (b.path.length > 1 && dist(u.pos, b.path[0]) < 0.4) b.path.shift();
      wp = b.path[0] ?? dest;
      // wedged against a wall: the first leg itself is blocked, so slide out to open ground first
      if (!clearLine(u.pos, wp, u.radius * 0.8)) { const free = nearestFree(u.pos); if (dist(free, u.pos) > 0.2) wp = free; }
    } else { b.path = []; b.dest = { ...dest }; }
    cmd.move = norm(sub(wp, u.pos));
    if (!cmd.attack && cmd.skill < 0) cmd.aim = { x: u.pos.x + cmd.move.x * 4, y: u.pos.y + cmd.move.y * 4 };
    // unstick
    if (dist(u.pos, u.lastPos) < 0.002) { b.wander += dt; if (b.wander > 0.8) { cmd.move = { x: (w.rng.next() - 0.5), y: (w.rng.next() - 0.5) }; b.path = []; if (b.wander > 1.4) b.wander = 0; } } else b.wander = 0;
  }
}

export const BOT_NAMES = ['清风', '明月', '流云', '落叶', '孤狼', '星辰', '飞羽', '青山', '霜降', '惊鸿', '云舒', '竹影', '雷鸣', '烈焰', '白露', '朝阳', '夜雨', '长歌', '听风', '望舒'];
export const mirror = mirrorPos;
