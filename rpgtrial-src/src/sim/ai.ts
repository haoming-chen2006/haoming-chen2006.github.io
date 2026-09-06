// Enemy AI: skeleton kinds, dormant → awaken → chase / strafe / attack / retreat, telegraphed attacks,
// blocking warriors, kiting mages, flanking rogues, the two-phase Hollow Knight. Spawn + encounter helpers.
import type { World } from './world.ts';
import type { Actor, AttackDef, EnemyKind, ModelId, WeaponId, OffhandId, Abilities, DamageType, Vec3 } from './types.ts';
import { bus } from '../core/events.ts';
import { forwardFromYaw, yawFromDir, approachAngle, dist2, wrapAngle } from '../core/math.ts';
import { startAttack, facing, isBehind } from './combat.ts';
import { useAbility } from './abilities.ts';

export interface SpawnEnemyOpts { id?: string; yaw?: number; dormant?: boolean; name?: string; level?: number }

const A = (id: string, kind: AttackDef['kind'], anim: string, animSpeed: number, startup: number, active: number, recovery: number, step: number, reach: number,
  poiseDamage: number, extra: Partial<AttackDef> = {}): AttackDef =>
  ({ id, kind, anim, animSpeed, startup, active, recovery, step, reach, arc: Math.PI / 3, damageMult: 1, poiseDamage, cost: 0, cancelAt: 1, telegraph: true, ...extra });

