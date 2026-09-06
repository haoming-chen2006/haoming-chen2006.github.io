// Ability execution: casts (with wind-up anims), projectiles simulated in the sim, buffs, area spells,
// saving throws, cooldowns and resource spending. Data lives in content/spells.ts.
import type { World } from './world.ts';
import type { Actor, AbilityDef, Projectile, AttackDef } from './types.ts';
import { bus } from '../core/events.ts';
import { getAbility } from '../content/spells.ts';
import { rollExpr, mod } from './dice.ts';
import { forwardFromYaw, yawFromDir, dist2, type Vec3 } from '../core/math.ts';
import { resolveAttack, applyDamage, healActor, startAttack, hasFeat, weaponStats, attackAbilityMod, attackBonusOf, blockMode, COMBAT } from './combat.ts';
import { terrainHeight } from './terrain.ts';
import { MAP_HALF, CRYPT_ORIGIN } from '../content/level.ts';

export interface UseOpts { targetId?: string | null; free?: boolean; silent?: boolean }

/** Clip lengths (s) so cast anims can be scaled to the cast time. */
const CLIP: Record<string, number> = { Spellcast_Shoot: 0.93, Spellcast_Raise: 2.1, Spellcast_Long: 2.53, Cheer: 1.67, Throw: 1.37, Spellcast_Summon: 4.3, Spellcasting: 0.67, Block_Attack: 1.07, Use_Item: 1.6, Taunt: 1.03, Interact: 1.3 };
export const clipSpeed = (anim: string, seconds: number) => { const c = CLIP[anim]; if (!c || seconds <= 0) return 1; return Math.min(2.6, Math.max(0.5, c / seconds)); };

const castKey = (a: Actor): 'int' | 'wis' | 'cha' => a.classId === 'wizard' ? 'int' : a.kind === 'companion' ? 'wis' : a.abilities.int >= a.abilities.wis ? 'int' : 'wis';
export const spellDc = (a: Actor) => 8 + a.prof + mod(a.abilities[castKey(a)]);
export const spellAttackBonus = (a: Actor) => a.attackBonus !== undefined && a.kind === 'enemy' ? a.attackBonus : a.prof + mod(a.abilities[castKey(a)]);
const evocationBonus = (a: Actor) => hasFeat(a, 'empoweredEvocation') ? Math.max(0, mod(a.abilities.int)) : 0;

/** Special attacks that reuse the swing machinery. */
const BASH: AttackDef = { id: 'shieldBash', kind: 'special', anim: 'Block_Attack', animSpeed: 1.5, startup: 0.22, active: 0.14, recovery: 0.35, step: 0.7, reach: 2.2, arc: Math.PI / 3, damageMult: 1, poiseDamage: 100, cost: 15, cancelAt: 0.5, damage: '1d4', damageType: 'bludgeoning', special: 'bash' };
const WHIRLWIND: AttackDef = { id: 'whirlwind', kind: 'special', anim: '2H_Melee_Attack_Spinning', animSpeed: 0.85, startup: 0.15, active: 0.4, recovery: 0.3, step: 0.3, reach: 3.0, arc: Math.PI, damageMult: 1, poiseDamage: 30, cost: 35, cancelAt: 0.5, special: 'whirlwind' };

const RESOURCE_NAMES: Record<string, string> = { spellSlots1: 'spell slots', secondWind: 'Second Wind', actionSurge: 'Action Surge', rage: 'rage', smokeBomb: 'smoke bombs', arcaneRecovery: 'Arcane Recovery' };

const hostile = (a: Actor, t: Actor) => t !== a && !t.dead && !t.hidden && !t.invulnerable && t.faction !== a.faction && t.faction !== 'neutral';

