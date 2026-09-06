// The deterministic simulation. Owns all actors, movement, collision, triggers, interactables, and wires the
// combat / abilities / AI / inventory / rules modules together. No three.js, no DOM (Node-importable).
import { Rng } from './rng.ts';
import { terrainHeight, terrainNormal, surfaceAt } from './terrain.ts';
import { LAKE, WADE_DEPTH, MAP_HALF, COLLIDERS, TRIGGERS, INTERACTABLES, CRYPT_ORIGIN, LANDMARKS } from '../content/level.ts';
import type { Actor, PlayerIntent, AnyCollider, Trigger, Interactable, ModelId, ClassId, Faction, Abilities, InventorySlot, EquipSlot, SkillKey, AbilityKey, Projectile, EnemyKind } from './types.ts';
import { emptyIntent } from './types.ts';
import { bus, type RollResult } from '../core/events.ts';
import { forwardFromYaw, yawFromDir, approachAngle, clamp, dist2, len2, wrapAngle, type Vec3 } from '../core/math.ts';
import { mod, profBonus } from './dice.ts';
import { getClass, CLASSES } from '../content/classes.ts';
import * as combat from './combat.ts';
import * as abilities from './abilities.ts';
import * as inventory from './inventory.ts';
import * as rules from './rules.ts';
import * as ai from './ai.ts';
import * as companion from './companion.ts';

export const GRAVITY = -22;
const DODGE_TIME = 0.55, DODGE_SPEED = 8.5, DODGE_COST = 22, DODGE_IFRAMES = 0.32;
const SPRINT_COST = 9;   // per second
const STAMINA_REGEN = 26; // per second
const JUMP_VEL = 6.8;
const LOCK_ACQUIRE = 18, LOCK_BREAK = 25;
/** Enemies swing far more often than one attack per 6 s round, so heroes get a flat HP cushion at level 1 (5e dice stay readable). */
export const HERO_HP_BONUS = 6;
const CLIP_LEN: Record<string, number> = { Cheer: 1.67, Interact: 1.3, PickUp: 1.3, Use_Item: 1.6, Throw: 1.37, Taunt: 1.03, Spellcast_Raise: 2.1, Spellcast_Long: 2.53, Spellcast_Shoot: 0.93, Lie_Down: 3, Lie_StandUp: 2.33, Sit_Floor_Down: 1, Sit_Floor_StandUp: 1.13, Hit_A: 0.67, Hit_B: 0.87, Death_A: 0.8, Death_B: 2.63, Jump_Full_Long: 2.33 };

export interface SpawnOpts {
  id: string; kind: Actor['kind']; name: string; model: ModelId; faction: Faction; pos: Vec3; yaw?: number;
  classId?: ClassId; level?: number; abilities?: Partial<Abilities>; maxHp?: number; ac?: number;
  weapon?: Actor['weapon']; offhand?: Actor['offhand']; hidden?: boolean; ai?: Partial<NonNullable<Actor['ai']>>;
  walkSpeed?: number; runSpeed?: number; radius?: number; maxStamina?: number; poise?: number; scale?: number; important?: boolean;
}

export class World {
  rng: Rng;
  time = 0;
  actors = new Map<string, Actor>();
  colliders: AnyCollider[] = [...COLLIDERS];
  triggers: Trigger[] = TRIGGERS.map((t) => ({ ...t }));
  interactables: Interactable[] = INTERACTABLES.map((i) => ({ ...i }));
  firedTriggers = new Set<string>();
  playerId = 'player';
  intent: PlayerIntent = emptyIntent();
  /** The interactable currently in range/facing (for the prompt). */
  focusInteractable: Interactable | null = null;
  area: 'shore' | 'crypt' = 'shore';
  paused = false;
  /** Hook for other modules: run after movement each step. */
  postStep: ((w: World, dt: number) => void)[] = [];

  // ---- sim-rules state ----
  inventory: InventorySlot[] = [];
  gold = 0;
  equipment: Record<EquipSlot, string | null> = { mainHand: null, offHand: null, armor: null, ring: null, amulet: null };
  /** Hotbar ability ids (keys 1–6) for the current class. */
  kit: string[] = [];
  flags = new Set<string>();
  encounters = new Map<string, { alive: number }>();
  encounterMembers = new Map<string, string[]>();
  projectiles: Projectile[] = [];
  nextProjectileId = 1;
  nextEnemyId = 1;
  /** Hours (0–24). Long rests advance it by 8. */
  timeOfDay = 7;
  cinematic = false;
  /** Where respawn() puts the player (last campfire / checkpoint). */
  checkpoint: Vec3 = { x: LANDMARKS.start.x, y: 0, z: LANDMARKS.start.z };
  stats: Record<string, number> = { kills: 0, damageDealt: 0, damageTaken: 0, parries: 0, dodges: 0, crits: 0, deaths: 0, potions: 0 };

  constructor(seed = 12345) {
    this.rng = new Rng(seed);
    bus.on('damage', (e) => { if (e.sourceId === this.playerId) this.stats.damageDealt += e.amount; if (e.targetId === this.playerId) this.stats.damageTaken += e.amount; if (e.crit && e.sourceId === this.playerId) this.stats.crits++; });
    bus.on('death', (e) => { if (e.actorId === this.playerId) this.stats.deaths++; else if (this.actors.get(e.actorId)?.kind === 'enemy') this.stats.kills++; });
    bus.on('parry', (e) => { if (e.defenderId === this.playerId) this.stats.parries++; });
    bus.on('itemUsed', (e) => { if (e.actorId === this.playerId) this.stats.potions++; });
  }

