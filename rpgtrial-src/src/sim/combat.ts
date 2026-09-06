// Combat core: swing state machine (startup / charge / active / recovery), melee hit arcs, D&D attack
// resolution (d20 + mod + prof vs AC, crits, resistances), blocking / parry, poise & stagger, death.
// Used by the player controller (world.ts), enemy AI (ai.ts) and abilities (abilities.ts).
import type { World } from './world.ts';
import type { Actor, AttackDef, WeaponStyle, DamageType } from './types.ts';
import { bus, type RollResult } from '../core/events.ts';
import { d20, rollExpr, parseDice, mod, type Advantage } from './dice.ts';
import { forwardFromYaw, yawFromDir, approachAngle, clamp, type Vec3 } from '../core/math.ts';
import { getItem } from '../content/items.ts';

/** Tuning constants (documented in NOTES-sim.md). */
export const COMBAT = {
  lightCost: 12, heavyCost: 24, chargedCost: 30, minAttackStamina: 8,
  chargeThreshold: 0.25, chargeMax: 1.1, chargedDamageMult: 1.5,
  comboGrace: 0.45,          // seconds after a light swing ends during which the next light continues the combo
  bufferTime: 0.6,           // how long a queued input survives
  blockCost: { light: 10, heavy: 18, charged: 24, special: 18, ranged: 8, spell: 8 } as Record<string, number>,
  blockMissCost: 4,
  parryWindow: 0.2, parryWindowDuelist: 0.35,
  staggerPlayer: 0.6, staggerEnemy: 0.9, parryStagger: 1.4, guardBreakStagger: 1.2,
  playerPoise: 30,
  poiseRegen: 12,
  hitStop: 0.06,
  attackTurnRate: 7,          // rad/s toward the target during startup (player)
  attackTurnRateAI: 4.5,
  actionSurgeSpeed: 1.35,
};

const A = (id: string, kind: AttackDef['kind'], anim: string, animSpeed: number, startup: number, active: number, recovery: number,
  step: number, reach: number, arc: number, damageMult: number, poiseDamage: number, cost: number, cancelAt: number, extra: Partial<AttackDef> = {}): AttackDef =>
  ({ id, kind, anim, animSpeed, startup, active, recovery, step, reach, arc, damageMult, poiseDamage, cost, cancelAt, ...extra });