/** Pick a target: explicit id → lock-on / AI target → soft aim assist in front. */
export function pickTarget(w: World, a: Actor, def: AbilityDef, hint?: string | null): Actor | null {
  if (hint) { const t = w.actors.get(hint); if (t && !t.dead && !t.hidden) return t; }
  if (def.kind === 'heal') return a.kind === 'companion' ? w.player ?? a : a;
  const tid = a.id === w.playerId ? a.targetId : a.ai?.targetId;
  if (tid) { const t = w.actors.get(tid); if (t && !t.dead && !t.hidden) return t; }
  const range = def.range ?? 18;
  const faceYaw = a.id === w.playerId ? w.playerFaceYaw() : a.yaw;
  const f = forwardFromYaw(faceYaw);
  let best: Actor | null = null, bestScore = Infinity;
  for (const t of w.actors.values()) {
    if (!hostile(a, t) || t.ai?.behaviour === 'dormant') continue;
    const dx = t.pos.x - a.pos.x, dz = t.pos.z - a.pos.z; const d = Math.hypot(dx, dz); if (d > range) continue;
    const cos = (dx * f.x + dz * f.z) / (d || 1e-6); if (cos < 0.7) continue;
    const score = d * (1.6 - cos); if (score < bestScore) { bestScore = score; best = t; }
  }
  return best;
}

export function useAbility(w: World, a: Actor, id: string, opts: UseOpts = {}): boolean {
  const def = getAbility(id);
  const isPlayer = a.id === w.playerId;
  const say = (text: string, kind: 'info' | 'warn' = 'warn') => { if (isPlayer && !opts.silent) bus.emit('toast', { text, kind }); };
  if (!def) { say(`Unknown ability: ${id}`); return false; }
  if (a.dead || a.hidden) return false;
  if (id === 'shield') { say('Hold Q to raise Shield', 'info'); return false; }
  if (!(a.state === 'idle' || a.state === 'move' || a.state === 'block')) return false;
  if (!a.onGround) return false;
  if ((a.cooldowns[id] ?? 0) > 0) { say(`${def.name} is not ready`); return false; }
  const cost = def.cost;
  if (cost && !opts.free && (a.resources[cost.resource] ?? 0) < cost.amount) { say(`No ${RESOURCE_NAMES[cost.resource] ?? cost.resource} left`); return false; }
  const staminaNeed = id === 'whirlwind' ? WHIRLWIND.cost : id === 'shieldBash' ? BASH.cost : 0;
  if (staminaNeed && a.stamina < COMBAT.minAttackStamina) { bus.emit('staminaEmpty', { actorId: a.id }); return false; }
  if (id === 'shieldBash' && blockMode(a) !== 'shield') { say('You need a shield for that'); return false; }
  if (id === 'throwDagger' && isPlayer && weaponStats(w, a).itemId !== 'dagger' && a.weapon !== 'dagger') { say('You need a dagger to throw'); return false; }
  if (id === 'healingWord' || id === 'secondWind') { const t = pickTarget(w, a, def, opts.targetId); if (t && t.hp >= t.maxHp) { say('Already at full health'); return false; } }
  // spend
  if (cost && !opts.free) a.resources[cost.resource] = (a.resources[cost.resource] ?? 0) - cost.amount;
  if (def.cooldown) a.cooldowns[id] = def.cooldown;
  a.blocking = false; a.parryWindow = 0;
  if (a.state === 'block') w.setState(a, 'idle');
  const target = pickTarget(w, a, def, opts.targetId);
  a.castTargetId = target && target !== a ? target.id : null;
  const faceYaw = target && target !== a ? yawFromDir(target.pos.x - a.pos.x, target.pos.z - a.pos.z) : isPlayer ? w.playerFaceYaw() : a.yaw;
  bus.emit('castStart', { actorId: a.id, spellId: id, pos: { ...a.pos } });
  if (id === 'shieldBash') return startAttack(w, a, BASH, 'special', faceYaw);
  if (id === 'whirlwind') return startAttack(w, a, WHIRLWIND, 'special', faceYaw);
  a.yaw = faceYaw;
  if (!def.castTime) { releaseAbility(w, a, def); return true; }
  w.setState(a, 'cast'); a.castId = id; a.castTime = 0; a.castTotal = def.castTime; a.castRecover = def.kind === 'buff' || def.kind === 'heal' ? 0.35 : 0.25;
  if (def.anim) w.setAnim(a, def.anim, false, 0.08, clipSpeed(def.anim, def.castTime + (a.castRecover ?? 0.25)));
  if (def.kind === 'spell' && a.kind === 'enemy') bus.emit('telegraph', { actorId: a.id, kind: 'spell', pos: { ...a.pos }, duration: def.castTime });
  return true;
}