export interface EnemyDef {
  name: string; model: ModelId; hp: number; ac: number; abilities: Partial<Abilities>; attackBonus: number; damage: string; damageType: DamageType;
  weapon: WeaponId; offhand: OffhandId; xp: number; poise: number; walk: number; run: number; radius: number; aggro: number; leash: number;
  light: AttackDef[]; heavy?: AttackDef; cooldown: [number, number]; heavyChance: number; blockChance: number; retreatBelow: number;
  keepDistance?: [number, number]; castCooldown?: [number, number]; scale?: number; critRange?: number; hyperArmor?: boolean; awakenAnim?: string;
}
/** Enemy stat block per kind. Clip lengths: 1H slices ≈1.07 s, Chop 1.07, 2H Chop 1.63, Dual Stab 1.6, Jump_Chop 1.33, Spinning 0.67. */
export const ENEMY_DEFS: Record<EnemyKind, EnemyDef> = {
  minion: {
    name: 'Skeleton Minion', model: 'Skeleton_Minion', hp: 9, ac: 12, abilities: { str: 10, dex: 14, con: 15, int: 6, wis: 8, cha: 5 },
    attackBonus: 3, damage: '1d6+2', damageType: 'slashing', weapon: 'Skeleton_Blade', offhand: null, xp: 25, poise: 18, walk: 2.8, run: 5.4, radius: 0.4, aggro: 14, leash: 40,
    light: [A('m1', 'light', '1H_Melee_Attack_Slice_Horizontal', 0.95, 0.48, 0.15, 0.45, 1.3, 2.0, 10), A('m2', 'light', '1H_Melee_Attack_Slice_Diagonal', 0.9, 0.45, 0.15, 0.45, 1.3, 2.0, 10)],
    cooldown: [1.6, 2.4], heavyChance: 0, blockChance: 0, retreatBelow: 0,
  },
  warrior: {
    name: 'Skeleton Warrior', model: 'Skeleton_Warrior', hp: 22, ac: 14, abilities: { str: 14, dex: 12, con: 15, int: 6, wis: 8, cha: 5 },
    attackBonus: 4, damage: '1d8+2', damageType: 'slashing', weapon: 'Skeleton_Blade', offhand: 'Skeleton_Shield_Large_A', xp: 100, poise: 26, walk: 2.2, run: 4.6, radius: 0.45, aggro: 14, leash: 40,
    light: [A('w1', 'light', '1H_Melee_Attack_Chop', 0.76, 0.65, 0.15, 0.6, 1.3, 2.2, 15), A('w2', 'light', '1H_Melee_Attack_Slice_Horizontal', 0.8, 0.6, 0.15, 0.55, 1.3, 2.2, 15)],
    heavy: A('wh', 'heavy', '2H_Melee_Attack_Chop', 0.94, 0.85, 0.18, 0.7, 1.0, 2.4, 30, { damage: '2d6+3' }),
    cooldown: [2.0, 2.8], heavyChance: 0.25, blockChance: 0.35, retreatBelow: 0.25,
  },
  mage: {
    name: 'Skeleton Mage', model: 'Skeleton_Mage', hp: 16, ac: 11, abilities: { str: 8, dex: 12, con: 12, int: 14, wis: 10, cha: 8 },
    attackBonus: 3, damage: '1d4+1', damageType: 'bludgeoning', weapon: 'Skeleton_Staff', offhand: null, xp: 100, poise: 12, walk: 2.2, run: 4.4, radius: 0.42, aggro: 16, leash: 40,
    light: [A('mg1', 'light', '2H_Melee_Attack_Chop', 1.0, 0.6, 0.15, 0.6, 0.6, 2.0, 8)],
    cooldown: [1.8, 2.6], heavyChance: 0, blockChance: 0, retreatBelow: 0, keepDistance: [7, 11], castCooldown: [3.0, 4.2],
  },
  rogue: {
    name: 'Skeleton Rogue', model: 'Skeleton_Rogue', hp: 18, ac: 13, abilities: { str: 10, dex: 16, con: 12, int: 8, wis: 10, cha: 6 },
    attackBonus: 4, damage: '1d4+2', damageType: 'piercing', weapon: 'Skeleton_Blade', offhand: null, xp: 100, poise: 18, walk: 3.0, run: 6.2, radius: 0.4, aggro: 15, leash: 45,
    light: [A('r1', 'light', 'Dualwield_Melee_Attack_Stab', 1.5, 0.42, 0.12, 0.45, 1.4, 2.0, 8), A('r2', 'light', 'Dualwield_Melee_Attack_Slice', 1.3, 0.38, 0.12, 0.4, 1.2, 2.0, 8)],
    cooldown: [0.8, 1.2], heavyChance: 0, blockChance: 0, retreatBelow: 0.3, critRange: 19,
  },
  boss: {
    name: 'The Hollow Knight', model: 'Skeleton_Warrior', hp: 90, ac: 15, abilities: { str: 18, dex: 12, con: 16, int: 8, wis: 10, cha: 12 },
    attackBonus: 6, damage: '2d6+3', damageType: 'slashing', weapon: 'Skeleton_Blade', offhand: 'Skeleton_Shield_Large_A', xp: 450, poise: 70, walk: 2.3, run: 4.8, radius: 0.55, aggro: 30, leash: 70,
    light: [A('b1', 'light', '1H_Melee_Attack_Chop', 0.8, 0.6, 0.16, 0.5, 1.6, 2.8, 25), A('b2', 'light', '1H_Melee_Attack_Slice_Horizontal', 0.85, 0.55, 0.16, 0.5, 1.6, 2.8, 25)],
    heavy: A('bh', 'heavy', '2H_Melee_Attack_Chop', 0.9, 0.85, 0.2, 0.7, 1.4, 3.0, 45, { damage: '2d8+4' }),
    cooldown: [1.5, 2.3], heavyChance: 0.35, blockChance: 0.25, retreatBelow: 0, scale: 1.35, hyperArmor: true,
  },
};
const BOSS_SPIN: AttackDef = A('bspin', 'heavy', '2H_Melee_Attack_Spinning', 0.9, 0.5, 0.35, 0.5, 0.3, 3.2, 30, { arc: Math.PI, damage: '2d6+4' });
const BOSS_JUMP: AttackDef = A('bjump', 'special', '1H_Melee_Attack_Jump_Chop', 1.0, 0.75, 0.15, 0.55, 0, 3.5, 40, { special: 'shockwave', radius: 3.8, saveDc: 14, saveAbility: 'dex', damage: '3d6', damageType: 'bludgeoning' });