const ARC = Math.PI / 3; // ±60°
/** Player / hero attack sets per weapon style. Clip lengths: 1H slices ≈1.07 s, Stab 1.6 s, 2H Chop 1.63 s, Spinning 0.67 s. */
export const STYLE_ATTACKS: Record<WeaponStyle, { light: AttackDef[]; heavy: AttackDef; charge: { anim: string; speed: number }; charged: AttackDef }> = {
  '1h': {
    light: [
      A('l1', 'light', '1H_Melee_Attack_Slice_Horizontal', 1.6, 0.22, 0.14, 0.30, 0.6, 2.2, ARC, 1.0, 12, COMBAT.lightCost, 0.45),
      A('l2', 'light', '1H_Melee_Attack_Slice_Diagonal', 1.55, 0.20, 0.14, 0.30, 0.6, 2.2, ARC, 1.0, 12, COMBAT.lightCost, 0.45),
      A('l3', 'light', '1H_Melee_Attack_Chop', 1.4, 0.26, 0.15, 0.40, 0.7, 2.3, ARC, 1.2, 18, COMBAT.lightCost, 0.6),
    ],
    heavy: A('h', 'heavy', '1H_Melee_Attack_Stab', 1.5, 0.38, 0.16, 0.50, 0.9, 2.5, Math.PI / 4, 1.3, 30, COMBAT.heavyCost, 0.5),
    charge: { anim: '2H_Melee_Attack_Spin', speed: 0.42 },
    charged: A('c', 'charged', '2H_Melee_Attack_Spinning', 0.85, 0.12, 0.30, 0.35, 0.4, 2.6, Math.PI, COMBAT.chargedDamageMult, 45, 0, 0.5),
  },
  '2h': {
    light: [
      A('l1', 'light', '2H_Melee_Attack_Slice', 1.4, 0.28, 0.15, 0.35, 0.7, 2.4, ARC, 1.0, 14, COMBAT.lightCost, 0.45),
      A('l2', 'light', '2H_Melee_Attack_Chop', 1.7, 0.35, 0.15, 0.45, 0.7, 2.4, ARC, 1.0, 14, COMBAT.lightCost, 0.45),
      A('l3', 'light', '2H_Melee_Attack_Stab', 1.75, 0.32, 0.16, 0.42, 0.9, 2.7, Math.PI / 4, 1.2, 20, COMBAT.lightCost, 0.6),
    ],
    heavy: A('h', 'heavy', '2H_Melee_Attack_Chop', 1.5, 0.45, 0.15, 0.50, 1.0, 2.5, ARC, 1.3, 35, COMBAT.heavyCost, 0.5),
    charge: { anim: '2H_Melee_Attack_Spin', speed: 0.42 },
    charged: A('c', 'charged', '2H_Melee_Attack_Spinning', 0.85, 0.12, 0.30, 0.35, 0.4, 2.9, Math.PI, COMBAT.chargedDamageMult, 50, 0, 0.5),
  },
  dual: {
    light: [
      A('l1', 'light', 'Dualwield_Melee_Attack_Slice', 2.0, 0.18, 0.12, 0.28, 0.6, 2.0, ARC, 1.0, 8, COMBAT.lightCost, 0.4),
      A('l2', 'light', 'Dualwield_Melee_Attack_Chop', 2.1, 0.18, 0.12, 0.30, 0.6, 2.0, ARC, 1.0, 8, COMBAT.lightCost, 0.4),
      A('l3', 'light', 'Dualwield_Melee_Attack_Stab', 2.4, 0.22, 0.12, 0.32, 0.8, 2.2, Math.PI / 4, 1.2, 14, COMBAT.lightCost, 0.55),
    ],
    heavy: A('h', 'heavy', '1H_Melee_Attack_Stab', 1.7, 0.32, 0.14, 0.45, 0.9, 2.3, Math.PI / 4, 1.3, 25, COMBAT.heavyCost, 0.5),
    charge: { anim: '2H_Melee_Attack_Spin', speed: 0.42 },
    charged: A('c', 'charged', '2H_Melee_Attack_Spinning', 0.9, 0.1, 0.28, 0.32, 0.4, 2.4, Math.PI, COMBAT.chargedDamageMult, 40, 0, 0.5),
  },
  unarmed: {
    light: [
      A('l1', 'light', 'Unarmed_Melee_Attack_Punch_A', 2.2, 0.2, 0.12, 0.35, 0.5, 1.7, ARC, 1.0, 8, COMBAT.lightCost, 0.45),
      A('l2', 'light', 'Unarmed_Melee_Attack_Punch_B', 2.4, 0.2, 0.12, 0.38, 0.5, 1.7, ARC, 1.0, 8, COMBAT.lightCost, 0.45),
      A('l3', 'light', 'Unarmed_Melee_Attack_Kick', 1.4, 0.25, 0.15, 0.30, 0.6, 1.9, ARC, 1.2, 16, COMBAT.lightCost, 0.6),
    ],
    heavy: A('h', 'heavy', 'Unarmed_Melee_Attack_Kick', 1.2, 0.35, 0.15, 0.40, 0.8, 2.0, ARC, 1.3, 25, COMBAT.heavyCost, 0.5),
    charge: { anim: 'Unarmed_Melee_Attack_Punch_B', speed: 0.3 },
    charged: A('c', 'charged', 'Unarmed_Melee_Attack_Kick', 1.0, 0.15, 0.2, 0.4, 0.6, 2.0, ARC, COMBAT.chargedDamageMult, 40, 0, 0.5),
  },
};

