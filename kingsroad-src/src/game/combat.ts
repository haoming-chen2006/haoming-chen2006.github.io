import { dsin } from '../engine/dmath.ts';
import { add, dist, norm, pointSegDist, scale, sub, type Vec } from '../engine/math.ts';
import { ASSIST_GOLD, HERO_KILL_GOLD, HERO_KILL_XP, MAP_H, MAP_W, MINION_GOLD, MINION_XP, RESPAWN_BASE, RESPAWN_PER_LEVEL, STREAK_WINDOW, TOWER_GOLD, XP_SHARE_RANGE } from './constants.ts';
import { NEUTRAL, other, type DamageType, type Entity, type Projectile, type ProjectileStyle, type Seat, type Side, type Team, type Unit } from './types.ts';
import { World, canTarget } from './world.ts';
import { towerAggro } from './structures.ts';
import { callGuardians } from './waves.ts';

export interface DamageOpts {
  source?: Entity;
  hero?: boolean;
  type?: DamageType;
  buildingMult?: number;
  towerMult?: number;
  stun?: number;
  slow?: number;
  slowT?: number;
  knockback?: number;
  from?: Vec;
  burn?: number;
  silent?: boolean;
  crit?: boolean;
  execute?: number;
  noVamp?: boolean;
  /** Damage came from a skill (charges the crown). */
  skill?: boolean;
  crowned?: boolean;
  /** Damage produced by an item passive; never re-triggers passives. */
  chain?: boolean;
}

const isHeroUnit = (e?: Entity): e is Unit => !!e && e.kind === 'unit' && e.isHero;

/** HoK-style mitigation: 600 / (600 + defence). */
const mitigate = (amount: number, def: number): number => amount * (600 / (600 + Math.max(0, def)));

