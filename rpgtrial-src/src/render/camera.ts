// Third-person action camera (Elden Ring / Witcher): orbit with mouse, spring follow, collision, lock-on, cinematic shots.
import * as THREE from 'three';
import { clamp, damp, dampAngle, wrapAngle, yawFromDir } from '../core/math.ts';
import { terrainHeight } from '../sim/terrain.ts';
import type { Actor } from '../sim/types.ts';

export interface CameraShot { pos: THREE.Vector3; look: THREE.Vector3; fov?: number; duration?: number; ease?: boolean }

export class ThirdPersonCamera {
  camera: THREE.PerspectiveCamera;
  yaw = 0; pitch = 0.22; distance = 4.6; targetDistance = 4.6;
  minDist = 1.6; maxDist = 8; minPitch = -0.55; maxPitch = 1.25;
  sensitivity = 0.0022; invertY = false;
  shoulder = 0.55;                 // right-shoulder offset (m)
  height = 1.45;                   // pivot height above feet
  lockTarget: Actor | null = null;
  shake = 0; private shakeT = 0;
  cinematic: CameraShot | null = null; private cinFrom: CameraShot | null = null; private cinT = 0;
  private pivot = new THREE.Vector3(); private smoothPivot = new THREE.Vector3();
  private curPos = new THREE.Vector3(); private curLook = new THREE.Vector3();
  colliders: THREE.Object3D[] = [];  // optional meshes for raycast
  private ray = new THREE.Raycaster();
  baseFov = 55; fovBoost = 0;
  initialised = false;

  constructor(aspect: number) { this.camera = new THREE.PerspectiveCamera(this.baseFov, aspect, 0.08, 1500); }

  applyMouse(dx: number, dy: number, wheel: number) {
    if (this.cinematic) return;
    if (!this.lockTarget) { this.yaw -= dx * this.sensitivity; this.pitch += dy * this.sensitivity * (this.invertY ? -1 : 1); }
    else { this.pitch += dy * this.sensitivity * 0.5; }
    this.pitch = clamp(this.pitch, this.minPitch, this.maxPitch);
    if (wheel) this.targetDistance = clamp(this.targetDistance + wheel * 0.6, this.minDist, this.maxDist);
  }
  /** Immediately place the camera behind the actor (used at spawn / after cinematics). */
  snapBehind(a: Actor) { this.yaw = a.yaw + Math.PI; this.pitch = 0.22; this.initialised = false; }
  playShot(shot: CameraShot) { this.cinFrom = { pos: this.camera.position.clone(), look: this.curLook.clone(), fov: this.camera.fov }; this.cinematic = shot; this.cinT = 0; }
  endShot() { this.cinematic = null; this.cinFrom = null; }

  update(target: Actor, dt: number, sprinting = false) {
    const cam = this.camera;
    if (this.cinematic) {
      const s = this.cinematic; this.cinT += dt; const dur = s.duration ?? 0.8;
      let t = s.ease === false ? 1 : clamp(this.cinT / dur, 0, 1); t = t * t * (3 - 2 * t);
      const f = this.cinFrom!;
      cam.position.lerpVectors(f.pos, s.pos, t);
      this.curLook.lerpVectors(f.look, s.look, t); cam.lookAt(this.curLook);
      cam.fov = (f.fov ?? this.baseFov) + ((s.fov ?? this.baseFov) - (f.fov ?? this.baseFov)) * t; cam.updateProjectionMatrix();
      this.curPos.copy(cam.position); this.initialised = false;
      return;
    }
    // pivot above actor, smoothed
    this.pivot.set(target.pos.x, target.pos.y + this.height, target.pos.z);
    if (!this.initialised) { this.smoothPivot.copy(this.pivot); this.distance = this.targetDistance; }
    else { this.smoothPivot.x = damp(this.smoothPivot.x, this.pivot.x, 18, dt); this.smoothPivot.z = damp(this.smoothPivot.z, this.pivot.z, 18, dt); this.smoothPivot.y = damp(this.smoothPivot.y, this.pivot.y, 8, dt); }
    // lock-on: yaw toward midpoint of player and target
    if (this.lockTarget && !this.lockTarget.dead) {
      const t = this.lockTarget; const dx = t.pos.x - target.pos.x, dz = t.pos.z - target.pos.z;
      const want = yawFromDir(dx, dz) + Math.PI; // camera sits behind player looking toward target
      this.yaw = dampAngle(this.yaw, want, 6, dt);
      const d = Math.hypot(dx, dz); const wantPitch = clamp(0.18 + d * 0.012, 0.15, 0.5);
      this.pitch = damp(this.pitch, wantPitch, 3, dt);
    }
    this.distance = damp(this.distance, this.targetDistance, 6, dt);
    // desired position: orbit around pivot; shoulder offset to the right
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const rightX = cy, rightZ = -sy;
    const off = new THREE.Vector3(sy * cp, sp, cy * cp).multiplyScalar(this.distance);
    const desired = this.smoothPivot.clone().add(off).addScaledVector(new THREE.Vector3(rightX, 0, rightZ), this.shoulder);
    // collision: terrain and optional meshes — shorten the boom
    const from = this.smoothPivot.clone(); const dir = desired.clone().sub(from); const len = dir.length(); dir.normalize();
    let best = len;
    // terrain: sample along the boom
    for (let s = 0.3; s <= len; s += 0.25) {
      const px = from.x + dir.x * s, py = from.y + dir.y * s, pz = from.z + dir.z * s;
      if (py < terrainHeight(px, pz) + 0.35) { best = Math.max(0.5, s - 0.3); break; }
    }
    if (this.colliders.length) {
      this.ray.set(from, dir); this.ray.far = best;
      const hits = this.ray.intersectObjects(this.colliders, true);
      if (hits.length) best = Math.max(0.5, hits[0].distance - 0.25);
    }
    const pos = from.clone().addScaledVector(dir, best);
    if (!this.initialised) { this.curPos.copy(pos); this.initialised = true; }
    else { const l = best < this.distance - 0.05 ? 30 : 12; this.curPos.x = damp(this.curPos.x, pos.x, l, dt); this.curPos.y = damp(this.curPos.y, pos.y, l, dt); this.curPos.z = damp(this.curPos.z, pos.z, l, dt); }
    cam.position.copy(this.curPos);
    // look slightly ahead / at lock target
    const look = this.smoothPivot.clone();
    if (this.lockTarget && !this.lockTarget.dead) { const t = this.lockTarget; look.lerp(new THREE.Vector3(t.pos.x, t.pos.y + 1.2, t.pos.z), 0.35); }
    this.curLook.copy(look);
    cam.lookAt(look);
    // fov: sprint boost
    this.fovBoost = damp(this.fovBoost, sprinting ? 7 : 0, 4, dt);
    cam.fov = this.baseFov + this.fovBoost; cam.updateProjectionMatrix();
    // shake
    if (this.shake > 0.001) {
      this.shakeT += dt * 40; const s = this.shake;
      cam.position.x += Math.sin(this.shakeT * 1.3) * s * 0.06; cam.position.y += Math.cos(this.shakeT * 1.7) * s * 0.05;
      cam.rotation.z += Math.sin(this.shakeT * 0.9) * s * 0.004;
      this.shake = damp(this.shake, 0, 6, dt);
    }
  }
  addShake(a: number) { this.shake = Math.min(1.5, this.shake + a); }
  /** Forward yaw used to make movement camera-relative (yaw=0 faces +Z). */
  get moveYaw() { return this.yaw + Math.PI; }
  get lookDir() { return this.camera.getWorldDirection(new THREE.Vector3()); }
}