// ------------------------------------------------------------------ weapon stats
export interface WeaponStats { damage: string; type: DamageType; finesse: boolean; heavy: boolean; itemId: string | null }
const RAW_WEAPON: Record<string, { damage: string; type: DamageType; finesse?: boolean; heavy?: boolean }> = {
  sword_1handed: { damage: '1d8', type: 'slashing' }, sword_2handed: { damage: '2d6', type: 'slashing', heavy: true },
  axe_1handed: { damage: '1d6', type: 'slashing' }, axe_2handed: { damage: '1d12', type: 'slashing', heavy: true },
  dagger: { damage: '1d4', type: 'piercing', finesse: true }, staff: { damage: '1d6', type: 'bludgeoning' }, wand: { damage: '1d4', type: 'bludgeoning' },
  crossbow_1handed: { damage: '1d6', type: 'piercing' }, crossbow_2handed: { damage: '1d8', type: 'piercing' },
  Skeleton_Blade: { damage: '1d6', type: 'slashing' }, Skeleton_Axe: { damage: '1d8', type: 'slashing' }, Skeleton_Staff: { damage: '1d6', type: 'bludgeoning' }, Skeleton_Crossbow: { damage: '1d8', type: 'piercing' },
};
export function weaponStyle(a: Actor): WeaponStyle {
  const w = a.weapon;
  if (!w) return 'unarmed';
  if (w === 'sword_2handed' || w === 'axe_2handed' || w === 'staff' || w === 'Skeleton_Staff' || w === 'crossbow_2handed') return '2h';
  if (w === 'dagger' && a.offhand === 'dagger') return 'dual';
  return '1h';
}
export function weaponStats(w: World, a: Actor): WeaponStats {
  if (a.damageDice) return { damage: a.damageDice, type: a.damageType ?? 'slashing', finesse: false, heavy: false, itemId: null };
  if (a.id === w.playerId) {
    const id = w.equipment.mainHand; const it = id ? getItem(id) : undefined;
    if (it?.weapon) return { damage: it.weapon.damage, type: it.weapon.type, finesse: !!it.weapon.finesse, heavy: !!it.heavyWeapon, itemId: it.id };
  }
  const raw = a.weapon ? RAW_WEAPON[a.weapon] : undefined;
  if (raw) return { damage: raw.damage, type: raw.type, finesse: !!raw.finesse, heavy: !!raw.heavy, itemId: null };
  return { damage: '1', type: 'bludgeoning', finesse: false, heavy: false, itemId: null };
}
export function attackAbilityMod(a: Actor, ws: WeaponStats): number {
  const s = mod(a.abilities.str), d = mod(a.abilities.dex);
  return ws.finesse ? Math.max(s, d) : s;
}
export function attackBonusOf(a: Actor, ws: WeaponStats): number {
  if (a.attackBonus !== undefined) return a.attackBonus;
  return attackAbilityMod(a, ws) + a.prof;
}
export const hasFeat = (a: Actor, id: string) => !!a.feats && a.feats.includes(id);
export const isStaggered = (a: Actor) => a.state === 'stagger';
/** True if `attacker` is behind `target` (within the rear 120° cone). */
export function isBehind(attacker: Actor, target: Actor): boolean {
  const f = forwardFromYaw(target.yaw);
  const dx = attacker.pos.x - target.pos.x, dz = attacker.pos.z - target.pos.z; const d = Math.hypot(dx, dz) || 1e-6;
  return (dx * f.x + dz * f.z) / d < -0.5;
}
/** Is the defender facing the attacker closely enough for a block/parry to count? */
export function facing(defender: Actor, attacker: Actor, cos = 0.25): boolean {
  const f = forwardFromYaw(defender.yaw);
  const dx = attacker.pos.x - defender.pos.x, dz = attacker.pos.z - defender.pos.z; const d = Math.hypot(dx, dz) || 1e-6;
  return (dx * f.x + dz * f.z) / d > cos;
}
export type BlockMode = 'shield' | 'ward' | null;
export function blockMode(a: Actor): BlockMode {
  if (a.offhand && (a.offhand.startsWith('shield') || a.offhand.startsWith('Skeleton_Shield'))) return 'shield';
  if (a.classId === 'wizard') return 'ward';
  return null;
}

