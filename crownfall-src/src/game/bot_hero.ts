import { add, angleOf, dist, fromAngle, norm, scale, sub, type Vec } from '../engine/math.ts';
import type { DifficultyConfig } from './bot.ts';
import { ARENA_H, POSSESS, RIVER_MID } from './constants.ts';
import { canPossess, idleCommand, possess, type HeroCommand } from './hero.ts';
import { nextWaypoint, pathDistance } from './terrain.ts';
import type { Entity, Team, Unit } from './types.ts';
import { canTarget, World } from './world.ts';

/**
 * Drives the bot's possessed champion with the same HeroCommand interface the player uses,
 * and decides when the bot should possess or let go of a troop.
 */
export class BotHero {
  readonly team: Team;
  private cfg: DifficultyConfig;
  private thinkT = 0;
  private targetId = -1;
  private aim: Vec = { x: 9, y: 16 };
  private strafeDir = 1;
  private strafeT = 0;
  private retreatT = 0;
  private lastPossessAt = -100;
  private possessedAt = 0;
  private abilityHoldT = 0;

  constructor(team: Team, cfg: DifficultyConfig) {
    this.team = team;
    this.cfg = cfg;
  }

  private forwardSign(): number { return this.team === 1 ? 1 : -1; } // direction toward the enemy along y

  /** Called every tick. Returns the command for this tick (idle when not possessing). */
  update(w: World, dt: number): HeroCommand {
    const p = w.players[this.team];
    const hero = w.hero(this.team);
    if (!hero) {
      this.maybePossess(w);
      return idleCommand();
    }
    p.stats.heroTime += dt;
    this.thinkT -= dt;
    if (this.retreatT > 0) this.retreatT -= dt;
    if (this.abilityHoldT > 0) this.abilityHoldT -= dt;
    if (this.thinkT <= 0) {
      this.thinkT = this.cfg.heroReaction * (0.8 + w.rng.next() * 0.4);
      this.think(w, hero);
    }
    return this.drive(w, hero, dt);
  }

  private maybePossess(w: World): void {
    const p = w.players[this.team];
    if (this.cfg.possessChance <= 0 || p.possessCd > 0 || p.heroId >= 0) return;
    if (w.time - this.lastPossessAt < this.cfg.possessCooldown) return;
    if (w.phase !== 'regulation' && w.phase !== 'overtime') return;
    // Only troops worth becoming: no swarm chaff, no spawner output, fully deployed.
    let best: Unit | undefined;
    let bestScore = 0;
    for (const u of w.units(this.team)) {
      if (!u.def.possessable || u.deployT > 0 || u.fromSpawner || u.def.role === 'swarm' || u.def.count > 2) continue;
      if (u.hp < u.maxHp * 0.5) continue;
      const roleScore = u.def.role === 'tank' || u.def.role === 'wincon' ? 3 : u.def.role === 'assassin' || u.def.role === 'dps' ? 2.5 : u.def.role === 'air' ? 1.8 : 1.4;
      const fresh = w.time - u.bornAt < 3 ? 1.2 : 0.6;
      const crossing = Math.abs(u.pos.y - RIVER_MID) < 4 ? 1.5 : 1;
      const score = roleScore * fresh * crossing * (u.hp / 1500 + 0.5);
      if (score > bestScore) { bestScore = score; best = u; }
    }
    if (!best) return;
    // Roll once per candidate window so possession feels deliberate rather than constant.
    if (!w.rng.chance(this.cfg.possessChance * 0.08)) return;
    if (possess(w, this.team, best.id)) {
      this.lastPossessAt = w.time;
      this.possessedAt = w.time;
      this.targetId = -1;
      this.retreatT = 0;
      w.emit({ type: 'botPossess', team: this.team, pos: best.pos, text: best.def.name });
    }
  }

  /** Pick a target and decide on mode changes; runs every reaction interval. */
  private think(w: World, hero: Unit): void {
    const d = hero.def;
    // targets: closest enemy troop in sight, else the nearest enemy structure
    let best: Entity | undefined;
    let bd = Infinity;
    for (const e of w.enemiesOf(this.team)) {
      if (e.kind === 'unit' && e.deployT > 0) continue;
      const dd = dist(e.pos, hero.pos) - e.radius;
      // buildings-only troops keep marching at structures unless something is in their face
      if (d.targets === 'buildings' && e.kind === 'unit' && dd > 1.6) continue;
      if (e.kind === 'unit' && !canTarget(d.targets === 'buildings' ? 'both' : d.targets, e)) continue;
      const weight = e.kind === 'unit' ? (e.possessed ? 0.6 : 1) : (dd > d.sight ? 2.2 : 1.3);
      const score = dd * weight;
      if (score < bd) { bd = score; best = e; }
    }
    if (!best) {
      let sb = Infinity;
      for (const e of w.enemiesOf(this.team)) if (e.kind !== 'unit') { const pd = pathDistance(hero.pos, e.pos, hero.flying); if (pd < sb) { sb = pd; best = e; } }
    }
    this.targetId = best ? best.id : -1;
    // aim with difficulty-dependent jitter
    if (best) {
      const j = this.cfg.heroAimJitter;
      this.aim = { x: best.pos.x + (w.rng.next() - 0.5) * 2 * j, y: best.pos.y + (w.rng.next() - 0.5) * 2 * j };
    }
    // retreat decision
    const hpFrac = hero.hp / hero.maxHp;
    if (hpFrac < 0.3 && this.retreatT <= 0) {
      const allyNear = [...w.units(this.team)].some((u) => u !== hero && dist(u.pos, hero.pos) < 3.5);
      if (!allyNear) this.retreatT = 3.5;
    }
    this.strafeT -= this.cfg.heroReaction;
    if (this.strafeT <= 0) { this.strafeT = 1.2 + w.rng.next() * 1.4; this.strafeDir = w.rng.chance(0.5) ? 1 : -1; }
  }

