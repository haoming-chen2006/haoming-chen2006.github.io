import { add, dist, norm, pointSegDist, scale, sub, type Vec } from '../engine/math.ts';
import { other, type Entity, type Projectile, type ProjectileStyle, type Team, type Unit } from './types.ts';
import { POSSESS, STREAK_WINDOW } from './constants.ts';
import { World, canTarget } from './world.ts';

export interface DamageOpts {
  source?: Entity;
  hero?: boolean;
  buildingMult?: number;
  towerMult?: number;
  stun?: number;
  knockback?: number;
  from?: Vec;
  burn?: number;
  silent?: boolean;
  crit?: boolean;
}

const isHero = (e?: Entity): boolean => !!e && e.kind === 'unit' && e.possessed;

/** Apply damage with all the side effects (shields, status, stats, death). Returns damage dealt. */
export function damage(w: World, target: Entity, amount: number, opts: DamageOpts = {}): number {
  if (target.dead || amount <= 0) return 0;
  let amt = amount;
  if (target.kind !== 'unit' && opts.buildingMult) amt *= opts.buildingMult;
  if (target.kind === 'tower' && opts.towerMult !== undefined) amt *= opts.towerMult;
  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, amt);
    target.shield -= absorbed;
    amt -= absorbed;
    w.addEffect({ type: 'shield', pos: { ...target.pos }, dur: 0.25, radius: target.radius + 0.3, color: '#ffe9a0' });
  }
  const wasAbove = target.hp / target.maxHp >= 0.25;
  target.hp -= amt;
  target.hitFlash = 0.12;
  if (target.kind === 'unit' && target.possessed && wasAbove && target.hp > 0 && target.hp / target.maxHp < 0.25) w.emit({ type: 'lowHp', team: target.team, pos: target.pos });
  if (target.kind === 'tower' && target.towerType === 'king' && !target.active) {
    target.active = true;
    w.emit({ type: 'kingActivated', team: target.team, pos: target.pos });
  }
  const hero = opts.hero ?? isHero(opts.source);
  const srcTeam: Team = opts.source ? opts.source.team : other(target.team);
  const stats = w.players[srcTeam].stats;
  if (target.kind === 'tower') { stats.towerDamage += amt; w.emit({ type: 'towerHit', pos: target.pos, team: target.team }); }
  if (hero) stats.heroDamage += amt;
  if (opts.stun && opts.stun > 0) {
    target.status.stun = Math.max(target.status.stun, opts.stun);
    if (target.kind === 'unit') { target.charging = false; target.moveT = 0; }
    target.targetId = -1;
  }
  if (opts.burn && opts.burn > 0) { target.status.burnDps = Math.max(target.status.burnDps, opts.burn); target.status.burnT = 3; }
  if (opts.knockback && target.kind === 'unit' && opts.from) {
    const dir = norm(sub(target.pos, opts.from));
    const kb = opts.knockback * 5;
    target.vel = add(target.vel, scale(dir.x === 0 && dir.y === 0 ? { x: 0, y: -1 } : dir, kb));
    target.charging = false; target.moveT = 0;
  }
  if (!opts.silent && amt >= 1) {
    const color = opts.crit ? '#ffd166' : target.team === 0 ? '#ff8f8f' : '#fff3c4';
    w.text(target.pos, `${Math.round(amt)}`, color, opts.crit ? 0.8 : hero ? 0.62 : 0.5);
  }
  if (target.hp <= 0) kill(w, target, opts.source);
  return amt;
}

export function heal(w: World, target: Entity, amount: number): number {
  if (target.dead) return 0;
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  const healed = target.hp - before;
  if (healed >= 5) w.text(target.pos, `+${Math.round(healed)}`, '#8dff9a', 0.5);
  return healed;
}