// ------------------------------------------------------------------ swing state machine
/** Begin a swing. Returns false (and emits staminaEmpty for the player) when it can't start. */
export function startAttack(w: World, a: Actor, def: AttackDef, kind: Actor['attackKind'] | 'special' = def.kind === 'special' ? 'light' : def.kind, faceYaw?: number): boolean {
  if (a.dead) return false;
  if (def.cost > 0 && a.stamina < COMBAT.minAttackStamina) { bus.emit('staminaEmpty', { actorId: a.id }); return false; }
  a.stamina = Math.max(0, a.stamina - def.cost);
  if (def.cost > 0) a.staminaRegenDelay = Math.max(a.staminaRegenDelay, 0.5);
  w.setState(a, 'attack');
  a.attack = def; a.attackPhase = 'startup'; a.attackTime = 0; a.attackKind = kind === 'special' ? 'light' : kind;
  a.hitboxOpen = false; a.hitDone.clear(); a.queued = null; a.blocking = false; a.parryWindow = 0; a.comboWindow = 0;
  a.lastAttackTime = w.time;
  if (faceYaw !== undefined) a.yaw = faceYaw;
  const speedMul = a.conditions.actionSurge ? COMBAT.actionSurgeSpeed : 1;
  w.setAnim(a, def.anim, false, 0.06, def.animSpeed * speedMul);
  if (def.telegraph) bus.emit('telegraph', { actorId: a.id, kind: def.kind === 'light' ? 'light' : def.kind === 'special' ? 'special' : 'heavy', pos: { ...a.pos }, duration: def.startup });
  return true;
}
/** Player light attack: continues the combo if inside the grace window. */
export function startLight(w: World, a: Actor, faceYaw?: number): boolean {
  const style = weaponStyle(a); const set = STYLE_ATTACKS[style];
  const idx = a.comboWindow > 0 || a.state === 'attack' ? a.comboIndex % set.light.length : 0;
  const ok = startAttack(w, a, set.light[idx], 'light', faceYaw);
  if (ok) { a.comboIndex = (idx + 1) % set.light.length; a.style = style; }
  return ok;
}
export function startHeavy(w: World, a: Actor, faceYaw?: number): boolean {
  const style = weaponStyle(a); const set = STYLE_ATTACKS[style];
  const ok = startAttack(w, a, set.heavy, 'heavy', faceYaw);
  if (ok) { a.comboIndex = 0; a.style = style; }
  return ok;
}
function toCharge(w: World, a: Actor) {
  const set = STYLE_ATTACKS[weaponStyle(a)];
  a.stamina = Math.max(0, a.stamina - (COMBAT.chargedCost - COMBAT.heavyCost));
  a.attackPhase = 'charge'; a.attackTime = 0; a.attackKind = 'charged'; a.chargeTime = 0;
  w.setAnim(a, set.charge.anim, false, 0.1, set.charge.speed);
}
function releaseCharge(w: World, a: Actor) {
  const set = STYLE_ATTACKS[weaponStyle(a)];
  a.attack = set.charged; a.attackPhase = 'startup'; a.attackTime = 0; a.attackKind = 'charged'; a.hitDone.clear();
  const speedMul = a.conditions.actionSurge ? COMBAT.actionSurgeSpeed : 1;
  w.setAnim(a, set.charged.anim, false, 0.05, set.charged.animSpeed * speedMul);
}
/** Abort the current swing (stagger, dodge-cancel, death). */
export function cancelAttack(w: World, a: Actor) {
  a.attack = null; a.attackPhase = null; a.hitboxOpen = false; a.attackKind = null; a.queued = null; a.attackTime = 0;
}
export const canDodgeCancel = (a: Actor) => a.state === 'attack' && a.attackPhase === 'recovery';

export function updateAttacks(w: World, dt: number) {
  for (const a of w.actors.values()) {
    if (a.hidden || a.dead) continue;
    if (a.state === 'attack' && a.attack) updateActorAttack(w, a, dt);
    else {
      if (a.comboWindow > 0) { a.comboWindow -= dt; if (a.comboWindow <= 0) { a.comboWindow = 0; a.comboIndex = 0; } }
      if (a.state !== 'attack' && a.attack) cancelAttack(w, a);
    }
  }
}

function attackTargetYaw(w: World, a: Actor): number | null {
  const tid = a.id === w.playerId ? a.targetId : a.ai?.targetId ?? a.targetId;
  if (!tid) return null;
  const t = w.actors.get(tid); if (!t || t.dead || t.hidden) return null;
  return yawFromDir(t.pos.x - a.pos.x, t.pos.z - a.pos.z);
}