/** Apply damage with all the side effects (mitigation, shields, status, stats, death). Returns damage dealt. */
export function damage(w: World, target: Entity, amount: number, opts: DamageOpts = {}): number {
  if (target.dead || amount <= 0) return 0;
  if (target.status.invulnT > 0) return 0;
  let amt = amount;
  const type = opts.type ?? 'physical';
  if (type === 'physical') amt = mitigate(amt, target.armor);
  else if (type === 'magic') amt = mitigate(amt, target.resist);
  if (target.kind !== 'unit' && opts.buildingMult) amt *= opts.buildingMult;
  if (target.kind === 'tower' && opts.towerMult !== undefined) amt *= opts.towerMult;
  if (opts.execute && target.kind === 'unit') amt += (target.maxHp - target.hp) * opts.execute;
  if (opts.crowned) amt *= 1.5;
  if (target.kind === 'unit' && target.wardT > 0) amt *= 0.7; // Stone Body
  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, amt);
    target.shield -= absorbed;
    amt -= absorbed;
    w.addEffect({ type: 'shield', pos: { ...target.pos }, dur: 0.25, radius: target.radius + 0.3, color: '#ffe9a0' });
  }
  const wasAbove = target.hp / target.maxHp >= 0.25;
  target.hp -= amt;
  target.hitFlash = 0.12;
  if (target.kind === 'unit') {
    target.damageTaken += amt;
    if (opts.source && opts.source.kind === 'unit' && opts.source.isHero && opts.source.team !== target.team) {
      const rec = target.lastHurtBy.find((r) => r.id === opts.source!.id);
      if (rec) rec.t = w.time; else target.lastHurtBy.push({ id: opts.source.id, t: w.time });
      if (target.lastHurtBy.length > 8) target.lastHurtBy.shift();
    }
    if (target.possessed && wasAbove && target.hp > 0 && target.hp / target.maxHp < 0.25) w.emit({ type: 'lowHp', team: target.team, pos: target.pos });
    // Xuanwu's Mountain: every 500 damage taken hardens him (+14 armour/resist per stack, 5 stacks, 8 s)
    if (target.isHero && target.def.id === 'xuanwu') {
      target.passiveN += amt;
      if (target.passiveN >= 500) { target.passiveN -= 500; target.passiveStacks = Math.min(5, target.passiveStacks + 1); target.passiveT = 8; w.refreshDerived(target); w.addEffect({ type: 'shield', pos: { ...target.pos }, dur: 0.4, radius: target.radius + 0.4, color: '#c9d6e3' }); }
    }
    if (target.recallT > 0) { target.recallT = 0; if (target.possessed) w.emit({ type: 'invalid', text: '@toast.recallInterrupted', team: target.team }); }
    // frost heart passive: attackers are slowed
    if (target.isHero && target.items.includes('frost_heart') && opts.source && opts.source.kind === 'unit') { opts.source.status.slow = Math.max(opts.source.status.slow, 0.3); opts.source.status.slowT = Math.max(opts.source.status.slowT, 1); }
  }
  const src = opts.source;
  if (src && src.kind === 'unit' && src.team !== NEUTRAL) {
    const stats = w.players[src.team as Team].stats;
    const seat = w.seatOf(src);
    if (target.kind === 'tower') {
      stats.towerDamage += amt; if (seat) seat.stats.towerDamage += amt; w.emit({ type: 'towerHit', pos: target.pos, team: target.team });
      // a wounded crystal calls its guardians (once)
      if (target.tier === 'crystal' && !target.guardians && target.hp > 0 && target.hp < target.maxHp * 0.4) { target.guardians = true; callGuardians(w, target.team as Team, target.pos); }
    }
    if (isHeroUnit(target)) {
      stats.heroDamage += amt; if (seat) seat.stats.heroDamage += amt; if (src.isHero) towerAggro(w, src, target);
      // resonance: skill hits on enemy heroes charge the crown
      if (src.isHero && opts.skill && !opts.crowned && amt > 0) {
        src.crown = Math.min(100, src.crown + 25);
        if (src.crown >= 100 && !src.crowned) { src.crowned = true; w.addEffect({ type: 'crown', pos: { ...src.pos }, dur: 1.0, radius: 1, color: '#ffd700', team: src.team }); w.emit({ type: 'crown', team: src.team, pos: src.pos, hero: src.possessed }); }
      }
      if (opts.crowned) { target.status.stun = Math.max(target.status.stun, 0.5); }
    }
    if (src.isHero && target.kind === 'unit' && !opts.chain && amt > 0) {
      // Storm Lance: every fourth basic attack calls down a bolt that forks to nearby enemies
      if (!opts.skill && type === 'physical' && src.items.includes('storm_lance')) {
        src.stormN += 1;
        if (src.stormN >= 4) {
          src.stormN = 0;
          const bolt = w.stats(src).attack * 0.35 + 40;
          const forks: Unit[] = [];
          for (const e of w.units(target.team as Team)) if (e !== target && !e.dead && dist(e.pos, target.pos) <= 3.5 && canTarget(src.def.targets, e)) forks.push(e);
          forks.sort((a, b) => dist(a.pos, target.pos) - dist(b.pos, target.pos));
          w.addEffect({ type: 'lightning', pos: { ...target.pos }, to: { ...target.pos }, dur: 0.35, radius: 0.4, color: '#e8fbff', team: src.team });
          for (const e of forks.slice(0, 2)) w.addEffect({ type: 'lightning', pos: { ...target.pos }, to: { ...e.pos }, dur: 0.3, radius: 0.15, color: '#7cf7d5', team: src.team });
          w.emit({ type: 'spell', pos: target.pos, team: src.team, text: 'storm' });
          for (const e of [target, ...forks.slice(0, 2)]) damage(w, e, bolt, { source: src, hero: true, type: 'magic', chain: true, noVamp: true, slow: 0.25, slowT: 0.8 });
        }
      }
      // Void Staff: skills mark enemy heroes; the third mark detonates for a slice of their health
      if (opts.skill && target.isHero && src.items.includes('void_staff')) {
        target.voidMarks += 1;
        if (target.voidMarks >= 3) {
          target.voidMarks = 0;
          const pop = target.maxHp * 0.07 + w.stats(src).power * 0.4;
          w.addEffect({ type: 'burst', pos: { ...target.pos }, dur: 0.5, radius: 1.4, color: '#b47cff', team: src.team });
          w.emit({ type: 'spell', pos: target.pos, team: src.team, text: 'void' });
          damage(w, target, pop, { source: src, hero: true, type: 'magic', chain: true, noVamp: true });
        } else w.addEffect({ type: 'ring', pos: { ...target.pos }, dur: 0.35, radius: 0.9, color: '#b47cff', team: src.team });
      }
    }
    if (src.isHero && !opts.noVamp && target.kind === 'unit') {
      const d = w.stats(src);
      const vamp = type === 'physical' ? d.lifesteal : type === 'magic' ? d.spellvamp : 0;
      if (vamp > 0 && amt > 0) heal(w, src, amt * vamp * (target.isHero ? 1 : 0.4), true);
    }
    if (src.status.redT > 0 && target.kind === 'unit' && src.isHero && !opts.burn) { target.status.burnDps = Math.max(target.status.burnDps, 25 + src.level * 5); target.status.burnT = 2; target.status.slow = Math.max(target.status.slow, 0.2); target.status.slowT = Math.max(target.status.slowT, 1); }
  } else if (target.kind === 'tower' && src && src.team !== target.team && src.team !== NEUTRAL) {
    w.players[src.team as Team].stats.towerDamage += amt;
  }
  if (opts.stun && opts.stun > 0) {
    target.status.stun = Math.max(target.status.stun, opts.stun);
    if (target.kind === 'unit') { target.charging = false; target.moveT = 0; }
    target.targetId = -1;
  }
  // Bingji's Deep Freeze: slowing an already-slowed enemy freezes them briefly
  if (opts.slow && opts.slow > 0 && target.kind === 'unit' && src && src.kind === 'unit' && src.def.id === 'bingji' && target.status.slowT > 0.3 && target.status.stun <= 0 && !target.def.monster?.boss) {
    target.status.stun = 0.6; target.status.slowT = 0; target.status.slow = 0; target.charging = false; target.moveT = 0; target.targetId = -1;
    w.addEffect({ type: 'frost', pos: { ...target.pos }, dur: 0.6, radius: 1.0, color: '#c7f0ff' });
  }
  if (opts.slow && opts.slow > 0 && target.kind === 'unit') { target.status.slow = Math.max(target.status.slow, opts.slow); target.status.slowT = Math.max(target.status.slowT, opts.slowT ?? 1.5); }
  if (opts.burn && opts.burn > 0) { target.status.burnDps = Math.max(target.status.burnDps, opts.burn); target.status.burnT = 3; }
  if (opts.knockback && target.kind === 'unit' && opts.from && !(target.def.monster?.boss)) {
    const dir = norm(sub(target.pos, opts.from));
    const kb = opts.knockback * 5;
    target.vel = add(target.vel, scale(dir.x === 0 && dir.y === 0 ? { x: 0, y: -1 } : dir, kb));
    target.charging = false; target.moveT = 0;
  }
  if (!opts.silent && amt >= 1) {
    const color = opts.crit ? '#ffd166' : type === 'magic' ? '#c89bff' : type === 'true' ? '#ffffff' : target.team === 0 ? '#ff8f8f' : '#fff3c4';
    w.text(target.pos, `${Math.round(amt)}`, color, opts.crit ? 0.8 : opts.hero || isHeroUnit(src) ? 0.62 : 0.45);
  }
  if (target.hp <= 0) kill(w, target, opts.source);
  return amt;
}