export function kill(w: World, target: Entity, source?: Entity): void {
  if (target.dead) return;
  target.dead = true;
  target.hp = 0;
  const killerTeam: Team = source ? source.team : other(target.team);
  const killerStats = w.players[killerTeam].stats;
  if (target.kind === 'unit') {
    killerStats.unitKills += 1;
    if (isHero(source) && source) {
      const kp = w.players[killerTeam];
      killerStats.heroKills += 1;
      if (kp.harvested < POSSESS.harvestCap) {
        const gain = Math.min(POSSESS.elixirPerKill, POSSESS.harvestCap - kp.harvested);
        kp.harvested += gain;
        killerStats.elixirHarvested += gain;
        w.addElixir(kp, gain);
        w.text(source.pos, `+${gain.toFixed(1)} elixir`, '#d97bff', 0.45);
      }
      // kill streaks
      if (w.time - kp.streakT <= STREAK_WINDOW) kp.streak += 1; else kp.streak = 1;
      kp.streakT = w.time;
      killerStats.bestStreak = Math.max(killerStats.bestStreak, kp.streak);
      if (kp.streak >= 2) {
        const label = kp.streak === 2 ? 'Double kill!' : kp.streak === 3 ? 'Triple kill!' : kp.streak === 4 ? 'Quad kill!' : kp.streak === 5 ? 'Rampage!' : 'Unstoppable!';
        w.emit({ type: 'streak', team: killerTeam, pos: source.pos, text: label, big: kp.streak >= 5 });
      }
    }
    if (target.possessed) {
      const p = w.players[target.team];
      p.heroId = -1;
      p.possessCd = POSSESS.cooldownAfterDeath;
      p.stats.heroDeaths += 1;
      target.possessed = false;
      w.emit({ type: 'heroDeath', pos: target.pos, team: target.team });
      w.addEffect({ type: 'soul', pos: { ...target.pos }, dur: 1.2, radius: 1.2, color: '#ffe27a', team: target.team });
    }
    w.addEffect({ type: 'death', pos: { ...target.pos }, dur: 0.5, radius: target.radius, color: target.def.look.color, team: target.team });
    w.emit({ type: 'death', pos: target.pos, team: target.team });
  } else if (target.kind === 'tower') {
    const p = w.players[killerTeam];
    if (target.towerType === 'king') p.crowns = 3; else p.crowns = Math.min(3, p.crowns + 1);
    killerStats.towersDestroyed += 1;
    w.emit({ type: 'towerDestroyed', pos: target.pos, team: target.team, big: target.towerType === 'king' });
    w.addEffect({ type: 'crater', pos: { ...target.pos }, dur: 60, radius: target.radius, color: '#3a3128' });
    w.addEffect({ type: 'burst', pos: { ...target.pos }, dur: 0.8, radius: target.radius * 2.6, color: '#ffb347' });
    w.addEffect({ type: 'smoke', pos: { ...target.pos }, dur: 3, radius: target.radius * 1.5, color: '#6b6b6b' });
    w.addEffect({ type: 'crown', pos: { ...target.pos }, dur: 1.4, radius: 1, color: '#ffd700', team: killerTeam });
    const king = w.king(target.team);
    if (king && !king.active) { king.active = true; w.emit({ type: 'kingActivated', team: target.team, pos: king.pos }); }
    // Anyone targeting the tower needs a new target
    for (const e of w.alive()) if (e.targetId === target.id) e.targetId = -1;
  } else {
    w.addEffect({ type: 'burst', pos: { ...target.pos }, dur: 0.5, radius: target.radius * 1.8, color: '#c8b08a' });
    w.addEffect({ type: 'smoke', pos: { ...target.pos }, dur: 1.2, radius: target.radius, color: '#777' });
    w.emit({ type: 'death', pos: target.pos, team: target.team });
  }
}

/** Per-tick status effect bookkeeping (stun, freeze, rage, burn). */
export function tickStatus(w: World, e: Entity, dt: number): void {
  const s = e.status;
  if (s.stun > 0) s.stun -= dt;
  if (s.freeze > 0) s.freeze -= dt;
  if (s.rage > 0) { s.rage -= dt; if (s.rage <= 0) { s.rageSpeed = 1; s.rageAttack = 1; } }
  if (s.burnT > 0) {
    s.burnT -= dt;
    damage(w, e, s.burnDps * dt, { silent: true, towerMult: 0.4 });
    if (w.rng.chance(dt * 6)) w.addEffect({ type: 'flame', pos: { x: e.pos.x + (w.rng.next() - 0.5) * e.radius, y: e.pos.y - e.radius * 0.5 }, dur: 0.4, radius: 0.25, color: '#ff8c3a', vel: { x: 0, y: -1.5 } });
    if (s.burnT <= 0) s.burnDps = 0;
  }
  if (e.hitFlash > 0) e.hitFlash -= dt;
  if (e.attackAnim > 0) e.attackAnim = Math.max(0, e.attackAnim - dt * 3.5);
}