function updateActorAttack(w: World, a: Actor, dt: number) {
  const def = a.attack!;
  const isPlayer = a.id === w.playerId;
  const speedMul = a.conditions.actionSurge ? COMBAT.actionSurgeSpeed : 1;
  const prev = a.attackTime ?? 0;
  a.attackTime = prev + dt * speedMul;
  const t = a.attackTime;
  const phase = a.attackPhase;

  if (phase === 'charge') {
    a.chargeTime += dt;
    const release = isPlayer ? (!w.intent.heavyHold || a.chargeTime >= COMBAT.chargeMax) : true;
    if (release) releaseCharge(w, a);
    return;
  }
  // turn toward the target during startup (tracking), softer during active
  const ty = attackTargetYaw(w, a);
  if (ty !== null && (phase === 'startup' || phase === 'active')) {
    const rate = (isPlayer ? COMBAT.attackTurnRate : COMBAT.attackTurnRateAI) * (phase === 'active' ? 0.35 : 1);
    a.yaw = approachAngle(a.yaw, ty, rate * dt);
  }
  // root-motion step spread over [0.6·startup, startup+active]
  const stepStart = def.startup * 0.6, stepEnd = def.startup + def.active;
  if (def.step > 0 && t > stepStart && prev < stepEnd) {
    const frac = (Math.min(t, stepEnd) - Math.max(prev, stepStart)) / (stepEnd - stepStart);
    if (frac > 0) {
      const f = forwardFromYaw(a.yaw);
      // don't step through the target: shorten the step when a target is already in reach
      let s = def.step * frac;
      const tid = isPlayer ? a.targetId : a.ai?.targetId;
      const tgt = tid ? w.actors.get(tid) : undefined;
      if (tgt && !tgt.dead) { const d = Math.hypot(tgt.pos.x - a.pos.x, tgt.pos.z - a.pos.z) - (a.radius + tgt.radius); s = Math.max(0, Math.min(s, d)); }
      w.moveActor(a, f.x * s, f.z * s);
    }
  }
  if (phase === 'startup') {
    if (isPlayer && def.kind === 'heavy' && w.intent.heavyHold && t >= COMBAT.chargeThreshold && a.stamina >= 6) { toCharge(w, a); return; }
    if (t >= def.startup) {
      a.attackPhase = 'active'; a.hitboxOpen = true;
      bus.emit('swing', { actorId: a.id, kind: def.kind === 'special' ? 'heavy' : def.kind, pos: { ...a.pos } });
      if (def.special === 'shockwave') shockwave(w, a, def);
    }
  }
  if (a.attackPhase === 'active') {
    if (def.special !== 'shockwave') meleeHitTest(w, a, def);
    if (t >= def.startup + def.active) { a.attackPhase = 'recovery'; a.hitboxOpen = false; }
  }
  if (a.attackPhase === 'recovery') {
    const total = def.startup + def.active + def.recovery;
    const cancelT = def.startup + def.active + def.recovery * def.cancelAt;
    if (isPlayer && a.queued && t >= cancelT && (w.time - (a.lastAttackTime ?? 0)) < 5) {
      const q = a.queued; a.queued = null;
      const fy = w.playerFaceYaw();
      if (q === 'light' && a.comboIndex !== 0) { startLight(w, a, fy); return; }
      if (q === 'heavy') { startHeavy(w, a, fy); return; }
      if (q === 'light') { startLight(w, a, fy); return; }
    }
    if (t >= total) endAttack(w, a);
  }
}
function endAttack(w: World, a: Actor) {
  const wasLight = a.attack?.kind === 'light';
  a.attack = null; a.attackPhase = null; a.hitboxOpen = false; a.attackKind = null;
  a.comboWindow = wasLight && a.comboIndex !== 0 ? COMBAT.comboGrace : 0;
  if (!wasLight) a.comboIndex = 0;
  w.setState(a, 'idle');
  if (a.ai) { if (a.ai.attackCooldown <= 0) a.ai.attackCooldown = 0.2; }
}

// ------------------------------------------------------------------ hit tests
/** Enemies of `a` inside the swing arc that haven't been hit by this swing yet. */
export function meleeHitTest(w: World, a: Actor, def: AttackDef) {
  const f = forwardFromYaw(a.yaw);
  for (const t of w.actors.values()) {
    if (t === a || t.dead || t.hidden || t.faction === a.faction || t.faction === 'neutral' || a.hitDone.has(t.id)) continue;
    if (t.invulnerable) continue;
    const dx = t.pos.x - a.pos.x, dz = t.pos.z - a.pos.z; const d = Math.hypot(dx, dz);
    if (d > def.reach + t.radius) continue;
    if (Math.abs(t.pos.y - a.pos.y) > 2.2) continue;
    if (def.arc < Math.PI && d > 0.6) {
      const cos = (dx * f.x + dz * f.z) / (d || 1e-6);
      if (cos < Math.cos(def.arc)) continue;
    }
    a.hitDone.add(t.id);
    resolveMelee(w, a, t, def);
  }
}
function shockwave(w: World, a: Actor, def: AttackDef) {
  const r = def.radius ?? 3.5;
  bus.emit('spellImpact', { spellId: 'shockwave', pos: { ...a.pos } });
  bus.emit('screenShake', { amount: 0.8, pos: { ...a.pos } });
  for (const t of w.actors.values()) {
    if (t === a || t.dead || t.hidden || t.faction === a.faction || t.faction === 'neutral' || t.invulnerable) continue;
    const d = Math.hypot(t.pos.x - a.pos.x, t.pos.z - a.pos.z); if (d > r + t.radius) continue;
    if (t.iframes > 0) { bus.emit('miss', { attackerId: a.id, targetId: t.id, pos: { ...t.pos }, reason: 'dodge' }); continue; }
    const roll = w.rollSave(t, def.saveAbility ?? 'dex', def.saveDc ?? 13, { label: 'Dexterity save' });
    bus.emit('attackRoll', { attackerId: a.id, targetId: t.id, roll, pos: { ...t.pos } });
    let dmg = rollExpr(w.rng, def.damage ?? '3d6').total; if (roll.success) dmg = Math.floor(dmg / 2);
    applyDamage(w, a, t, dmg, def.damageType ?? 'bludgeoning', { crit: false, poiseDamage: roll.success ? def.poiseDamage * 0.5 : def.poiseDamage, kind: 'special', blocked: false });
    const dx = t.pos.x - a.pos.x, dz = t.pos.z - a.pos.z; const l = Math.hypot(dx, dz) || 1;
    if (!roll.success) t.knockback = { x: (dx / l) * 9, z: (dz / l) * 9, t: 0.3 };
  }
}

