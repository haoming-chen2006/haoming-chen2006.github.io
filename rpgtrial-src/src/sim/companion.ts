// Companion AI (Ilyra): follows the player, keeps her distance in fights, Sacred Flame on the player's
// target every ~3 s, Healing Word once per encounter when the player drops under 40% HP.
import type { World } from './world.ts';
import type { Actor, Vec3 } from './types.ts';
import { forwardFromYaw, yawFromDir, approachAngle, dist2 } from '../core/math.ts';
import { terrainHeight } from './terrain.ts';
import { useAbility } from './abilities.ts';
import { bus } from '../core/events.ts';

export const COMPANION = { followStop: 2.5, walkUntil: 6, teleportBeyond: 30, keepFromEnemies: 6, maxFromPlayer: 10, flameEvery: 3, healBelow: 0.4 };

/** Story companions get sensible stats even when spawned raw by the lead. */
export function initCompanion(a: Actor, explicit: { abilities?: unknown; maxHp?: number; ac?: number; level?: number } = {}) {
  if (a.ai) return;
  a.ai = { behaviour: 'follow', targetId: null, timer: 0, attackCooldown: 0, home: { ...a.pos }, leash: 1e9, aggroRange: 22, follow: true, castCooldown: 1.5, healedThisEncounter: false, holdPos: null };
  if (!explicit.abilities) a.abilities = { str: 10, dex: 14, con: 12, int: 12, wis: 16, cha: 14 };
  if (!explicit.level) { a.level = 2; a.prof = 2; a.hitDice = a.maxHitDice = 2; }
  if (explicit.maxHp === undefined) { a.maxHp = 16; a.hp = 16; }
  if (explicit.ac === undefined) a.ac = 13;
  a.important = true; a.maxPoise = a.poise = 40;
  if (!a.saveProfs.length) a.saveProfs = ['wis', 'cha'];
  if (!a.skillProfs.length) a.skillProfs = ['insight', 'medicine', 'religion', 'persuasion'];
  if (!a.name) a.name = 'Ilyra';
}

export function stepCompanions(w: World, dt: number) {
  for (const a of w.actors.values()) if (a.kind === 'companion' && !a.hidden && !a.dead) stepCompanion(w, a, dt);
}

const hostileAwake = (t: Actor) => t.kind === 'enemy' && !t.dead && !t.hidden && t.ai?.behaviour !== 'dormant' && t.ai?.behaviour !== 'awaken';

function move(w: World, a: Actor, dx: number, dz: number, speed: number, dt: number, face?: Actor | null) {
  const l = Math.hypot(dx, dz); if (l < 1e-4) return;
  dx /= l; dz /= l;
  if (a.conditions.slowed) speed *= 0.5;
  w.moveActor(a, dx * speed * dt, dz * speed * dt);
  w.setState(a, 'move');
  const running = speed > a.walkSpeed * 1.3;
  if (face) {
    a.yaw = approachAngle(a.yaw, yawFromDir(face.pos.x - a.pos.x, face.pos.z - a.pos.z), 9 * dt);
    w.setAnim(a, running ? 'Running_A' : 'Walking_Backwards', true, 0.15, 1.0);
  } else {
    a.yaw = approachAngle(a.yaw, yawFromDir(dx, dz), 9 * dt);
    w.setAnim(a, running ? 'Running_A' : 'Walking_A', true, 0.15, running ? 1.05 : 1.0);
  }
  a.footstepPhase += speed * dt;
  const stride = running ? 0.42 : 0.62;
  if (a.footstepPhase >= stride) { a.footstepPhase = 0; bus.emit('footstep', { actorId: a.id, pos: { ...a.pos }, surface: w.surfaceFor(a), running }); }
}
const idle = (w: World, a: Actor) => { if (a.state === 'move' || a.state === 'idle') { w.setState(a, 'idle'); w.setAnim(a, 'Idle', true, 0.25); } };

