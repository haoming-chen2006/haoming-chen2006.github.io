import * as THREE from 'three';

const dummy = new THREE.Object3D();
const tmpColor = new THREE.Color();

export interface DebrisOpts {
  color: THREE.Color | number;
  color2?: THREE.Color | number;
  speed?: number;
  up?: number;
  size?: number;
  life?: number;
  spread?: number;
  bounce?: number;
  gravity?: number;
}

/** Instanced physics-lite chunks: tower rubble, meteor rock, bone bits, dirt. */
export class Debris {
  readonly mesh: THREE.InstancedMesh;
  private readonly max: number;
  private pos: Float32Array;
  private vel: Float32Array;
  private rot: Float32Array;
  private angVel: Float32Array;
  private size: Float32Array;
  private life: Float32Array;
  private maxLife: Float32Array;
  private bounce: Float32Array;
  private grav: Float32Array;
  private cursor = 0;
  private live = 0;

  constructor(scene: THREE.Scene, max = 320) {
    this.max = max;
    const f = (n: number) => new Float32Array(max * n);
    this.pos = f(3); this.vel = f(3); this.rot = f(3); this.angVel = f(3); this.size = f(1); this.life = f(1); this.maxLife = f(1); this.bounce = f(1); this.grav = f(1);
    const geo = new THREE.DodecahedronGeometry(1, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    for (let i = 0; i < max; i++) { dummy.position.set(0, -100, 0); dummy.scale.setScalar(0.0001); dummy.updateMatrix(); this.mesh.setMatrixAt(i, dummy.matrix); this.mesh.setColorAt(i, tmpColor.setHex(0x888888)); }
    scene.add(this.mesh);
  }

  spawn(x: number, y: number, z: number, n: number, o: DebrisOpts): void {
    const sp = o.speed ?? 4, spread = o.spread ?? 1;
    for (let k = 0; k < n; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.max;
      const a = Math.random() * Math.PI * 2, b = (Math.random() - 0.5) * Math.PI * spread;
      const s = sp * (0.4 + Math.random() * 0.9);
      this.pos[i * 3] = x + (Math.random() - 0.5) * 0.3; this.pos[i * 3 + 1] = y + Math.random() * 0.3; this.pos[i * 3 + 2] = z + (Math.random() - 0.5) * 0.3;
      this.vel[i * 3] = Math.cos(a) * Math.cos(b) * s; this.vel[i * 3 + 1] = (o.up ?? 1) * (Math.abs(Math.sin(b)) * s + 1.5); this.vel[i * 3 + 2] = Math.sin(a) * Math.cos(b) * s;
      this.rot[i * 3] = Math.random() * 6; this.rot[i * 3 + 1] = Math.random() * 6; this.rot[i * 3 + 2] = Math.random() * 6;
      this.angVel[i * 3] = (Math.random() - 0.5) * 12; this.angVel[i * 3 + 1] = (Math.random() - 0.5) * 12; this.angVel[i * 3 + 2] = (Math.random() - 0.5) * 12;
      this.size[i] = (o.size ?? 0.25) * (0.5 + Math.random());
      this.life[i] = this.maxLife[i] = (o.life ?? 2.5) * (0.7 + Math.random() * 0.6);
      this.bounce[i] = o.bounce ?? 0.35;
      this.grav[i] = o.gravity ?? 12;
      const c = o.color2 !== undefined && Math.random() < 0.4 ? o.color2 : o.color;
      this.mesh.setColorAt(i, c instanceof THREE.Color ? c : tmpColor.setHex(c));
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.mesh.count = this.max;
    this.live = 1;
  }

  update(dt: number): void {
    if (this.live === 0) return;
    let live = 0;
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { dummy.position.set(0, -100, 0); dummy.scale.setScalar(0.0001); dummy.updateMatrix(); this.mesh.setMatrixAt(i, dummy.matrix); continue; }
      live++;
      this.vel[i * 3 + 1] -= this.grav[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const floor = this.size[i] * 0.6;
      if (this.pos[i * 3 + 1] < floor) {
        this.pos[i * 3 + 1] = floor;
        if (this.vel[i * 3 + 1] < 0) { this.vel[i * 3 + 1] = -this.vel[i * 3 + 1] * this.bounce[i]; this.vel[i * 3] *= 0.6; this.vel[i * 3 + 2] *= 0.6; this.angVel[i * 3] *= 0.5; this.angVel[i * 3 + 2] *= 0.5; }
        if (Math.abs(this.vel[i * 3 + 1]) < 0.4) { this.vel[i * 3 + 1] = 0; this.angVel[i * 3] = 0; this.angVel[i * 3 + 2] = 0; this.angVel[i * 3 + 1] *= 0.9; }
      }
      this.rot[i * 3] += this.angVel[i * 3] * dt; this.rot[i * 3 + 1] += this.angVel[i * 3 + 1] * dt; this.rot[i * 3 + 2] += this.angVel[i * 3 + 2] * dt;
      const t = this.life[i] / this.maxLife[i];
      const sc = this.size[i] * (t < 0.25 ? t / 0.25 : 1);
      dummy.position.set(this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]);
      dummy.rotation.set(this.rot[i * 3], this.rot[i * 3 + 1], this.rot[i * 3 + 2]);
      dummy.scale.set(sc, sc * 0.8, sc);
      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix);
    }
    this.live = live;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
