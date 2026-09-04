import * as THREE from 'three';
import { styleColor } from '../game/combat.ts';
import type { Effect, Projectile, ProjectileStyle } from '../game/types.ts';
import type { World } from '../game/world.ts';
import { DecalPool } from './decals.ts';
import { Debris } from './debris.ts';
import { ParticleSystem } from './particles.ts';
import { Trail, TrailPool } from './trails.ts';

/** The live effects instance, so entity feedback can share the same particle pools. */
export let activeFx: Effects3D | null = null;

const SHOT_Y = 1.0;
const UP = new THREE.Vector3(0, 1, 0);
const tmpV = new THREE.Vector3();

interface Visual { obj: THREE.Object3D; effect: Effect; extra: THREE.Object3D[]; own?: { t: number; dur: number }; d: Record<string, number> }
interface Shot { obj: THREE.Object3D; p: Projectile; trail: Trail | null; spin: number; lastX: number; lastY: number; lastZ: number }

const STYLE_TRAIL: Record<ProjectileStyle, { width: number; n: number; color: number } | null> = {
  arrow: { width: 0.05, n: 7, color: 0xfff2c8 }, spear: { width: 0.06, n: 7, color: 0xffe0a0 }, fireball: { width: 0.28, n: 12, color: 0xff7a1a }, bolt: { width: 0.14, n: 10, color: 0x9fd3ff },
  bomb: null, cannonball: null, flame: { width: 0.22, n: 10, color: 0xffa040 }, shadow: { width: 0.16, n: 12, color: 0xb67cff }, holy: { width: 0.16, n: 12, color: 0xfff2b0 }, rock: null, ice: { width: 0.16, n: 12, color: 0xbfefff },
};