/** Advance casts; releases the effect at castTotal and returns to idle after the recovery. */
export function updateCasts(w: World, dt: number) {
  for (const a of w.actors.values()) {
    if (a.hidden || a.dead || a.state !== 'cast') continue;
    a.castTime = (a.castTime ?? 0) + dt;
    const total = a.castTotal ?? 0;
    if (a.castId && a.castTime >= total) { const def = getAbility(a.castId); a.castId = null; if (def) releaseAbility(w, a, def); if (a.state !== 'cast') continue; }
    if (a.castTime >= total + (a.castRecover ?? 0.25)) { w.setState(a, 'idle'); }
  }
}

function condition(w: World, a: Actor, name: string, seconds: number) {
  const on = !a.conditions[name];
  a.conditions[name] = seconds;
  if (on) bus.emit('condition', { actorId: a.id, condition: name, on: true });
}

export function releaseAbility(w: World, a: Actor, def: AbilityDef) {
  const target = a.castTargetId ? w.actors.get(a.castTargetId) ?? null : null;
  const live = target && !target.dead && !target.hidden ? target : null;
  const from = { x: a.pos.x, y: a.pos.y + 1.3, z: a.pos.z };
  const emitRelease = (to: Vec3, tid?: string) => bus.emit('castRelease', { actorId: a.id, spellId: def.id, from, to, targetId: tid });
  switch (def.id) {
    case 'fireBolt':
      emitRelease(aimPoint(a, live), live?.id);
      spawnProjectile(w, a, { kind: 'fireBolt', spellId: def.id, damage: def.damage!, damageType: 'fire', speed: 22, radius: 0.35, attackBonus: spellAttackBonus(a), flatBonus: evocationBonus(a), poiseDamage: 14, label: 'Fire Bolt' }, live);
      break;
    case 'rayOfFrost':
      emitRelease(aimPoint(a, live), live?.id);
      spawnProjectile(w, a, { kind: 'rayOfFrost', spellId: def.id, damage: def.damage!, damageType: 'cold', speed: 30, radius: 0.3, attackBonus: spellAttackBonus(a), flatBonus: evocationBonus(a), effect: 'slow', poiseDamage: 10, label: 'Ray of Frost' }, live);
      break;
    case 'magicMissile': {
      emitRelease(aimPoint(a, live), live?.id);
      const spreads = [0, 0.35, -0.35], speeds = [17, 15, 13];
      for (let i = 0; i < 3; i++) spawnProjectile(w, a, { kind: 'magicMissile', spellId: def.id, damage: def.damage!, damageType: 'force', speed: speeds[i], radius: 0.3, homing: 7, flatBonus: evocationBonus(a), poiseDamage: 8, label: 'Magic Missile' }, live, spreads[i]);
      break;
    }
    case 'necroticBolt':
      emitRelease(aimPoint(a, live), live?.id);
      spawnProjectile(w, a, { kind: 'necroticBolt', spellId: def.id, damage: def.damage!, damageType: 'necrotic', speed: 14, radius: 0.38, attackBonus: a.attackBonus ?? 4, poiseDamage: 12, label: 'Necrotic Bolt' }, live);
      break;
    case 'sacredFlame':
      emitRelease(aimPoint(a, live), live?.id);
      spawnProjectile(w, a, { kind: 'sacredFlame', spellId: def.id, damage: def.damage!, damageType: 'radiant', speed: 20, radius: 0.4, homing: 9, save: { ability: 'dex', dc: def.save?.dc === 'spell' || def.save?.dc === undefined ? spellDc(a) : def.save.dc }, poiseDamage: 10, label: 'Dexterity save' }, live);
      break;
    case 'throwDagger': {
      const ws = weaponStats(w, a); const finesse = { ...ws, finesse: true };
      emitRelease(aimPoint(a, live), live?.id);
      spawnProjectile(w, a, { kind: 'dagger', spellId: def.id, damage: '1d4', damageType: 'piercing', speed: 24, radius: 0.3, attackBonus: attackBonusOf(a, finesse), flatBonus: attackAbilityMod(a, finesse), sneak: true, weaponAttack: true, poiseDamage: 8, label: 'Thrown dagger' }, live);
      break;
    }
    case 'thunderwave': thunderwave(w, a, def); emitRelease({ ...a.pos }); break;
    case 'secondWind': { const h = rollExpr(w.rng, '1d10').total + a.level; healActor(w, a, a, h); emitRelease({ ...a.pos }, a.id); break; }
    case 'healingWord': { const t = live ?? (a.kind === 'companion' ? w.player : a) ?? a; const h = rollExpr(w.rng, def.damage ?? '1d4+3').total; healActor(w, a, t, h); emitRelease({ ...t.pos }, t.id); bus.emit('spellImpact', { spellId: def.id, pos: { x: t.pos.x, y: t.pos.y + 1, z: t.pos.z }, targetId: t.id }); break; }
    case 'actionSurge': a.stamina = a.maxStamina; a.staminaRegenDelay = 0; condition(w, a, 'actionSurge', 6); emitRelease({ ...a.pos }, a.id); break;
    case 'rage': condition(w, a, 'raging', 10); a.poise = a.maxPoise; emitRelease({ ...a.pos }, a.id); bus.emit('screenShake', { amount: 0.3 }); break;
    case 'recklessAttack': condition(w, a, 'reckless', 8); emitRelease({ ...a.pos }, a.id); break;
    case 'cunningDash': condition(w, a, 'cunningDash', 6); emitRelease({ ...a.pos }, a.id); break;
    case 'smokeBomb': {
      const r = def.radius ?? 7;
      for (const t of w.actors.values()) {
        if (!hostile(a, t) || !t.ai || dist2(t.pos, a.pos) > r) continue;
        t.ai.targetId = null; t.ai.lostTargetTimer = 3; if (t.ai.behaviour === 'chase' || t.ai.behaviour === 'strafe' || t.ai.behaviour === 'attack') t.ai.behaviour = 'idle';
        if (t.targetId) t.targetId = null;
        condition(w, t, 'blinded', 3);
      }
      const p: Vec3 = { x: a.pos.x, y: a.pos.y + 0.5, z: a.pos.z };
      emitRelease(p); bus.emit('spellImpact', { spellId: def.id, pos: p });
      break;
    }
    case 'summonMinions': {
      const f = forwardFromYaw(a.yaw); const r = { x: f.z, z: -f.x };
      const spots = [{ x: a.pos.x + r.x * 2.2, y: 0, z: a.pos.z + r.z * 2.2 }, { x: a.pos.x - r.x * 2.2, y: 0, z: a.pos.z - r.z * 2.2 }];
      for (const s of spots) {
        const m = w.spawnEnemy('minion', { x: s.x, y: terrainHeight(s.x, s.z), z: s.z }, { yaw: a.yaw, dormant: false });
        m.ai!.home = { ...a.ai?.home ?? a.pos }; m.ai!.leash = a.ai?.leash ?? 60; m.xpValue = 10;
        if (a.encounterId) w.addToEncounter(a.encounterId, m.id);
        w.awaken(m, 'Spawn_Ground_Skeletons', 2.0);
        bus.emit('spellImpact', { spellId: def.id, pos: { ...m.pos }, targetId: m.id });
      }
      emitRelease({ ...a.pos });
      bus.emit('toast', { text: `${a.name} calls the fallen to rise!`, kind: 'warn' });
      break;
    }
    default: emitRelease({ ...a.pos }); break;
  }
}