  get player(): Actor { return this.actors.get(this.playerId)!; }

  spawn(o: SpawnOpts): Actor {
    const abilities: Abilities = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...o.abilities };
    const level = o.level ?? 1;
    const groundY = terrainHeight(o.pos.x, o.pos.z);
    const maxHp = o.maxHp ?? 10 + mod(abilities.con);
    const a: Actor = {
      id: o.id, kind: o.kind, name: o.name, model: o.model, classId: o.classId, faction: o.faction,
      pos: { x: o.pos.x, y: o.pos.y ?? groundY, z: o.pos.z }, yaw: o.yaw ?? 0, vel: { x: 0, y: 0, z: 0 }, onGround: true, groundY,
      radius: o.radius ?? 0.42, height: 1.8, walkSpeed: o.walkSpeed ?? 2.4, runSpeed: o.runSpeed ?? 5.6,
      level, xp: 0, prof: profBonus(level), abilities, ac: o.ac ?? 10 + mod(abilities.dex), hp: maxHp, maxHp, tempHp: 0,
      hitDice: level, maxHitDice: level, skillProfs: [], saveProfs: [],
      stamina: o.maxStamina ?? 100, maxStamina: o.maxStamina ?? 100, staminaRegenDelay: 0,
      state: 'idle', stateTime: 0, iframes: 0, poise: o.poise ?? (o.kind === 'player' ? combat.COMBAT.playerPoise : 40), maxPoise: o.poise ?? (o.kind === 'player' ? combat.COMBAT.playerPoise : 40), staggerTime: 0,
      blocking: false, parryWindow: 0, comboIndex: 0, comboWindow: 0, attackKind: null, hitboxOpen: false, hitDone: new Set(), chargeTime: 0,
      weapon: o.weapon ?? null, offhand: o.offhand ?? null,
      anim: { name: 'Idle', loop: true, fade: 0.2, speed: 1, seq: 0 },
      targetId: null, conditions: {}, resources: {}, cooldowns: {},
      ai: o.ai ? { behaviour: 'idle', targetId: null, timer: 0, attackCooldown: 0, home: { ...o.pos }, leash: 40, aggroRange: 14, ...o.ai } : undefined,
      hidden: o.hidden, footstepPhase: 0,
      attack: null, attackPhase: null, attackTime: 0, queued: null, feats: [], scale: o.scale, important: o.important, animHold: 0, pendingLevelUps: 0,
    };
    a.style = combat.weaponStyle(a);
    if (a.kind === 'player' && a.classId) { const c = getClass(a.classId); if (c) { a.skillProfs = [...c.skillProfs]; a.saveProfs = [...c.saveProfs]; a.expertise = c.expertise ? [...c.expertise] : undefined; a.resources = { ...c.resources }; this.kit = [...c.kit]; if (a.classId === 'rogue') a.sneakDice = '1d6'; } }
    if (a.kind === 'companion') companion.initCompanion(a, { abilities: o.abilities, maxHp: o.maxHp, ac: o.ac, level: o.level });
    this.actors.set(a.id, a);
    return a;
  }
  remove(id: string) { this.actors.delete(id); }

  /** Request an animation on an actor (sim side). */
  setAnim(a: Actor, name: string, loop = true, fade = 0.15, speed = 1) {
    if (a.anim.name === name && a.anim.loop === loop && loop) return;
    a.anim = { name, loop, fade, speed, seq: a.anim.seq + 1 };
  }
  setState(a: Actor, s: Actor['state']) { if (a.state !== s) { a.state = s; a.stateTime = 0; } }
  toast(text: string, kind: 'info' | 'warn' | 'gold' | 'xp' = 'info') { bus.emit('toast', { text, kind }); }

  // ---------------- collision ----------------
  /** Resolve horizontal position against colliders; returns adjusted x/z. */
  resolveCollisions(a: Actor, x: number, z: number): { x: number; z: number } {
    for (const c of this.colliders) {
      if (c.kind === 'circle') {
        const dx = x - c.x, dz = z - c.z; const d = Math.hypot(dx, dz); const min = c.r + a.radius;
        if (d < min && d > 1e-5) { x = c.x + (dx / d) * min; z = c.z + (dz / d) * min; }
        else if (d <= 1e-5) { x = c.x + min; }
      } else {
        if (c.y0 !== undefined && (a.pos.y > (c.y1 ?? 1e9) || a.pos.y + a.height < c.y0)) continue;
        const cos = Math.cos(-c.yaw), sin = Math.sin(-c.yaw);
        const lx = (x - c.x) * cos - (z - c.z) * sin, lz = (x - c.x) * sin + (z - c.z) * cos;
        const hw = c.w / 2 + a.radius, hd = c.d / 2 + a.radius;
        if (Math.abs(lx) < hw && Math.abs(lz) < hd) {
          const px = hw - Math.abs(lx), pz = hd - Math.abs(lz);
          let nx = lx, nz = lz;
          if (px < pz) nx = Math.sign(lx || 1) * hw; else nz = Math.sign(lz || 1) * hd;
          const c2 = Math.cos(c.yaw), s2 = Math.sin(c.yaw);
          x = c.x + nx * c2 - nz * s2; z = c.z + nx * s2 + nz * c2;
        }
      }
    }
    // world bounds & deep water
    const inCrypt = Math.abs(z - CRYPT_ORIGIN.z) < 120;
    if (!inCrypt) {
      x = clamp(x, -MAP_HALF + 2, MAP_HALF - 2); z = clamp(z, -MAP_HALF + 2, MAP_HALF - 2);
      if (terrainHeight(x, z) < LAKE.level - WADE_DEPTH) { x = a.pos.x; z = a.pos.z; }
    }
    if (!Number.isFinite(x) || !Number.isFinite(z)) { x = a.pos.x; z = a.pos.z; }
    return { x, z };
  }
  /** Is a point inside a static collider (for projectiles)? */
  pointBlocked(x: number, z: number, y = 0): boolean {
    for (const c of this.colliders) {
      if (c.kind === 'circle') { if (Math.hypot(x - c.x, z - c.z) < c.r) return true; }
      else {
        if (c.y0 !== undefined && (y > (c.y1 ?? 1e9) || y < c.y0)) continue;
        const cos = Math.cos(-c.yaw), sin = Math.sin(-c.yaw);
        const lx = (x - c.x) * cos - (z - c.z) * sin, lz = (x - c.x) * sin + (z - c.z) * cos;
        if (Math.abs(lx) < c.w / 2 && Math.abs(lz) < c.d / 2) return true;
      }
    }
    return false;
  }
  /** Move actor by desired displacement with collision. */
  moveActor(a: Actor, dx: number, dz: number) {
    if (!Number.isFinite(dx) || !Number.isFinite(dz)) return;
    let nx = a.pos.x + dx, nz = a.pos.z + dz;
    const h0 = terrainHeight(a.pos.x, a.pos.z), h1 = terrainHeight(nx, nz);
    const horiz = Math.hypot(dx, dz);
    if (horiz > 1e-6 && h1 - h0 > horiz * 1.15 && a.onGround) {
      const hx = terrainHeight(a.pos.x + dx, a.pos.z), hz = terrainHeight(a.pos.x, a.pos.z + dz);
      if (hx - h0 <= Math.abs(dx) * 1.15) { nz = a.pos.z; } else if (hz - h0 <= Math.abs(dz) * 1.15) { nx = a.pos.x; } else { nx = a.pos.x; nz = a.pos.z; }
    }
    const r = this.resolveCollisions(a, nx, nz);
    a.pos.x = r.x; a.pos.z = r.z;
  }
  /** Gravity + ground snap. */
  applyVertical(a: Actor, dt: number) {
    const g = terrainHeight(a.pos.x, a.pos.z); a.groundY = g;
    if (a.state === 'jump' || !a.onGround) {
      a.vel.y += GRAVITY * dt; a.pos.y += a.vel.y * dt;
      if (a.pos.y <= g) { a.pos.y = g; a.vel.y = 0; if (!a.onGround) { a.onGround = true; if (a.state === 'jump') { this.setState(a, 'idle'); this.setAnim(a, 'Jump_Land', false, 0.05); a.stateTime = -0.25; } } }
    } else { a.pos.y = g; a.vel.y = 0; }
  }
  /** Soft push-apart so actors can't walk through each other. */
  pushApart() {
    const list: Actor[] = [];
    for (const a of this.actors.values()) if (!a.hidden && !a.dead && a.ai?.behaviour !== 'dormant' && a.state !== 'lie' && a.state !== 'sit') list.push(a);
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z; const d = Math.hypot(dx, dz); const min = a.radius + b.radius;
      if (d >= min) continue;
      const nx = d > 1e-4 ? dx / d : 1, nz = d > 1e-4 ? dz / d : 0; const push = (min - d);
      const wa = b.radius / (a.radius + b.radius);   // heavier (bigger) actors move less
      const ra = this.resolveCollisions(a, a.pos.x - nx * push * wa, a.pos.z - nz * push * wa); a.pos.x = ra.x; a.pos.z = ra.z;
      const rb = this.resolveCollisions(b, b.pos.x + nx * push * (1 - wa), b.pos.z + nz * push * (1 - wa)); b.pos.x = rb.x; b.pos.z = rb.z;
    }
  }

  // ---------------- lock-on ----------------
  private lockCandidates(): Actor[] {
    const p = this.player; const out: Actor[] = [];
    for (const a of this.actors.values()) {
      if (a.kind !== 'enemy' || a.dead || a.hidden || a.invisible || a.ai?.behaviour === 'dormant') continue;
      if (dist2(a.pos, p.pos) <= LOCK_ACQUIRE) out.push(a);
    }
    return out;
  }
  setTarget(id: string | null) {
    const p = this.player; if (!p) return;
    if (p.targetId === id) return;
    p.targetId = id; bus.emit('lockOn', { actorId: p.id, targetId: id });
  }
  /** Toggle lock-on: nearest visible enemy in front of the camera. */
  toggleLock() {
    const p = this.player;
    if (p.targetId) { this.setTarget(null); return; }
    const camF = forwardFromYaw(this.intent.cameraYaw);
    let best: Actor | null = null, bs = Infinity, fallback: Actor | null = null, fd = Infinity;
    for (const a of this.lockCandidates()) {
      const dx = a.pos.x - p.pos.x, dz = a.pos.z - p.pos.z; const d = Math.hypot(dx, dz) || 1e-6; const cos = (dx * camF.x + dz * camF.z) / d;
      if (d < fd) { fd = d; fallback = a; }
      if (cos < 0.1) continue;
      const s = d * (1.6 - cos); if (s < bs) { bs = s; best = a; }
    }
    this.setTarget((best ?? fallback)?.id ?? null);
  }
  /** Switch to the next target left/right of the current one (scroll while locked). */
  cycleTarget(dir: number) {
    const p = this.player; if (!p) return;
    const list = this.lockCandidates(); if (!list.length) { this.setTarget(null); return; }
    if (!p.targetId) { this.toggleLock(); return; }
    const cur = this.actors.get(p.targetId);
    const camYaw = this.intent.cameraYaw;
    const ang = (a: Actor) => wrapAngle(yawFromDir(a.pos.x - p.pos.x, a.pos.z - p.pos.z) - camYaw);
    const sorted = list.map((a) => ({ a, ang: ang(a) })).sort((x, y) => x.ang - y.ang);
    let i = cur ? sorted.findIndex((s) => s.a === cur) : -1;
    if (i < 0) { this.setTarget(sorted[0].a.id); return; }
    // yaw increases to the left (x = sin(yaw)); dir > 0 = next to the right
    i = (i + (dir > 0 ? -1 : 1) + sorted.length) % sorted.length;
    this.setTarget(sorted[i].a.id);
  }
  private validateLock() {
    const p = this.player; if (!p?.targetId) return;
    const t = this.actors.get(p.targetId);
    if (!t || t.dead || t.hidden || dist2(t.pos, p.pos) > LOCK_BREAK) this.setTarget(null);
  }
  /** Direction a new attack/cast should face: lock target, else movement input, else current facing. */
  playerFaceYaw(): number {
    const p = this.player; const it = this.intent;
    if (p.targetId) { const t = this.actors.get(p.targetId); if (t && !t.dead) return yawFromDir(t.pos.x - p.pos.x, t.pos.z - p.pos.z); }
    const m = this.moveVector(it);
    if (m.l > 0.05) return yawFromDir(m.x, m.z);
    return p.yaw;
  }
  private moveVector(it: PlayerIntent) {
    const camF = forwardFromYaw(it.cameraYaw); const camR = { x: camF.z, z: -camF.x };
    let mx = camF.x * it.move.z + camR.x * it.move.x, mz = camF.z * it.move.z + camR.z * it.move.x;
    const l = len2(mx, mz); if (l > 1) { mx /= l; mz /= l; }
    return { x: mx, z: mz, l: Math.min(1, l) };
  }

  // ---------------- player ----------------
  stepPlayer(p: Actor, it: PlayerIntent, dt: number) {
    if (p.dead) return;
    if (this.cinematic || p.state === 'cinematic') { p.blocking = false; return; }
    if (p.state === 'interact') { if ((p.animHold ?? 0) > 0) return; this.setState(p, 'idle'); }
    const controllable = p.state === 'idle' || p.state === 'move' || p.state === 'jump';
    const mv = this.moveVector(it); const mx = mv.x, mz = mv.z, ml = mv.l;
    const wantMove = ml > 0.05;
    const dash = !!p.conditions.cunningDash;

    // lock-on
    if (it.lockOn) this.toggleLock();
    if (it.lockTargetHint) { const d = it.lockTargetHint === 'next' || it.lockTargetHint === 'right' ? 1 : it.lockTargetHint === 'prev' || it.lockTargetHint === 'left' ? -1 : 0; if (d) this.cycleTarget(d); else if (this.actors.has(it.lockTargetHint)) this.setTarget(it.lockTargetHint); }
    this.validateLock();

    // stamina regen
    const sprintingNow = it.sprint && wantMove && controllable && !dash;
    if (p.staminaRegenDelay > 0) p.staminaRegenDelay -= dt;
    else if (!sprintingNow && p.state !== 'dodge' && p.state !== 'attack') p.stamina = Math.min(p.maxStamina, p.stamina + STAMINA_REGEN * dt * (p.blocking ? 0.5 : 1));

    // attack input: act now, or buffer for the end of the current action
    if (it.lightAttack || it.heavyAttack) {
      const kind: 'light' | 'heavy' = it.heavyAttack ? 'heavy' : 'light';
      const canNow = (controllable && p.state !== 'jump' && p.onGround) || p.state === 'block';
      if (canNow) { if (p.state === 'block') { p.blocking = false; this.setState(p, 'idle'); } if (kind === 'light') combat.startLight(this, p, this.playerFaceYaw()); else combat.startHeavy(this, p, this.playerFaceYaw()); }
      else if ((p.state === 'attack' && p.attackPhase !== 'charge') || p.state === 'dodge' || p.state === 'stagger' || p.state === 'cast' || p.state === 'jump') { p.queued = kind; p.queuedAt = this.time; }
    }
    // dodge (also cancels attack recovery and blocking)
    const dodgeCost = DODGE_COST * (combat.hasFeat(p, 'mobile') ? 0.75 : 1);
    if (it.dodge && (controllable || p.state === 'block' || combat.canDodgeCancel(p)) && p.onGround && p.state !== 'jump') {
      if (p.stamina < dodgeCost * 0.5) bus.emit('staminaEmpty', { actorId: p.id });
      else {
        if (p.state === 'attack') combat.cancelAttack(this, p);
        p.stamina -= dodgeCost; p.staminaRegenDelay = 0.6;
        this.setState(p, 'dodge'); p.iframes = DODGE_IFRAMES; p.blocking = false; p.parryWindow = 0; p.comboIndex = 0; p.comboWindow = 0;
        let dyaw = wantMove ? yawFromDir(mx, mz) : p.yaw + Math.PI;
        if (p.targetId && wantMove) {
          const rel = wrapAngle(dyaw - p.yaw);
          const name = Math.abs(rel) < Math.PI / 4 ? 'Dodge_Forward' : Math.abs(rel) > 3 * Math.PI / 4 ? 'Dodge_Backward' : rel > 0 ? 'Dodge_Left' : 'Dodge_Right';
          this.setAnim(p, name, false, 0.05, 1.25);
        } else {
          if (wantMove) p.yaw = dyaw; else dyaw = p.yaw + Math.PI;
          this.setAnim(p, wantMove ? 'Dodge_Forward' : 'Dodge_Backward', false, 0.05, 1.25);
        }
        (p as any)._dodgeDir = forwardFromYaw(dyaw);
        this.stats.dodges++;
        bus.emit('dodge', { actorId: p.id, pos: { ...p.pos } });
      }
    }
    if (p.state === 'dodge') {
      const d = (p as any)._dodgeDir as Vec3 | undefined; const t = p.stateTime / DODGE_TIME;
      const sp = DODGE_SPEED * (1 - t * 0.8);
      if (d) this.moveActor(p, d.x * sp * dt, d.z * sp * dt);
      if (p.stateTime >= DODGE_TIME) this.setState(p, 'idle');
      return;
    }
    // jump
    if (it.jump && controllable && p.onGround && p.state !== 'jump' && p.stamina > 5) {
      p.vel.y = JUMP_VEL; p.onGround = false; this.setState(p, 'jump'); this.setAnim(p, 'Jump_Full_Short', false, 0.05, 1.1); p.stamina -= 8; p.staminaRegenDelay = 0.3;
      if (wantMove) p.yaw = approachAngle(p.yaw, yawFromDir(mx, mz), 1.5);
    }
    if (p.state === 'attack' || p.state === 'cast' || p.state === 'stagger' || p.state === 'drink' || p.state === 'awaken' || p.state === 'rest' || p.state === 'lie' || p.state === 'sit') { p.blocking = false; return; }

    // buffered attack fires as soon as we're free again
    if (p.queued && controllable && p.state !== 'jump') {
      const q = p.queued; p.queued = null;
      if (this.time - (p.queuedAt ?? 0) <= combat.COMBAT.bufferTime) { if (q === 'light' ? combat.startLight(this, p, this.playerFaceYaw()) : combat.startHeavy(this, p, this.playerFaceYaw())) return; }
    }
    // abilities / items
    if (it.ability !== null && (controllable || p.state === 'block') && p.state !== 'jump') {
      const id = this.kit[it.ability];
      if (id) { if (abilities.useAbility(this, p, id)) return; }
      else this.toast('Nothing on that key.', 'info');
    }
    if (it.useItem && (controllable || p.state === 'block') && p.state !== 'jump') {
      const pot = inventory.quickPotion(this);
      if (!pot) this.toast('No potions left.', 'warn');
      else if (inventory.useItem(this, pot)) return;
    }
    // block (hold)
    const bm = combat.blockMode(p);
    if (it.block && bm && p.onGround && p.state !== 'jump' && (controllable || p.state === 'block')) {
      if (!p.blocking) {
        p.blocking = true; p.parryWindow = bm === 'shield' ? (combat.hasFeat(p, 'defensiveDuelist') ? combat.COMBAT.parryWindowDuelist : combat.COMBAT.parryWindow) : 0;
        this.setState(p, 'block'); this.setAnim(p, bm === 'shield' ? 'Blocking' : 'Spellcasting', true, 0.08); p.animHold = 0;
      } else if ((p.animHold ?? 0) <= 0 && p.anim.name !== (bm === 'shield' ? 'Blocking' : 'Spellcasting')) this.setAnim(p, bm === 'shield' ? 'Blocking' : 'Spellcasting', true, 0.1);
      p.parryWindow = Math.max(0, p.parryWindow - dt);
      if (wantMove) this.moveActor(p, mx * 1.6 * dt, mz * 1.6 * dt);
      if (p.targetId) { const t = this.actors.get(p.targetId); if (t) p.yaw = approachAngle(p.yaw, yawFromDir(t.pos.x - p.pos.x, t.pos.z - p.pos.z), 8 * dt); }
      else if (wantMove) p.yaw = approachAngle(p.yaw, yawFromDir(mx, mz), 6 * dt);
      return;
    } else if (p.blocking || p.state === 'block') { p.blocking = false; p.parryWindow = 0; this.setState(p, 'idle'); }

    // locomotion
    const sprinting = it.sprint && wantMove && (p.stamina > 0 || dash) && p.state !== 'jump';
    if (sprinting && !dash) { p.stamina = Math.max(0, p.stamina - SPRINT_COST * dt); if (p.stamina <= 0) { p.staminaRegenDelay = 1.0; bus.emit('staminaEmpty', { actorId: p.id }); } }
    const walking = it.walk;
    let speed = wantMove ? (sprinting ? p.runSpeed * 1.35 : walking ? p.walkSpeed : p.runSpeed) * ml : 0;
    if (dash) speed *= 1.2;
    if (p.conditions.slowed) speed *= 0.5;
    if (wantMove) {
      const desiredYaw = yawFromDir(mx, mz);
      if (p.targetId && !sprinting) { const t = this.actors.get(p.targetId); if (t) p.yaw = approachAngle(p.yaw, yawFromDir(t.pos.x - p.pos.x, t.pos.z - p.pos.z), 10 * dt); }
      else p.yaw = approachAngle(p.yaw, desiredYaw, 12 * dt);
      this.moveActor(p, mx * speed * dt, mz * speed * dt);
    }
    if (p.state === 'jump') return;
    if (wantMove) {
      this.setState(p, 'move');
      if (p.targetId && !sprinting) {
        const rel = wrapAngle(yawFromDir(mx, mz) - p.yaw);
        const name = Math.abs(rel) < Math.PI / 3 ? (walking ? 'Walking_A' : 'Running_A') : Math.abs(rel) > 2 * Math.PI / 3 ? 'Walking_Backwards' : rel > 0 ? 'Running_Strafe_Left' : 'Running_Strafe_Right';
        this.setAnim(p, name, true, 0.12, name.startsWith('Walking') ? 1.0 : 1.05);
      } else this.setAnim(p, sprinting ? 'Running_B' : walking ? 'Walking_A' : 'Running_A', true, 0.12, sprinting ? 1.25 : 1.0);
      const stride = sprinting ? 0.36 : walking ? 0.62 : 0.42;
      p.footstepPhase += speed * dt;
      if (p.footstepPhase >= stride) { p.footstepPhase = 0; bus.emit('footstep', { actorId: p.id, pos: { ...p.pos }, surface: this.surfaceFor(p), running: !walking }); }
    } else {
      this.setState(p, 'idle');
      const style = combat.weaponStyle(p);
      this.setAnim(p, style === '2h' ? '2H_Melee_Idle' : 'Idle', true, 0.25);
      p.footstepPhase = 0.3;
    }
  }
  surfaceFor(a: Actor): 'grass' | 'stone' | 'water' | 'wood' | 'dirt' {
    if (Math.abs(a.pos.z - CRYPT_ORIGIN.z) < 120) return 'stone';
    return surfaceAt(a.pos.x, a.pos.z);
  }

  // ---------------- triggers / interactables ----------------
  updateTriggers(p: Actor) {
    for (const t of this.triggers) {
      if (t.once && this.firedTriggers.has(t.id)) continue;
      if (dist2(p.pos, t) < t.r) { this.firedTriggers.add(t.id); bus.emit('trigger', { id: t.id }); }
    }
    let best: Interactable | null = null, bestD = Infinity;
    const f = forwardFromYaw(p.yaw);
    for (const i of this.interactables) {
      if (!i.enabled || i.used) continue;
      const d = dist2(p.pos, i); if (d > i.r) continue;
      const dx = i.x - p.pos.x, dz = i.z - p.pos.z; const dot = (dx * f.x + dz * f.z) / (d || 1);
      const score = d - dot * 0.8;
      if (score < bestD) { bestD = score; best = i; }
    }
    if (best !== this.focusInteractable) { this.focusInteractable = best; bus.emit('interactable', { id: best?.id ?? null, label: best?.label ?? null }); }
  }
  getInteractable(id: string) { return this.interactables.find((i) => i.id === id); }
  setInteractable(id: string, patch: Partial<Interactable>) { const i = this.getInteractable(id); if (i) Object.assign(i, patch); if (this.focusInteractable?.id === id && (patch.enabled === false || patch.used)) { this.focusInteractable = null; bus.emit('interactable', { id: null, label: null }); } }
  addInteractable(i: Interactable) { const idx = this.interactables.findIndex((x) => x.id === i.id); if (idx >= 0) this.interactables[idx] = { ...i }; else this.interactables.push({ ...i }); }
  addTrigger(t: Trigger) { const idx = this.triggers.findIndex((x) => x.id === t.id); if (idx >= 0) this.triggers[idx] = { ...t }; else this.triggers.push({ ...t }); }
  addCollider(c: AnyCollider) { this.colliders.push(c); }

  // ---------------- main step ----------------
  step(dt: number, intent: PlayerIntent) {
    if (this.paused) return;
    if (!(dt > 0) || !Number.isFinite(dt)) return;
    this.time += dt; this.intent = intent;
    for (const a of this.actors.values()) {
      if (a.hidden) continue;
      a.stateTime += dt;
      if (a.iframes > 0) a.iframes -= dt;
      if ((a.animHold ?? 0) > 0) a.animHold! -= dt;
      for (const k in a.cooldowns) if (a.cooldowns[k] > 0) a.cooldowns[k] = Math.max(0, a.cooldowns[k] - dt);
      for (const k in a.conditions) if (a.conditions[k] > 0) { a.conditions[k] -= dt; if (a.conditions[k] <= 0) { delete a.conditions[k]; bus.emit('condition', { actorId: a.id, condition: k, on: false }); } }
      if (a.staggerTime > 0) { a.staggerTime -= dt; if (a.staggerTime <= 0 && a.state === 'stagger') { this.setState(a, 'idle'); if (a.kind !== 'player') this.setAnim(a, 'Idle', true, 0.2); } }
      if (a.poise < a.maxPoise && a.state !== 'stagger') a.poise = Math.min(a.maxPoise, a.poise + combat.COMBAT.poiseRegen * dt);
      if (a.kind !== 'player' && a.staminaRegenDelay > 0) a.staminaRegenDelay -= dt;
      if (a.dead && a.deathTime !== undefined && !a.hidden && a.kind === 'enemy' && !a.ai?.boss && this.time - a.deathTime > 6) a.hidden = true;
    }
    const p = this.player;
    if (p && !p.hidden) {
      this.stepPlayer(p, intent, dt);
      inventory.updateDrink(this, p, dt);
      if (intent.interact && this.focusInteractable && (p.state === 'idle' || p.state === 'move') && !this.cinematic) {
        bus.emit('interact', { id: this.focusInteractable.id, actorId: p.id });
      }
    }
    combat.updateAttacks(this, dt);
    abilities.updateCasts(this, dt);
    ai.stepEnemies(this, dt);
    companion.stepCompanions(this, dt);
    abilities.updateProjectiles(this, dt);
    for (const fn of this.postStep) fn(this, dt);
    for (const a of this.actors.values()) {
      if (a.hidden || !a.knockback) continue;
      const k = a.knockback; this.moveActor(a, k.x * dt, k.z * dt); k.t -= dt; if (k.t <= 0) a.knockback = null;
    }
    this.pushApart();
    for (const a of this.actors.values()) { if (!a.hidden) this.applyVertical(a, dt); }
    if (p && !p.hidden) this.updateTriggers(p);
  }

  /** Move an actor to another area (crypt ↔ shore). */
  teleport(a: Actor, to: Vec3, yaw?: number) {
    a.pos.x = to.x; a.pos.z = to.z; a.pos.y = terrainHeight(to.x, to.z); a.vel = { x: 0, y: 0, z: 0 }; a.onGround = true; if (yaw !== undefined) a.yaw = yaw;
    a.knockback = null;
    if (a.state === 'jump' || a.state === 'dodge' || a.state === 'interact') { a.animHold = 0; this.setState(a, 'idle'); this.setAnim(a, 'Idle', true, 0.1); }
    if (a.id === this.playerId) { this.area = Math.abs(to.z - CRYPT_ORIGIN.z) < 120 ? 'crypt' : 'shore'; bus.emit('teleport', { to: { ...to }, area: this.area }); }
  }
  actorsNear(pos: Vec3, r: number, filter?: (a: Actor) => boolean): Actor[] {
    const out: Actor[] = [];
    for (const a of this.actors.values()) if (!a.hidden && !a.dead && dist2(a.pos, pos) <= r && (!filter || filter(a))) out.push(a);
    return out;
  }

  // ======================================================================================
  // Contract API (ARCHITECTURE.md → "World API")
  // ======================================================================================
  spawnEnemy(kind: EnemyKind, pos: Vec3, opts?: ai.SpawnEnemyOpts): Actor { return ai.spawnEnemy(this, kind, pos, opts); }
  startEncounter(id: string, actorIds: string[]) { ai.startEncounter(this, id, actorIds); }
  addToEncounter(id: string, actorId: string) { ai.addToEncounter(this, id, actorId); }
  awaken(a: Actor, anim?: string, duration?: number) { ai.awakenActor(this, a, anim, duration); }
  onEnemyDeath(a: Actor) { ai.onEnemyDeath(this, a); }

  skillCheck(actor: Actor, skill: SkillKey, dc: number, opts?: rules.CheckOpts): RollResult { return rules.skillCheck(this, actor, skill, dc, opts); }
  abilityCheck(actor: Actor, ability: AbilityKey, dc: number, opts?: rules.CheckOpts): RollResult { return rules.abilityCheck(this, actor, ability, dc, opts); }
  savingThrow(actor: Actor, ability: AbilityKey, dc: number, opts?: rules.CheckOpts): RollResult { return rules.savingThrow(this, actor, ability, dc, opts); }
  rollSave(actor: Actor, ability: AbilityKey, dc: number, opts?: rules.CheckOpts): RollResult { return rules.rollSave(this, actor, ability, dc, opts); }
  passivePerception(actor: Actor): number { return rules.passivePerception(actor); }

  giveItem(itemId: string, qty = 1) { inventory.giveItem(this, itemId, qty); }
  removeItem(itemId: string, qty = 1): boolean { return inventory.removeItem(this, itemId, qty); }
  hasItem(itemId: string, qty = 1): boolean { return inventory.hasItem(this, itemId, qty); }
  countItem(itemId: string): number { return inventory.countItem(this, itemId); }
  equip(itemId: string, slot?: EquipSlot) { inventory.equip(this, itemId, slot); }
  unequip(slot: EquipSlot) { inventory.unequip(this, slot); }
  useItem(itemId: string): boolean { return inventory.useItem(this, itemId); }
  recomputeStats() { if (this.player) inventory.recomputeStats(this, this.player); }

  grantXp(amount: number) { rules.grantXp(this, amount); }
  chooseLevelUp(choiceId: string) { rules.chooseLevelUp(this, choiceId); }
  rest(kind: 'short' | 'long') { rules.rest(this, kind); }

  useAbility(actor: Actor, abilityId: string, opts?: abilities.UseOpts): boolean { return abilities.useAbility(this, actor, abilityId, opts); }
  /** Direct damage from the environment / scripts (traps, falls). */
  damageActor(actorId: string, amount: number, type: import('./types.ts').DamageType = 'bludgeoning', sourceId?: string): number {
    const t = this.actors.get(actorId); if (!t) return 0;
    return combat.applyDamage(this, sourceId ? this.actors.get(sourceId) ?? null : null, t, amount, type, { poiseDamage: 0 });
  }
  healActor(actorId: string, amount: number): number { const t = this.actors.get(actorId); return t ? combat.healActor(this, null, t, amount) : 0; }
  killActor(actorId: string) { const t = this.actors.get(actorId); if (t) combat.killActor(this, t); }
  setCondition(actorId: string, name: string, seconds: number) { const a = this.actors.get(actorId); if (!a) return; const on = !a.conditions[name]; a.conditions[name] = seconds; if (on) bus.emit('condition', { actorId, condition: name, on: true }); }
  clearCondition(actorId: string, name: string) { const a = this.actors.get(actorId); if (!a || !a.conditions[name]) return; delete a.conditions[name]; bus.emit('condition', { actorId, condition: name, on: false }); }

  /** Rebuild the player from content/classes.ts (keeps position, xp and level). */
  setPlayerClass(classId: ClassId) {
    const def = getClass(classId) ?? CLASSES.fighter;
    let p = this.player;
    if (!p) p = this.spawn({ id: this.playerId, kind: 'player', name: 'Adventurer', model: def.model, faction: 'party', pos: LANDMARKS.start, yaw: LANDMARKS.start.yaw });
    p.classId = def.id; p.model = def.model;
    p.abilities = { ...def.abilities }; p.saveProfs = [...def.saveProfs]; p.skillProfs = [...def.skillProfs]; p.expertise = def.expertise ? [...def.expertise] : undefined;
    p.prof = profBonus(p.level);
    const con = mod(p.abilities.con);
    p.maxHp = def.hitDie + con + HERO_HP_BONUS + (p.level - 1) * (Math.floor(def.hitDie / 2) + 1 + con);
    p.hp = p.maxHp; p.tempHp = 0; p.hitDice = p.maxHitDice = p.level;
    p.resources = { ...def.resources }; p.cooldowns = {}; p.conditions = {}; p.feats = []; p.pendingLevelUps = 0;
    p.sneakDice = def.id === 'rogue' ? (p.level >= 3 ? '2d6' : '1d6') : undefined;
    p.maxPoise = p.poise = combat.COMBAT.playerPoise; p.maxStamina = 100; p.stamina = 100; p.staminaRegenDelay = 0;
    p.dead = false; p.targetId = null; p.blocking = false; combat.cancelAttack(this, p); p.castId = null; p.drinkItem = null;
    this.setState(p, 'idle'); this.setAnim(p, 'Idle', true, 0.1);
    this.kit = [...def.kit];
    p.weapon = def.weapon; p.offhand = def.offhand; p.ac = def.ac; p.walkSpeed = def.walkSpeed ?? 2.4; p.runSpeed = def.runSpeed ?? 5.6;
    inventory.applyClassGear(this, def);
    inventory.recomputeStats(this, p);
  }
  /** Bring the player back at the last checkpoint with full HP; awake enemies go home. */
  respawn() {
    const p = this.player; if (!p) return;
    p.dead = false; p.hp = p.maxHp; p.tempHp = 0; p.stamina = p.maxStamina; p.poise = p.maxPoise; p.staggerTime = 0;
    for (const k of Object.keys(p.conditions)) { delete p.conditions[k]; bus.emit('condition', { actorId: p.id, condition: k, on: false }); }
    p.blocking = false; combat.cancelAttack(this, p); p.castId = null; p.drinkItem = null; p.targetId = null; p.knockback = null;
    this.setState(p, 'idle'); this.setAnim(p, 'Idle', true, 0.1); p.iframes = 1.0;
    this.teleport(p, this.checkpoint);
    for (const a of this.actors.values()) {
      if (a.kind !== 'enemy' || !a.ai || a.dead) continue;
      if (a.ai.behaviour === 'dormant' || a.ai.behaviour === 'awaken') continue;
      a.ai.targetId = null; a.ai.behaviour = 'retreat'; a.ai.holdPos = { ...a.ai.home }; a.ai.attackCooldown = 1;
    }
    for (const a of this.actors.values()) if (a.kind === 'companion' && dist2(a.pos, p.pos) > 30) this.teleport(a, { x: p.pos.x + 1.5, y: 0, z: p.pos.z + 1 });
    bus.emit('respawn', { pos: { ...p.pos } });
  }
  setCheckpoint(pos: Vec3) { this.checkpoint = { ...pos }; }

  setCinematic(on: boolean) {
    this.cinematic = on;
    const p = this.player;
    if (on) {
      if (p && !p.dead) { combat.cancelAttack(this, p); p.blocking = false; p.castId = null; p.drinkItem = null; p.queued = null; this.setState(p, 'cinematic'); this.setAnim(p, 'Idle', true, 0.3); }
      for (const a of this.actors.values()) if (a !== p && !a.dead && (a.state === 'attack' || a.state === 'cast')) { combat.cancelAttack(this, a); a.castId = null; this.setState(a, 'idle'); }
    } else {
      for (const a of this.actors.values()) { a.animHold = 0; if (a.state === 'cinematic' || a.state === 'interact') this.setState(a, 'idle'); }
      if (p && !p.dead) { this.setState(p, 'idle'); this.setAnim(p, 'Idle', true, 0.2); }
    }
    bus.emit('cinematic', { on });
  }
  setCompanionFollow(on: boolean, targetPos?: Vec3) {
    for (const a of this.actors.values()) {
      if (a.kind !== 'companion') continue;
      companion.initCompanion(a);
      a.ai!.follow = on; a.ai!.holdPos = targetPos ? { ...targetPos } : null;
    }
  }
  /** Play a one-shot (or looping) animation on an actor for cinematics / emotes; held for the clip length. */
  playAnim(actorId: string, name: string, loop = false, fade = 0.15, speed = 1) {
    const a = this.actors.get(actorId); if (!a || a.dead) return;
    this.setAnim(a, name, loop, fade, speed);
    a.animHold = loop ? 1e9 : (CLIP_LEN[name] ?? 1.4) / Math.max(0.1, speed);
    if (a.id === this.playerId && !this.cinematic && a.state !== 'cinematic') { combat.cancelAttack(this, a); a.blocking = false; this.setState(a, 'interact'); }
  }
  /** Release an animation held by playAnim (returns the actor to its controller). */
  releaseAnim(actorId: string) { const a = this.actors.get(actorId); if (!a) return; a.animHold = 0; if (a.state === 'interact') this.setState(a, 'idle'); }
  lookAt(actorId: string, target: string | Vec3) {
    const a = this.actors.get(actorId); if (!a) return;
    const t = typeof target === 'string' ? this.actors.get(target)?.pos : target; if (!t) return;
    const dx = t.x - a.pos.x, dz = t.z - a.pos.z; if (Math.hypot(dx, dz) < 1e-3) return;
    a.yaw = yawFromDir(dx, dz);
  }
}
