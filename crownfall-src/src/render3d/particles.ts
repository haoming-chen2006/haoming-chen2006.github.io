import * as THREE from 'three';
import { particleTexture } from './textures.ts';

export interface EmitOpts {
  x: number; y: number; z: number;
  vx?: number; vy?: number; vz?: number;
  life?: number;
  size?: number;
  /** size multiplier at end of life (0.3 shrinks, 2.5 grows) */
  sizeEnd?: number;
  color: THREE.Color | number;
  colorEnd?: THREE.Color | number;
  alpha?: number;
  gravity?: number;
  drag?: number;
  spin?: number;
  /** restitution when hitting the ground (0 = no bounce, particles just die) */
  bounce?: number;
  /** @deprecated kept for old callers: <1 grows, >=1 shrinks */
  shrink?: number;
}

export interface BurstOpts {
  color: THREE.Color | number; colorEnd?: THREE.Color | number; speed?: number; up?: number; life?: number; size?: number; sizeEnd?: number;
  gravity?: number; drag?: number; spread?: number; shrink?: number; alpha?: number; spin?: number; bounce?: number;
}

const tmpColor = new THREE.Color();

/** Pooled GPU point-sprite particle system: per-particle size, colour fade, alpha, spin, gravity, drag and ground bounce. */
export class ParticleSystem {
  readonly points: THREE.Points;
  private readonly max: number;
  private pos: Float32Array;
  private col: Float32Array;
  private size: Float32Array;
  private alpha: Float32Array;
  private angle: Float32Array;
  private vel: Float32Array;
  private life: Float32Array;
  private maxLife: Float32Array;
  private grav: Float32Array;
  private drag: Float32Array;
  private startSize: Float32Array;
  private sizeEnd: Float32Array;
  private startAlpha: Float32Array;
  private spin: Float32Array;
  private bounce: Float32Array;
  private c0: Float32Array;
  private c1: Float32Array;
  private cursor = 0;
  private live = 0;
  private geo: THREE.BufferGeometry;
  private dirty = false;