function aimPoint(a: Actor, t: Actor | null): Vec3 {
  if (t) return { x: t.pos.x, y: t.pos.y + 1.0, z: t.pos.z };
  const f = forwardFromYaw(a.yaw); return { x: a.pos.x + f.x * 20, y: a.pos.y + 1.2, z: a.pos.z + f.z * 20 };
}

function thunderwave(w: World, a: Actor, def: AbilityDef) {
  const r = def.radius ?? 4.5; const dc = spellDc(a); const f = forwardFromYaw(a.yaw);
  bus.emit('spellImpact', { spellId: def.id, pos: { ...a.pos } });
  bus.emit('screenShake', { amount: 0.6, pos: { ...a.pos } });
  for (const t of w.actors.values()) {
    if (!hostile(a, t)) continue;
    const dx = t.pos.x - a.pos.x, dz = t.pos.z - a.pos.z; const d = Math.hypot(dx, dz);
    if (d > r + t.radius) continue;
    if (d > 0.8 && (dx * f.x + dz * f.z) / d < -0.1) continue;   // behind the caster
    if (t.iframes > 0) { bus.emit('miss', { attackerId: a.id, targetId: t.id, pos: { ...t.pos }, reason: 'dodge' }); continue; }
    const roll = w.rollSave(t, 'con', dc, { label: 'Constitution save' });
    bus.emit('attackRoll', { attackerId: a.id, targetId: t.id, roll, pos: { x: t.pos.x, y: t.pos.y + 1.2, z: t.pos.z } });
    let dmg = rollExpr(w.rng, def.damage ?? '2d8').total + evocationBonus(a);
    if (roll.success) dmg = Math.floor(dmg / 2);
    applyDamage(w, a, t, dmg, def.damageType ?? 'force', { poiseDamage: roll.success ? 10 : 35, kind: 'spell' });
    if (!roll.success && !t.dead) { const l = d || 1; t.knockback = { x: (dx / l) * 12, z: (dz / l) * 12, t: 0.3 }; }
  }
}

