// Combat / gameplay VFX driven by bus events (post-FX agent owns this file).
// Construct once, give it `particles`, call update(dt, camPos) every frame after character views update.
import * as THREE from 'three';
import { bus, type Events, type DamageType } from '../core/events.ts';
import type { Vec3 } from '../core/math.ts';
import type { CharacterView } from './characters.ts';
import type { Renderer } from './renderer.ts';
import { Particles, type Emitter, type EmitterKind } from './particles.ts';
import { WeaponTrail } from './fx/trail.ts';
import { Ghosts } from './fx/ghost.ts';
import { makeSprite, GroundRing, LightColumn, Aura } from './fx/shapes.ts';
import { SPRITE } from './fx/textures.ts';
import { INTERACTABLES, LANDMARKS } from '../content/level.ts';
import { terrainHeight } from '../sim/terrain.ts';
import { FlickerLight } from './fx/flickerLight.ts';

type GetView = (id: string) => CharacterView | undefined;

const CLASS_COLOR: Record<string, number> = { fighter: 0xffd08a, wizard: 0x7fb8ff, rogue: 0xc47bff, barbarian: 0xff6a3a, ranger: 0x9cff7a };
const BONE_COLOR = 0xc9e8d4;
const GOLD = 0xffc85a;

interface SpellStyle { kind: 'fire' | 'missile' | 'radiant' | 'heal' | 'rage' | 'mark' | 'sneak' | 'thunder' | 'shield' | 'arcane' | 'frost' | 'necrotic' | 'physical' | 'smoke' | 'speed'; color: number; color2: number }
export function spellStyle(id: string): SpellStyle {
  const s = (id || '').toLowerCase();
  if (/necro|grave|shadow|summon|raise/.test(s)) return { kind: 'necrotic', color: 0x9cffb0, color2: 0x1a3a2a };
  if (/dagger|knife|arrow|throw|bolt(?!.*fire)|crossbow/.test(s) && !/fire|frost|necro/.test(s)) return { kind: 'physical', color: 0xd8dce8, color2: 0x8a90a0 };
  if (/smoke/.test(s)) return { kind: 'smoke', color: 0x6a6f78, color2: 0x30343a };
  if (/surge|dash|reckless|haste/.test(s)) return { kind: 'speed', color: 0xfff0c0, color2: 0xffa040 };
  if (/rage/.test(s)) return { kind: 'rage', color: 0xff4a2a, color2: 0x8a0a00 };
  if (/mark/.test(s)) return { kind: 'mark', color: 0xff3cd2, color2: 0x7a0a6a };
  if (/sneak|assassin/.test(s)) return { kind: 'sneak', color: 0xa060ff, color2: 0x3a1080 };
  if (/thunder|shock/.test(s)) return { kind: 'thunder', color: 0xd6ecff, color2: 0x4a7aff };
  if (/sacred|radiant|holy|divine|bless|guid|turn/.test(s)) return { kind: 'radiant', color: 0xfff0b0, color2: 0xffb040 };
  if (/heal|cure|word|wind|potion|regen/.test(s)) return { kind: 'heal', color: 0xb8ff9a, color2: 0xffd860 };
  if (/missile/.test(s)) return { kind: 'missile', color: 0xd8b0ff, color2: 0x7a30ff };
  if (/frost|ice|cold|ray/.test(s)) return { kind: 'frost', color: 0xdff6ff, color2: 0x4ab0ff };
  if (/fire|bolt|burn|flame|scorch/.test(s)) return { kind: 'fire', color: 0xffc070, color2: 0xff4a10 };
  if (/shield|block|guard|ward|armou?r/.test(s)) return { kind: 'shield', color: 0x9fd8ff, color2: 0x3a7aff };
  return { kind: 'arcane', color: 0xc8a0ff, color2: 0x6a30ff };
}
const DMG: Record<DamageType, { kind: EmitterKind; color?: number; color2?: number; light: number }> = {
  slashing: { kind: 'sparks', light: 0xffc080 }, piercing: { kind: 'sparks', light: 0xffc080 }, bludgeoning: { kind: 'puff', light: 0xd0b090 },
  fire: { kind: 'emberBurst', light: 0xff7020 }, cold: { kind: 'iceShards', light: 0x80d0ff }, radiant: { kind: 'radiantMotes', light: 0xffd070 },
  necrotic: { kind: 'arcaneMotes', color: 0xb0ffb0, color2: 0x1f3a2a, light: 0x60ff90 }, force: { kind: 'arcaneMotes', light: 0xb080ff },
  lightning: { kind: 'ringBurst', color: 0xffffff, color2: 0x8ad0ff, light: 0xc0e0ff }, poison: { kind: 'arcaneMotes', color: 0xc2ff5a, color2: 0x2f7a2a, light: 0x80ff40 },
};

interface Transient { update(dt: number, time: number): boolean; dispose(): void }
interface TrailState { view: CharacterView; bone: THREE.Object3D; hilt: THREE.Vector3; tip: THREE.Vector3; until: number; start: number }
interface Projectile { pos: THREE.Vector3; from: THREE.Vector3; to: THREE.Vector3; speed: number; style: SpellStyle; group: THREE.Group; core: THREE.Sprite; glow: THREE.Sprite; light: THREE.PointLight; trail: Emitter | null; age: number; wobble: number; phase: number; total: number }
interface Attached { emitter?: Emitter; aura?: Aura; sprite?: THREE.Sprite; until?: number; bone?: string; yOff: number; spin?: number }

export class VFX {
  particles: Particles | null = null;
  time = 0;
  private fx: Transient[] = [];
  private trails = new Map<string, WeaponTrail>();
  private trailState = new Map<string, TrailState>();
  private ghosts: Ghosts;
  private pendingGhosts: { view: CharacterView; color: number; at: number }[] = [];
  private projectiles: Projectile[] = [];
  private attached = new Map<string, Attached>();
  private lights: { light: THREE.PointLight; age: number; life: number; base: number }[] = [];
  private timers: { at: number; fn: () => void }[] = [];
  // lock-on reticle
  private reticle: THREE.Group; private reticleRing: THREE.Sprite; private reticleDot: THREE.Sprite; private lockView: CharacterView | null = null; private lockOverride = false; private reticleScale = 0;
  // interactable highlight
  private hiGroup: THREE.Group; private hiRune: THREE.Sprite; private hiRing: THREE.Mesh; private hiPos: THREE.Vector3 | null = null; private hiMotes: Emitter | null = null; private hiFade = 0;
  private unsub: (() => void)[] = [];
  private tmp = new THREE.Vector3(); private tmp2 = new THREE.Vector3();