/** Turns simulation effects and projectiles into meshes, particles, trails, decals and debris. */
export class Effects3D {
  readonly sparks = new ParticleSystem(9000, true);
  readonly smoke = new ParticleSystem(3500, false);
  readonly decals: DecalPool;
  readonly debris: Debris;
  private trails: TrailPool;
  private scene: THREE.Scene;
  private camera: THREE.Object3D | null = null;
  private camPos = new THREE.Vector3(9, 30, 40);
  private seen = new WeakSet<Effect>();
  private visuals: Visual[] = [];
  private shots = new Map<number, Shot>();
  private fadingTrails: { trail: Trail; t: number }[] = [];
  private ringPool: THREE.Mesh[] = [];
  private glowPool: THREE.Mesh[] = [];
  private zones = new Map<object, THREE.Mesh>();
  private geo = {
    ring: new THREE.RingGeometry(0.82, 1, 48),
    thickRing: new THREE.RingGeometry(0.6, 1, 48),
    disc: new THREE.CircleGeometry(1, 32),
    sphere: new THREE.SphereGeometry(1, 14, 10),
    arrow: new THREE.CylinderGeometry(0.03, 0.03, 0.7, 5),
    head: new THREE.ConeGeometry(0.08, 0.22, 5),
    cyl: new THREE.CylinderGeometry(1, 1, 1, 10, 1, true),
    rock: new THREE.DodecahedronGeometry(1, 0),
    crystal: new THREE.ConeGeometry(0.18, 1, 5),
    hex: new THREE.IcosahedronGeometry(1, 1),
  };

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    scene.add(this.sparks.points);
    scene.add(this.smoke.points);
    this.decals = new DecalPool(scene);
    this.debris = new Debris(scene, 320);
    this.trails = new TrailPool(scene);
    activeFx = this;
  }

  setViewHeight(h: number): void { this.sparks.setScale(h); this.smoke.setScale(h); }

  /* ---------- pooled primitives ---------- */

  private ring(color: THREE.Color | number, radius: number, opacity = 0.9, thick = false): THREE.Mesh {
    let m = this.ringPool.pop();
    if (!m) {
      m = new THREE.Mesh(this.geo.ring, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
      m.rotation.x = -Math.PI / 2;
      m.renderOrder = 5;
      m.userData.pool = 'ring';
    }
    m.geometry = thick ? this.geo.thickRing : this.geo.ring;
    const mat = m.material as THREE.MeshBasicMaterial;
    mat.color.set(color); mat.opacity = opacity;
    m.scale.setScalar(radius);
    m.position.y = 0.06;
    m.rotation.set(-Math.PI / 2, 0, 0);
    m.visible = true;
    this.scene.add(m);
    return m;
  }

  private glow(color: THREE.Color | number, r: number, intensity = 3, opacity = 0.9): THREE.Mesh {
    let m = this.glowPool.pop();
    if (!m) {
      m = new THREE.Mesh(this.geo.sphere, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending }));
      m.renderOrder = 6;
      m.userData.pool = 'glow';
    }
    const mat = m.material as THREE.MeshBasicMaterial;
    mat.color.set(color).multiplyScalar(intensity); mat.opacity = opacity;
    m.scale.setScalar(r);
    m.visible = true;
    this.scene.add(m);
    return m;
  }

  private release(o: THREE.Object3D): void {
    this.scene.remove(o);
    if (o.userData.pool === 'ring' && this.ringPool.length < 64) { this.ringPool.push(o as THREE.Mesh); return; }
    if (o.userData.pool === 'glow' && this.glowPool.length < 64) { this.glowPool.push(o as THREE.Mesh); return; }
    o.traverse((c) => {
      const m = c as THREE.Mesh;
      if (m.isMesh || (c as THREE.Line).isLine) {
        const mat = m.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose()); else if (mat && !(o.userData.sharedMat)) mat.dispose();
        if (m.geometry && m.userData.ownGeo) m.geometry.dispose();
      }
    });
  }

  private color(hex: string): THREE.Color { return new THREE.Color(hex.length === 9 ? hex.slice(0, 7) : hex); }

  private add(effect: Effect, obj: THREE.Object3D, extra: THREE.Object3D[] = [], own?: { dur: number }): Visual {
    if (obj.parent !== this.scene) this.scene.add(obj);
    for (const e of extra) if (e.parent !== this.scene) this.scene.add(e);
    const v: Visual = { obj, effect, extra, d: {}, own: own ? { t: 0, dur: own.dur } : undefined };
    this.visuals.push(v);
    return v;
  }

  /** Sim position of the first-person camera's unit (null when not in first person); near-camera effects tone themselves down. */
  firstPersonAt: { x: number; y: number } | null = null;

  /* ---------- public helpers for the integrator ---------- */

  /** Muzzle flash for the player's own ranged attacks (call from the game screen on a hero 'ranged' event). */
  muzzleFlash(x: number, y: number, z: number, dx: number, dz: number, color: THREE.Color | number = 0xffe0a0): void {
    this.sparks.burst(x + dx * 0.9, y, z + dz * 0.9, 10, { color, colorEnd: 0xff6a2a, speed: 2.5, up: 0.3, life: 0.14, size: 0.16, sizeEnd: 0.1, gravity: 0, spread: 0.5 });
    const g = this.glow(color, 0.11, 3, 0.8);
    g.position.set(x + dx * 1.0, y, z + dz * 1.0);
    this.add({ type: 'spark', pos: { x, y: z }, t: 0, dur: 0.08, radius: 0.3, color: '#ffe0a0' }, g, [], { dur: 0.08 });
  }

  /** Small impact sparks at a world position. */
  hitSparks(x: number, y: number, z: number, color: THREE.Color | number = 0xffffff, n = 8): void {
    this.sparks.burst(x, y, z, n, { color, speed: 3.5, up: 1, life: 0.3, size: 0.2, sizeEnd: 0.3, gravity: 8, drag: 2, bounce: 0.3 });
  }

  /* ---------- effect creation ---------- */

  private lightningGeo(a: THREE.Vector3, b: THREE.Vector3, jitter: number, branch: number): THREE.BufferGeometry {
    const pts: THREE.Vector3[] = [];
    const n = 9;
    const dir = b.clone().sub(a);
    const len = dir.length();
    const perp1 = new THREE.Vector3().crossVectors(dir, UP).normalize();
    if (perp1.lengthSq() < 0.01) perp1.set(1, 0, 0);
    const perp2 = new THREE.Vector3().crossVectors(dir, perp1).normalize();
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p = a.clone().lerp(b, t);
      if (i > 0 && i < n) { const j = jitter * Math.sin(t * Math.PI) * len * 0.12; p.addScaledVector(perp1, (Math.random() - 0.5) * j * 2).addScaledVector(perp2, (Math.random() - 0.5) * j * 2); }
      pts.push(p);
      if (branch > 0 && i > 1 && i < n - 1 && Math.random() < branch) {
        // a short branch: out and back so the line strip stays continuous
        const q = p.clone().addScaledVector(perp1, (Math.random() - 0.5) * len * 0.35).addScaledVector(perp2, (Math.random() - 0.5) * len * 0.35).addScaledVector(dir, 0.1);
        pts.push(q, p.clone());
      }
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    return g;
  }

  private makeLightning(a: THREE.Vector3, b: THREE.Vector3, color: THREE.Color, jitter = 1, branch = 0.35): THREE.Group {
    const grp = new THREE.Group();
    const geo = this.lightningGeo(a, b, jitter, branch);
    const core = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: color.clone().multiplyScalar(5), transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
    const glow = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: color.clone().multiplyScalar(1.5), transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.setScalar(1.0);
    core.userData.ownGeo = true;
    grp.add(core); grp.add(glow);
    grp.userData.a = a.clone(); grp.userData.b = b.clone(); grp.userData.color = color; grp.userData.jitter = jitter; grp.userData.branch = branch;
    return grp;
  }

  private reflicker(grp: THREE.Group): void {
    const a = grp.userData.a as THREE.Vector3, b = grp.userData.b as THREE.Vector3;
    const geo = this.lightningGeo(a, b, grp.userData.jitter as number, grp.userData.branch as number);
    for (const c of grp.children) { const l = c as THREE.Line; l.geometry.dispose(); l.geometry = geo; }
  }

  private onNew(e: Effect): void {
    const c = this.color(e.color);
    const x = e.pos.x, z = e.pos.y;
    switch (e.type) {
      case 'ring': {
        this.add(e, this.ring(c, e.radius * 0.3));
        for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; this.sparks.emit({ x: x + Math.cos(a) * e.radius * 0.5, y: 0.2, z: z + Math.sin(a) * e.radius * 0.5, vx: Math.cos(a) * 2, vy: 1.2, vz: Math.sin(a) * 2, life: 0.5, size: 0.2, color: c, gravity: 1, drag: 2 }); }
        break;
      }
      case 'shockwave': {
        const r = this.ring(c, e.radius * 0.2, 1, true);
        this.add(e, r);
        this.sparks.burst(x, 0.3, z, 30, { color: c, colorEnd: 0xffffff, speed: 6, up: 0.7, life: 0.5, size: 0.3, gravity: 6, bounce: 0.3 });
        this.smoke.burst(x, 0.3, z, 22, { color: 0x8a7a62, colorEnd: 0x5c5044, speed: 4 + e.radius, up: 0.8, life: 1.3, size: 0.8, sizeEnd: 3, gravity: -0.3, drag: 1.8, alpha: 0.45 });
        if (e.radius >= 2) { this.decals.spawn('cracks', x, z, e.radius * 0.9, 6); this.debris.spawn(x, 0.2, z, 10, { color: 0x6b5a45, color2: 0x4a3f30, speed: 4, up: 1.2, size: 0.16, life: 2 }); }
        break;
      }
      case 'burst': {
        const g = this.glow(c, e.radius * 0.5, 3.5);
        g.position.set(x, 0.6, z);
        this.add(e, g);
        const big = e.radius >= 1.5;
        this.sparks.burst(x, 0.5, z, Math.min(110, 18 + e.radius * 22), { color: 0xfff2c0, colorEnd: c, speed: 4 + e.radius * 1.6, up: 1.3, life: 0.7, size: 0.45, sizeEnd: 0.2, gravity: 5, bounce: 0.2 });
        this.sparks.burst(x, 0.5, z, Math.min(50, 8 + e.radius * 10), { color: c, colorEnd: 0x200800, speed: 2 + e.radius, up: 1.6, life: 0.9, size: 0.7, sizeEnd: 1.8, gravity: -0.8, drag: 2, alpha: 0.8 });
        this.smoke.burst(x, 0.4, z, Math.min(36, 6 + e.radius * 7), { color: 0x3a3a3a, colorEnd: 0x777777, speed: 1.5 + e.radius, up: 1.5, life: 1.5, size: 0.9, sizeEnd: 3.2, gravity: -0.6, drag: 1.2, alpha: 0.5 });
        if (big) { this.decals.spawn('scorch', x, z, e.radius * 0.8, 9); this.debris.spawn(x, 0.3, z, 8, { color: 0x3a2a1a, color2: 0xff7a1a, speed: 5, up: 1.4, size: 0.14, life: 1.8 }); }
        break;
      }
      case 'slash': {
        const arcGeo = new THREE.RingGeometry(e.radius * 0.5, e.radius, 28, 1, 0, e.arc ?? 1.4);
        const arc = new THREE.Mesh(arcGeo, new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(2.2), transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
        arc.userData.ownGeo = true;
        arc.rotation.x = -Math.PI / 2;
        arc.rotation.z = -((e.angle ?? 0) + (e.arc ?? 1.4) / 2);
        arc.position.set(x, 0.85, z);
        this.add(e, arc);
        const mid = (e.angle ?? 0);
        const px = x + Math.cos(mid) * e.radius * 0.8, pz = z + Math.sin(mid) * e.radius * 0.8;
        this.sparks.burst(px, 0.9, pz, 6, { color: 0xffffff, speed: 2.5, up: 0.8, life: 0.25, size: 0.18, gravity: 4 });
        this.smoke.burst(px, 0.15, pz, 3, { color: 0x9a8a72, speed: 0.8, up: 1, life: 0.6, size: 0.4, sizeEnd: 1.6, gravity: -0.5, alpha: 0.35 });
        break;
      }
      case 'beam': {
        if (!e.to) break;
        const a = new THREE.Vector3(x, SHOT_Y, z), b = new THREE.Vector3(e.to.x, SHOT_Y, e.to.y);
        const len = a.distanceTo(b);
        const m = new THREE.Mesh(this.geo.cyl, new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(3.5), transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }));
        m.position.copy(a).lerp(b, 0.5);
        m.scale.set(e.radius * 2, len, e.radius * 2);
        m.quaternion.setFromUnitVectors(UP, b.clone().sub(a).normalize());
        const core = new THREE.Mesh(this.geo.cyl, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending }));
        core.position.copy(m.position); core.scale.set(e.radius * 0.7, len, e.radius * 0.7); core.quaternion.copy(m.quaternion);
        this.add(e, m, [core]);
        for (let i = 0; i < 24; i++) { const t = Math.random(); this.sparks.emit({ x: a.x + (b.x - a.x) * t, y: SHOT_Y + (Math.random() - 0.5) * 0.3, z: a.z + (b.z - a.z) * t, vx: (Math.random() - 0.5) * 2, vy: Math.random() * 2, vz: (Math.random() - 0.5) * 2, life: 0.45, size: 0.22, color: c, gravity: 2 }); }
        break;
      }
      case 'spawn': {
        this.add(e, this.ring(c, e.radius * 0.2));
        this.sparks.burst(x, 0.2, z, 16, { color: c, colorEnd: 0xffffff, speed: 1.2, up: 3.2, life: 0.7, size: 0.28, gravity: 1, drag: 1 });
        this.smoke.burst(x, 0.1, z, 6, { color: 0x9a8a72, speed: 1.5, up: 0.6, life: 0.7, size: 0.5, sizeEnd: 1.8, gravity: -0.3, alpha: 0.35 });
        break;
      }
      case 'cone': break;
      case 'lightning': {
        if (!e.to) break;
        const sky = e.color === '#e8fbff';
        const a = sky ? new THREE.Vector3(e.to.x + (Math.random() - 0.5) * 2, 11, e.to.y + (Math.random() - 0.5) * 2) : new THREE.Vector3(x, 1.0, z);
        const b = new THREE.Vector3(e.to.x, sky ? 0.2 : 1.0, e.to.y);
        const grp = this.makeLightning(a, b, c, sky ? 1.4 : 1, sky ? 0.5 : 0.35);
        const flash = this.glow(c, sky ? 0.9 : 0.45, 3, 0.9);
        flash.position.copy(b);
        this.add(e, grp, [flash]);
        this.sparks.burst(b.x, b.y, b.z, sky ? 26 : 12, { color: 0xffffff, colorEnd: c, speed: 3.5, up: 1, life: 0.4, size: 0.24, gravity: 6, bounce: 0.3 });
        if (sky) this.decals.spawn('scorch', b.x, b.z, 0.9, 4);
        break;
      }
      case 'heal': {
        if (e.radius > 1) {
          this.add(e, this.ring(0x9dffb0, e.radius * 0.3));
          this.decals.spawn('holy', x, z, e.radius, 1.6);
          for (let i = 0; i < 50; i++) { const a = Math.random() * Math.PI * 2, r = Math.random() * e.radius; this.sparks.emit({ x: x + Math.cos(a) * r, y: 0.2 + Math.random(), z: z + Math.sin(a) * r, vy: 1.5 + Math.random() * 1.5, life: 1.2, size: 0.3, sizeEnd: 0.2, color: 0x9dffb0, colorEnd: 0xffffff, gravity: -0.8 }); }
        } else this.sparks.emit({ x, y: 0.8, z, vy: 1.4, life: 0.7, size: 0.25, color: 0x9dffb0, colorEnd: 0xffffff, gravity: -0.5 });
        break;
      }
      case 'frost': {
        const dome = new THREE.Mesh(this.geo.sphere, new THREE.MeshStandardMaterial({ color: 0x9fd6f5, transparent: true, opacity: 0.22, roughness: 0.25, emissive: 0x3a86c8, emissiveIntensity: 0.2, depthWrite: false }));
        dome.scale.set(e.radius * 0.3, e.radius * 0.15, e.radius * 0.3);
        dome.position.set(x, 0, z);
        const extra: THREE.Object3D[] = [];
        const crM = new THREE.MeshStandardMaterial({ color: 0xe8fbff, emissive: 0x9fd9ff, emissiveIntensity: 1.2, transparent: true, opacity: 0.9, flatShading: true });
        for (let i = 0; i < 9; i++) {
          const cr = new THREE.Mesh(this.geo.crystal, crM);
          const a = Math.random() * Math.PI * 2, r = Math.random() * e.radius * 0.8;
          cr.position.set(x + Math.cos(a) * r, 0.3, z + Math.sin(a) * r);
          cr.rotation.set((Math.random() - 0.5) * 0.7, 0, (Math.random() - 0.5) * 0.7);
          cr.scale.set(1, 0.9 + Math.random() * 0.8, 1);
          cr.userData.sharedMat = true;
          extra.push(cr);
        }
        this.decals.spawn('frost', x, z, e.radius, e.dur + 0.5);
        this.add(e, dome, extra);
        this.sparks.burst(x, 0.6, z, 40, { color: 0xbfefff, colorEnd: 0xffffff, speed: 3, up: 1, life: 0.9, size: 0.3, gravity: 2 });
        break;
      }
      case 'soul': {
        const g = this.glow(0xffe27a, 0.35, 3.5);
        g.position.set(x, 0.8, z);
        this.add(e, g);
        break;
      }
      case 'crater': {
        this.decals.spawn('scorch', x, z, e.radius * 1.05, e.dur, e.radius > 1.2 ? 0.17 : 0.02);
        if (e.radius >= 1.2) this.decals.spawn('cracks', x, z, e.radius * 1.4, e.dur, e.radius > 1.2 ? 0.18 : 0.025);
        break;
      }
      case 'smoke':
        this.smoke.burst(x, 0.5, z, Math.min(40, 8 + e.radius * 8), { color: c, colorEnd: 0x888888, speed: 1.2 + e.radius * 0.6, up: 1.6, life: e.dur * 0.7, size: 0.7 + e.radius * 0.5, sizeEnd: 3, gravity: -0.5, drag: 1.5, alpha: 0.5 });
        break;
      case 'spark': this.sparks.burst(x, SHOT_Y, z, 10, { color: 0xffffff, colorEnd: c, speed: 3.5, up: 1, life: 0.3, size: 0.22, gravity: 7, bounce: 0.3 }); break;
      case 'flame': this.sparks.emit({ x, y: 0.3, z, vy: 1.8, vx: (Math.random() - 0.5) * 0.5, vz: (Math.random() - 0.5) * 0.5, life: 0.55, size: 0.5, sizeEnd: 0.1, color: c, colorEnd: 0x3a0800, gravity: -1.5 }); break;
      case 'crown': {
        this.sparks.burst(x, 1.5, z, 80, { color: 0xffd700, colorEnd: 0xfff6c0, speed: 4.5, up: 2.5, life: 1.6, size: 0.4, sizeEnd: 0.3, gravity: 3, bounce: 0.4, spin: 6 });
        this.add(e, this.ring(0xffd700, e.radius * 0.5));
        break;
      }
      case 'shield': {
        const h = new THREE.Mesh(this.geo.hex, new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.6, wireframe: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        h.position.set(x, 0.9, z); h.scale.setScalar(e.radius);
        this.add(e, h);
        break;
      }
      case 'blink': {
        if (!e.to) break;
        const ghost = this.glow(c, 0.5, 1.5, 0.6);
        ghost.position.set(x, 0.9, z);
        this.add(e, ghost);
        this.smoke.burst(x, 0.7, z, 16, { color: 0x3d2c5a, colorEnd: 0xb67cff, speed: 1.5, up: 1.2, life: 0.8, size: 0.6, sizeEnd: 2, gravity: -0.5, alpha: 0.6 });
        this.sparks.burst(e.to.x, 1.0, e.to.y, 36, { color: c, colorEnd: 0xffffff, speed: 3, up: 1, life: 0.5, size: 0.3, gravity: 0, spin: 8 });
        this.sparks.burst(x, 1.0, z, 20, { color: c, speed: 2, up: 1, life: 0.4, size: 0.28, gravity: 0 });
        break;
      }
      case 'meteor': {
        const rock = new THREE.Mesh(this.geo.rock, new THREE.MeshStandardMaterial({ color: 0x4a2f22, emissive: 0xff4a10, emissiveIntensity: 2.2, flatShading: true, roughness: 0.9 }));
        rock.scale.setScalar(1.05);
        const halo = this.glow(0xff8a2a, 1.7, 2.2, 0.55);
        const target = this.ring(c, e.radius, 0.8);
        const target2 = this.ring(0xffffff, e.radius * 0.2, 0.9);
        this.add(e, rock, [halo, target, target2]);
        break;
      }
      case 'volley': {
        const extra: THREE.Object3D[] = [];
        const n = Math.round(e.radius * 8);
        const m = new THREE.MeshStandardMaterial({ color: 0xd9c8a0 });
        const hm = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, metalness: 0.5 });
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * e.radius;
          const g = new THREE.Group();
          const shaft = new THREE.Mesh(this.geo.arrow, m); shaft.userData.sharedMat = true; g.add(shaft);
          const head = new THREE.Mesh(this.geo.head, hm); head.position.y = -0.4; head.rotation.x = Math.PI; head.userData.sharedMat = true; g.add(head);
          g.position.set(x + Math.cos(a) * r, 9 + Math.random() * 3, z + Math.sin(a) * r);
          g.rotation.z = 0.2 + Math.random() * 0.25;
          g.rotation.y = Math.random() * Math.PI * 2;
          g.userData.delay = Math.random() * 0.3;
          g.userData.startY = g.position.y;
          extra.push(g);
        }
        const target = this.ring(c, e.radius, 0.5);
        this.add(e, target, extra, { dur: 2.2 });
        break;
      }
      case 'death': {
        this.sparks.burst(x, 0.7, z, 22, { color: 0xffffff, colorEnd: c, speed: 2.8, up: 1.5, life: 0.7, size: 0.28, gravity: 5, bounce: 0.3 });
        this.smoke.burst(x, 0.4, z, 8, { color: 0x333333, colorEnd: 0x777777, speed: 0.9, up: 1.3, life: 1.1, size: 0.6, sizeEnd: 2.2, gravity: -0.6, alpha: 0.4 });
        break;
      }
      case 'text': break;
    }
  }

  private updateVisual(v: Visual, dt: number, time: number): void {
    const e = v.effect;
    const p = v.own ? Math.min(1, v.own.t / v.own.dur) : Math.min(1, e.t / e.dur);
    const o = v.obj;
    const mat = (o as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined;
    const ease = 1 - Math.pow(1 - p, 3);
    switch (e.type) {
      case 'ring': o.scale.setScalar(e.radius * (0.3 + 0.7 * ease)); if (mat) mat.opacity = 0.9 * (1 - p); o.position.set(e.pos.x, 0.06, e.pos.y); break;
      case 'shield': if (mat) mat.opacity = 0.7 * (1 - p); o.scale.setScalar(e.radius * (1 + p * 0.2)); o.rotation.y += dt * 2; break;
      case 'shockwave': o.scale.setScalar(e.radius * ease); if (mat) mat.opacity = 1 - p; o.position.set(e.pos.x, 0.06, e.pos.y); break;
      case 'burst': o.position.set(e.pos.x, 0.6, e.pos.y); o.scale.setScalar(e.radius * (0.3 + 0.9 * ease)); if (mat) mat.opacity = 0.9 * (1 - p) * (1 - p); break;
      case 'slash': if (mat) mat.opacity = 0.85 * (1 - p); o.rotation.z = -((e.angle ?? 0) + (e.arc ?? 1.4) / 2) - (e.arc ?? 0) * p * 0.35; o.scale.setScalar(1 + p * 0.25); break;
      case 'beam': if (mat) mat.opacity = 1 - p; o.scale.x = o.scale.z = Math.max(0.02, (v.d.w ??= o.scale.x) * (1 - p)); for (const x of v.extra) ((x as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 1 - p * 1.5; break;
      case 'spawn': o.scale.setScalar(e.radius * (0.2 + 0.8 * ease)); if (mat) mat.opacity = 0.8 * (1 - p); break;
      case 'lightning': {
        v.d.flick = (v.d.flick ?? 0) + dt;
        if (v.d.flick > 0.045) { v.d.flick = 0; this.reflicker(o as THREE.Group); }
        const flicker = 0.6 + Math.random() * 0.4;
        for (const c of (o as THREE.Group).children) { const l = c as THREE.Line; (l.material as THREE.LineBasicMaterial).opacity = (1 - p) * flicker; }
        for (const x of v.extra) { ((x as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.9; x.scale.setScalar(x.scale.x * (1 + dt * 4)); }
        break;
      }
      case 'heal': if (e.radius > 1) { o.scale.setScalar(e.radius * (0.3 + 0.7 * ease)); if (mat) mat.opacity = 0.8 * (1 - p); } break;
      case 'frost': {
        const grow = Math.min(1, e.t / 0.3);
        const shatter = p > 0.85;
        const fade = shatter ? (1 - p) / 0.15 : 1;
        o.scale.set(e.radius * grow, e.radius * 0.5 * grow, e.radius * grow);
        ((o as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.22 * fade;
        const crM = ((v.extra[0] as THREE.Mesh)?.material as THREE.MeshStandardMaterial | undefined);
        if (crM) crM.opacity = 0.9 * fade;
        for (let i = 0; i < v.extra.length; i++) { const cr = v.extra[i]; const g = Math.min(1, Math.max(0, (e.t - i * 0.03) / 0.35)); cr.scale.y = (0.9 + (i % 3) * 0.3) * g; cr.position.y = 0.3 + g * 0.2; }
        if (shatter && !v.d.shattered) { v.d.shattered = 1; this.sparks.burst(e.pos.x, 0.8, e.pos.y, 60, { color: 0xe8fbff, colorEnd: 0x9fd9ff, speed: 4, up: 1.2, life: 0.9, size: 0.3, gravity: 6, bounce: 0.4, spin: 10 }); this.debris.spawn(e.pos.x, 0.5, e.pos.y, 14, { color: 0xdff5ff, color2: 0xbfefff, speed: 4, up: 1, size: 0.14, life: 1.6 }); }
        break;
      }
      case 'soul': {
        o.position.set(e.pos.x, 0.8 + ease * 3.5, e.pos.y);
        if (mat) mat.opacity = 1 - p * p;
        for (let i = 0; i < 2; i++) this.sparks.emit({ x: o.position.x + (Math.random() - 0.5) * 0.6, y: o.position.y + (Math.random() - 0.5) * 0.4, z: o.position.z + (Math.random() - 0.5) * 0.6, vy: 0.8, life: 0.7, size: 0.26, color: 0xffe27a, colorEnd: 0xffffff, gravity: -1.5, spin: 4 });
        break;
      }
      case 'meteor': {
        const fall = 1 - p;
        const fx = e.pos.x + fall * 4.5, fy = 0.6 + fall * fall * 6 + fall * 14, fz = e.pos.y + fall * 3;
        o.position.set(fx, fy, fz);
        o.rotation.x += dt * 9; o.rotation.y += dt * 6;
        v.extra[0].position.copy(o.position);
        for (let i = 0; i < 12; i++) this.sparks.emit({ x: fx + (Math.random() - 0.5) * 0.9, y: fy + (Math.random() - 0.5) * 0.9, z: fz + (Math.random() - 0.5) * 0.9, vx: 4 + Math.random() * 3, vy: 3.5 + Math.random() * 3, vz: 2.5 + Math.random(), life: 0.7, size: 1.1, sizeEnd: 0.15, color: i % 3 === 0 ? 0xfff0a0 : 0xff7a1a, colorEnd: 0x401000, gravity: -1, drag: 1.8, spin: 4 });
        for (let i = 0; i < 3; i++) this.smoke.emit({ x: fx + 0.4 + Math.random() * 0.4, y: fy + 0.5 + Math.random() * 0.4, z: fz + 0.3, vx: 2, vy: 2, vz: 1.2, life: 1.6, size: 0.9, sizeEnd: 3.5, color: 0x2a2a2a, colorEnd: 0x6a6a6a, alpha: 0.55, drag: 1.5 });
        const ring = v.extra[1], ring2 = v.extra[2];
        ring.scale.setScalar(e.radius * (0.92 + 0.08 * Math.sin(time * 14)));
        ((ring as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.5 + p * 0.5;
        ring2.scale.setScalar(e.radius * (1 - p) + 0.2);
        break;
      }
      case 'volley': {
        const own = v.own!;
        if (mat) mat.opacity = 0.5 * Math.max(0, 1 - own.t / 0.8);
        for (const a of v.extra) {
          const delay = a.userData.delay as number;
          const q = Math.max(0, Math.min(1, (own.t - delay) / 0.32));
          a.position.y = (a.userData.startY as number) * (1 - q * q) + 0.35;
          a.visible = own.t >= delay;
          if (q >= 1 && !a.userData.landed) { a.userData.landed = true; this.sparks.burst(a.position.x, 0.2, a.position.z, 3, { color: 0xffe9b0, speed: 1.5, up: 1, life: 0.25, size: 0.15, gravity: 5 }); this.smoke.burst(a.position.x, 0.1, a.position.z, 1, { color: 0x9a8a72, speed: 0.5, up: 0.8, life: 0.5, size: 0.3, sizeEnd: 1.2, alpha: 0.3 }); }
          if (own.t > own.dur - 0.4) a.position.y -= dt * 2;
        }
        break;
      }
      case 'blink': if (mat) mat.opacity = 0.6 * (1 - p); o.scale.setScalar(0.5 + p * 0.6); break;
      case 'spark': if (mat) mat.opacity = 0.8 * (1 - p); o.scale.setScalar(o.scale.x * (1 + dt * 8)); break;
      default: break;
    }
  }

  /** Continuous emitters for effects that persist (cone breath). */
  private continuous(e: Effect): void {
    if (e.type === 'cone') {
      const c = this.color(e.color);
      const base = e.angle ?? 0, half = (e.arc ?? 1) / 2;
      // When the breather is the first-person camera, start the flames further out and smaller so they don't fill the screen.
      const fp = !!this.firstPersonAt && Math.hypot(this.firstPersonAt.x - e.pos.x, this.firstPersonAt.y - e.pos.y) < 0.8;
      const start = fp ? 1.6 : 0.6, sizeMul = fp ? 0.45 : 1;
      for (let i = 0; i < 10; i++) {
        const a = base + (Math.random() - 0.5) * half * 2 * Math.random();
        const sp = 5 + Math.random() * 5;
        const hot = i % 3 === 0;
        this.sparks.emit({ x: e.pos.x + Math.cos(a) * start, y: 0.9 + Math.random() * 0.5, z: e.pos.y + Math.sin(a) * start, vx: Math.cos(a) * sp, vy: 0.8 + Math.random() * 2, vz: Math.sin(a) * sp, life: (e.radius / sp) * 1.2, size: (hot ? 0.55 : 0.8) * sizeMul, sizeEnd: 2.2 * sizeMul, color: hot ? 0xfff2a0 : c, colorEnd: 0x501000, gravity: -2.5, drag: 2.2, spin: 5 });
      }
      for (let i = 0; i < 2; i++) { const a = base + (Math.random() - 0.5) * half * 2; this.smoke.emit({ x: e.pos.x + Math.cos(a) * 1.2, y: 1.2, z: e.pos.y + Math.sin(a) * 1.2, vx: Math.cos(a) * 3, vy: 1.5, vz: Math.sin(a) * 3, life: 0.9, size: 0.6, sizeEnd: 2.4, color: 0x2a2a2a, colorEnd: 0x555555, alpha: 0.4, drag: 2 }); }
    }
  }

  /* ---------- projectiles ---------- */

  private makeShot(p: Projectile): Shot {
    const c = new THREE.Color(styleColor(p.style));
    let obj: THREE.Object3D;
    switch (p.style) {
      case 'arrow': case 'spear': {
        const g = new THREE.Group();
        const m = new THREE.MeshStandardMaterial({ color: p.style === 'spear' ? 0x8a5a2b : 0xd9c8a0 });
        const shaft = new THREE.Mesh(this.geo.arrow, m); shaft.rotation.x = Math.PI / 2; if (p.style === 'spear') shaft.scale.y = 1.5; g.add(shaft);
        const head = new THREE.Mesh(this.geo.head, new THREE.MeshStandardMaterial({ color: 0xe8e8e8, metalness: 0.5, roughness: 0.3 })); head.rotation.x = Math.PI / 2; head.position.z = p.style === 'spear' ? 0.6 : 0.42; g.add(head);
        const fl = new THREE.Mesh(this.geo.head, new THREE.MeshStandardMaterial({ color: p.style === 'spear' ? 0xc9b458 : 0xff5a5a })); fl.rotation.x = -Math.PI / 2; fl.position.z = -0.32; fl.scale.set(0.9, 0.7, 0.9); g.add(fl);
        obj = g;
        break;
      }
      case 'bomb': case 'cannonball': case 'rock': {
        const m = new THREE.Mesh(this.geo.rock, new THREE.MeshStandardMaterial({ color: p.style === 'rock' ? 0x8a7a6a : 0x22262b, roughness: 0.6, metalness: p.style === 'cannonball' ? 0.5 : 0, emissive: p.style === 'bomb' ? 0xff5a1a : 0x000000, emissiveIntensity: 0.6, flatShading: true }));
        m.scale.setScalar(p.style === 'bomb' ? 0.24 : 0.19);
        obj = m;
        break;
      }
      default: {
        const g = new THREE.Group();
        const core = new THREE.Mesh(this.geo.sphere, new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(4), transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }));
        core.scale.setScalar(p.hero ? 0.18 : 0.14);
        const halo = new THREE.Mesh(this.geo.sphere, new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(1.4), transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
        halo.scale.setScalar(p.hero ? 0.32 : 0.26);
        g.add(core); g.add(halo);
        obj = g;
      }
    }
    const spec = STYLE_TRAIL[p.style];
    const trail = spec ? this.trails.get(spec.n, spec.width * (p.hero ? 1.3 : 1), spec.color) : null;
    return { obj, p, trail, spin: (Math.random() - 0.5) * 12, lastX: p.pos.x, lastY: SHOT_Y, lastZ: p.pos.y };
  }

  private shotTick(s: Shot, dt: number): void {
    const p = s.p;
    const y = p.mode === 'lob' ? 0.55 + p.height : SHOT_Y;
    const c = new THREE.Color(styleColor(p.style));
    if (p.style === 'fireball' || p.style === 'flame') {
      for (let i = 0; i < 2; i++) this.sparks.emit({ x: p.pos.x + (Math.random() - 0.5) * 0.2, y: y + (Math.random() - 0.5) * 0.2, z: p.pos.y + (Math.random() - 0.5) * 0.2, vx: -p.dir.x * 2 + (Math.random() - 0.5), vy: 1 + Math.random(), vz: -p.dir.y * 2 + (Math.random() - 0.5), life: 0.4, size: 0.5, sizeEnd: 0.1, color: i ? 0xfff0a0 : c, colorEnd: 0x400800, gravity: -2 });
      this.smoke.emit({ x: p.pos.x, y: y + 0.1, z: p.pos.y, vx: -p.dir.x, vy: 0.8, vz: -p.dir.y, life: 0.9, size: 0.35, sizeEnd: 1.8, color: 0x333333, colorEnd: 0x666666, alpha: 0.4, drag: 2 });
    } else if (p.style === 'bolt') {
      this.sparks.emit({ x: p.pos.x, y, z: p.pos.y, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, vz: (Math.random() - 0.5) * 2, life: 0.25, size: 0.2, color: 0xffffff, colorEnd: c, gravity: 0 });
    } else if (p.style === 'shadow' || p.style === 'holy' || p.style === 'ice') {
      this.sparks.emit({ x: p.pos.x + (Math.random() - 0.5) * 0.3, y: y + (Math.random() - 0.5) * 0.3, z: p.pos.y + (Math.random() - 0.5) * 0.3, vy: p.style === 'holy' ? 0.8 : 0.2, life: 0.5, size: 0.22, color: c, colorEnd: 0xffffff, gravity: p.style === 'ice' ? 2 : -0.5, spin: 6 });
    } else if (p.style === 'bomb') {
      this.sparks.emit({ x: p.pos.x, y: y + 0.25, z: p.pos.y, vy: 0.8, vx: (Math.random() - 0.5), vz: (Math.random() - 0.5), life: 0.25, size: 0.18, color: 0xffe080, colorEnd: 0xff5a1a });
      if (Math.random() < 0.5) this.smoke.emit({ x: p.pos.x, y, z: p.pos.y, vy: 0.4, life: 0.8, size: 0.25, sizeEnd: 1.2, color: 0x444444, colorEnd: 0x777777, alpha: 0.35 });
    } else if (p.style === 'cannonball') {
      if (Math.random() < 0.6) this.smoke.emit({ x: p.pos.x, y, z: p.pos.y, vy: 0.3, life: 0.5, size: 0.2, sizeEnd: 0.9, color: 0x555555, colorEnd: 0x888888, alpha: 0.3 });
    }
    if (p.style === 'bomb' || p.style === 'cannonball' || p.style === 'rock') { s.obj.rotation.x += s.spin * dt; s.obj.rotation.z += s.spin * 0.6 * dt; }
  }

  private shotImpact(s: Shot): void {
    const p = s.p;
    const x = s.lastX, y = s.lastY, z = s.lastZ;
    switch (p.style) {
      case 'arrow': case 'spear': this.sparks.burst(x, y, z, 5, { color: 0xffffff, speed: 2.5, up: 1, life: 0.25, size: 0.16, gravity: 6 }); break;
      case 'fireball': case 'flame': if (p.splash <= 0) { this.sparks.burst(x, y, z, 14, { color: 0xfff0a0, colorEnd: 0xff5a1a, speed: 3, up: 1, life: 0.4, size: 0.35, gravity: 2 }); } break;
      case 'ice': this.sparks.burst(x, y, z, 14, { color: 0xe8fbff, colorEnd: 0x9fd9ff, speed: 3, up: 1, life: 0.5, size: 0.24, gravity: 6, bounce: 0.4, spin: 10 }); break;
      case 'cannonball': case 'rock': this.smoke.burst(x, 0.2, z, 8, { color: 0x8a7a62, colorEnd: 0x5c5044, speed: 2.5, up: 0.8, life: 0.8, size: 0.5, sizeEnd: 2, gravity: -0.3, alpha: 0.45 }); this.sparks.burst(x, y, z, 6, { color: 0xffffff, speed: 3, up: 1, life: 0.25, size: 0.18, gravity: 8 }); break;
      case 'bolt': this.sparks.burst(x, y, z, 10, { color: 0xffffff, colorEnd: 0x9fd3ff, speed: 3.5, up: 1, life: 0.3, size: 0.22, gravity: 3 }); break;
      case 'shadow': case 'holy': this.sparks.burst(x, y, z, 10, { color: new THREE.Color(styleColor(p.style)), colorEnd: 0xffffff, speed: 2.5, up: 1, life: 0.35, size: 0.24, gravity: 0 }); break;
      default: break;
    }
  }

  /* ---------- per-frame ---------- */

  sync(w: World, dt: number, time: number): void {
    if (!this.camera) this.camera = this.scene.getObjectByProperty('isCamera', true) ?? null;
    if (this.camera) this.camera.getWorldPosition(this.camPos);
    // effects
    for (const e of w.effects) {
      if (!this.seen.has(e)) { this.seen.add(e); this.onNew(e); }
      if (e.type === 'cone') this.continuous(e);
    }
    const alive = new Set(w.effects);
    this.visuals = this.visuals.filter((v) => {
      const simAlive = alive.has(v.effect);
      if (v.own) {
        v.own.t += dt;
        if (v.own.t >= v.own.dur) { this.release(v.obj); for (const x of v.extra) this.release(x); return false; }
        this.updateVisual(v, dt, time);
        return true;
      }
      if (!simAlive) {
        if (v.effect.type === 'meteor') {
          const { x, y: z } = v.effect.pos;
          this.debris.spawn(x, 0.4, z, 30, { color: 0x4a2f22, color2: 0xff6a1a, speed: 8, up: 1.7, size: 0.26, life: 2.8 });
          const flash = this.glow(0xfff0c0, v.effect.radius * 1.2, 4, 1); flash.position.set(x, 0.8, z);
          this.add({ type: 'spark', pos: { x, y: z }, t: 0, dur: 0.14, radius: 1, color: '#fff0c0' }, flash, [], { dur: 0.14 });
          const wave = this.ring(0xffffff, v.effect.radius * 0.3, 1, true); wave.position.set(x, 0.08, z);
          this.add({ type: 'shockwave', pos: { x, y: z }, t: 0, dur: 0.55, radius: v.effect.radius * 2.2, color: '#ffffff' }, wave, [], { dur: 0.55 });
          this.smoke.burst(x, 0.5, z, 40, { color: 0x2a2a2a, colorEnd: 0x6a6a6a, speed: 5, up: 2.2, life: 2.2, size: 1.2, sizeEnd: 4, gravity: -0.4, drag: 1.2, alpha: 0.55 });
          this.decals.spawn('cracks', x, z, v.effect.radius * 1.1, 10);
        }
        this.release(v.obj); for (const x of v.extra) this.release(x);
        return false;
      }
      this.updateVisual(v, dt, time);
      return true;
    });
    // projectiles
    const live = new Set<number>();
    for (const p of w.projectiles) {
      if (p.dead) continue;
      live.add(p.id);
      let s = this.shots.get(p.id);
      if (!s) { s = this.makeShot(p); this.scene.add(s.obj); this.shots.set(p.id, s); }
      const y = p.mode === 'lob' ? 0.55 + p.height : SHOT_Y;
      s.obj.position.set(p.pos.x, y, p.pos.y);
      const dx = p.pos.x - p.prev.x, dz = p.pos.y - p.prev.y;
      if (p.style !== 'bomb' && p.style !== 'cannonball' && p.style !== 'rock' && (dx !== 0 || dz !== 0)) s.obj.lookAt(p.pos.x + dx, y + (p.mode === 'lob' ? (p.height - (s.lastY - 0.55)) : 0), p.pos.y + dz);
      if (p.hero && p.mode === 'linear') s.obj.scale.setScalar(Math.min(1, 0.08 + p.traveled / 2.5));
      if (s.trail) { s.trail.push(p.pos.x, y, p.pos.y); s.trail.update(this.camPos); if (p.hero && p.mode === 'linear') s.trail.fade = Math.min(1, p.traveled / 2); }
      this.shotTick(s, dt);
      s.lastX = p.pos.x; s.lastY = y; s.lastZ = p.pos.y;
    }
    for (const [id, s] of this.shots) {
      if (live.has(id)) continue;
      this.shotImpact(s);
      this.release(s.obj);
      if (s.trail) this.fadingTrails.push({ trail: s.trail, t: 0 });
      this.shots.delete(id);
    }
    this.fadingTrails = this.fadingTrails.filter((f) => {
      f.t += dt;
      f.trail.fade = Math.max(0, 1 - f.t / 0.18);
      f.trail.update(this.camPos);
      if (f.t >= 0.18) { this.trails.release(f.trail); return false; }
      return true;
    });
    // persistent buff zones (Frenzy): pulsing violet ring + rising motes
    for (const z of w.zones) {
      let m = this.zones.get(z);
      if (!m) { m = this.ring(0xd84cff, z.radius, 0.75, true); this.zones.set(z, m); }
      m.position.set(z.pos.x, 0.07, z.pos.y);
      m.scale.setScalar(z.radius * (0.96 + 0.04 * Math.sin(time * 6)));
      m.rotation.z = time * 0.8;
      (m.material as THREE.MeshBasicMaterial).opacity = 0.45 + 0.25 * Math.sin(time * 6) + (z.t < 0.6 ? -(0.6 - z.t) : 0);
      for (let i = 0; i < 2; i++) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * z.radius; this.sparks.emit({ x: z.pos.x + Math.cos(a) * r, y: 0.1, z: z.pos.y + Math.sin(a) * r, vy: 1.4 + Math.random(), life: 0.9, size: 0.2, sizeEnd: 0.4, color: 0xd84cff, colorEnd: 0xffb3ff, gravity: -1, spin: 5 }); }
    }
    for (const [z, m] of this.zones) if (!w.zones.includes(z as never)) { this.release(m); this.zones.delete(z); }
    this.sparks.update(dt);
    this.smoke.update(dt);
    this.decals.update(dt);
    this.debris.update(dt);
    void tmpV;
  }
}