// ------------------------------------------------------------------ projectiles
export interface ProjectileSpec {
  kind: string; spellId: string; damage: string; damageType: Projectile['damageType']; speed: number; radius?: number; ttl?: number;
  attackBonus?: number; save?: Projectile['save']; homing?: number; effect?: Projectile['effect']; poiseDamage?: number; flatBonus?: number; sneak?: boolean; weaponAttack?: boolean; label?: string;
}
export function spawnProjectile(w: World, owner: Actor, spec: ProjectileSpec, target?: Actor | null, spread = 0): Projectile {
  const f = forwardFromYaw(owner.yaw);
  const from: Vec3 = { x: owner.pos.x + f.x * 0.6, y: owner.pos.y + 1.3, z: owner.pos.z + f.z * 0.6 };
  const to = aimPoint(owner, target ?? null);
  let dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z; const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
  if (spread) { const c = Math.cos(spread), s = Math.sin(spread); const nx = dx * c + dz * s, nz = -dx * s + dz * c; dx = nx; dz = nz; }
  const p: Projectile = {
    id: w.nextProjectileId++, kind: spec.kind, spellId: spec.spellId, ownerId: owner.id, faction: owner.faction,
    pos: { ...from }, vel: { x: dx * spec.speed, y: dy * spec.speed, z: dz * spec.speed }, speed: spec.speed, radius: spec.radius ?? 0.35, ttl: spec.ttl ?? 3,
    targetId: target?.id ?? null, homing: spec.homing ?? 0, damage: spec.damage, damageType: spec.damageType, attackBonus: spec.attackBonus, save: spec.save,
    effect: spec.effect ?? null, poiseDamage: spec.poiseDamage ?? 10, sneak: spec.sneak, flatBonus: spec.flatBonus, label: spec.label, weaponAttack: spec.weaponAttack,
  };
  w.projectiles.push(p);
  bus.emit('projectile', { id: p.id, kind: p.kind, from: { ...from }, to: { ...to }, speed: spec.speed });
  return p;
}