const rand = (w: World, r: [number, number]) => w.rng.range(r[0], r[1]);
const isSkeleton = (a: Actor) => a.model.startsWith('Skeleton');

// ------------------------------------------------------------------ spawning / encounters
export function spawnEnemy(w: World, kind: EnemyKind, pos: Vec3, opts: SpawnEnemyOpts = {}): Actor {
  const d = ENEMY_DEFS[kind] ?? ENEMY_DEFS.minion;
  const level = Math.max(1, opts.level ?? 1);
  const id = opts.id ?? `${kind}_${w.nextEnemyId++}`;
  if (w.actors.has(id)) w.actors.delete(id);
  const a = w.spawn({
    id, kind: 'enemy', name: opts.name ?? d.name, model: d.model, faction: 'undead', pos, yaw: opts.yaw ?? 0, level, abilities: d.abilities,
    maxHp: d.hp + (level - 1) * 6, ac: d.ac + Math.floor((level - 1) / 2), weapon: d.weapon, offhand: d.offhand, walkSpeed: d.walk, runSpeed: d.run, radius: d.radius, poise: d.poise,
    ai: { behaviour: opts.dormant ? 'dormant' : 'idle', aggroRange: d.aggro, leash: d.leash, kind, awakenAnim: d.awakenAnim ?? 'Skeletons_Awaken_Floor', strafeDir: w.rng.chance(0.5) ? 1 : -1, castCooldown: kind === 'mage' ? 0.3 : 1.5, jumpCooldown: 4, attacksInRow: 0 },
  });
  a.enemyKind = kind; a.attackBonus = d.attackBonus + Math.floor((level - 1) / 2); a.damageDice = d.damage; a.damageType = d.damageType; a.xpValue = d.xp;
  a.resistances = ['piercing']; a.vulnerabilities = ['bludgeoning']; a.immunities = ['poison'];
  a.critRange = d.critRange; a.scale = d.scale; a.hyperArmor = d.hyperArmor; a.maxStamina = a.stamina = 1e6;
  if (kind === 'boss') { a.ai!.boss = { phase: 1, name: opts.name ?? d.name, subtitle: 'Warden of the Hollowmere' }; a.height = 1.8 * (d.scale ?? 1); }
  if (opts.dormant) { a.invulnerable = true; w.setState(a, 'lie'); w.setAnim(a, 'Skeletons_Inactive_Floor_Pose', true, 0); }
  else w.setAnim(a, isSkeleton(a) ? 'Idle_Combat' : 'Idle', true, 0.2);
  return a;
}
/** Bring a dormant/summoned enemy to life: plays the awaken clip, invulnerable until done, then hunts the player. */
export function awakenActor(w: World, a: Actor, anim?: string, duration = 2.0) {
  if (!a.ai || a.dead) return;
  const clip = anim ?? a.ai.awakenAnim ?? 'Skeletons_Awaken_Floor';
  const clipLen = clip === 'Spawn_Ground_Skeletons' ? 3.57 : clip === 'Skeletons_Awaken_Floor_Long' ? 3.83 : clip === 'Skeletons_Awaken_Standing' ? 1.0 : 2.3;
  a.ai.behaviour = 'awaken'; a.ai.timer = duration; a.invulnerable = true;
  a.ai.targetId = w.player?.id ?? null;
  w.setState(a, 'awaken');
  w.setAnim(a, clip, false, 0.05, clipLen / duration);
}
export function startEncounter(w: World, id: string, actorIds: string[]) {
  const members: string[] = [];
  for (const aid of actorIds) {
    const a = w.actors.get(aid); if (!a || !a.ai) { console.warn('[sim] startEncounter: unknown enemy', aid); continue; }
    members.push(aid); a.encounterId = id;
    if (a.dead) continue;
    if (a.ai.behaviour === 'dormant') awakenActor(w, a);
    else if (a.ai.behaviour !== 'awaken') { a.ai.targetId = w.player?.id ?? null; a.ai.behaviour = 'chase'; a.ai.lostTargetTimer = 0; }
  }
  w.encounterMembers.set(id, members);
  w.encounters.set(id, { alive: members.filter((m) => !w.actors.get(m)?.dead).length });
  for (const a of w.actors.values()) if (a.kind === 'companion' && a.ai) a.ai.healedThisEncounter = false;
  bus.emit('encounterStart', { id });
}
export function addToEncounter(w: World, id: string, actorId: string) {
  const a = w.actors.get(actorId); if (!a) return;
  a.encounterId = id;
  const m = w.encounterMembers.get(id) ?? []; if (!m.includes(actorId)) m.push(actorId); w.encounterMembers.set(id, m);
  const e = w.encounters.get(id) ?? { alive: 0 }; e.alive += a.dead ? 0 : 1; w.encounters.set(id, e);
}
export function onEnemyDeath(w: World, a: Actor) {
  const id = a.encounterId; if (!id) return;
  const e = w.encounters.get(id); if (!e) return;
  e.alive = Math.max(0, e.alive - 1);
  if (e.alive === 0) bus.emit('encounterEnd', { id });
}