  constructor(max = 4000, additive = true) {
    this.max = max;
    const f = (n: number) => new Float32Array(max * n);
    this.pos = f(3); this.col = f(3); this.size = f(1); this.alpha = f(1); this.angle = f(1);
    this.vel = f(3); this.life = f(1); this.maxLife = f(1); this.grav = f(1); this.drag = f(1);
    this.startSize = f(1); this.sizeEnd = f(1); this.startAlpha = f(1); this.spin = f(1); this.bounce = f(1); this.c0 = f(3); this.c1 = f(3);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    this.geo.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));
    this.geo.setAttribute('angle', new THREE.BufferAttribute(this.angle, 1));
    for (const name of ['position', 'color', 'size', 'alpha', 'angle']) (this.geo.getAttribute(name) as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: particleTexture() }, scale: { value: 400 } },
      vertexShader: `
        attribute float size; attribute float alpha; attribute float angle; attribute vec3 color;
        varying float vAlpha; varying vec3 vColor; varying float vAngle; uniform float scale;
        void main() {
          vAlpha = alpha; vColor = color; vAngle = angle;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = min(alpha <= 0.0 ? 0.0 : size * scale / max(1.0, -mv.z), 420.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D map; varying float vAlpha; varying vec3 vColor; varying float vAngle;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float c = cos(vAngle), s = sin(vAngle);
          uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y) + 0.5;
          vec4 t = texture2D(map, uv);
          gl_FragColor = vec4(vColor, t.a * vAlpha);
        }`,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 20 : 10;
    this.geo.setDrawRange(0, max);
  }

  setScale(viewHeight: number): void {
    (this.points.material as THREE.ShaderMaterial).uniforms.scale.value = viewHeight * 0.5;
  }

  get activeCount(): number { return this.live; }

  emit(o: EmitOpts): void {
    if (!Number.isFinite(o.x) || !Number.isFinite(o.y) || !Number.isFinite(o.z) || !Number.isFinite(o.size ?? 1)) return;
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.max;
    const c = o.color instanceof THREE.Color ? o.color : tmpColor.setHex(o.color);
    this.c0[i * 3] = c.r; this.c0[i * 3 + 1] = c.g; this.c0[i * 3 + 2] = c.b;
    if (o.colorEnd !== undefined) {
      const ce = o.colorEnd instanceof THREE.Color ? o.colorEnd : tmpColor.setHex(o.colorEnd);
      this.c1[i * 3] = ce.r; this.c1[i * 3 + 1] = ce.g; this.c1[i * 3 + 2] = ce.b;
    } else { this.c1[i * 3] = this.c0[i * 3]; this.c1[i * 3 + 1] = this.c0[i * 3 + 1]; this.c1[i * 3 + 2] = this.c0[i * 3 + 2]; }
    this.col[i * 3] = this.c0[i * 3]; this.col[i * 3 + 1] = this.c0[i * 3 + 1]; this.col[i * 3 + 2] = this.c0[i * 3 + 2];
    this.pos[i * 3] = o.x; this.pos[i * 3 + 1] = o.y; this.pos[i * 3 + 2] = o.z;
    this.vel[i * 3] = o.vx ?? 0; this.vel[i * 3 + 1] = o.vy ?? 0; this.vel[i * 3 + 2] = o.vz ?? 0;
    this.life[i] = this.maxLife[i] = Math.max(0.02, o.life ?? 0.6);
    this.startSize[i] = this.size[i] = o.size ?? 0.3;
    let sizeEnd = o.sizeEnd;
    if (sizeEnd === undefined) sizeEnd = o.shrink !== undefined ? (o.shrink >= 1 ? 0.3 : 1 + (1 - o.shrink) * 1.6) : 0.35;
    this.sizeEnd[i] = sizeEnd;
    this.startAlpha[i] = o.alpha ?? 1;
    this.alpha[i] = 0;
    this.grav[i] = o.gravity ?? 0;
    this.drag[i] = o.drag ?? 0;
    this.spin[i] = o.spin ?? 0;
    this.bounce[i] = o.bounce ?? 0;
    this.angle[i] = Math.random() * Math.PI * 2;
    this.dirty = true;
  }

  /** Emit `n` particles in a burst from a point. */
  burst(x: number, y: number, z: number, n: number, o: BurstOpts): void {
    const sp = o.speed ?? 3, spread = o.spread ?? 1;
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, b = (Math.random() - 0.5) * Math.PI * spread;
      const s = sp * (0.4 + Math.random() * 0.8);
      this.emit({
        x, y, z, vx: Math.cos(a) * Math.cos(b) * s, vy: (o.up ?? 1) * Math.abs(Math.sin(b)) * s + (o.up ?? 1) * 0.5, vz: Math.sin(a) * Math.cos(b) * s,
        life: (o.life ?? 0.6) * (0.6 + Math.random() * 0.8), size: (o.size ?? 0.3) * (0.6 + Math.random() * 0.8), sizeEnd: o.sizeEnd, color: o.color, colorEnd: o.colorEnd,
        gravity: o.gravity ?? 4, drag: o.drag ?? 1.5, shrink: o.shrink, alpha: o.alpha ?? 1, spin: o.spin ?? (Math.random() - 0.5) * 4, bounce: o.bounce,
      });
    }
  }

  update(dt: number): void {
    if (!this.dirty && this.live === 0) return;
    const p = this.pos, v = this.vel;
    let live = 0;
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) { if (this.alpha[i] !== 0) this.alpha[i] = 0; continue; }
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.alpha[i] = 0; continue; }
      live++;
      const t = this.life[i] / this.maxLife[i]; // 1 -> 0
      v[i * 3 + 1] -= this.grav[i] * dt;
      const d = this.drag[i] > 0 ? Math.exp(-this.drag[i] * dt) : 1;
      v[i * 3] *= d; v[i * 3 + 1] *= d; v[i * 3 + 2] *= d;
      p[i * 3] += v[i * 3] * dt; p[i * 3 + 1] += v[i * 3 + 1] * dt; p[i * 3 + 2] += v[i * 3 + 2] * dt;
      if (this.bounce[i] > 0 && p[i * 3 + 1] < 0.06 && v[i * 3 + 1] < 0) {
        p[i * 3 + 1] = 0.06; v[i * 3 + 1] = -v[i * 3 + 1] * this.bounce[i]; v[i * 3] *= 0.7; v[i * 3 + 2] *= 0.7;
      }
      const age = 1 - t;
      const fadeIn = Math.min(1, age * 10);
      const fadeOut = t < 0.5 ? t * 2 : 1;
      this.alpha[i] = this.startAlpha[i] * fadeIn * fadeOut;
      this.size[i] = this.startSize[i] * (1 + (this.sizeEnd[i] - 1) * age);
      this.angle[i] += this.spin[i] * dt;
      const k = age;
      this.col[i * 3] = this.c0[i * 3] + (this.c1[i * 3] - this.c0[i * 3]) * k;
      this.col[i * 3 + 1] = this.c0[i * 3 + 1] + (this.c1[i * 3 + 1] - this.c0[i * 3 + 1]) * k;
      this.col[i * 3 + 2] = this.c0[i * 3 + 2] + (this.c1[i * 3 + 2] - this.c0[i * 3 + 2]) * k;
    }
    this.live = live;
    this.dirty = live > 0;
    for (const name of ['position', 'color', 'size', 'alpha', 'angle']) (this.geo.getAttribute(name) as THREE.BufferAttribute).needsUpdate = true;
  }
}