function resolveMelee(w: World, a: Actor, t: Actor, def: AttackDef) {
  const ws = weaponStats(w, a);
  let bonus = def.attackBonus ?? attackBonusOf(a, ws);
  let flat = 0;
  const heavyKind = def.kind === 'heavy' || def.kind === 'charged';
  if (heavyKind && hasFeat(a, 'greatWeaponMaster')) { bonus -= 5; flat += 10; }
  resolveAttack(w, a, t, {
    damage: def.damage ?? ws.damage, damageType: def.damageType ?? ws.type, attackBonus: bonus,
    label: def.kind === 'special' ? 'Attack roll' : `${def.kind === 'light' ? 'Light' : def.kind === 'heavy' ? 'Heavy' : 'Charged'} attack`,
    poiseDamage: def.poiseDamage, kind: def.kind === 'special' ? 'special' : def.kind, damageMult: def.damageMult,
    flatBonus: flat + (def.attackBonus === undefined ? attackAbilityMod(a, ws) : 0), sneakEligible: true, weaponAttack: def.attackBonus === undefined, blockable: true,
    critRange: a.critRange !== undefined && isBehind(a, t) ? a.critRange : undefined,   // skeleton rogue: backstabs crit on 19–20
  });
}

// ------------------------------------------------------------------ resolution
export interface AttackOpts {
  damage: string; damageType: DamageType; attackBonus: number; label: string;
  poiseDamage: number; kind: 'light' | 'heavy' | 'charged' | 'special' | 'ranged' | 'spell';
  damageMult?: number; flatBonus?: number; sneakEligible?: boolean; weaponAttack?: boolean; blockable?: boolean;
  advantage?: Advantage; critRange?: number; pos?: Vec3;
}
export interface AttackOutcome { hit: boolean; damage: number; crit: boolean; reason?: 'miss' | 'dodge' | 'block' | 'parry' | 'invulnerable' }

let lastSneakToast = -10;
export function combineAdvantage(adv: boolean, dis: boolean): Advantage { return adv === dis ? null : adv ? 'adv' : 'dis'; }

/** One attack roll + damage against a target. Handles i-frames, parry, block, advantage, crits, sneak attack. */
export function resolveAttack(w: World, a: Actor, t: Actor, o: AttackOpts): AttackOutcome {
  const pos = o.pos ?? { x: t.pos.x, y: t.pos.y + 1.2, z: t.pos.z };
  if (t.dead || t.invulnerable) return { hit: false, damage: 0, crit: false, reason: 'invulnerable' };
  if (t.iframes > 0) { bus.emit('miss', { attackerId: a.id, targetId: t.id, pos, reason: 'dodge' }); return { hit: false, damage: 0, crit: false, reason: 'dodge' }; }
  const bm = blockMode(t);
  const guarding = !!o.blockable && t.blocking && bm !== null && facing(t, a);
  // parry: the first moments of a shield block negate the hit and stagger the attacker
  if (guarding && bm === 'shield' && t.parryWindow > 0 && o.kind !== 'spell' && o.kind !== 'ranged') {
    t.parryWindow = 0;
    bus.emit('parry', { defenderId: t.id, attackerId: a.id, pos });
    w.setAnim(t, 'Block_Attack', false, 0.04, 1.4); t.animHold = 0.45;
    if (t.id === w.playerId) t.stamina = Math.min(t.maxStamina, t.stamina + 10);
    stagger(w, a, COMBAT.parryStagger, 'Hit_B');
    bus.emit('hitStop', { seconds: 0.08 });
    return { hit: false, damage: 0, crit: false, reason: 'parry' };
  }
  const adv = !!a.conditions.reckless || !!t.conditions.reckless || (isStaggered(t) && o.kind !== 'spell') || (o.advantage === 'adv');
  const dis = !!a.conditions.blinded || (o.advantage === 'dis');
  const ac = t.ac + (guarding && bm === 'ward' ? 5 : 0);
  const roll = d20(w.rng, { kind: 'attack', label: o.label, bonus: o.attackBonus, dc: ac, advantage: combineAdvantage(adv, dis) });
  const critRange = o.critRange ?? a.critRange ?? 20;
  let crit = roll.d20 >= critRange && roll.d20 !== 1;
  if (crit) { roll.crit = 'hit'; roll.success = true; }
  if (!crit && isStaggered(t) && hasFeat(a, 'assassinate') && roll.success) { crit = true; roll.crit = 'hit'; }
  bus.emit('attackRoll', { attackerId: a.id, targetId: t.id, roll, pos });
  if (!roll.success) {
    if (guarding) { if (t.id === w.playerId) t.stamina = Math.max(0, t.stamina - COMBAT.blockMissCost); bus.emit('miss', { attackerId: a.id, targetId: t.id, pos, reason: 'block' }); return { hit: false, damage: 0, crit: false, reason: 'block' }; }
    bus.emit('miss', { attackerId: a.id, targetId: t.id, pos, reason: 'miss' });
    return { hit: false, damage: 0, crit: false, reason: 'miss' };
  }
  // ---- damage ----
  const diceMult = crit ? 2 : 1;
  let dmg = 0;
  if (o.weaponAttack && hasFeat(a, 'savageAttacker')) dmg = Math.max(rollExpr(w.rng, o.damage, diceMult).total, rollExpr(w.rng, o.damage, diceMult).total);
  else dmg = rollExpr(w.rng, o.damage, diceMult).total;
  if (crit && o.weaponAttack && hasFeat(a, 'brutalCritical')) { const p = parseDice(o.damage); if (p.n) dmg += w.rng.int(1, p.sides); }
  dmg += o.flatBonus ?? 0;
  if (a.conditions.raging && o.weaponAttack) dmg += 2;
  if (o.sneakEligible && a.sneakDice && (isBehind(a, t) || isStaggered(t) || t.conditions.blinded)) {
    dmg += rollExpr(w.rng, a.sneakDice, diceMult).total;
    if (w.time - lastSneakToast > 2) { lastSneakToast = w.time; bus.emit('toast', { text: 'Sneak Attack!', kind: 'info' }); }
  }
  dmg = Math.max(1, Math.round(dmg * (o.damageMult ?? 1)));
  const applied = applyDamage(w, a, t, dmg, o.damageType, { crit, poiseDamage: o.poiseDamage, kind: o.kind, blocked: guarding && bm === 'shield', pos });
  return { hit: true, damage: applied, crit };
}