  constructor(public scene: THREE.Scene, public getView: GetView, public camera: THREE.Camera, public renderer: Renderer) {
    this.ghosts = new Ghosts(scene);
    // reticle
    this.reticle = new THREE.Group(); this.reticle.name = 'vfx:reticle'; this.reticle.visible = false;
    this.reticleRing = makeSprite(SPRITE.reticle, 0xffb347, 0.9, 2.2); this.reticleDot = makeSprite(SPRITE.glow, 0xffd080, 0.14, 2.5);
    this.reticle.add(this.reticleRing, this.reticleDot); scene.add(this.reticle);
    // interactable highlight
    this.hiGroup = new THREE.Group(); this.hiGroup.name = 'vfx:interact'; this.hiGroup.visible = false;
    this.hiRune = makeSprite(SPRITE.rune, GOLD, 0.55, 2.2); this.hiRune.position.y = 1.5;
    const ringMat = new THREE.MeshBasicMaterial({ map: (this.reticleRing.material as THREE.SpriteMaterial).map, color: new THREE.Color(GOLD).multiplyScalar(1.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, toneMapped: false });
    this.hiRing = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ringMat); this.hiRing.rotation.x = -Math.PI / 2; this.hiRing.position.y = 0.06; this.hiRing.scale.setScalar(0.9); this.hiRing.layers.set(1);
    this.hiGroup.add(this.hiRune, this.hiRing); scene.add(this.hiGroup);
    this.subscribe();
  }

  // ---------------------------------------------------------------- helpers
  private bone(view: CharacterView | undefined, ...names: string[]): THREE.Object3D | null {
    if (!view?.ready) return null;
    for (const n of names) { const b = view.bones.get(n) ?? view.bones.get(n.replace(/[.:]/g, '')); if (b) return b; }
    return null;
  }
  private bonePos(view: CharacterView | undefined, out: THREE.Vector3, yFallback: number, ...names: string[]) {
    const b = this.bone(view, ...names);
    if (b) { b.updateWorldMatrix(true, false); return b.getWorldPosition(out); }
    if (view) return out.set(view.actor.pos.x, view.actor.pos.y + yFallback, view.actor.pos.z);
    return out.set(0, 0, 0);
  }
  private actorColor(view?: CharacterView) {
    const a = view?.actor; if (!a) return 0xffe0b0;
    if (a.classId && CLASS_COLOR[a.classId]) return CLASS_COLOR[a.classId];
    if (a.model.startsWith('Skeleton')) return BONE_COLOR;
    return 0xffe0b0;
  }
  /** Event positions are often the actor's feet; lift them to the torso when so. */
  private hitPos(p: Vec3, view?: CharacterView, lift = 1.05) {
    const v = this.tmp.set(p.x, p.y, p.z);
    if (view && Math.abs(p.y - view.actor.pos.y) < 0.3) v.y += lift; else if (!view && p.y < terrainHeight(p.x, p.z) + 0.3) v.y += lift;
    return v.clone();
  }
  private screenPos(p: THREE.Vector3) { const q = p.clone().project(this.camera); return { x: (q.x + 1) / 2, y: (q.y + 1) / 2 }; }
  private emit(kind: EmitterKind, pos: THREE.Vector3 | Vec3, opts: Parameters<Particles['addEmitter']>[2] = {}) { return this.particles ? this.particles.addEmitter(kind, pos, opts) : null; }
  private later(seconds: number, fn: () => void) { this.timers.push({ at: this.time + seconds, fn }); }
  /**
   * Fixed pool of point lights that always live in the scene (intensity 0 when idle) so the light count never changes
   * — three.js recompiles every material when it does. Projectiles/auras borrow from the same pool.
   */
  private pool: THREE.PointLight[] = [];
  private poolBusy = new Set<THREE.PointLight>();
  private borrowLight(): THREE.PointLight | null {
    if (this.pool.length === 0) for (let i = 0; i < 5; i++) { const l = new THREE.PointLight(0xffffff, 0, 6, 2); l.name = 'vfx:light' + i; this.scene.add(l); this.pool.push(l); }
    for (const l of this.pool) if (!this.poolBusy.has(l)) { this.poolBusy.add(l); return l; }
    // all busy: steal the flash light with the least remaining life
    let worst = -1, idx = -1; this.lights.forEach((e, i) => { const rem = e.life - e.age; if (idx < 0 || rem < worst) { worst = rem; idx = i; } });
    if (idx >= 0) { const e = this.lights.splice(idx, 1)[0]; return e.light; }
    return null;
  }
  private returnLight(l: THREE.PointLight) { l.intensity = 0; this.poolBusy.delete(l); }
  /** Short-lived point light. */
  private flashLight(pos: THREE.Vector3, color: THREE.ColorRepresentation, intensity: number, distance: number, life: number) {
    const l = this.borrowLight(); if (!l) return;
    l.color.set(color); l.intensity = intensity; l.distance = distance; l.position.copy(pos);
    this.lights.push({ light: l, age: 0, life, base: intensity });
  }
  private add(t: Transient) { this.fx.push(t); return t; }
  private ring(pos: THREE.Vector3, color: number, r0: number, r1: number, life: number, intensity = 2.5, cell: number = SPRITE.ring) {
    const g = new GroundRing(color, r0, r1, life, intensity, cell); g.mesh.position.copy(pos); g.mesh.position.y += 0.05; this.scene.add(g.mesh);
    this.add({ update: (dt) => g.update(dt), dispose: () => g.dispose() }); return g;
  }
  private column(pos: THREE.Vector3, color: number, radius: number, height: number, life: number, intensity = 2.2) {
    const c = new LightColumn(color, radius, height, life, intensity); c.mesh.position.set(pos.x, pos.y + height / 2, pos.z); this.scene.add(c.mesh);
    this.add({ update: (dt, t) => c.update(dt, t), dispose: () => c.dispose() }); return c;
  }
  /** A sprite that scales/fades over its life (impact flashes, parry stars, d20). */
  private popSprite(pos: THREE.Vector3, cell: number, color: number, size: number, life: number, opts: { intensity?: number; spin?: number; grow?: number; rise?: number; hold?: number } = {}) {
    const s = makeSprite(cell, color, 0.001, opts.intensity ?? 2.5); s.position.copy(pos); this.scene.add(s);
    let age = 0; const spin = opts.spin ?? 0, grow = opts.grow ?? 1.8, rise = opts.rise ?? 0, hold = opts.hold ?? 0.35;
    this.add({
      update: (dt) => {
        age += dt; const t = age / life; if (t >= 1) return false;
        const pop = 1 - Math.pow(1 - Math.min(1, t / 0.15), 3);
        const sz = size * (pop * (1 + (grow - 1) * t)); s.scale.setScalar(sz);
        (s.material as THREE.SpriteMaterial).opacity = t < hold ? 1 : 1 - (t - hold) / (1 - hold);
        (s.material as THREE.SpriteMaterial).rotation = spin * age; s.position.y = pos.y + rise * t;
        return true;
      },
      dispose: () => { this.scene.remove(s); (s.material as THREE.Material).dispose(); },
    });
    return s;
  }