// ------------------------------------------------------------------ per-step brain
export function stepEnemies(w: World, dt: number) {
  for (const a of w.actors.values()) if (a.kind === 'enemy' && a.ai && !a.hidden && !a.dead) stepEnemy(w, a, dt);
}

function tick(ai: NonNullable<Actor['ai']>, dt: number) {
  if (ai.attackCooldown > 0) ai.attackCooldown -= dt;
  if (ai.castCooldown && ai.castCooldown > 0) ai.castCooldown -= dt;
  if (ai.jumpCooldown && ai.jumpCooldown > 0) ai.jumpCooldown -= dt;
  if (ai.lostTargetTimer && ai.lostTargetTimer > 0) ai.lostTargetTimer -= dt;
  if (ai.retreatTimer && ai.retreatTimer > 0) ai.retreatTimer -= dt;
  if (ai.timer > 0 && ai.behaviour !== 'awaken') ai.timer -= dt;
}
/** How many other enemies are mid-swing on this target (attack tokens keep group fights readable). */
function attackers(w: World, targetId: string, self: Actor): number {
  let n = 0;
  for (const o of w.actors.values()) if (o !== self && o.kind === 'enemy' && !o.dead && o.ai?.targetId === targetId && (o.state === 'attack' || o.state === 'cast')) n++;
  return n;
}
function acquire(w: World, a: Actor): Actor | null {
  const ai = a.ai!;
  let best: Actor | null = null, bd = Infinity;
  for (const t of w.actors.values()) {
    if (t.dead || t.hidden || t.faction !== 'party' || t.kind === 'npc') continue;
    let d = dist2(a.pos, t.pos); if (t.kind === 'companion') d *= 1.6;   // prefer the player
    if (d < ai.aggroRange && d < bd) { bd = d; best = t; }
  }
  return best;
}
const idleAnim = (w: World, a: Actor, combat: boolean) => { if (a.state === 'idle' || a.state === 'move') { w.setState(a, 'idle'); w.setAnim(a, isSkeleton(a) ? (combat ? 'Idle_Combat' : 'Idle') : 'Idle', true, 0.25); } };