export interface FireOpts {
  team: Team;
  from: Vec;
  style: ProjectileStyle;
  speed: number;
  damage: number;
  sourceId: number;
  hero?: boolean;
  mode?: 'homing' | 'linear' | 'lob';
  targetId?: number;
  dir?: Vec;
  maxDist?: number;
  splash?: number;
  splashAir?: boolean;
  hitsAir?: boolean;
  hitsGround?: boolean;
  pierce?: boolean;
  stun?: number;
  knockback?: number;
  buildingMult?: number;
  burn?: number;
  chain?: { count: number; range: number; stun: number };
  lobTo?: Vec;
  radius?: number;
}

export function fireProjectile(w: World, o: FireOpts): Projectile {
  const lobTo = o.lobTo ?? o.from;
  const lobDist = dist(o.from, lobTo);
  const p: Projectile = {
    id: w.newProjectileId(), team: o.team, pos: { ...o.from }, prev: { ...o.from }, style: o.style, speed: o.speed, damage: o.damage,
    mode: o.mode ?? 'homing', targetId: o.targetId ?? -1, dir: o.dir ?? { x: 0, y: -1 }, maxDist: o.maxDist ?? 12, traveled: 0,
    splash: o.splash ?? 0, splashAir: o.splashAir ?? true, hitsAir: o.hitsAir ?? true, hitsGround: o.hitsGround ?? true,
    pierce: o.pierce ?? false, hitIds: new Set(), sourceId: o.sourceId, stun: o.stun ?? 0, knockback: o.knockback ?? 0,
    buildingMult: o.buildingMult ?? 1, burn: o.burn ?? 0, chain: o.chain, lobFrom: { ...o.from }, lobTo: { ...lobTo }, lobT: 0,
    lobDur: Math.max(0.35, lobDist / o.speed), height: 0, dead: false, hero: o.hero ?? false, radius: o.radius ?? 0.18,
  };
  w.projectiles.push(p);
  return p;
}

const projectileCanHit = (p: Projectile, e: Entity): boolean => {
  if (e.dead || e.team === p.team) return false;
  if (e.flying && !p.hitsAir) return false;
  if (!e.flying && !p.hitsGround) return false;
  return true;
};

function impact(w: World, p: Projectile, primary: Entity | null, at: Vec): void {
  const src = w.get(p.sourceId);
  const opts = { source: src, hero: p.hero, stun: p.stun, knockback: p.knockback, from: at, buildingMult: p.buildingMult, burn: p.burn };
  if (p.splash > 0) {
    for (const e of w.within(at, p.splash, (x) => projectileCanHit(p, x) && (p.splashAir || !x.flying || x === primary))) {
      damage(w, e, p.damage, opts);
    }
    w.addEffect({ type: 'burst', pos: { ...at }, dur: 0.35, radius: p.splash, color: styleColor(p.style) });
  } else if (primary) {
    damage(w, primary, p.damage, opts);
    w.addEffect({ type: 'spark', pos: { ...at }, dur: 0.2, radius: 0.3, color: styleColor(p.style) });
  }
  if (p.chain && primary) {
    let last: Entity = primary;
    const hit = new Set<number>([primary.id]);
    for (let i = 0; i < p.chain.count; i++) {
      let best: Entity | null = null, bd = Infinity;
      for (const e of w.enemiesOf(p.team)) {
        if (hit.has(e.id) || !projectileCanHit(p, e)) continue;
        const d = dist(e.pos, last.pos);
        if (d <= p.chain.range && d < bd) { bd = d; best = e; }
      }
      if (!best) break;
      hit.add(best.id);
      w.addEffect({ type: 'lightning', pos: { ...last.pos }, to: { ...best.pos }, dur: 0.25, radius: 0.1, color: '#bfe6ff' });
      damage(w, best, p.damage, { ...opts, stun: p.chain.stun });
      last = best;
    }
  }
  w.emit({ type: 'hit', pos: at, style: p.style, hero: p.hero, team: p.team });
}

export function styleColor(style: ProjectileStyle): string {
  switch (style) {
    case 'arrow': return '#e8d9b0';
    case 'spear': return '#c9b458';
    case 'fireball': return '#ff8c3a';
    case 'bolt': return '#9fd3ff';
    case 'bomb': return '#ffb347';
    case 'cannonball': return '#cfcfcf';
    case 'flame': return '#ffb347';
    case 'shadow': return '#b67cff';
    case 'holy': return '#fff2b0';
    case 'rock': return '#c8b08a';
    case 'ice': return '#bfefff';
  }
}