export function updateProjectiles(w: World, dt: number) {
  if (!w.projectiles.length) return;
  const keep: Projectile[] = [];
  for (const p of w.projectiles) {
    const owner = w.actors.get(p.ownerId) ?? null;
    if (p.homing && p.targetId) {
      const t = w.actors.get(p.targetId);
      if (t && !t.dead && !t.hidden) {
        const tx = t.pos.x - p.pos.x, ty = t.pos.y + 1.0 - p.pos.y, tz = t.pos.z - p.pos.z; const l = Math.hypot(tx, ty, tz) || 1;
        const k = Math.min(1, p.homing * dt);
        let vx = p.vel.x / p.speed + (tx / l - p.vel.x / p.speed) * k, vy = p.vel.y / p.speed + (ty / l - p.vel.y / p.speed) * k, vz = p.vel.z / p.speed + (tz / l - p.vel.z / p.speed) * k;
        const vl = Math.hypot(vx, vy, vz) || 1; p.vel.x = vx / vl * p.speed; p.vel.y = vy / vl * p.speed; p.vel.z = vz / vl * p.speed;
      }
    }
    p.pos.x += p.vel.x * dt; p.pos.y += p.vel.y * dt; p.pos.z += p.vel.z * dt; p.ttl -= dt;
    let done = false;
    // actors
    for (const t of w.actors.values()) {
      if (t.id === p.ownerId || t.dead || t.hidden || t.invulnerable || t.faction === p.faction || t.faction === 'neutral') continue;
      if (t.ai?.behaviour === 'dormant') continue;
      const d = Math.hypot(t.pos.x - p.pos.x, t.pos.z - p.pos.z);
      if (d > p.radius + t.radius) continue;
      if (p.pos.y < t.pos.y - 0.3 || p.pos.y > t.pos.y + t.height + 0.4) continue;
      projectileHit(w, p, owner, t); done = true; break;
    }
    if (!done) {
      const inCrypt = Math.abs(p.pos.z - CRYPT_ORIGIN.z) < 120;
      if (p.pos.y < terrainHeight(p.pos.x, p.pos.z) + 0.05 || w.pointBlocked(p.pos.x, p.pos.z, p.pos.y) || p.ttl <= 0 || p.pos.y > 60 ||
        (!inCrypt && (Math.abs(p.pos.x) > MAP_HALF || Math.abs(p.pos.z) > MAP_HALF))) {
        bus.emit('spellImpact', { spellId: p.spellId, pos: { ...p.pos } }); done = true;
      }
    }
    if (!done) keep.push(p);
  }
  w.projectiles = keep;
}

function projectileHit(w: World, p: Projectile, owner: Actor | null, t: Actor) {
  const pos = { x: p.pos.x, y: p.pos.y, z: p.pos.z };
  if (t.iframes > 0) { bus.emit('miss', { attackerId: p.ownerId, targetId: t.id, pos, reason: 'dodge' }); bus.emit('spellImpact', { spellId: p.spellId, pos }); return; }
  let hit = false;
  if (owner && p.attackBonus !== undefined) {
    const r = resolveAttack(w, owner, t, { damage: p.damage, damageType: p.damageType, attackBonus: p.attackBonus, label: p.label ?? 'Ranged attack', poiseDamage: p.poiseDamage ?? 10, kind: p.kind === 'dagger' ? 'ranged' : 'spell', flatBonus: p.flatBonus, sneakEligible: p.sneak, weaponAttack: p.weaponAttack, blockable: true, pos });
    hit = r.hit;
  } else if (p.save) {
    const roll = w.rollSave(t, p.save.ability, p.save.dc, { label: p.label ?? `${p.save.ability.toUpperCase()} save` });
    bus.emit('attackRoll', { attackerId: p.ownerId, targetId: t.id, roll, pos });
    let dmg = rollExpr(w.rng, p.damage).total + (p.flatBonus ?? 0);
    if (roll.success) dmg = Math.floor(dmg / 2);
    if (dmg > 0) { applyDamage(w, owner, t, dmg, p.damageType, { poiseDamage: (p.poiseDamage ?? 10) * (roll.success ? 0.5 : 1), kind: 'spell', pos }); hit = true; }
  } else {
    const dmg = rollExpr(w.rng, p.damage).total + (p.flatBonus ?? 0);
    applyDamage(w, owner, t, dmg, p.damageType, { poiseDamage: p.poiseDamage ?? 10, kind: 'spell', pos }); hit = true;
  }
  if (hit && p.effect === 'slow' && !t.dead) condition(w, t, 'slowed', 4);
  bus.emit('spellImpact', { spellId: p.spellId, pos, targetId: t.id });
}