/** Move with separation from other enemies; sets the locomotion anim and emits footsteps. */
export function aiMove(w: World, a: Actor, dx: number, dz: number, speed: number, dt: number, faceTarget?: Actor | null) {
  let l = Math.hypot(dx, dz); if (l < 1e-4) return;
  dx /= l; dz /= l;
  for (const o of w.actors.values()) {
    if (o === a || o.dead || o.hidden || o.kind !== 'enemy') continue;
    const ox = a.pos.x - o.pos.x, oz = a.pos.z - o.pos.z; const d = Math.hypot(ox, oz); const min = a.radius + o.radius + 0.5;
    if (d < min && d > 1e-4) { const k = (min - d) / min; dx += (ox / d) * k * 1.5; dz += (oz / d) * k * 1.5; }
  }
  l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  if (a.conditions.slowed) speed *= 0.5;
  speed *= a.ai?.speedMul ?? 1;
  w.moveActor(a, dx * speed * dt, dz * speed * dt);
  w.setState(a, 'move');
  const moveYaw = yawFromDir(dx, dz);
  if (faceTarget) {
    a.yaw = approachAngle(a.yaw, yawFromDir(faceTarget.pos.x - a.pos.x, faceTarget.pos.z - a.pos.z), 9 * dt);
    const rel = wrapAngle(moveYaw - a.yaw);
    const running = speed > a.walkSpeed * 1.3;
    const name = Math.abs(rel) < Math.PI / 3 ? (running ? 'Running_A' : (isSkeleton(a) ? 'Walking_D_Skeletons' : 'Walking_A')) : Math.abs(rel) > 2 * Math.PI / 3 ? 'Walking_Backwards' : rel > 0 ? 'Running_Strafe_Left' : 'Running_Strafe_Right';
    w.setAnim(a, name, true, 0.15, name.startsWith('Running_Strafe') ? 0.85 : name === 'Walking_Backwards' ? 1.1 : running ? 1.05 : 1.0);
  } else {
    a.yaw = approachAngle(a.yaw, moveYaw, 8 * dt);
    const running = speed > a.walkSpeed * 1.3;
    w.setAnim(a, running ? 'Running_A' : (isSkeleton(a) ? 'Walking_D_Skeletons' : 'Walking_A'), true, 0.15, running ? 1.05 : 1.0);
  }
  a.footstepPhase += speed * dt;
  const stride = speed > a.walkSpeed * 1.3 ? 0.42 : 0.62;
  if (a.footstepPhase >= stride) { a.footstepPhase = 0; bus.emit('footstep', { actorId: a.id, pos: { ...a.pos }, surface: w.surfaceFor(a), running: speed > a.walkSpeed * 1.3 }); }
}
function faceActor(a: Actor, t: Actor, dt: number, rate = 8) { a.yaw = approachAngle(a.yaw, yawFromDir(t.pos.x - a.pos.x, t.pos.z - a.pos.z), rate * dt); }