export function heal(w: World, target: Entity, amount: number, silent = false): number {
  if (target.dead) return 0;
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  const healed = target.hp - before;
  if (!silent && healed >= 5) w.text(target.pos, `+${Math.round(healed)}`, '#8dff9a', 0.5);
  return healed;
}

/** Give gold to a seat (and its live hero). */
export function giveGold(w: World, seat: Seat, amount: number, pos?: Vec): void {
  seat.gold += amount; seat.stats.goldEarned += amount;
  const h = w.getUnit(seat.heroId); if (h) h.gold = seat.gold;
  if (pos && amount >= 20 && !seat.isBot) w.text(pos, `+${Math.round(amount)}g`, '#ffd86b', 0.45);
}

/** Give XP to a seat's hero; handles level-ups. */
export function giveXp(w: World, seat: Seat, amount: number): void {
  const h = w.getUnit(seat.heroId);
  seat.xp += amount;
  while (seat.level < 15 && seat.xp >= World.xpToNext(seat.level)) {
    seat.xp -= World.xpToNext(seat.level);
    seat.level += 1;
    seat.skillPoints += 1;
    if (h) {
      h.level = seat.level; h.skillPoints = seat.skillPoints;
      const d = w.refreshDerived(h);
      h.hp = Math.min(h.maxHp, h.hp + d.maxHp * 0.08);
      h.mana = Math.min(h.maxMana, h.mana + 60);
      w.addEffect({ type: 'levelup', pos: { ...h.pos }, dur: 0.9, radius: 1.2, color: '#ffe27a', team: h.team });
      w.emit({ type: 'levelup', pos: h.pos, team: h.team, text: String(seat.level), seat });
    }
  }
  if (h) { h.xp = seat.xp; h.level = seat.level; }
}