export function updateProjectiles(w: World, dt: number): void {
  for (const p of w.projectiles) {
    if (p.dead) continue;
    p.prev = { ...p.pos };
    if (p.mode === 'homing') {
      const t = w.get(p.targetId);
      if (!t) {
        // target vanished: splash projectiles still land where they were heading
        if (p.splash > 0) impact(w, p, null, p.pos);
        p.dead = true;
        continue;
      }
      const d = dist(p.pos, t.pos);
      const step = p.speed * dt;
      if (d <= t.radius + step * 0.5 + 0.05) { impact(w, p, t, t.pos); p.dead = true; continue; }
      const dir = norm(sub(t.pos, p.pos));
      p.dir = dir;
      p.pos = add(p.pos, scale(dir, step));
    } else if (p.mode === 'linear') {
      const step = p.speed * dt;
      p.pos = add(p.pos, scale(p.dir, step));
      p.traveled += step;
      // swept collision against enemies
      let best: Entity | null = null, bestT = Infinity;
      for (const e of w.enemiesOf(p.team)) {
        if (!projectileCanHit(p, e) || p.hitIds.has(e.id)) continue;
        if (pointSegDist(e.pos, p.prev, p.pos) <= e.radius + p.radius) {
          const t = dist(p.prev, e.pos);
          if (t < bestT) { bestT = t; best = e; }
        }
      }
      if (best) {
        p.hitIds.add(best.id);
        impact(w, p, best, best.pos);
        if (!p.pierce) { p.dead = true; continue; }
      }
      if (p.traveled >= p.maxDist || p.pos.x < -1 || p.pos.x > 19 || p.pos.y < -1 || p.pos.y > 33) {
        if (p.splash > 0 && !p.pierce) impact(w, p, null, p.pos);
        p.dead = true;
      }
    } else {
      p.lobT += dt / p.lobDur;
      const t = Math.min(1, p.lobT);
      p.pos = { x: p.lobFrom.x + (p.lobTo.x - p.lobFrom.x) * t, y: p.lobFrom.y + (p.lobTo.y - p.lobFrom.y) * t };
      p.height = Math.sin(t * Math.PI) * Math.min(2.5, 0.6 + dist(p.lobFrom, p.lobTo) * 0.35);
      if (t >= 1) {
        const primary = p.targetId >= 0 ? w.get(p.targetId) ?? null : null;
        impact(w, p, primary && dist(primary.pos, p.lobTo) <= primary.radius + 0.4 ? primary : null, p.lobTo);
        p.dead = true;
      }
    }
  }
}

/** Instant area damage (spells and abilities). */
export function areaDamage(w: World, team: Team, at: Vec, radius: number, amount: number, opts: DamageOpts & { hitsAir?: boolean; hitsGround?: boolean } = {}): Entity[] {
  const hits = w.within(at, radius, (e) => e.team !== team && ((opts.hitsAir ?? true) || !e.flying) && ((opts.hitsGround ?? true) || e.flying));
  for (const e of hits) damage(w, e, amount, { ...opts, from: opts.from ?? at });
  return hits;
}

/** Melee hit from a unit at its current target (or all in splash radius). */
export function meleeHit(w: World, u: Unit, target: Entity, dmg: number, extra: DamageOpts = {}): void {
  const opts: DamageOpts = { source: u, ...extra };
  if (u.def.splash > 0) {
    const center = target.pos;
    for (const e of w.within(center, u.def.splash, (x) => x.team !== u.team && (u.def.splashAir || !x.flying || x === target) && canTarget(u.possessed ? 'both' : u.def.targets, x))) {
      damage(w, e, dmg, opts);
    }
    w.addEffect({ type: 'slash', pos: { ...u.pos }, dur: 0.25, radius: u.def.splash + 0.2, color: u.def.look.accent, angle: u.facing, arc: Math.PI * 2 });
  } else {
    damage(w, target, dmg, opts);
    w.addEffect({ type: 'slash', pos: { ...u.pos }, dur: 0.18, radius: u.def.range + u.radius + 0.2, color: '#ffffff', angle: u.facing, arc: 1.4 });
  }
  w.emit({ type: 'hit', pos: target.pos, style: u.def.look.weapon === 'none' ? 'rock' : 'arrow', hero: u.possessed, team: u.team });
}