function stepCompanion(w: World, a: Actor, dt: number) {
  initCompanion(a);
  const ai = a.ai!;
  if (ai.castCooldown && ai.castCooldown > 0) ai.castCooldown -= dt;
  if (w.cinematic) { if (a.state === 'idle' || a.state === 'move') idle(w, a); return; }
  if (a.state === 'stagger' || a.state === 'cast' || a.state === 'attack' || a.state === 'cinematic' || a.state === 'awaken' || a.state === 'lie' || a.state === 'sit' || a.state === 'interact') return;
  if ((a.animHold ?? 0) > 0) return;
  if (a.knockback) return;
  const p = w.player; if (!p || p.hidden) { idle(w, a); return; }
  const dp = dist2(a.pos, p.pos);
  const follow = ai.follow !== false;

  // ---- combat awareness ----
  let nearest: Actor | null = null, dn = Infinity;
  for (const t of w.actors.values()) { if (!hostileAwake(t)) continue; const d = dist2(t.pos, p.pos); if (d < ai.aggroRange && dist2(t.pos, a.pos) < dn) { dn = dist2(t.pos, a.pos); nearest = t; } }
  const inCombat = nearest !== null && !p.dead;
  if (!inCombat) ai.timer = (ai.timer ?? 0) + dt; else ai.timer = 0;
  if (ai.timer > 10) ai.healedThisEncounter = false;   // calm for a while: her healing word is ready again
  if (inCombat && p.hp > 0 && p.hp < p.maxHp * COMPANION.healBelow && !ai.healedThisEncounter && (a.cooldowns.healingWord ?? 0) <= 0 && dp < 18) {
    if (useAbility(w, a, 'healingWord', { targetId: p.id })) { ai.healedThisEncounter = true; return; }
  }
  if (inCombat && (ai.castCooldown ?? 0) <= 0) {
    let target: Actor | null = null;
    if (p.targetId) { const t = w.actors.get(p.targetId); if (t && hostileAwake(t) && dist2(t.pos, a.pos) < 18) target = t; }
    if (!target && nearest && dn < 18) target = nearest;
    if (target) { if (useAbility(w, a, 'sacredFlame', { targetId: target.id })) { ai.castCooldown = COMPANION.flameEvery + w.rng.range(-0.5, 0.5); return; } }
  }

  // ---- movement ----
  if (follow) {
    if (dp > COMPANION.teleportBeyond) {
      const f = forwardFromYaw(p.yaw); const to: Vec3 = { x: p.pos.x - f.x * 2, y: 0, z: p.pos.z - f.z * 2 }; to.y = terrainHeight(to.x, to.z);
      w.teleport(a, to, p.yaw); idle(w, a); return;
    }
    if (inCombat && nearest) {
      if (dn < COMPANION.keepFromEnemies - 1) { move(w, a, a.pos.x - nearest.pos.x, a.pos.z - nearest.pos.z, a.walkSpeed * 1.5, dt, nearest); return; }
      if (dp > COMPANION.maxFromPlayer) { move(w, a, p.pos.x - a.pos.x, p.pos.z - a.pos.z, a.runSpeed, dt); return; }
      a.yaw = approachAngle(a.yaw, yawFromDir(nearest.pos.x - a.pos.x, nearest.pos.z - a.pos.z), 6 * dt);
      idle(w, a); return;
    }
    if (dp > COMPANION.followStop) {
      const sprinting = p.state === 'move' && p.anim.name === 'Running_B';
      const speed = dp > COMPANION.walkUntil || sprinting ? a.runSpeed * (sprinting ? 1.25 : 1) : a.walkSpeed * 1.1;
      move(w, a, p.pos.x - a.pos.x, p.pos.z - a.pos.z, speed, dt); return;
    }
    idle(w, a); return;
  }
  if (ai.holdPos) {
    const d = dist2(a.pos, ai.holdPos);
    if (d > 0.6) { move(w, a, ai.holdPos.x - a.pos.x, ai.holdPos.z - a.pos.z, d > 6 ? a.runSpeed : a.walkSpeed, dt); return; }
  }
  idle(w, a);
}