  private drive(w: World, hero: Unit, dt: number): HeroCommand {
    const cmd = idleCommand();
    const d = hero.def;
    const p = w.players[this.team];
    const target = w.get(this.targetId);
    const enemyKing = w.king(this.team === 0 ? 1 : 0);
    cmd.aim = target ? { ...this.aim } : enemyKing ? { ...enemyKing.pos } : { x: hero.pos.x, y: hero.pos.y + this.forwardSign() * 3 };
    const hpFrac = hero.hp / hero.maxHp;

    // Let go of a hopeless champion so the bot can possess something fresh later.
    const hopeless = hpFrac < 0.18 && this.retreatT <= 0;
    const stale = w.time - this.possessedAt > 45;
    if (hopeless || stale) {
      cmd.release = true;
      w.emit({ type: 'botRelease', team: this.team, pos: hero.pos, text: d.name });
      return cmd;
    }

    if (this.retreatT > 0) {
      // fall back toward our king tower, dashing away from the closest enemy
      const home = w.king(this.team);
      const goal = home ? home.pos : { x: hero.pos.x, y: hero.pos.y - this.forwardSign() * 5 };
      const wp = nextWaypoint(hero.pos, goal, hero.flying, hero.radius);
      cmd.move = norm(sub(wp, hero.pos));
      let nearest: Entity | undefined; let nd = Infinity;
      for (const e of w.enemiesOf(this.team)) { const dd = dist(e.pos, hero.pos); if (dd < nd) { nd = dd; nearest = e; } }
      if (nearest && nd < 3 && hero.dashCd <= 0) cmd.dash = true;
      if (d.ability.kind === 'healBurst' && hero.abilityCd <= 0) cmd.ability = true;
      if (d.ability.kind === 'blink' && hero.abilityCd <= 0) { cmd.ability = true; cmd.aim = goal; }
      return cmd;
    }

    if (!target) {
      // march on
      const goal = enemyKing ? enemyKing.pos : { x: 9, y: this.team === 1 ? ARENA_H : 0 };
      const wp = nextWaypoint(hero.pos, goal, hero.flying, hero.radius);
      cmd.move = norm(sub(wp, hero.pos));
      return cmd;
    }

    const edge = dist(hero.pos, target.pos) - target.radius;
    const ranged = !!d.projectile && d.range >= 3;
    const wp = nextWaypoint(hero.pos, target.pos, hero.flying, hero.radius);
    const toward = norm(sub(wp, hero.pos));
    const sameSide = (hero.pos.y < RIVER_MID) === (target.pos.y < RIVER_MID) || hero.flying;
    if (ranged) {
      const ideal = d.range * 0.75;
      if (edge > d.range * 0.95) cmd.move = toward;
      else if (edge < d.range * 0.4 && target.kind === 'unit' && sameSide) cmd.move = scale(toward, -1);
      else if (sameSide) {
        // strafe around the target to dodge return fire
        const perp = fromAngle(angleOf(toward) + Math.PI / 2 * this.strafeDir);
        cmd.move = norm(add(perp, scale(toward, edge > ideal ? 0.4 : -0.2)));
      }
      cmd.attack = edge <= d.range + 1.2;
    } else {
      cmd.move = edge > d.range * 0.6 ? toward : { x: 0, y: 0 };
      cmd.attack = edge <= d.range + 0.35;
    }

    // signature ability when it will do something
    if (hero.abilityCd <= 0 && hero.abilityT <= 0) {
      const a = d.ability;
      const enemiesNear = (r: number, at: Vec = hero.pos) => w.within(at, r, (e) => e.team !== this.team && e.kind === 'unit').length;
      let use = false;
      switch (a.kind) {
        case 'dashStrike': case 'leap': use = edge > 1.2 && edge <= (a.range ?? 4) + 0.5 && sameSide; break;
        case 'aoeSelf': case 'spin': use = enemiesNear(a.radius ?? 2) >= 2 || edge <= (a.radius ?? 2) * 0.8; break;
        case 'aoeAim': use = dist(target.pos, hero.pos) <= (a.range ?? 5) + 0.5 && (enemiesNear(a.radius ?? 2, target.pos) >= 2 || target.kind !== 'unit' || target.hp > 800); break;
        case 'lineShot': case 'spreadShot': case 'cone': case 'chain': use = edge <= (a.range ?? 5); break;
        case 'blink': use = edge > 3 && edge <= (a.range ?? 5) + 1; break;
        case 'summon': use = enemiesNear(5) >= 1; break;
        case 'selfBuff': use = edge <= 3; break;
        case 'healBurst': use = hpFrac < 0.55 || [...w.units(this.team)].some((u) => u !== hero && dist(u.pos, hero.pos) < (a.radius ?? 3) && u.hp < u.maxHp * 0.6); break;
      }
      if (use) { cmd.ability = true; this.abilityHoldT = 0.1; }
    }
    if (this.abilityHoldT > 0) cmd.ability = true;

    // dash to close the gap on melee targets, or to escape when hurt
    if (hero.dashCd <= 0) {
      if (hpFrac < 0.3 && edge < 2.5) { cmd.dash = true; this.retreatT = 3; }
      else if (!ranged && edge > 3.5 && edge < POSSESS.dashDist + 4 && sameSide && this.cfg.aggression > 0.7) cmd.dash = true;
    }
    void p; void dt;
    return cmd;
  }

  /** Whether this bot ever possesses (used by tests/UI). */
  static enabled(cfg: DifficultyConfig): boolean { return cfg.possessChance > 0; }
}

export { canPossess };