// ------------------------------------------------------------------ damage / stagger / death
export interface DamageOpts { crit?: boolean; poiseDamage?: number; kind?: AttackOpts['kind']; blocked?: boolean; pos?: Vec3; silentMods?: boolean }
export function applyDamage(w: World, src: Actor | null, t: Actor, amount: number, type: DamageType, o: DamageOpts = {}): number {
  if (t.dead || t.hidden) return 0;
  if (t.invulnerable) return 0;
  const pos = o.pos ?? { x: t.pos.x, y: t.pos.y + 1.2, z: t.pos.z };
  let dmg = amount;
  let poiseDmg = o.poiseDamage ?? 10;
  // blocking with a shield halves damage and costs stamina; running dry breaks the guard
  if (o.blocked) {
    dmg = Math.floor(dmg / 2); poiseDmg *= 0.5;
    if (t.id === w.playerId) {
      let cost = COMBAT.blockCost[o.kind ?? 'light'] ?? 10; if (hasFeat(t, 'defensiveDuelist')) cost *= 0.5;
      t.stamina -= cost; t.staminaRegenDelay = 0.6; t.blockHits = (t.blockHits ?? 0) + 1;
      w.setAnim(t, 'Block_Hit', false, 0.04, 1.6); t.animHold = 0.35;
      if (t.stamina <= 0) { t.stamina = 0; t.blocking = false; bus.emit('staminaEmpty', { actorId: t.id }); stagger(w, t, COMBAT.guardBreakStagger, 'Hit_B'); }
    } else { w.setAnim(t, 'Block_Hit', false, 0.04, 1.6); t.animHold = 0.35; }
  }
  // resistances / vulnerabilities
  const physical = type === 'slashing' || type === 'piercing' || type === 'bludgeoning';
  let modKind: 'resist' | 'vulnerable' | 'immune' | null = null;
  if (t.immunities?.includes(type)) { dmg = 0; modKind = 'immune'; }
  else {
    const resist = !!t.resistances?.includes(type) || (physical && !!t.conditions.raging) || (type === 'poison' && !!t.conditions.antitoxin);
    const vuln = !!t.vulnerabilities?.includes(type);
    if (resist && !vuln) { dmg = Math.floor(dmg / 2); modKind = 'resist'; }
    else if (vuln && !resist) { dmg *= 2; modKind = 'vulnerable'; }
  }
  if (modKind && !o.silentMods) bus.emit('damageMod', { targetId: t.id, type, mod: modKind, pos });
  if (t.conditions.raging) poiseDmg *= 0.5;
  // enemies mid-swing shrug off some poise damage so telegraphed attacks actually come out (boss: hyper armor)
  if (t.state === 'attack' && t.kind === 'enemy') poiseDmg *= t.hyperArmor ? 0.3 : 0.6;
  // temp HP soaks first
  if (t.tempHp > 0) { const s = Math.min(t.tempHp, dmg); t.tempHp -= s; dmg -= s; }
  if (t.important && t.hp - dmg < 1) dmg = Math.max(0, t.hp - 1);
  t.hp -= dmg; t.lastHitBy = src?.id; t.lastDamageTime = w.time;
  const killing = t.hp <= 0;
  bus.emit('damage', { sourceId: src?.id ?? '', targetId: t.id, amount: dmg, type, crit: !!o.crit, pos, blocked: !!o.blocked, killingBlow: killing });
  const heavyHit = o.kind === 'heavy' || o.kind === 'charged';
  if ((o.crit || heavyHit) && dmg > 0 && (src?.id === w.playerId || t.id === w.playerId)) bus.emit('hitStop', { seconds: COMBAT.hitStop });
  // interrupts
  if (t.state === 'drink') { t.drinkItem = null; w.setState(t, 'idle'); bus.emit('toast', { text: 'Interrupted!', kind: 'warn' }); }
  if (killing) { killActor(w, t, src?.id); if (src && hasFeat(src, 'greatWeaponMaster')) src.stamina = Math.min(src.maxStamina, src.stamina + 20); return dmg; }
  // poise
  if (t.state !== 'stagger' && !(t.ai?.behaviour === 'awaken') && dmg > 0) {
    t.poise -= poiseDmg;
    if (t.poise <= 0) { stagger(w, t, t.id === w.playerId ? COMBAT.staggerPlayer : COMBAT.staggerEnemy); }
  }
  // enemies notice who hit them
  if (src && t.ai && t.ai.behaviour !== 'dormant' && t.ai.behaviour !== 'awaken' && !t.ai.targetId && src.faction !== t.faction) { t.ai.targetId = src.id; if (t.ai.behaviour === 'idle') t.ai.behaviour = 'chase'; }
  return dmg;
}