function stepEnemy(w: World, a: Actor, dt: number) {
  const ai = a.ai!; const def = ENEMY_DEFS[ai.kind ?? 'minion'];
  tick(ai, dt);
  if (ai.behaviour === 'dormant') return;
  if (ai.behaviour === 'awaken') {
    ai.timer -= dt;
    if (ai.timer > 0) return;
    a.invulnerable = false; ai.behaviour = 'chase'; w.setState(a, 'idle'); idleAnim(w, a, true);
    return;
  }
  if (w.cinematic) { if (a.state === 'idle' || a.state === 'move') idleAnim(w, a, false); return; }
  if (a.state === 'stagger' || a.state === 'attack' || a.state === 'cast' || a.state === 'awaken' || a.state === 'cinematic' || a.state === 'dead' || a.state === 'lie' || a.state === 'sit') return;
  if ((a.animHold ?? 0) > 0) return;
  if (a.knockback) return;
  if (a.state === 'block') {
    ai.blockTimer = (ai.blockTimer ?? 0) - dt;
    const t = ai.targetId ? w.actors.get(ai.targetId) : undefined; if (t) faceActor(a, t, dt, 10);
    if (ai.blockTimer <= 0) { a.blocking = false; w.setState(a, 'idle'); ai.attackCooldown = Math.min(ai.attackCooldown, 0.3); }
    return;
  }
  // ---- target ----
  let t = ai.targetId ? w.actors.get(ai.targetId) : undefined;
  if (t && (t.dead || t.hidden)) { ai.targetId = null; t = undefined; }
  if (!t && !(ai.lostTargetTimer && ai.lostTargetTimer > 0)) { const n = acquire(w, a); if (n) { ai.targetId = n.id; t = n; if (ai.behaviour === 'idle') ai.behaviour = 'chase'; } }
  // ---- leash ----
  const dHome = dist2(a.pos, ai.home);
  if (ai.behaviour !== 'retreat' && dHome > ai.leash) { ai.targetId = null; t = undefined; ai.behaviour = 'retreat'; ai.holdPos = { ...ai.home }; }
  if (ai.behaviour === 'retreat' && ai.holdPos) {
    const d = dist2(a.pos, ai.holdPos);
    if (d > 1.0) { aiMove(w, a, ai.holdPos.x - a.pos.x, ai.holdPos.z - a.pos.z, a.walkSpeed, dt); return; }
    ai.holdPos = null; ai.behaviour = 'idle'; a.hp = a.maxHp; a.poise = a.maxPoise; idleAnim(w, a, false); return;
  }
  if (!t) { ai.behaviour = 'idle'; idleAnim(w, a, false); return; }
  // ---- boss intro / phase change ----
  if (ai.boss && !ai.taunted) {
    ai.taunted = true;
    w.setState(a, 'cast'); a.castId = null; a.castTime = 0; a.castTotal = 1.0; a.castRecover = 0.1;
    w.setAnim(a, 'Taunt', false, 0.1, 1.0);
    bus.emit('bossStart', { actorId: a.id, name: ai.boss.name, subtitle: ai.boss.subtitle });
    return;
  }
  if (ai.boss && ai.boss.phase === 1 && a.hp <= a.maxHp * 0.5) {
    ai.boss.phase = 2; ai.summoned = true; ai.jumpCooldown = 2;
    if (useAbility(w, a, 'summonMinions', { free: true })) return;
  }
  const d = dist2(a.pos, t.pos);
  if (ai.kind === 'mage') mageBrain(w, a, t, d, dt, def);
  else if (ai.kind === 'rogue') rogueBrain(w, a, t, d, dt, def);
  else meleeBrain(w, a, t, d, dt, def);
}

function chooseAttack(w: World, a: Actor, def: EnemyDef, t: Actor, d: number): AttackDef {
  const ai = a.ai!;
  if (ai.boss && ai.boss.phase === 2 && w.rng.chance(0.2) && d < 3.5) return BOSS_SPIN;
  if (def.heavy && w.rng.chance(def.heavyChance)) return def.heavy;
  const i = (ai.attacksInRow ?? 0) % def.light.length; return def.light[i];
}
function doAttack(w: World, a: Actor, def: EnemyDef, atk: AttackDef, t: Actor) {
  const ai = a.ai!;
  ai.behaviour = 'attack'; ai.attacksInRow = (ai.attacksInRow ?? 0) + 1;
  ai.attackCooldown = rand(w, def.cooldown) + (attackers(w, t.id, a) > 0 ? 0.4 : 0);
  startAttack(w, a, atk, atk.kind === 'special' ? 'special' : atk.kind, yawFromDir(t.pos.x - a.pos.x, t.pos.z - a.pos.z));
}
function tryBlock(w: World, a: Actor, def: EnemyDef, t: Actor, d: number): boolean {
  const ai = a.ai!;
  if (def.blockChance <= 0 || !a.offhand) return false;
  if (t.state !== 'attack' || t.attackPhase !== 'startup' || d > 3.5 || !facing(t, a, 0.5)) return false;
  if (ai.lastPlayerAttackSeq === t.anim.seq) return false;
  ai.lastPlayerAttackSeq = t.anim.seq;
  if (!w.rng.chance(def.blockChance)) return false;
  a.blocking = true; a.parryWindow = 0; ai.blockTimer = 1.0;
  w.setState(a, 'block'); w.setAnim(a, 'Blocking', true, 0.06); faceActor(a, t, 1, 100);
  return true;
}
function strafe(w: World, a: Actor, t: Actor, dt: number, speed: number) {
  const ai = a.ai!;
  if ((ai.timer ?? 0) <= 0) { ai.timer = w.rng.range(0.5, 1.4); if (w.rng.chance(0.3)) ai.strafeDir = -(ai.strafeDir ?? 1); }
  const dx = t.pos.x - a.pos.x, dz = t.pos.z - a.pos.z; const l = Math.hypot(dx, dz) || 1;
  const sx = -dz / l * (ai.strafeDir ?? 1), sz = dx / l * (ai.strafeDir ?? 1);
  // hold a comfortable ring around the target
  const ring = a.radius + t.radius + 1.6; const rad = (l - ring) * 0.6;
  aiMove(w, a, sx + dx / l * rad, sz + dz / l * rad, speed, dt, t);
  ai.behaviour = 'strafe';
}