/** Share XP among every allied hero near a kill. */
function shareXp(w: World, team: Team, at: Vec, amount: number, killer?: Unit): void {
  const near: Seat[] = [];
  for (const h of w.heroes(team)) { if (dist(h.pos, at) <= XP_SHARE_RANGE || h === killer) { const s = w.seatOf(h); if (s) near.push(s); } }
  if (!near.length) return;
  const share = amount / Math.max(1, Math.min(2.2, near.length * 0.7));
  for (const s of near) giveXp(w, s, share);
}

export function kill(w: World, target: Entity, source?: Entity): void {
  if (target.dead) return;
  target.dead = true;
  target.hp = 0;
  if (source && source.kind === 'unit' && source.isHero && target.kind === 'unit') {
    // Huofeng's Cinders: burning victims burst into flame
    if (source.def.id === 'huofeng' && target.status.burnT > 0) {
      const d = w.stats(source);
      w.addEffect({ type: 'burst', pos: { ...target.pos }, dur: 0.5, radius: 1.6, color: '#ff8a3c', team: source.team });
      areaDamage(w, target.team, target.pos, 1.6, 90 + source.level * 18 + d.power * 0.25, { source, hero: true, type: 'magic', chain: true, burn: 30 });
    }
    // Huochong's Reload: kills shorten Combat Roll
    if (source.def.id === 'huochong') source.skillCd[1] = Math.max(0, source.skillCd[1] - (target.isHero ? 4 : 1));
  }
  const killerTeam: Side = source ? source.team : other(target.team as Team);
  const killerUnit = source && source.kind === 'unit' ? source : undefined;
  const killerSeat = killerUnit ? w.seatOf(killerUnit) : undefined;
  if (target.kind === 'unit') {
    if (killerTeam !== NEUTRAL) w.players[killerTeam as Team].stats.unitKills += 1;
    if (target.isHero) heroKilled(w, target, killerUnit, killerSeat, killerTeam);
    else if (target.def.kind === 'minion') {
      if (killerTeam !== NEUTRAL) {
        const type = target.def.minionType ?? 'melee';
        const scaleT = 1 + Math.min(1, w.time / 900) * 0.5;
        const gold = Math.round((type === 'super' ? 120 : MINION_GOLD[type]) * scaleT);
        const xp = Math.round((type === 'super' ? 150 : MINION_XP[type]) * scaleT);
        if (killerSeat) { giveGold(w, killerSeat, gold, target.pos); killerSeat.stats.minionKills += 1; }
        shareXp(w, killerTeam as Team, target.pos, xp, killerUnit);
      }
    } else if (target.def.kind === 'monster' && target.def.monster) {
      const m = target.def.monster;
      if (killerTeam !== NEUTRAL) {
        const team = killerTeam as Team;
        const scaleT = 1 + Math.min(1, w.time / 900) * 0.4;
        if (killerSeat) giveGold(w, killerSeat, Math.round(m.gold * scaleT), target.pos);
        shareXp(w, team, target.pos, Math.round(m.xp * scaleT), killerUnit);
        if (m.buff === 'blue' || m.buff === 'red') {
          const h = killerUnit?.isHero ? killerUnit : [...w.heroes(team)].sort((a, b) => dist(a.pos, target.pos) - dist(b.pos, target.pos))[0];
          if (h) { if (m.buff === 'blue') h.status.blueT = 90; else h.status.redT = 90; w.refreshDerived(h); w.emit({ type: 'buff', team, pos: h.pos, text: m.buff === 'blue' ? '@buff.blue' : '@buff.red' }); }
        } else if (m.buff === 'tyrant' || m.buff === 'overlord') {
          for (const h of w.heroes(team)) { if (m.buff === 'tyrant') h.status.tyrantT = 90; else h.status.overlordT = 90; w.refreshDerived(h); }
          for (const s of w.players[team].seats) giveGold(w, s, m.buff === 'tyrant' ? 100 : 150);
          // the twist: whoever lands the last hit on the Tyrant rides its fury for 20 s
          if (m.buff === 'tyrant' && killerUnit?.isHero) { killerUnit.status.rage = 20; killerUnit.status.rageSpeed = 1.45; killerUnit.status.rageAttack = 1.25; killerUnit.status.redT = Math.max(killerUnit.status.redT, 20); w.refreshDerived(killerUnit); w.text(killerUnit.pos, '@fx.tyrantRide', '#ffb347', 0.7); }
          w.players[team].stats.objectives += 1;
          if (killerSeat) killerSeat.stats.objectives += 1;
          w.emit({ type: 'objective', team, pos: target.pos, text: m.buff === 'tyrant' ? '@objective.tyrant' : '@objective.overlord', big: true });
          if (m.buff === 'overlord') w.players[team].objectiveT.overlord = w.time;
        }
      }
    }
    w.addEffect({ type: 'death', pos: { ...target.pos }, dur: 0.5, radius: target.radius, color: target.def.look.color, team: target.team });
    w.emit({ type: 'death', pos: target.pos, team: target.team, hero: target.isHero });
  } else if (target.kind === 'tower') {
    const victimTeam = target.team as Team;
    if (killerTeam !== NEUTRAL) {
      const team = killerTeam as Team;
      const p = w.players[team];
      p.crowns = target.tier === 'crystal' ? 3 : Math.min(3, p.crowns + 1);
      p.stats.towersDestroyed += 1;
      if (killerSeat) { killerSeat.stats.towersDestroyed += 1; giveGold(w, killerSeat, TOWER_GOLD.local, target.pos); }
      for (const s of p.seats) giveGold(w, s, TOWER_GOLD.team);
    }
    w.players[victimTeam].towersLost += 1;
    w.emit({ type: 'towerDestroyed', pos: target.pos, team: target.team, big: target.tier === 'crystal' || target.tier === 'base', text: target.tier });
    w.addEffect({ type: 'crater', pos: { ...target.pos }, dur: 600, radius: target.radius, color: '#3a3128' });
    w.addEffect({ type: 'burst', pos: { ...target.pos }, dur: 0.8, radius: target.radius * 2.6, color: '#ffb347' });
    w.addEffect({ type: 'smoke', pos: { ...target.pos }, dur: 3, radius: target.radius * 1.5, color: '#6b6b6b' });
    // the next tower down the lane becomes targetable
    if (target.lane >= 0) {
      const order: Array<'outer' | 'inner' | 'base'> = ['outer', 'inner', 'base'];
      const i = order.indexOf(target.tier as never);
      const next = w.towers(victimTeam).find((t) => t.lane === target.lane && t.tier === order[i + 1]);
      if (next) next.active = true;
      else {
        const c = w.crystal(victimTeam);
        if (c) c.active = true;
      }
    }
    for (const e of w.alive()) if (e.targetId === target.id) e.targetId = -1;
    w.refreshObstacles();
  }
}