  // ---------------------------------------------------------------- weapon geometry
  private weaponAxis(view: CharacterView): { bone: THREE.Object3D; hilt: THREE.Vector3; tip: THREE.Vector3 } | null {
    const bone = this.bone(view, 'handslot.r', 'handslotr', 'hand.r', 'handr'); if (!bone) return null;
    bone.updateWorldMatrix(true, true);
    const inv = bone.matrixWorld.clone().invert(); const box = new THREE.Box3(); const tb = new THREE.Box3(); const m4 = new THREE.Matrix4();
    bone.traverse((o) => {
      if (o === bone) return; const m = o as THREE.Mesh; if (!m.isMesh) return;
      let p: THREE.Object3D | null = m; while (p && p !== bone) { if (!p.visible) return; p = p.parent; }
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      tb.copy(m.geometry.boundingBox!).applyMatrix4(m4.copy(inv).multiply(m.matrixWorld)); box.union(tb);
    });
    if (box.isEmpty()) return { bone, hilt: new THREE.Vector3(0, 0, 0), tip: new THREE.Vector3(0, 0.3, 0) };
    const size = box.getSize(new THREE.Vector3()); const axis: 'x' | 'y' | 'z' = size.x > size.y && size.x > size.z ? 'x' : size.z > size.y ? 'z' : 'y';
    const c = box.getCenter(new THREE.Vector3()); const hilt = c.clone(), tip = c.clone();
    const min = box.min[axis], max = box.max[axis]; const far = Math.abs(max) > Math.abs(min) ? max : min, near = far === max ? min : max;
    hilt[axis] = near + (far - near) * 0.22; tip[axis] = far;
    return { bone, hilt, tip };
  }

  // ---------------------------------------------------------------- public API
  setLockTarget(view: CharacterView | null) { this.lockOverride = true; this.lockView = view; }
  setInteractableHighlight(pos: Vec3 | null) { this.hiPos = pos ? new THREE.Vector3(pos.x, pos.y, pos.z) : null; }
  /** Campfire flare (also fired by the `rest` event). */
  campfireFlare(pos: Vec3 = { x: LANDMARKS.campfire.x, y: terrainHeight(LANDMARKS.campfire.x, LANDMARKS.campfire.z), z: LANDMARKS.campfire.z }) {
    const p = new THREE.Vector3(pos.x, pos.y, pos.z);
    if (this.particles) for (const e of this.particles.emitters) if ((e.kind === 'fire' || e.kind === 'torch') && e.position.distanceTo(p) < 4) e.burst(28, this.time);
    for (const l of FlickerLight.instances) if (l.position.distanceTo(p) < 4) l.flare(2.6);
    this.emit('emberBurst', { x: p.x, y: p.y + 0.4, z: p.z }, { count: 1.6, scale: 1.2 });
    this.flashLight(p.clone().add(new THREE.Vector3(0, 1, 0)), 0xffa040, 40, 14, 1.2);
    this.renderer.flash(0xffb060, 0.12);
  }

  // ---------------------------------------------------------------- events
  private subscribe() {
    const on = <K extends keyof Events>(k: K, fn: (p: Events[K]) => void) => this.unsub.push(bus.on(k, fn));
    on('swing', (e) => this.onSwing(e));
    on('chargeStart', (e) => this.onChargeStart(e));
    on('damage', (e) => this.onDamage(e));
    on('miss', (e) => this.onMiss(e));
    on('parry', (e) => this.onParry(e));
    on('dodge', (e) => this.onDodge(e));
    on('castStart', (e) => this.onCastStart(e));
    on('castRelease', (e) => this.onCastRelease(e));
    on('spellImpact', (e) => this.onSpellImpact(e));
    on('projectile', (e) => this.onProjectile(e));
    on('heal', (e) => this.onHeal(e));
    on('levelUp', (e) => this.onLevelUp(e));
    on('death', (e) => this.onDeath(e));
    on('bossStart', (e) => this.onBossStart(e));
    on('check', (e) => this.onCheck(e));
    on('loot', () => this.onLoot());
    on('rest', () => this.campfireFlare());
    on('condition', (e) => this.onCondition(e));
    on('telegraph', (e) => this.onTelegraph(e));
    on('stagger', (e) => this.onStagger(e));
    on('lockOn', (e) => { if (e.actorId === 'player') { this.lockOverride = false; this.lockView = e.targetId ? (this.getView(e.targetId) ?? null) : null; } });
    on('interactable', (e) => { if (!e.id) { this.hiPos = null; return; } const it = INTERACTABLES.find((i) => i.id === e.id); if (it) this.hiPos = new THREE.Vector3(it.x, it.y || terrainHeight(it.x, it.z), it.z); });
    on('teleport', () => { this.hiPos = null; });
  }
  dispose() { for (const u of this.unsub) u(); }