function meleeBrain(w: World, a: Actor, t: Actor, d: number, dt: number, def: EnemyDef) {
  const ai = a.ai!;
  const reach = (def.light[0]?.reach ?? 2.0); const engage = reach + t.radius - 0.35;
  if (def.retreatBelow > 0 && a.hp < a.maxHp * def.retreatBelow && !(ai.retreatTimer && ai.retreatTimer > 0) && !ai.summoned) {
    ai.summoned = true; ai.retreatTimer = 2.0;   // (re-uses the flag: one retreat per life)
  }
  if (ai.retreatTimer && ai.retreatTimer > 0) { aiMove(w, a, a.pos.x - t.pos.x, a.pos.z - t.pos.z, a.walkSpeed * 1.3, dt, t); return; }
  if (tryBlock(w, a, def, t, d)) return;
  // boss: leap in from mid range (phase 2)
  if (ai.boss && ai.boss.phase === 2 && (ai.jumpCooldown ?? 0) <= 0 && d >= 3 && d <= 9 && attackers(w, t.id, a) < 2) {
    ai.jumpCooldown = 8; ai.behaviour = 'attack';
    const jump: AttackDef = { ...BOSS_JUMP, step: Math.max(1.5, Math.min(8, d - 1.2)) };
    startAttack(w, a, jump, 'special', yawFromDir(t.pos.x - a.pos.x, t.pos.z - a.pos.z));
    a.vel.y = 8.0; a.onGround = false;   // parabola over the startup; lands at the shockwave
    return;
  }
  // lunge: start the (telegraphed) swing from just outside reach; the swing's forward step closes the gap
  const lunge = engage + Math.min(1.0, def.light[0].step * 0.8);
  if (d <= lunge && ai.attackCooldown <= 0 && attackers(w, t.id, a) < 2 && facing(a, t, 0.5)) { doAttack(w, a, def, chooseAttack(w, a, def, t, d), t); return; }
  if (d > engage) {
    ai.behaviour = 'chase';
    aiMove(w, a, t.pos.x - a.pos.x, t.pos.z - a.pos.z, d > 6 ? a.runSpeed : a.walkSpeed * 1.25, dt, d < 4 ? t : null);
    return;
  }
  faceActor(a, t, dt);
  if (d < engage - 0.8 || w.rng.chance(0.6)) strafe(w, a, t, dt, a.walkSpeed * 0.9);
  else idleAnim(w, a, true);
}