function heroKilled(w: World, target: Unit, killer: Unit | undefined, killerSeat: Seat | undefined, killerTeam: Side): void {
  const seat = w.seatOf(target);
  // Immortal shield / phoenix: cheat death once per long cooldown
  if (seat && seat.items.includes('immortal_shield') && !(seat as never as { usedImmortal?: number }).usedImmortal) {
    (seat as never as { usedImmortal?: number }).usedImmortal = 1;
    target.dead = false; target.hp = target.maxHp * 0.3; target.status.invulnT = 1.2;
    w.addEffect({ type: 'heal', pos: { ...target.pos }, dur: 0.8, radius: 1.6, color: '#fff4c2' });
    w.emit({ type: 'heal', team: target.team, pos: target.pos, text: '@toast.immortal' });
    return;
  }
  const victimTeam = target.team as Team;
  if (seat) {
    seat.deaths += 1; seat.stats.heroDeaths += 1; seat.streak = 0;
    seat.heroId = -1;
    seat.respawnT = RESPAWN_BASE + RESPAWN_PER_LEVEL * seat.level + Math.min(10, w.time / 90);
    seat.gold = target.gold;
  }
  const vp = w.players[victimTeam];
  vp.stats.heroDeaths += 1;
  if (target.possessed) { vp.heroId = -1; vp.possessCd = 0; w.emit({ type: 'heroDeath', pos: target.pos, team: target.team }); }
  target.possessed = false;
  // rewards
  if (killer === undefined && w.get(0) === undefined) { /* no-op */ }
  if (killerTeam !== NEUTRAL) {
    const team = killerTeam as Team;
    const kp = w.players[team];
    kp.kills += 1; kp.stats.heroKills += 1;
    // phoenix feather: the fallen hero explodes
    if (seat && seat.items.includes('phoenix_feather')) { areaDamage(w, victimTeam, target.pos, 3, 400 + target.level * 40, { source: target, hero: true, type: 'magic', from: target.pos, knockback: 0.8 }); w.addEffect({ type: 'burst', pos: { ...target.pos }, dur: 0.7, radius: 3, color: '#ffb15e' }); }
    // bloodthirst blade: the killer's nearby allies are healed
    if (killer?.isHero && killer.items.includes('bloodthirst')) for (const a of w.heroes(team)) if (dist(a.pos, killer.pos) < 6) heal(w, a, a.maxHp * 0.15);
    const bounty = HERO_KILL_GOLD + Math.min(300, (seat?.streak ?? 0) * 60) + Math.min(200, target.level * 10);
    const assisters: Seat[] = [];
    for (const r of target.lastHurtBy) {
      if (w.time - r.t > 10) continue;
      const u = w.getUnit(r.id);
      const s = u ? w.seatOf(u) : w.seatByHero(r.id);
      if (s && s !== killerSeat && s.team === team && !assisters.includes(s)) assisters.push(s);
    }
    if (killerSeat) {
      killerSeat.kills += 1; killerSeat.stats.heroKills += 1;
      if (w.time - (killerSeat as never as { lastKillT?: number }).lastKillT! <= STREAK_WINDOW) killerSeat.streak += 1; else killerSeat.streak = Math.max(1, killerSeat.streak + 1);
      (killerSeat as never as { lastKillT?: number }).lastKillT = w.time;
      killerSeat.stats.bestStreak = Math.max(killerSeat.stats.bestStreak, killerSeat.streak);
      giveGold(w, killerSeat, bounty, killer?.pos);
      giveXp(w, killerSeat, HERO_KILL_XP + target.level * 12);
      if (!w.announced.firstBlood) { w.announced.firstBlood = true; w.emit({ type: 'firstBlood', team, pos: target.pos, text: '@streak.firstBlood', big: true, killer: killerSeat.name }); }
      const multi = multiKill(w, killerSeat);
      if (multi) w.emit({ type: 'streak', team, pos: target.pos, text: multi, big: true, killer: killerSeat.name });
      else if (killerSeat.streak >= 3) w.emit({ type: 'streak', team, pos: target.pos, text: killerSeat.streak >= 7 ? '@streak.legendary' : killerSeat.streak >= 5 ? '@streak.unstoppable' : '@streak.killingSpree', big: killerSeat.streak >= 5, killer: killerSeat.name });
    } else {
      // killed by a tower or minion: gold goes to nearby allies; a tower that kills a hero is crowned
      for (const s of assisters) giveGold(w, s, bounty * 0.5);
      const tower = target.lastHurtBy.length ? undefined : undefined; void tower;
      for (const t of w.towers(team)) if (dist(t.pos, target.pos) - target.radius <= t.range + 0.5 && t.active) { t.crownT = 30; w.addEffect({ type: 'crown', pos: { ...t.pos }, dur: 1.2, radius: 1.4, color: '#ffd700', team }); }
    }
    for (const s of assisters) { s.assists += 1; s.stats.assists += 1; giveGold(w, s, ASSIST_GOLD); giveXp(w, s, HERO_KILL_XP * 0.5); }
    w.emit({ type: 'kill', team, pos: target.pos, killer: killerSeat?.name ?? (killer?.def.name ?? '@unit.tower'), victim: seat?.name ?? target.def.name, killerTeam: team, hero: true });
    // ace?
    if ([...w.heroes(victimTeam)].length === 0 && w.players[victimTeam].seats.every((s) => s.heroId < 0)) w.emit({ type: 'ace', team, pos: target.pos, text: '@streak.ace', big: true });
  }
  w.addEffect({ type: 'soul', pos: { ...target.pos }, dur: 1.2, radius: 1.2, color: '#ffe27a', team: target.team });
}

