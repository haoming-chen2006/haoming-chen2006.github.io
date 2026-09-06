import * as THREE from 'three';
import { ARENA_H, ARENA_W } from '../game/constants.ts';
import type { Vec } from '../engine/math.ts';

export type ViewMode = 'commander' | 'first' | 'third';

export interface RigTarget {
  mode: ViewMode;
  heroPos?: Vec;
  heroEye?: number;
  heroHover?: number;
  heroFacing?: number;
}

const UP = new THREE.Vector3(0, 1, 0);

/** Camera rig with a tilted commander view, first-person and over-the-shoulder possession views. */
export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  mode: ViewMode = 'commander';
  yaw = -Math.PI / 2; // simulation angle convention: 0 = +x, pi/2 = +z (toward the player)
  pitch = 0.05;
  zoom = 1; // commander zoom (1 = default)
  sensitivity = 0.0022;
  fpsFov = 78;
  invertY = false;
  private pos = new THREE.Vector3();
  private look = new THREE.Vector3();
  private fromPos = new THREE.Vector3();
  private fromLook = new THREE.Vector3();
  private transT = 1;
  private transDur = 0.7;
  private shake = 0;
  private shakeOff = new THREE.Vector3();
  private fovTarget = 50;
  private fovKick = 0;
  private raycaster = new THREE.Raycaster();
  private ground = new THREE.Plane(UP, 0);
  /** Scripted camera path; while active it overrides the mode pose. */
  private cinematic: { t: number; dur: number; loop: boolean; path: (t: number, out: { pos: THREE.Vector3; look: THREE.Vector3 }) => void } | null = null;
  private cineOut = { pos: new THREE.Vector3(), look: new THREE.Vector3() };

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 260);
    this.commanderPose(this.pos, this.look);
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.look);
  }

  setAspect(aspect: number): void { this.camera.aspect = aspect; this.camera.updateProjectionMatrix(); }

  private commanderPose(outPos: THREE.Vector3, outLook: THREE.Vector3): void {
    const z = this.zoom;
    // Behind and above the player's king tower, tilted toward the enemy side.
    const aspectFactor = Math.max(0.75, Math.min(1.35, 1.2 / this.camera.aspect));
    outPos.set(ARENA_W / 2, (25 + aspectFactor * 6) / z, ARENA_H + (10 + aspectFactor * 4) / z);
    outLook.set(ARENA_W / 2, 0, 13 + (1 - 1 / z) * 4);
  }

  private possessPose(t: RigTarget, outPos: THREE.Vector3, outLook: THREE.Vector3): void {
    const hp = t.heroPos ?? { x: ARENA_W / 2, y: ARENA_H / 2 };
    const eye = (t.heroEye ?? 1.2) + (t.heroHover ?? 0);
    const cy = Math.cos(this.pitch), sy = Math.sin(this.pitch);
    const dir = new THREE.Vector3(Math.cos(this.yaw) * cy, sy, Math.sin(this.yaw) * cy);
    if (t.mode === 'first') {
      outPos.set(hp.x, eye, hp.y);
      outLook.copy(outPos).add(dir);
    } else {
      const back = 4.4, up = 2.0;
      const center = new THREE.Vector3(hp.x, eye * 0.6 + 0.7, hp.y);
      outPos.copy(center).addScaledVector(dir, -back).add(new THREE.Vector3(0, up, 0));
      // pull the camera in if a structure or the arena wall sits between it and the hero
      let best = 1;
      for (let i = 1; i <= 24; i++) {
        const t = i / 24;
        const px = center.x + (outPos.x - center.x) * t, py = center.y + (outPos.y - center.y) * t, pz = center.z + (outPos.z - center.z) * t;
        let blocked = px < -0.2 || px > ARENA_W + 0.2 || pz < -0.2 || pz > ARENA_H + 0.2 ? py < 1.2 : false;
        if (!blocked) for (const [ox, oz, r, h] of this.obstacles) { if (py < h && (px - ox) ** 2 + (pz - oz) ** 2 < (r + 0.35) ** 2) { blocked = true; break; } }
        if (blocked) { best = Math.max(0.3, t - 1 / 24); break; }
      }
      if (best < 1) {
        // never closer than 1.4 units to the head: when blocked, come in and rise instead of clipping inside the model
        outPos.copy(center).lerp(outPos, best);
        const d = outPos.distanceTo(center);
        if (d < 1.4) { outPos.copy(center).addScaledVector(dir, -1.4).add(new THREE.Vector3(0, 1.2, 0)); }
      }
      if (outPos.y < 0.5) outPos.y = 0.5;
      outLook.copy(center).addScaledVector(dir, 3.2);
      outLook.y = center.y + 0.5;
    }
  }

  /** Called when the mode changes so we animate from the current pose. */
  setMode(mode: ViewMode, facing?: number): void {
    if (mode === this.mode) return;
    this.fromPos.copy(this.camera.position);
    this.fromLook.copy(this.look);
    this.transT = 0;
    this.transDur = mode === 'commander' ? 0.9 : 0.75;
    if (this.mode === 'commander' && facing !== undefined) { this.yaw = facing; this.pitch = mode === 'first' ? 0.0 : 0.22; }
    this.mode = mode;
  }

  applyLook(dx: number, dy: number): void {
    this.yaw += dx * this.sensitivity;
    this.pitch = Math.max(-1.15, Math.min(1.05, this.pitch - (this.invertY ? -dy : dy) * this.sensitivity));
  }

  /**
   * Mouse-steering fallback when pointer lock is unavailable: the cursor's offset from the
   * screen centre turns the view, with a dead zone in the middle.
   */
  steer(nx: number, ny: number, dt: number): void {
    const dead = 0.12;
    const sx = Math.abs(nx) > dead ? Math.sign(nx) * (Math.abs(nx) - dead) / (1 - dead) : 0;
    const sy = Math.abs(ny) > dead ? Math.sign(ny) * (Math.abs(ny) - dead) / (1 - dead) : 0;
    this.yaw += sx * sx * Math.sign(sx) * 3.2 * dt;
    this.pitch = Math.max(-1.15, Math.min(1.05, this.pitch + sy * sy * Math.sign(sy) * 1.6 * dt));
  }

  /** Structures the third-person camera must not clip through: [x, z, radius, height]. */
  obstacles: [number, number, number, number][] = [];

  forward(): Vec { return { x: Math.cos(this.yaw), y: Math.sin(this.yaw) }; }
  right(): Vec { return { x: -Math.sin(this.yaw), y: Math.cos(this.yaw) }; }

  addShake(amt: number): void { this.shake = Math.min(1.2, this.shake + amt); }

  /** Momentary field-of-view widening (dashes, charges). Decays on its own. */
  kickFov(amount: number): void { this.fovKick = Math.min(18, this.fovKick + amount); }

  get inCinematic(): boolean { return !!this.cinematic; }

  /** Match intro: swoop from above the enemy throne down the arena into the commander seat. */
  playIntro(duration = 3.2): void {
    const start = new THREE.Vector3(ARENA_W / 2 + 14, 22, -8);
    const mid = new THREE.Vector3(ARENA_W / 2 - 10, 9, ARENA_H / 2 - 4);
    const end = new THREE.Vector3(), endLook = new THREE.Vector3();
    this.commanderPose(end, endLook);
    const curve = new THREE.CatmullRomCurve3([start, mid, new THREE.Vector3(ARENA_W / 2 + 4, 14, ARENA_H - 2), end], false, 'catmullrom', 0.6);
    const lookA = new THREE.Vector3(ARENA_W / 2, 2, 8), lookB = new THREE.Vector3(ARENA_W / 2, 1.5, ARENA_H / 2);
    this.cinematic = {
      t: 0, dur: duration, loop: false,
      path: (t, out) => {
        const e = 1 - Math.pow(1 - t, 3);
        curve.getPointAt(Math.min(0.9999, e), out.pos);
        const lk = t < 0.6 ? lookA.clone().lerp(lookB, t / 0.6) : lookB.clone().lerp(endLook, (t - 0.6) / 0.4);
        out.look.copy(lk);
      },
    };
    this.camera.position.copy(start);
    this.pos.copy(start);
    this.look.copy(lookA);
    this.transT = 1;
  }

  /** Match end: slow orbit around a focus point (fallen throne or the winning champion). */
  playOutro(focus: Vec, height = 3): void {
    const center = new THREE.Vector3(focus.x, height, focus.y);
    const from = this.camera.position.clone();
    const startAngle = Math.atan2(from.z - center.z, from.x - center.x);
    this.cinematic = {
      t: 0, dur: 30, loop: true,
      path: (t, out) => {
        const a = startAngle + t * 30 * 0.25;
        const r = 9 - Math.min(3, t * 30 * 0.3);
        out.pos.set(center.x + Math.cos(a) * r, center.y + 4.5 - Math.min(2, t * 30 * 0.2), center.z + Math.sin(a) * r);
        out.look.copy(center);
      },
    };
    this.transT = 0;
    this.transDur = 1.2;
    this.fromPos.copy(from);
    this.fromLook.copy(this.look);
  }

  stopCinematic(): void {
    if (!this.cinematic) return;
    this.cinematic = null;
    this.fromPos.copy(this.camera.position);
    this.fromLook.copy(this.look);
    this.transT = 0;
    this.transDur = 0.8;
  }

  update(dt: number, t: RigTarget): void {
    const targetPos = new THREE.Vector3(), targetLook = new THREE.Vector3();
    if (t.mode === 'commander') this.commanderPose(targetPos, targetLook); else this.possessPose(t, targetPos, targetLook);
    if (this.cinematic) {
      const c = this.cinematic;
      c.t = Math.min(c.dur, c.t + dt);
      const f = c.t / c.dur;
      c.path(f, this.cineOut);
      if (this.transT < 1) {
        this.transT = Math.min(1, this.transT + dt / this.transDur);
        const k = this.transT * this.transT * (3 - 2 * this.transT);
        this.pos.lerpVectors(this.fromPos, this.cineOut.pos, k);
        this.look.lerpVectors(this.fromLook, this.cineOut.look, k);
      } else { this.pos.copy(this.cineOut.pos); this.look.copy(this.cineOut.look); }
      if (c.t >= c.dur && !c.loop) { this.cinematic = null; this.transT = 1; }
      this.camera.fov += (48 - this.camera.fov) * Math.min(1, dt * 3);
      this.camera.updateProjectionMatrix();
      this.camera.position.copy(this.pos);
      this.camera.lookAt(this.look);
      return;
    }
    if (this.transT < 1) {
      this.transT = Math.min(1, this.transT + dt / this.transDur);
      const k = this.transT < 0.5 ? 4 * this.transT ** 3 : 1 - Math.pow(-2 * this.transT + 2, 3) / 2;
      this.pos.lerpVectors(this.fromPos, targetPos, k);
      this.look.lerpVectors(this.fromLook, targetLook, k);
      // arc upward a little for drama
      this.pos.y += Math.sin(k * Math.PI) * 2.5;
    } else if (t.mode === 'commander') {
      const s = 1 - Math.exp(-dt * 6);
      this.pos.lerp(targetPos, s); this.look.lerp(targetLook, s);
    } else if (t.mode === 'third') {
      const s = 1 - Math.exp(-dt * 14);
      this.pos.lerp(targetPos, s); this.look.copy(targetLook);
    } else { this.pos.copy(targetPos); this.look.copy(targetLook); }
    this.fovTarget = t.mode === 'first' ? this.fpsFov : t.mode === 'third' ? Math.min(70, this.fpsFov - 14) : 50;
    this.fovKick = Math.max(0, this.fovKick - dt * 40);
    this.camera.fov += (this.fovTarget + this.fovKick - this.camera.fov) * Math.min(1, dt * 7);
    this.camera.updateProjectionMatrix();
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.2);
      const s = this.shake * this.shake * 0.5;
      this.shakeOff.set((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    } else this.shakeOff.set(0, 0, 0);
    this.camera.position.copy(this.pos).add(this.shakeOff);
    this.camera.lookAt(this.look.clone().add(this.shakeOff));
    if (t.mode === 'first') {
      // roll slightly with strafing for a bit of life
      this.camera.rotateZ(0);
    }
  }

  /** Snap straight to the commander view (new match). */
  resetToCommander(): void {
    this.mode = 'commander';
    this.zoom = 1;
    this.transT = 1;
    this.commanderPose(this.pos, this.look);
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.look);
  }

  /** Slow cinematic orbit around the arena (menu background). */
  orbit(time: number): void {
    const a = time * 0.12;
    const r = 30;
    this.pos.set(ARENA_W / 2 + Math.cos(a) * r, 10 + Math.sin(time * 0.3) * 1.5, ARENA_H / 2 + Math.sin(a) * r * 1.15);
    this.look.set(ARENA_W / 2, 7.5, ARENA_H / 2);
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.look);
    this.camera.fov += (48 - this.camera.fov) * 0.1;
    this.camera.updateProjectionMatrix();
    this.transT = 1;
    this.mode = 'commander';
  }

  /** Intersect a screen ray (NDC coords) with the ground plane. */
  groundPoint(ndcX: number, ndcY: number): Vec | null {
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.ground, hit)) return null;
    return { x: hit.x, y: hit.z };
  }

  /** Where the crosshair ray hits the ground, clamped to a maximum distance from the hero. */
  aimPoint(from: Vec, maxDist: number): Vec {
    const p = this.groundPoint(0, 0);
    if (p) {
      const dx = p.x - from.x, dy = p.y - from.y;
      const d = Math.hypot(dx, dy);
      if (d <= maxDist) return p;
      return { x: from.x + (dx / d) * maxDist, y: from.y + (dy / d) * maxDist };
    }
    const f = this.forward();
    return { x: from.x + f.x * maxDist, y: from.y + f.y * maxDist };
  }

  project(x: number, y: number, z: number, w: number, h: number): { x: number; y: number; visible: boolean; depth: number } {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    return { x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * h, visible: v.z > -1 && v.z < 1, depth: v.z };
  }
}