function rogueBrain(w: World, a: Actor, t: Actor, d: number, dt: number, def: EnemyDef) {
  const ai = a.ai!;
  const engage = def.light[0].reach + t.radius - 0.35;
  if (ai.retreatTimer && ai.retreatTimer > 0) { aiMove(w, a, a.pos.x - t.pos.x, a.pos.z - t.pos.z, a.runSpeed * 0.8, dt, t); return; }
  if (a.hp < a.maxHp * def.retreatBelow && !ai.summoned) { ai.summoned = true; ai.retreatTimer = 1.8; return; }
  const behind = isBehind(a, t);
  if (ai.attackCooldown <= 0 && d <= engage + 0.9 && attackers(w, t.id, a) < 2 && facing(a, t, 0.5)) {
    doAttack(w, a, def, def.light[(ai.attacksInRow ?? 0) % def.light.length], t);
    if ((ai.attacksInRow ?? 0) >= 2) { ai.attacksInRow = 0; ai.retreatTimer = 2.4; }
    return;
  }
  if (d > 5) { ai.behaviour = 'chase'; aiMove(w, a, t.pos.x - a.pos.x, t.pos.z - a.pos.z, a.runSpeed, dt); return; }
  // slip around to the target's back
  const f = forwardFromYaw(t.yaw); const bp = { x: t.pos.x - f.x * 1.6, z: t.pos.z - f.z * 1.6 };
  const db = Math.hypot(bp.x - a.pos.x, bp.z - a.pos.z);
  if (!behind && db > 0.5) { ai.behaviour = 'strafe'; aiMove(w, a, bp.x - a.pos.x, bp.z - a.pos.z, a.runSpeed * 0.85, dt, t); return; }
  if (d > engage) { ai.behaviour = 'chase'; aiMove(w, a, t.pos.x - a.pos.x, t.pos.z - a.pos.z, a.runSpeed * 0.8, dt, t); return; }
  faceActor(a, t, dt, 10); idleAnim(w, a, true);
}

function mageBrain(w: World, a: Actor, t: Actor, d: number, dt: number, def: EnemyDef) {
  const ai = a.ai!;
  const [kmin, kmax] = def.keepDistance ?? [7, 11];
  if (d < kmin - 1.5) {
    if (d < 1.9 && ai.attackCooldown <= 0 && w.rng.chance(0.5)) { doAttack(w, a, def, def.light[0], t); return; }
    // cornered (or simply pressed): still fire point-blank now and then instead of back-pedalling forever
    if ((ai.castCooldown ?? 0) <= 0 && (ai.timer ?? 0) <= 0 && w.rng.chance(0.05) && useAbility(w, a, 'necroticBolt', { targetId: t.id })) { ai.castCooldown = rand(w, def.castCooldown ?? [3.0, 4.2]) * 0.7; ai.behaviour = 'attack'; return; }
    const before = { x: a.pos.x, z: a.pos.z };
    ai.behaviour = 'retreat'; aiMove(w, a, a.pos.x - t.pos.x, a.pos.z - t.pos.z, a.walkSpeed * 1.4, dt, t);
    if (Math.hypot(a.pos.x - before.x, a.pos.z - before.z) < 1e-3 && ai.attackCooldown <= 0 && d < 2.4) doAttack(w, a, def, def.light[0], t);   // wall at the back: swing
    return;
  }
  if (d > kmax + 2) { ai.behaviour = 'chase'; aiMove(w, a, t.pos.x - a.pos.x, t.pos.z - a.pos.z, d > 14 ? a.runSpeed : a.walkSpeed, dt); return; }
  faceActor(a, t, dt, 10);
  if ((ai.castCooldown ?? 0) <= 0 && d <= 20) {
    if (useAbility(w, a, 'necroticBolt', { targetId: t.id })) { ai.castCooldown = rand(w, def.castCooldown ?? [2.4, 3.4]); ai.behaviour = 'attack'; return; }
  }
  if (w.rng.chance(0.5)) strafe(w, a, t, dt, a.walkSpeed * 0.7); else idleAnim(w, a, true);
}