export function stagger(w: World, a: Actor, seconds: number, anim?: string) {
  if (a.dead || a.invulnerable) return;
  if (a.state === 'awaken' || a.state === 'cinematic') return;
  cancelAttack(w, a);
  if (a.state === 'cast') { a.castId = null; }
  if (a.state === 'drink') a.drinkItem = null;
  a.blocking = false; a.parryWindow = 0;
  w.setState(a, 'stagger'); a.staggerTime = seconds; a.poise = a.maxPoise; a.animHold = 0;
  w.setAnim(a, anim ?? (w.rng.chance(0.5) ? 'Hit_A' : 'Hit_B'), false, 0.05, 1.1);
  bus.emit('stagger', { actorId: a.id, pos: { ...a.pos }, seconds });
}

export function healActor(w: World, src: Actor | null, t: Actor, amount: number): number {
  if (t.dead) return 0;
  const before = t.hp; t.hp = Math.min(t.maxHp, t.hp + Math.max(0, Math.floor(amount)));
  const healed = t.hp - before;
  bus.emit('heal', { sourceId: src?.id ?? '', targetId: t.id, amount: healed, pos: { x: t.pos.x, y: t.pos.y + 1.2, z: t.pos.z } });
  return healed;
}

export function killActor(w: World, a: Actor, killerId?: string) {
  if (a.dead) return;
  a.dead = true; a.hp = Math.min(a.hp, 0); a.deathTime = w.time;
  cancelAttack(w, a); a.blocking = false; a.parryWindow = 0; a.iframes = 0; a.castId = null; a.drinkItem = null; a.hitboxOpen = false; a.knockback = null;
  w.setState(a, 'dead');
  const skeleton = a.model.startsWith('Skeleton');
  w.setAnim(a, skeleton ? 'Death_C_Skeletons' : a.id === w.playerId ? 'Death_A' : 'Death_B', false, 0.08, skeleton ? 1.2 : 1);
  bus.emit('death', { actorId: a.id, pos: { ...a.pos }, killerId });
  // anyone targeting it forgets it
  for (const o of w.actors.values()) { if (o.ai?.targetId === a.id) o.ai.targetId = null; if (o.targetId === a.id && o.id !== w.playerId) o.targetId = null; }
  if (a.kind === 'enemy') {
    if (a.xpValue) w.grantXp(a.xpValue);
    if (a.ai?.boss) bus.emit('bossEnd', { actorId: a.id });
    w.onEnemyDeath(a);
  }
  if (a.id === w.playerId) { a.targetId = null; bus.emit('gameOver', { victory: false }); }
}