function multiKill(w: World, seat: Seat): string | null {
  const s = seat as never as { killTimes?: number[] };
  s.killTimes = (s.killTimes ?? []).filter((t) => w.time - t <= STREAK_WINDOW);
  s.killTimes.push(w.time);
  const n = s.killTimes.length;
  return n === 2 ? '@streak.double' : n === 3 ? '@streak.triple' : n === 4 ? '@streak.quad' : n >= 5 ? '@streak.penta' : null;
}

/** Per-tick status effect bookkeeping (stun, freeze, rage, burn, slows, buffs). */
export function tickStatus(w: World, e: Entity, dt: number): void {
  const s = e.status;
  if (s.stun > 0) s.stun -= dt;
  if (s.freeze > 0) s.freeze -= dt;
  if (s.invulnT > 0) s.invulnT -= dt;
  if (s.slowT > 0) { s.slowT -= dt; if (s.slowT <= 0) s.slow = 0; }
  if (s.rage > 0) { s.rage -= dt; if (s.rage <= 0) { s.rageSpeed = 1; s.rageAttack = 1; } }
  let refresh = false;
  if (e.kind === 'unit') {
    if (e.wardT > 0) e.wardT -= dt;
    if (e.passiveT > 0) { e.passiveT -= dt; if (e.passiveT <= 0 && e.passiveStacks > 0) { e.passiveStacks = 0; refresh = true; } }
  }
  if (s.blueT > 0) { s.blueT -= dt; if (s.blueT <= 0) refresh = true; }
  if (s.redT > 0) { s.redT -= dt; if (s.redT <= 0) refresh = true; }
  if (s.tyrantT > 0) { s.tyrantT -= dt; if (s.tyrantT <= 0) refresh = true; }
  if (s.overlordT > 0) { s.overlordT -= dt; if (s.overlordT <= 0) refresh = true; }
  if (refresh && e.kind === 'unit') w.refreshDerived(e);
  if (s.burnT > 0) {
    s.burnT -= dt;
    damage(w, e, s.burnDps * dt, { silent: true, towerMult: 0, type: 'true', noVamp: true });
    if (w.rng.chance(dt * 6)) w.addEffect({ type: 'flame', pos: { x: e.pos.x + (w.rng.next() - 0.5) * e.radius, y: e.pos.y - e.radius * 0.5 }, dur: 0.4, radius: 0.25, color: '#ff8c3a', vel: { x: 0, y: -1.5 } });
    if (s.burnT <= 0) s.burnDps = 0;
  }
  if (e.hitFlash > 0) e.hitFlash -= dt;
  if (e.attackAnim > 0) e.attackAnim = Math.max(0, e.attackAnim - dt * 3.5);
  if (e.kind === 'unit' && e.damageTaken > 0) e.damageTaken = Math.max(0, e.damageTaken - e.damageTaken * dt * 0.8);
}