  private onSwing(e: Events['swing']) {
    const v = this.getView(e.actorId); if (!v?.ready) return;
    const ax = this.weaponAxis(v); if (!ax) return;
    const color = this.actorColor(v);
    let trail = this.trails.get(e.actorId);
    if (!trail) { trail = new WeaponTrail(color); this.scene.add(trail.mesh); this.trails.set(e.actorId, trail); }
    const heavy = e.kind === 'heavy' || e.kind === 'charged';
    (trail as any).mat.uniforms.uIntensity.value = heavy ? 3.4 : 2.6;
    trail.begin();
    this.trailState.set(e.actorId, { view: v, bone: ax.bone, hilt: ax.hilt, tip: ax.tip, start: this.time, until: this.time + (e.kind === 'charged' ? 0.6 : heavy ? 0.48 : 0.34) });
    if (e.kind === 'charged') { this.later(0.08, () => { const p = this.bonePos(v, new THREE.Vector3(), 1.0, 'handslot.r', 'handslotr'); this.emit('sparkle', p, { color, color2: 0xffffff, count: 0.6, scale: 0.8 }); }); }
    this.attached.get(e.actorId + ':charge')?.emitter && this.clearAttached(e.actorId + ':charge');
  }
  private onChargeStart(e: Events['chargeStart']) {
    const v = this.getView(e.actorId); if (!v?.ready) return;
    const key = e.actorId + ':charge'; this.clearAttached(key);
    const em = this.emit('castCharge', v.actor.pos, { color: this.actorColor(v), color2: 0xffffff, scale: 0.7, rate: 0.8 });
    if (em) this.attached.set(key, { emitter: em, bone: 'handslot.r', yOff: 1.0, until: this.time + 1.5 });
  }
  private onDamage(e: Events['damage']) {
    const tv = this.getView(e.targetId), sv = this.getView(e.sourceId);
    const pos = this.hitPos(e.pos, tv);
    const dir = sv ? pos.clone().sub(new THREE.Vector3(sv.actor.pos.x, sv.actor.pos.y + 1, sv.actor.pos.z)).normalize() : new THREE.Vector3(0, 1, 0);
    const d = DMG[e.type] ?? DMG.slashing;
    const isSkel = !!tv && tv.actor.model.startsWith('Skeleton');
    const physical = e.type === 'slashing' || e.type === 'piercing' || e.type === 'bludgeoning';
    if (e.blocked) {
      const rdir = dir.clone().multiplyScalar(-1).add(new THREE.Vector3(0, 0.6, 0));
      this.emit('sparks', pos, { count: 0.6, scale: 0.8, dir: rdir });
      this.popSprite(pos, SPRITE.glow, 0xffe0b0, 0.5, 0.18, { intensity: 2.5, grow: 1.6 });
      this.flashLight(pos, 0xffd0a0, 8, 4, 0.2);
      return;
    }
    const mult = e.crit ? 1.7 : 1;
    if (isSkel && physical) {
      this.emit('boneDust', pos, { count: mult, dir: dir.clone().multiplyScalar(0.6).add(new THREE.Vector3(0, 0.5, 0)) });
      if (e.type !== 'bludgeoning') this.emit('sparks', pos, { count: 0.45 * mult, scale: 0.7, dir: dir.clone().multiplyScalar(-1) });
    } else {
      this.emit(d.kind, pos, { count: mult, color: d.color, color2: d.color2, dir: physical ? dir.clone().multiplyScalar(-0.4).add(new THREE.Vector3(0, 0.7, 0)) : undefined });
    }
    this.popSprite(pos, SPRITE.glow, e.crit ? 0xfff4e0 : d.light, e.crit ? 1.1 : 0.7, e.crit ? 0.22 : 0.16, { intensity: e.crit ? 3.5 : 2.5, grow: 2 });
    this.flashLight(pos, d.light, e.crit ? 30 : 14, 5, 0.25);
    tv?.hitFlash();
    if (e.targetId === 'player') {
      const tvv = tv?.actor; const frac = tvv ? e.amount / Math.max(1, tvv.maxHp) : 0.2;
      this.renderer.damageVignette(Math.min(1, 0.3 + frac * 1.6));
      this.renderer.impact(Math.min(0.7, 0.2 + frac), this.screenPos(pos));
    }
    if (e.crit) { this.renderer.impact(0.55, this.screenPos(pos)); this.renderer.flash(0xfff0d0, 0.08); this.popSprite(pos, SPRITE.spark, 0xffffff, 1.6, 0.3, { intensity: 3, spin: 2, grow: 1.4 }); }
    if (e.killingBlow) this.renderer.impact(0.35, this.screenPos(pos));
  }
  private onMiss(e: Events['miss']) {
    const tv = this.getView(e.targetId); const pos = this.hitPos(e.pos, tv);
    if (e.reason === 'block') { this.emit('sparks', pos, { count: 0.4, scale: 0.7 }); this.popSprite(pos, SPRITE.glow, 0xffe0b0, 0.4, 0.15, { intensity: 2 }); this.flashLight(pos, 0xffd0a0, 6, 3, 0.15); }
    else if (e.reason === 'miss') this.emit('puff', pos, { count: 0.35, scale: 0.6, intensity: 0.5 });
  }
  private onParry(e: Events['parry']) {
    const dv = this.getView(e.defenderId); const pos = this.hitPos(e.pos, dv);
    this.popSprite(pos, SPRITE.spark, 0xffffff, 2.4, 0.35, { intensity: 4, spin: 3, grow: 1.3 });
    this.popSprite(pos, SPRITE.ring, 0xbfe6ff, 0.6, 0.4, { intensity: 3, grow: 4.5, hold: 0.1 });
    this.emit('sparks', pos, { count: 1.5, scale: 1.1 }); this.emit('ringBurst', pos, { count: 0.8, scale: 0.8 });
    this.flashLight(pos, 0xcfe8ff, 40, 7, 0.3);
    this.renderer.flash(0xd8ecff, 0.22); this.renderer.impact(0.6, this.screenPos(pos));
  }
  private onDodge(e: Events['dodge']) {
    const v = this.getView(e.actorId); if (!v?.ready) return;
    const color = this.actorColor(v);
    this.pendingGhosts.push({ view: v, color, at: this.time }, { view: v, color, at: this.time + 0.07 }, { view: v, color, at: this.time + 0.15 });
    this.emit('puff', { x: e.pos.x, y: e.pos.y + 0.1, z: e.pos.z }, { count: 0.5, scale: 0.8, intensity: 0.6 });
  }
  private onCastStart(e: Events['castStart']) {
    const v = this.getView(e.actorId); const st = spellStyle(e.spellId);
    const key = e.actorId + ':cast'; this.clearAttached(key);
    const em = this.emit('castCharge', e.pos, { color: st.color, color2: st.color2, rate: 1 });
    if (em) this.attached.set(key, { emitter: em, bone: 'handslot.l', yOff: 1.05, until: this.time + 3 });
    const p = this.bonePos(v, new THREE.Vector3(), 1.05, 'handslot.l', 'handslotl', 'handslot.r', 'handslotr');
    this.flashLight(p, st.color, 10, 4, 1.2);
    if (st.kind === 'rage') this.renderer.impact(0.25);
  }
  private onCastRelease(e: Events['castRelease']) {
    const v = this.getView(e.actorId); const st = spellStyle(e.spellId);
    this.clearAttached(e.actorId + ':cast');
    const hand = this.bonePos(v, new THREE.Vector3(), 1.05, 'handslot.l', 'handslotl', 'handslot.r', 'handslotr');
    this.emit('sparkle', hand, { color: st.color, color2: 0xffffff, count: 0.5, scale: 0.6 });
    this.popSprite(hand, SPRITE.glow, st.color, 0.6, 0.2, { intensity: 3, grow: 1.8 });
    this.flashLight(hand, st.color, 16, 5, 0.3);
    const to = new THREE.Vector3(e.to.x, e.to.y, e.to.z);
    switch (st.kind) {
      case 'thunder': {
        const c = new THREE.Vector3(e.from.x, e.from.y, e.from.z);
        this.ring(c, st.color, 0.4, 5.5, 0.55, 3.5); this.later(0.06, () => this.ring(c, st.color2, 0.3, 4.5, 0.5, 2.5));
        this.emit('shockDust', c, { count: 1.4, scale: 1.3 }); this.emit('ringBurst', c.clone().add(new THREE.Vector3(0, 0.6, 0)), { color: st.color, color2: st.color2, count: 1.2, scale: 1.2 });
        this.flashLight(c.clone().add(new THREE.Vector3(0, 1, 0)), st.color, 60, 12, 0.4); this.renderer.flash(0xcfe0ff, 0.25); this.renderer.impact(0.6);
        break;
      }
      case 'rage': {
        if (v) this.setAura(e.actorId + ':raging', v, 0xff3a1a, 20);
        this.emit('emberBurst', { x: e.from.x, y: e.from.y + 1, z: e.from.z }, { color: 0xff8060, color2: 0xa00000, count: 0.8 });
        this.ring(new THREE.Vector3(e.from.x, e.from.y, e.from.z), 0xff3a1a, 0.3, 2.4, 0.5, 2.5); this.renderer.flash(0xff4020, 0.12);
        break;
      }
      case 'mark': {
        const tv = e.targetId ? this.getView(e.targetId) : undefined;
        if (tv) this.setSigil(e.targetId! + ':mark', tv, 0xff3cd2, 40);
        this.popSprite(to.clone().add(new THREE.Vector3(0, 1.2, 0)), SPRITE.circle, 0xff3cd2, 1.4, 0.6, { intensity: 3, spin: -2, grow: 0.6, hold: 0.5 });
        this.emit('arcaneMotes', to.clone().add(new THREE.Vector3(0, 1.1, 0)), { color: 0xff9cf0, color2: 0x7a0a6a, count: 0.7 });
        break;
      }
      case 'sneak': {
        const tp = to.clone().add(new THREE.Vector3(0, 1.0, 0));
        this.popSprite(tp, SPRITE.spark, 0xd0a0ff, 2.2, 0.3, { intensity: 3.5, spin: 6, grow: 1.5, hold: 0.2 });
        this.later(0.08, () => this.popSprite(tp, SPRITE.spark, 0xffffff, 1.6, 0.25, { intensity: 3.5, spin: -8, grow: 1.5, hold: 0.2 }));
        this.emit('arcaneMotes', tp, { color: 0xe0c0ff, color2: 0x4a10a0, count: 1.2 }); this.flashLight(tp, 0xa060ff, 30, 6, 0.3); this.renderer.impact(0.4, this.screenPos(tp));
        break;
      }
      case 'shield': {
        const c = new THREE.Vector3(e.from.x, e.from.y, e.from.z);
        this.popSprite(c.clone().add(new THREE.Vector3(0, 1, 0)), SPRITE.circle, st.color, 2.2, 0.7, { intensity: 2.5, spin: 1.5, grow: 1.1, hold: 0.4 });
        this.ring(c, st.color, 0.3, 1.8, 0.5, 2.5); this.emit('ringBurst', c.clone().add(new THREE.Vector3(0, 0.9, 0)), { color: st.color, color2: st.color2, count: 0.6 });
        break;
      }
      case 'smoke': {
        const c = to.clone(); c.y = terrainHeight(c.x, c.z);
        for (let i = 0; i < 3; i++) this.later(i * 0.08, () => this.emit('puff', c.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.5, 0.3, (Math.random() - 0.5) * 1.5)), { count: 2, scale: 2.4, color: 0x5a5e66, color2: 0x2a2d33, life: 3, intensity: 0.9 }));
        this.popSprite(c.clone().add(new THREE.Vector3(0, 0.8, 0)), SPRITE.glow, 0x9aa0aa, 1.2, 0.2, { intensity: 1.5, grow: 2 });
        break;
      }
      case 'speed': {
        if (v) { this.pendingGhosts.push({ view: v, color: 0xffd080, at: this.time }, { view: v, color: 0xffd080, at: this.time + 0.1 }); }
        this.ring(new THREE.Vector3(e.from.x, e.from.y, e.from.z), st.color, 0.3, 1.6, 0.4, 2.2); this.emit('sparkle', hand, { color: st.color, color2: st.color2, count: 0.6 });
        break;
      }
      case 'necrotic': {
        this.emit('soulWisps', new THREE.Vector3(e.from.x, e.from.y, e.from.z), { color: st.color, color2: st.color2, count: 0.8 });
        this.ring(new THREE.Vector3(e.from.x, e.from.y, e.from.z), st.color, 0.3, 2.2, 0.6, 2, SPRITE.circle);
        break;
      }
      case 'heal': case 'radiant': case 'fire': case 'missile': case 'arcane': case 'frost': case 'physical': break; // impact / heal / projectile events carry the rest
    }
  }
  private onSpellImpact(e: Events['spellImpact']) {
    const st = spellStyle(e.spellId); const tv = e.targetId ? this.getView(e.targetId) : undefined;
    const pos = this.hitPos(e.pos, tv, 1.0); const ground = new THREE.Vector3(pos.x, tv ? tv.actor.pos.y : terrainHeight(pos.x, pos.z), pos.z);
    switch (st.kind) {
      case 'fire':
        this.emit('emberBurst', pos, { count: 1.2 }); this.emit('flash', pos, { color: 0xffe0b0, color2: 0xff8040 });
        this.ring(ground, 0xff7a20, 0.2, 1.6, 0.4, 2.2); this.flashLight(pos, 0xff7020, 50, 9, 0.4); this.renderer.impact(0.3, this.screenPos(pos)); break;
      case 'radiant':
        this.column(ground, 0xfff0b0, 0.55, 5.5, 0.9, 2.6); this.emit('radiantMotes', ground, { count: 1.2 });
        this.ring(ground, 0xffd070, 0.2, 1.8, 0.7, 2.5, SPRITE.circle); this.flashLight(pos, 0xffd070, 40, 9, 0.6); this.renderer.flash(0xfff0c0, 0.1); break;
      case 'thunder':
        this.ring(ground, st.color, 0.3, 4, 0.5, 3); this.emit('shockDust', ground, { count: 1 }); this.flashLight(pos, st.color, 40, 10, 0.3); break;
      case 'missile': case 'arcane':
        this.emit('arcaneMotes', pos, { color: st.color, color2: st.color2, count: 0.9 }); this.popSprite(pos, SPRITE.glow, st.color, 0.9, 0.2, { intensity: 3, grow: 2 }); this.flashLight(pos, st.color, 25, 6, 0.3); break;
      case 'frost':
        this.emit('iceShards', pos, { count: 1.2 }); this.popSprite(pos, SPRITE.spark, 0xe0f8ff, 1.4, 0.3, { intensity: 3, spin: 2 }); this.flashLight(pos, 0x80d0ff, 30, 7, 0.3); break;
      case 'necrotic':
        this.emit('arcaneMotes', pos, { color: st.color, color2: st.color2, count: 1 }); this.emit('soulWisps', ground, { count: 0.5, color: st.color, color2: st.color2 }); this.flashLight(pos, 0x60ff90, 25, 6, 0.4); break;
      case 'physical':
        this.emit('sparks', pos, { count: 0.5, scale: 0.8 }); this.flashLight(pos, 0xffe0c0, 8, 4, 0.15); break;
      case 'heal': case 'smoke': case 'speed': break;
      default:
        this.emit('sparkle', pos, { color: st.color, color2: st.color2, count: 0.8 }); this.flashLight(pos, st.color, 20, 6, 0.3);
    }
  }
  private onProjectile(e: Events['projectile']) {
    const st = spellStyle(e.kind);
    const group = new THREE.Group(); group.name = 'vfx:proj';
    const glow = makeSprite(SPRITE.glow, st.color, st.kind === 'missile' ? 0.35 : 0.6, 2.5); const core = makeSprite(SPRITE.glow, 0xffffff, st.kind === 'missile' ? 0.14 : 0.26, 3);
    const light = new THREE.PointLight(st.color, st.kind === 'missile' ? 8 : 18, 8, 2);
    group.add(glow, core, light); this.scene.add(group);
    const from = new THREE.Vector3(e.from.x, e.from.y, e.from.z), to = new THREE.Vector3(e.to.x, e.to.y, e.to.z);
    if (Math.abs(from.y - terrainHeight(from.x, from.z)) < 0.3) from.y += 1.1;
    if (Math.abs(to.y - terrainHeight(to.x, to.z)) < 0.3) to.y += 1.0;
    const trail = this.emit('projTrail', from, { color: st.color, color2: st.color2, scale: st.kind === 'missile' ? 0.6 : 1, rate: st.kind === 'fire' ? 1.2 : 0.8 });
    const idx = this.projectiles.length;
    this.projectiles.push({ pos: from.clone(), from, to, speed: Math.max(4, e.speed), style: st, group, core, glow, light, trail, age: 0, wobble: st.kind === 'missile' ? 0.35 + 0.15 * (idx % 3) : 0.04, phase: idx * 2.1, total: from.distanceTo(to) });
    group.position.copy(from);
  }
  private onHeal(e: Events['heal']) {
    const tv = this.getView(e.targetId); const p = new THREE.Vector3(e.pos.x, e.pos.y, e.pos.z);
    const feet = tv ? new THREE.Vector3(tv.actor.pos.x, tv.actor.pos.y, tv.actor.pos.z) : new THREE.Vector3(p.x, terrainHeight(p.x, p.z), p.z);
    this.ring(feet, 0x9cff8a, 0.25, 1.7, 0.9, 2.4, SPRITE.circle); this.later(0.15, () => this.ring(feet, 0xffd860, 0.2, 1.3, 0.8, 2));
    this.emit('sparkle', feet.clone().add(new THREE.Vector3(0, 0.3, 0)), { color: 0xc8ff9a, color2: 0xffd860, count: 1.3, life: 1.3 });
    this.emit('radiantMotes', feet, { color: 0xd8ffb0, color2: 0xffe080, count: 0.5, scale: 0.7 });
    this.flashLight(feet.clone().add(new THREE.Vector3(0, 1, 0)), 0xa8ff80, 24, 6, 1.0);
    if (e.targetId === 'player') this.renderer.flash(0x60ff80, 0.05);
  }
  private onLevelUp(e: Events['levelUp']) {
    const v = this.getView(e.actorId); if (!v) return;
    const feet = new THREE.Vector3(v.actor.pos.x, v.actor.pos.y, v.actor.pos.z);
    this.column(feet, 0xffe0a0, 0.9, 6.5, 1.8, 2.6);
    this.ring(feet, GOLD, 0.2, 2.6, 0.9, 3, SPRITE.circle); this.later(0.25, () => this.ring(feet, 0xfff0c0, 0.2, 3.5, 1.0, 2.2));
    this.emit('radiantMotes', feet, { count: 2, scale: 1.3, life: 1.4 }); this.emit('runes', feet.clone().add(new THREE.Vector3(0, 0.6, 0)), { count: 1.6, scale: 1.3, life: 1.3 });
    this.later(0.5, () => this.emit('sparkle', feet.clone().add(new THREE.Vector3(0, 1.4, 0)), { count: 1.5, scale: 1.3 }));
    this.flashLight(feet.clone().add(new THREE.Vector3(0, 1.5, 0)), 0xffd070, 60, 12, 1.8); this.renderer.flash(0xffe0a0, 0.25);
  }
  private onDeath(e: Events['death']) {
    const v = this.getView(e.actorId); const skel = !!v && v.actor.model.startsWith('Skeleton');
    const feet = new THREE.Vector3(e.pos.x, e.pos.y, e.pos.z); const chest = feet.clone().add(new THREE.Vector3(0, 1.0, 0));
    for (const k of ['raging', 'mark', 'charge', 'cast', 'poisoned', 'burning', 'guidance', 'bless', 'stagger']) this.clearAttached(e.actorId + ':' + k);
    if (this.lockView === v) this.lockView = null;
    if (skel && v) {
      const anyV = v as any; if (typeof anyV.startDissolve === 'function') anyV.startDissolve(1.6); else if (typeof anyV.dissolve === 'function') anyV.dissolve();
      this.emit('soulWisps', feet, { count: 1 }); this.flashLight(chest, 0x60e0c0, 12, 5, 1.2);
      this.emit('boneDust', chest, { count: 0.8 });
      this.later(0.45, () => this.emit('boneDust', feet.clone().add(new THREE.Vector3(0, 0.55, 0)), { count: 1.1, scale: 1.1 }));
      this.later(0.95, () => { this.emit('boneDust', feet.clone().add(new THREE.Vector3(0, 0.2, 0)), { count: 1.4, scale: 1.3 }); this.emit('puff', feet, { count: 0.8, scale: 1.2, color: 0xbdb3a0, color2: 0x6e665a }); });
    } else {
      this.emit('puff', feet, { count: 1, scale: 1.2, intensity: 0.7 });
      if (e.actorId === 'player') { this.renderer.damageVignette(1); this.renderer.setLowHealth(1); }
    }
  }
  private onBossStart(e: Events['bossStart']) {
    const v = this.getView(e.actorId); const feet = v ? new THREE.Vector3(v.actor.pos.x, v.actor.pos.y, v.actor.pos.z) : null;
    this.renderer.impact(0.35); this.renderer.flash(0x301818, 0.15);
    for (let i = 0; i < 6; i++) this.later(i * 0.22, () => { bus.emit('screenShake', { amount: 0.55 - i * 0.05 }); if (feet) { this.emit('shockDust', feet, { count: 0.7, scale: 1.4 + i * 0.2 }); this.emit('puff', feet.clone().add(new THREE.Vector3((Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6)), { count: 0.6, scale: 1.5, intensity: 0.7 }); } });
    if (feet) { this.ring(feet, 0xff5030, 0.5, 6, 1.2, 1.8); this.emit('soulWisps', feet, { count: 1.5, color: 0xff6040, color2: 0x400000 }); this.flashLight(feet.clone().add(new THREE.Vector3(0, 1.5, 0)), 0xff4020, 50, 14, 1.5); }
  }
  private onCheck(e: Events['check']) {
    const v = this.getView(e.actorId); const p = this.hitPos(e.pos, v, 1.6); p.y = Math.max(p.y, (v?.actor.pos.y ?? p.y) + 1.9);
    const ok = e.roll.success !== false; const nat20 = e.roll.d20 === 20, nat1 = e.roll.d20 === 1;
    const color = nat1 ? 0xff5040 : ok ? GOLD : 0xb0b8c8;
    this.popSprite(p, SPRITE.d20, color, nat20 ? 0.95 : 0.7, 1.1, { intensity: nat20 ? 3.2 : 2.4, spin: 1.2, grow: 1.15, rise: 0.5, hold: 0.55 });
    this.popSprite(p, SPRITE.glow, color, nat20 ? 1.6 : 1.1, 0.35, { intensity: 2, grow: 1.6 });
    this.emit('runes', p.clone().add(new THREE.Vector3(0, -0.5, 0)), { color, color2: ok ? 0xffb040 : 0x606878, count: nat20 ? 1.4 : 0.7, scale: 0.8 });
    if (nat20) { this.emit('sparkle', p, { count: 1.2 }); this.renderer.flash(0xfff0c0, 0.12); } else if (nat1) this.emit('puff', p, { count: 0.5, scale: 0.6, intensity: 0.6 });
    this.flashLight(p, color, 14, 5, 0.9);
  }
  private onLoot() {
    const v = this.getView('player'); if (!v) return;
    const p = new THREE.Vector3(v.actor.pos.x, v.actor.pos.y + 1.1, v.actor.pos.z);
    this.emit('sparkle', p, { count: 0.9, scale: 0.9 }); this.popSprite(p, SPRITE.glow, GOLD, 0.8, 0.3, { intensity: 2, grow: 1.6 }); this.flashLight(p, GOLD, 12, 4, 0.5);
  }
  private onCondition(e: Events['condition']) {
    const v = this.getView(e.actorId); const c = e.condition.toLowerCase(); const key = e.actorId + ':' + e.condition;
    if (!e.on) { this.clearAttached(key); return; }
    if (!v) return;
    if (/rag/.test(c)) this.setAura(key, v, 0xff3a1a, 60);
    else if (/mark/.test(c)) this.setSigil(key, v, 0xff3cd2, 120);
    else if (/poison/.test(c)) { const em = this.emit('poisonBubbles', v.actor.pos); if (em) this.attached.set(key, { emitter: em, yOff: 0.2 }); }
    else if (/burn|fire/.test(c)) { const em = this.emit('torch', v.actor.pos, { scale: 0.8 }); if (em) this.attached.set(key, { emitter: em, yOff: 0.6 }); }
    else if (/guid|bless|inspir|antitoxin/.test(c)) { const em = this.emit('blessMotes', v.actor.pos, { color: /antitoxin/.test(c) ? 0xa0ffb0 : undefined }); if (em) this.attached.set(key, { emitter: em, yOff: 0.3, until: this.time + (/antitoxin/.test(c) ? 4 : 120) }); }
    else if (/hesit|frighten|fear/.test(c)) { const em = this.emit('stunStars', v.actor.pos, { color: 0xc0c8ff, color2: 0x6070c0 }); if (em) this.attached.set(key, { emitter: em, bone: 'head', yOff: 1.9, until: this.time + 4 }); }
  }
  private onTelegraph(e: Events['telegraph']) {
    const v = this.getView(e.actorId); if (!v) return;
    const color = e.kind === 'spell' ? 0xc060ff : e.kind === 'special' ? 0xff40a0 : e.kind === 'heavy' ? 0xff5030 : 0xffa040;
    const dur = Math.max(0.15, e.duration);
    const s = makeSprite(SPRITE.ring, color, 0.001, 2.8); this.scene.add(s);
    let age = 0; const bone = this.bone(v, 'chest', 'spine', 'head');
    this.add({
      update: (dt) => {
        age += dt; const t = age / dur; if (t >= 1.15 || v.actor.dead) return false;
        if (bone) { bone.updateWorldMatrix(true, false); bone.getWorldPosition(s.position); } else s.position.set(v.actor.pos.x, v.actor.pos.y + 1.2, v.actor.pos.z);
        const sz = t < 1 ? 1.5 - 0.9 * t : 0.6 + (t - 1) * 6; s.scale.setScalar(sz);
        (s.material as THREE.SpriteMaterial).opacity = t < 1 ? 0.35 + 0.65 * t : 1 - (t - 1) / 0.15;
        return true;
      },
      dispose: () => { this.scene.remove(s); (s.material as THREE.Material).dispose(); },
    });
  }
  private onStagger(e: Events['stagger']) {
    const v = this.getView(e.actorId); if (!v) return;
    const key = e.actorId + ':stagger'; this.clearAttached(key);
    const em = this.emit('stunStars', v.actor.pos); if (em) this.attached.set(key, { emitter: em, bone: 'head', yOff: 1.9, until: this.time + e.seconds });
    this.emit('puff', v.actor.pos, { count: 0.5, scale: 0.9, intensity: 0.6 });
  }

  // ---------------------------------------------------------------- attachments (auras, sigils, follow emitters)
  private setAura(key: string, v: CharacterView, color: number, seconds: number) {
    this.clearAttached(key);
    const aura = new Aura(color, 1.7, 1.5); this.scene.add(aura.group);
    const em = this.emit('auraEmbers', v.actor.pos, { color: 0xff9060, color2: 0xa00000 });
    this.attached.set(key, { aura, emitter: em ?? undefined, bone: 'chest', yOff: 1.0, until: this.time + seconds });
  }
  private setSigil(key: string, v: CharacterView, color: number, seconds: number) {
    this.clearAttached(key);
    const s = makeSprite(SPRITE.circle, color, 0.6, 2.2); this.scene.add(s);
    this.attached.set(key, { sprite: s, bone: 'head', yOff: 2.15, until: this.time + seconds, spin: 1.2 });
  }
  private clearAttached(key: string) {
    const a = this.attached.get(key); if (!a) return; this.attached.delete(key);
    if (a.emitter && this.particles) this.particles.remove(a.emitter);
    if (a.aura) { a.aura.alive = false; this.add({ update: (dt) => a.aura!.update(dt), dispose: () => a.aura!.dispose() }); }
    if (a.sprite) { const s = a.sprite; let f = 1; this.add({ update: (dt) => { f -= dt * 4; (s.material as THREE.SpriteMaterial).opacity = Math.max(0, f); return f > 0; }, dispose: () => { this.scene.remove(s); (s.material as THREE.Material).dispose(); } }); }
  }

  // ---------------------------------------------------------------- per-frame
  update(dt: number, camPos: THREE.Vector3) {
    this.time += dt; const t = this.time;
    // timers
    for (let i = this.timers.length - 1; i >= 0; i--) if (this.timers[i].at <= t) { const f = this.timers[i].fn; this.timers.splice(i, 1); f(); }
    // trails
    for (const [id, s] of this.trailState) {
      const trail = this.trails.get(id)!; const a = s.view.actor;
      const ended = t > s.until || (t > s.start + 0.12 && a.state !== 'attack' && a.state !== 'cast') || a.dead;
      if (ended) { trail.end(); this.trailState.delete(id); continue; }
      s.bone.updateWorldMatrix(true, false);
      trail.push(this.tmp.copy(s.hilt).applyMatrix4(s.bone.matrixWorld), this.tmp2.copy(s.tip).applyMatrix4(s.bone.matrixWorld));
    }
    for (const trail of this.trails.values()) trail.update(dt);
    // ghosts
    for (let i = this.pendingGhosts.length - 1; i >= 0; i--) { const g = this.pendingGhosts[i]; if (g.at <= t) { this.pendingGhosts.splice(i, 1); if (g.view.ready && g.view.root.visible) this.ghosts.spawn(g.view.model, g.color, 0.42, 1.6); } }
    this.ghosts.update(dt);
    // projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]; p.age += dt;
      const travelled = Math.min(p.total, p.age * p.speed); const k = p.total > 0 ? travelled / p.total : 1;
      p.pos.lerpVectors(p.from, p.to, k);
      const dir = this.tmp.subVectors(p.to, p.from).normalize(); const side = this.tmp2.set(-dir.z, 0, dir.x);
      const w = Math.sin(k * Math.PI) * p.wobble; p.pos.addScaledVector(side, Math.sin(p.age * 9 + p.phase) * w).y += Math.sin(p.age * 7 + p.phase * 1.3) * w * 0.5 + Math.sin(k * Math.PI) * (p.style.kind === 'missile' ? 0.6 : 0.15);
      p.group.position.copy(p.pos); p.trail?.setPosition(p.pos);
      const flick = 0.85 + 0.15 * Math.sin(p.age * 40); p.glow.scale.setScalar((p.style.kind === 'missile' ? 0.35 : 0.6) * flick); p.light.intensity = (p.style.kind === 'missile' ? 8 : 18) * flick;
      if (k >= 1 || p.age > 6) {
        this.scene.remove(p.group); p.glow.material.dispose(); p.core.material.dispose(); p.light.dispose();
        if (p.trail && this.particles) { const tr = p.trail; this.later(0.6, () => this.particles?.remove(tr)); tr.enabled = false; }
        this.projectiles.splice(i, 1);
      }
    }
    // attachments follow bones
    for (const [key, a] of this.attached) {
      const id = key.split(':')[0]; const v = this.getView(id);
      if (!v || (a.until !== undefined && t > a.until) || v.actor.dead) { this.clearAttached(key); continue; }
      const p = this.bonePos(v, this.tmp, a.yOff, ...(a.bone ? [a.bone, a.bone.replace(/[.:]/g, '')] : ['__none__']));
      if (!a.bone) p.set(v.actor.pos.x, v.actor.pos.y + a.yOff, v.actor.pos.z);
      if (a.emitter) a.emitter.setPosition(a.bone ? p : { x: v.actor.pos.x, y: v.actor.pos.y + (a.aura ? 0 : a.yOff * 0.3), z: v.actor.pos.z });
      if (a.aura) { a.aura.group.position.copy(p); a.aura.update(dt); }
      if (a.sprite) { a.sprite.position.copy(p); a.sprite.position.y += Math.sin(t * 2.5) * 0.06; (a.sprite.material as THREE.SpriteMaterial).rotation = t * (a.spin ?? 1); a.sprite.scale.setScalar(0.6 + 0.05 * Math.sin(t * 4)); }
    }
    // transient lights
    for (let i = this.lights.length - 1; i >= 0; i--) { const l = this.lights[i]; l.age += dt; const k = l.age / l.life; if (k >= 1) { this.returnLight(l.light); this.lights.splice(i, 1); } else l.light.intensity = l.base * Math.pow(1 - k, 1.6); }
    // transients
    for (let i = this.fx.length - 1; i >= 0; i--) if (!this.fx[i].update(dt, t)) { this.fx[i].dispose(); this.fx.splice(i, 1); }
    // lock-on reticle (auto from the player's targetId unless overridden)
    if (!this.lockOverride) { const pv = this.getView('player'); const tid = pv?.actor.targetId ?? null; const tv = tid ? this.getView(tid) : undefined; this.lockView = tv && !tv.actor.dead ? tv : null; }
    const want = this.lockView && !this.lockView.actor.dead && this.lockView.ready ? 1 : 0;
    this.reticleScale += (want - this.reticleScale) * Math.min(1, dt * 14);
    if (this.reticleScale > 0.02 && this.lockView) {
      this.reticle.visible = true; this.bonePos(this.lockView, this.reticle.position, 1.15, 'chest', 'spine');
      const pulse = 1 + 0.06 * Math.sin(t * 5); const sc = (0.9 + (1 - this.reticleScale) * 1.2) * pulse; this.reticleRing.scale.setScalar(sc);
      (this.reticleRing.material as THREE.SpriteMaterial).rotation = t * 0.8; (this.reticleRing.material as THREE.SpriteMaterial).opacity = this.reticleScale;
      this.reticleDot.scale.setScalar(0.12 * pulse); (this.reticleDot.material as THREE.SpriteMaterial).opacity = this.reticleScale;
    } else this.reticle.visible = false;
    // interactable highlight
    const hiWant = this.hiPos ? 1 : 0; this.hiFade += (hiWant - this.hiFade) * Math.min(1, dt * 6);
    if (this.hiFade > 0.02) {
      this.hiGroup.visible = true; if (this.hiPos) this.hiGroup.position.copy(this.hiPos);
      const bob = Math.sin(t * 2.2) * 0.08; this.hiRune.position.y = 1.45 + bob; (this.hiRune.material as THREE.SpriteMaterial).rotation = t * 0.9;
      this.hiRune.scale.setScalar(0.55 * this.hiFade * (1 + 0.06 * Math.sin(t * 3.1))); (this.hiRune.material as THREE.SpriteMaterial).opacity = this.hiFade;
      this.hiRing.scale.setScalar(0.9 + 0.08 * Math.sin(t * 2.2)); (this.hiRing.material as THREE.MeshBasicMaterial).opacity = this.hiFade * (0.6 + 0.3 * Math.sin(t * 2.2));
      if (!this.hiMotes && this.hiPos) this.hiMotes = this.emit('interactMotes', this.hiPos);
      if (this.hiMotes && this.hiPos) this.hiMotes.setPosition(this.hiPos);
    } else { this.hiGroup.visible = false; if (this.hiMotes) { this.particles?.remove(this.hiMotes); this.hiMotes = null; } }
    void camPos;
  }
}
