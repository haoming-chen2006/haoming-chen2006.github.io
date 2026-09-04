// FlickerLight: a PointLight with layered-noise flicker (torches, campfires, candles, magic braziers).
import * as THREE from 'three';

export interface FlickerOpts {
  /** 0..1 amount of intensity variation (default 0.35). */
  flicker?: number;
  /** Speed multiplier (default 1). Candles ~1.6, campfire ~1, magic ~0.5. */
  speed?: number;
  /** Positional jitter in metres (default 0.03). */
  jitter?: number;
  castShadow?: boolean;
  decay?: number;
}

const all = new Set<FlickerLight>();
let seedCounter = 0;

export class FlickerLight extends THREE.PointLight {
  baseIntensity: number;
  flicker: number; speed: number; jitter: number;
  private seed = (seedCounter++ * 7.31) % 100;
  private t = Math.random() * 100;
  private home = new THREE.Vector3();
  private homeSet = false;
  /** Extra multiplier for gameplay pulses (rest flare etc.), decays back to 1. */
  boost = 1;
  constructor(color: THREE.ColorRepresentation = 0xffa040, intensity = 12, distance = 9, opts: FlickerOpts = {}) {
    super(color, intensity, distance, opts.decay ?? 2);
    this.baseIntensity = intensity;
    this.flicker = opts.flicker ?? 0.35; this.speed = opts.speed ?? 1; this.jitter = opts.jitter ?? 0.03;
    this.castShadow = opts.castShadow ?? false;
    if (this.castShadow) { this.shadow.mapSize.set(512, 512); this.shadow.bias = -0.002; this.shadow.radius = 3; }
    all.add(this);
  }
  update(dt: number) {
    if (!this.homeSet) { this.home.copy(this.position); this.homeSet = true; }
    this.t += dt * this.speed;
    const t = this.t, s = this.seed;
    // three sines at incommensurate frequencies + a slow hash-driven gust
    const n = Math.sin(t * 9.1 + s) * 0.5 + Math.sin(t * 15.7 + s * 1.3) * 0.3 + Math.sin(t * 27.3 + s * 2.1) * 0.2;
    const gust = 0.5 + 0.5 * Math.sin(t * 1.3 + s * 0.7) * Math.sin(t * 0.37 + s);
    const f = 1 + this.flicker * (n * 0.6 + (gust - 0.5) * 0.8);
    this.boost += (1 - this.boost) * Math.min(1, dt * 3);
    this.intensity = this.baseIntensity * Math.max(0.2, f) * this.boost * this.distanceFade;
    if (this.jitter > 0) {
      this.position.set(this.home.x + Math.sin(t * 11.3 + s) * this.jitter, this.home.y + Math.sin(t * 13.7 + s * 2) * this.jitter * 0.6, this.home.z + Math.cos(t * 9.7 + s * 3) * this.jitter);
    }
  }
  /** Re-home the light (call after moving it programmatically). */
  setHome(p: THREE.Vector3) { this.home.copy(p); this.position.copy(p); this.homeSet = true; }
  flare(mult = 2.5) { this.boost = Math.max(this.boost, mult); }
  override dispose() { all.delete(this); super.dispose(); }
  /**
   * Tick every FlickerLight. With `near` given, only the `maxActive` closest lights (within `maxDist`) stay visible —
   * three.js evaluates every visible point light in every forward shader, so keep the active set small.
   */
  static updateAll(dt: number, near?: THREE.Vector3, maxActive = 6, maxDist = 70) {
    if (near) {
      // Keep the visible count CONSTANT (min(maxActive, total)) so three.js never recompiles shaders for a new light
      // count; far lights in the active set just fade their intensity to zero.
      const arr = [...all].map((l) => ({ l, d: l.homeDistanceTo(near) })).sort((a, b) => a.d - b.d);
      arr.forEach((e, i) => { e.l.visible = i < maxActive; e.l.distanceFade = e.d < maxDist ? 1 : Math.max(0, 1 - (e.d - maxDist) / 20); });
    }
    for (const l of all) if (l.visible) l.update(dt);
  }
  /** 0..1 multiplier applied by updateAll for far-away lights. */
  distanceFade = 1;
  homeDistanceTo(p: THREE.Vector3) { return (this.homeSet ? this.home : this.position).distanceTo(p); }
  static get instances() { return all; }
}

/** Presets matching content/level.ts LightPlacement kinds. */
export function lightForKind(kind: 'torch' | 'candle' | 'fire' | 'magic', color?: number, intensity?: number, range?: number): FlickerLight {
  switch (kind) {
    case 'torch': return new FlickerLight(color ?? 0xffa54a, intensity ?? 10, range ?? 8, { flicker: 0.4, speed: 1.2, jitter: 0.03 });
    case 'candle': return new FlickerLight(color ?? 0xffc97a, intensity ?? 2.2, range ?? 3.5, { flicker: 0.3, speed: 1.7, jitter: 0.008 });
    case 'fire': return new FlickerLight(color ?? 0xff9a3c, intensity ?? 22, range ?? 13, { flicker: 0.35, speed: 1, jitter: 0.06 });
    case 'magic': return new FlickerLight(color ?? 0x5ef2ff, intensity ?? 9, range ?? 9, { flicker: 0.2, speed: 0.5, jitter: 0.02 });
  }
}