export interface FireOpts {
  team: Side;
  from: Vec;
  style: ProjectileStyle;
  speed: number;
  damage: number;
  sourceId: number;
  type?: DamageType;
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
  slow?: number;
  slowT?: number;
  knockback?: number;
  buildingMult?: number;
  burn?: number;
  chain?: { count: number; range: number; stun: number };
  lobTo?: Vec;
  radius?: number;
  skill?: boolean;
  crowned?: boolean;
}

export function fireProjectile(w: World, o: FireOpts): Projectile {
  const lobTo = o.lobTo ?? o.from;
  const lobDist = dist(o.from, lobTo);
  const p: Projectile = {
    id: w.newProjectileId(), team: o.team, pos: { ...o.from }, prev: { ...o.from }, style: o.style, speed: o.speed, damage: o.damage, type: o.type ?? 'physical',
    mode: o.mode ?? 'homing', targetId: o.targetId ?? -1, dir: o.dir ?? { x: 0, y: -1 }, maxDist: o.maxDist ?? 12, traveled: 0,
    splash: o.splash ?? 0, splashAir: o.splashAir ?? true, hitsAir: o.hitsAir ?? true, hitsGround: o.hitsGround ?? true,
    pierce: o.pierce ?? false, hitIds: new Set(), sourceId: o.sourceId, stun: o.stun ?? 0, slow: o.slow ?? 0, slowT: o.slowT ?? 0, knockback: o.knockback ?? 0,
    buildingMult: o.buildingMult ?? 1, burn: o.burn ?? 0, chain: o.chain, lobFrom: { ...o.from }, lobTo: { ...lobTo }, lobT: 0,
    lobDur: Math.max(0.35, lobDist / o.speed), height: 0, dead: false, hero: o.hero ?? false, radius: o.radius ?? 0.18, skill: o.skill ?? false, crowned: o.crowned ?? false,
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
  const opts: DamageOpts = { source: src, hero: p.hero, type: p.type, stun: p.stun, slow: p.slow, slowT: p.slowT, knockback: p.knockback, from: at, buildingMult: p.buildingMult, burn: p.burn, skill: p.skill, crowned: p.crowned };
  if (p.splash > 0) {
    for (const e of w.within(at, p.splash, (x) => projectileCanHit(p, x) && (p.splashAir || !x.flying || x === primary))) damage(w, e, p.damage, opts);
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
      if (!t) { if (p.splash > 0) impact(w, p, null, p.pos); p.dead = true; continue; }
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
      let best: Entity | null = null, bestT = Infinity;
      for (const e of w.enemiesOf(p.team)) {
        if (!projectileCanHit(p, e) || p.hitIds.has(e.id)) continue;
        if (e.kind === 'tower' && !p.hero) continue;
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
      if (p.traveled >= p.maxDist || p.pos.x < -1 || p.pos.x > MAP_W + 1 || p.pos.y < -1 || p.pos.y > MAP_H + 1) {
        if (p.splash > 0 && !p.pierce) impact(w, p, null, p.pos);
        p.dead = true;
      }
    } else {
      p.lobT += dt / p.lobDur;
      const t = Math.min(1, p.lobT);
      p.pos = { x: p.lobFrom.x + (p.lobTo.x - p.lobFrom.x) * t, y: p.lobFrom.y + (p.lobTo.y - p.lobFrom.y) * t };
      p.height = dsin(t * Math.PI) * Math.min(2.5, 0.6 + dist(p.lobFrom, p.lobTo) * 0.35);
      if (t >= 1) {
        const primary = p.targetId >= 0 ? w.get(p.targetId) ?? null : null;
        impact(w, p, primary && dist(primary.pos, p.lobTo) <= primary.radius + 0.4 ? primary : null, p.lobTo);
        p.dead = true;
      }
    }
  }
}

/** Instant area damage (abilities). */
export function areaDamage(w: World, team: Side, at: Vec, radius: number, amount: number, opts: DamageOpts & { hitsAir?: boolean; hitsGround?: boolean; towers?: boolean } = {}): Entity[] {
  const hits = w.within(at, radius, (e) => e.team !== team && (opts.towers || e.kind === 'unit') && ((opts.hitsAir ?? true) || !e.flying) && ((opts.hitsGround ?? true) || e.flying));
  for (const e of hits) damage(w, e, amount, { ...opts, from: opts.from ?? at });
  return hits;
}

/** Melee hit from a unit at its current target (or all in splash radius). */
export function meleeHit(w: World, u: Unit, target: Entity, dmg: number, extra: DamageOpts = {}): void {
  const opts: DamageOpts = { source: u, type: u.def.attackType, ...extra };
  if (u.def.splash > 0) {
    const center = target.pos;
    for (const e of w.within(center, u.def.splash, (x) => x.team !== u.team && (!x.flying || x === target) && canTarget(u.isHero ? 'both' : u.def.targets, x))) damage(w, e, dmg, opts);
    w.addEffect({ type: 'slash', pos: { ...u.pos }, dur: 0.25, radius: u.def.splash + 0.2, color: u.def.look.accent, angle: u.facing, arc: Math.PI * 2 });
  } else {
    damage(w, target, dmg, opts);
    w.addEffect({ type: 'slash', pos: { ...u.pos }, dur: 0.18, radius: u.def.range + u.radius + 0.2, color: '#ffffff', angle: u.facing, arc: 1.4 });
  }
  w.emit({ type: 'hit', pos: target.pos, style: u.def.look.weapon === 'none' ? 'rock' : 'arrow', hero: u.possessed, team: u.team });
}

/** Basic attack damage with crit roll. */
export function attackDamage(w: World, u: Unit): { dmg: number; crit: boolean } {
  const d = w.stats(u);
  let dmg = u.def.attackType === 'magic' ? d.attack + d.power * 0.3 : d.attack;
  dmg *= u.buffAttack * u.status.rageAttack;
  let crit = false;
  if (u.critNext > 1) { dmg *= u.critNext; crit = true; u.critNext = 1; }
  else if (u.isHero && d.crit > 0 && w.rng.chance(d.crit)) { dmg *= 1.75; crit = true; }
  return { dmg, crit };
}
