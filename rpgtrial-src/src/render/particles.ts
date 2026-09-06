// GPU particle system: CPU spawns (writes a few floats per particle into a ring buffer), GPU simulates analytically
// (drag/gravity/wind/turbulence in the vertex shader). One instanced quad mesh per layer; a kind = 1..4 layers.
// Everything lives on FX_LAYER so the renderer's FxPass draws it after AO with soft-depth fading. (Post-FX agent owns.)
import * as THREE from 'three';
import type { QualitySettings } from './quality.ts';
import { FX_LAYER, SOFT_GLSL, softUniforms } from './fx/common.ts';
import { getAtlas, cellUV, ATLAS_COLS, SPRITE } from './fx/textures.ts';
import { terrainHeight } from '../sim/terrain.ts';
import { LAKE } from '../content/level.ts';
import type { Vec3 } from '../core/math.ts';

export type EmitterKind =
  | 'fire' | 'embers' | 'torch' | 'candle' | 'fireflies' | 'dust' | 'leaves' | 'mist' | 'magicBrazier' | 'smoke'
  // one-shot bursts used by vfx.ts
  | 'sparks' | 'boneDust' | 'puff' | 'sparkle' | 'shockDust' | 'runes' | 'emberBurst' | 'flash' | 'iceShards' | 'radiantMotes' | 'arcaneMotes' | 'ringBurst' | 'poisonBubbles'
  // continuous helpers used by vfx.ts (moved every frame)
  | 'castCharge' | 'projTrail' | 'stunStars' | 'interactMotes' | 'soulWisps' | 'auraEmbers' | 'blessMotes';

export interface LayerParams {
  sprite: number; variants?: number;
  blend: 'add' | 'alpha';
  rate: number;                 // per second; 0 for one-shot layers
  count?: number;               // one-shot count
  life: [number, number];
  size: [number, number]; sizeEnd: number;
  shape: 'point' | 'disc' | 'sphere' | 'box' | 'ring' | 'hemisphere'; radius: number; height?: [number, number];
  dir: [number, number, number]; spread: number; speed: [number, number]; radial?: number;
  gravity: number; drag: number; wind?: [number, number, number]; turb: number; turbFreq: number;
  colorA: number; colorB: number; intensity: number; alpha: number; fadeIn: number; fadeOut: number;
  spin: number; stretch: number; twinkle: number; tumble?: number; soft: number; renderOrder?: number;
  offset?: [number, number, number];
  groundRelative?: boolean;     // y = terrain height + height range (player-centred ambient emitters)
  waterOnly?: boolean;          // only spawn over the lake (mist)
  cull?: number;                // stop spawning beyond this camera distance
}

export interface EmitterOpts {
  scale?: number;               // multiplies sizes, radii and speeds
  intensity?: number;           // multiplies brightness / alpha
  rate?: number;                // multiplies spawn rate
  count?: number;               // multiplies one-shot counts
  color?: THREE.ColorRepresentation; color2?: THREE.ColorRepresentation;   // override colour ramp (all layers)
  dir?: Vec3;                   // override emit direction (bursts)
  follow?: THREE.Vector3;       // keep the emitter centred on this vector (e.g. the player)
  life?: number;                // multiplies lifetimes
}

const C = (h: number) => h;
const flame = (scale: number, rate: number): LayerParams => ({
  sprite: SPRITE.flame, blend: 'add', rate, life: [0.5, 0.85], size: [0.34 * scale, 0.5 * scale], sizeEnd: 0.45, shape: 'disc', radius: 0.2 * scale,
  dir: [0, 1, 0], spread: 0.12, speed: [1.1 * scale, 1.9 * scale], gravity: 0, drag: 1.6, turb: 0.12 * scale, turbFreq: 3.5,
  colorA: C(0xffd88c), colorB: C(0xff4a08), intensity: 2.4, alpha: 0.9, fadeIn: 0.15, fadeOut: 0.55, spin: 0.5, stretch: 0, twinkle: 0, soft: 0.35 * scale, renderOrder: 3, cull: 120,
});
const fireCore = (scale: number, rate: number): LayerParams => ({
  sprite: SPRITE.glow, blend: 'add', rate, life: [0.28, 0.45], size: [0.2 * scale, 0.3 * scale], sizeEnd: 0.4, shape: 'disc', radius: 0.1 * scale,
  dir: [0, 1, 0], spread: 0.1, speed: [0.7 * scale, 1.3 * scale], gravity: 0, drag: 1.5, turb: 0.05, turbFreq: 4,
  colorA: C(0xfff6d0), colorB: C(0xffb84a), intensity: 3.2, alpha: 0.8, fadeIn: 0.2, fadeOut: 0.5, spin: 0, stretch: 0, twinkle: 0, soft: 0.3 * scale, renderOrder: 4, cull: 120,
});
const embers = (scale: number, rate: number): LayerParams => ({
  sprite: SPRITE.glow, blend: 'add', rate, life: [1.4, 2.8], size: [0.022 * scale, 0.045 * scale], sizeEnd: 0.6, shape: 'disc', radius: 0.22 * scale,
  dir: [0, 1, 0], spread: 0.45, speed: [1.0 * scale, 2.4 * scale], gravity: 0.35, drag: 0.9, wind: [0.15, 0, 0.08], turb: 0.7, turbFreq: 2.2,
  colorA: C(0xffcf70), colorB: C(0xff3a00), intensity: 3.5, alpha: 1, fadeIn: 0.05, fadeOut: 0.5, spin: 0, stretch: 0.02, twinkle: 0.7, soft: 0.1, renderOrder: 5, cull: 140,
});
const smoke = (scale: number, rate: number): LayerParams => ({
  sprite: SPRITE.smokeA, variants: 2, blend: 'alpha', rate, life: [2.8, 4.5], size: [0.5 * scale, 0.75 * scale], sizeEnd: 3.2, shape: 'disc', radius: 0.15 * scale, offset: [0, 0.7 * scale, 0],
  dir: [0, 1, 0], spread: 0.2, speed: [0.55 * scale, 0.95 * scale], gravity: 0.08, drag: 0.7, wind: [0.35, 0, 0.15], turb: 0.35, turbFreq: 0.8,
  colorA: C(0x3a3632), colorB: C(0x6d6c74), intensity: 1, alpha: 0.32, fadeIn: 0.2, fadeOut: 0.5, spin: 0.35, stretch: 0, twinkle: 0, soft: 1.0, renderOrder: 1, cull: 120,
});

/** Layer recipes per kind. Ambient kinds are continuous; burst kinds are one-shot (rate 0, count > 0). */
export const KINDS: Record<EmitterKind, LayerParams[]> = {
  fire: [flame(1, 30), fireCore(1, 18), embers(1, 12), smoke(1, 4.5)],
  torch: [flame(0.45, 22), fireCore(0.45, 10), embers(0.5, 4), { ...smoke(0.4, 1.2), alpha: 0.2 }],
  candle: [{ ...flame(0.18, 14), life: [0.3, 0.5], turb: 0.02, spin: 0.2, speed: [0.25, 0.45] }, { ...fireCore(0.3, 6), size: [0.12, 0.16], speed: [0.1, 0.2], life: [0.4, 0.7], intensity: 1.8 }],
  embers: [embers(1, 14)],
  smoke: [smoke(1, 6)],
  magicBrazier: [
    { ...flame(1, 26), colorA: C(0xb8fff0), colorB: C(0x1c6bff), intensity: 2.2 },
    { ...fireCore(1, 14), colorA: C(0xeafffb), colorB: C(0x4ff0d8), intensity: 3 },
    { ...embers(1, 16), colorA: C(0xc6fff4), colorB: C(0x2f9bff), twinkle: 0.9, gravity: 0.8, speed: [0.8, 2.0] },
    { sprite: SPRITE.spark, blend: 'add', rate: 5, life: [1.2, 2.0], size: [0.06, 0.1], sizeEnd: 0.3, shape: 'disc', radius: 0.35, dir: [0, 1, 0], spread: 0.6, speed: [0.5, 1.2], gravity: 0.3, drag: 1, turb: 0.5, turbFreq: 1.5, colorA: C(0xffffff), colorB: C(0x63e6ff), intensity: 3, alpha: 1, fadeIn: 0.1, fadeOut: 0.5, spin: 2, stretch: 0, twinkle: 1, soft: 0.1, renderOrder: 5, cull: 120 },
    { ...smoke(0.9, 3), colorA: C(0x2c4a52), colorB: C(0x4a6c80), alpha: 0.22 },
  ],
  fireflies: [{
    sprite: SPRITE.glow, blend: 'add', rate: 9, life: [5, 9], size: [0.045, 0.075], sizeEnd: 1, shape: 'box', radius: 14, height: [0.3, 2.6], groundRelative: true,
    dir: [0, 0, 0], spread: 1, speed: [0.12, 0.35], gravity: 0, drag: 0.3, turb: 0.8, turbFreq: 0.5,
    colorA: C(0xe4ff7a), colorB: C(0x9cff5a), intensity: 2.6, alpha: 1, fadeIn: 0.2, fadeOut: 0.2, spin: 0, stretch: 0, twinkle: 1, soft: 0.1, renderOrder: 6,
  }],
  dust: [{
    sprite: SPRITE.mote, blend: 'add', rate: 18, life: [6, 10], size: [0.012, 0.03], sizeEnd: 1, shape: 'box', radius: 9, height: [0.1, 3.2], groundRelative: true,
    dir: [0, 0, 0], spread: 1, speed: [0.03, 0.12], gravity: -0.01, drag: 0.5, wind: [0.04, 0, 0.02], turb: 0.35, turbFreq: 0.35,
    colorA: C(0xfff0cf), colorB: C(0xffe2b0), intensity: 0.9, alpha: 0.55, fadeIn: 0.25, fadeOut: 0.25, spin: 0, stretch: 0, twinkle: 0.5, soft: 0.1, renderOrder: 6,
  }],
  leaves: [{
    sprite: SPRITE.leaf, blend: 'alpha', rate: 2.5, life: [6, 9], size: [0.1, 0.16], sizeEnd: 1, shape: 'box', radius: 11, height: [5, 9], groundRelative: true,
    dir: [0.4, -1, 0.2], spread: 0.6, speed: [0.3, 0.7], gravity: -0.9, drag: 1.6, wind: [0.7, 0, 0.3], turb: 0.9, turbFreq: 0.8,
    colorA: C(0xffe2a0), colorB: C(0xd08a40), intensity: 1, alpha: 1, fadeIn: 0.05, fadeOut: 0.08, spin: 2.6, stretch: 0, twinkle: 0, tumble: 1, soft: 0.05, renderOrder: 2,
  }],
  mist: [{
    sprite: SPRITE.smokeA, variants: 2, blend: 'alpha', rate: 2.2, life: [10, 16], size: [6, 11], sizeEnd: 1.5, shape: 'disc', radius: 34, height: [0.15, 0.5], waterOnly: true,
    dir: [1, 0, 0.3], spread: 0.9, speed: [0.12, 0.3], gravity: 0, drag: 0.4, wind: [0.15, 0, 0.05], turb: 0.6, turbFreq: 0.12,
    colorA: C(0xb6c6d6), colorB: C(0xc8d4dd), intensity: 1, alpha: 0.14, fadeIn: 0.3, fadeOut: 0.35, spin: 0.04, stretch: 0, twinkle: 0, soft: 3.0, renderOrder: 0,
  }],
  // ---------------- bursts ----------------
  sparks: [{
    sprite: SPRITE.glow, blend: 'add', rate: 0, count: 26, life: [0.25, 0.55], size: [0.02, 0.04], sizeEnd: 0.5, shape: 'sphere', radius: 0.08,
    dir: [0, 0.6, 0], spread: 0.85, speed: [3, 7.5], gravity: -9, drag: 2.2, turb: 0, turbFreq: 1,
    colorA: C(0xfff4d0), colorB: C(0xff8a24), intensity: 4, alpha: 1, fadeIn: 0.02, fadeOut: 0.4, spin: 0, stretch: 0.05, twinkle: 0, soft: 0.05, renderOrder: 6,
  }, {
    sprite: SPRITE.glow, blend: 'add', rate: 0, count: 1, life: [0.14, 0.14], size: [0.7, 0.7], sizeEnd: 2.2, shape: 'point', radius: 0,
    dir: [0, 0, 0], spread: 0, speed: [0, 0], gravity: 0, drag: 1, turb: 0, turbFreq: 1,
    colorA: C(0xfff0d0), colorB: C(0xffb060), intensity: 3, alpha: 0.9, fadeIn: 0.1, fadeOut: 0.7, spin: 0, stretch: 0, twinkle: 0, soft: 0.3, renderOrder: 7,
  }],
  boneDust: [{
    sprite: SPRITE.smokeA, variants: 2, blend: 'alpha', rate: 0, count: 16, life: [0.6, 1.2], size: [0.14, 0.26], sizeEnd: 2.3, shape: 'sphere', radius: 0.2,
    dir: [0, 0.7, 0], spread: 0.9, speed: [0.8, 2.2], gravity: -1.2, drag: 2.8, turb: 0.1, turbFreq: 2,
    colorA: C(0xeee6d2), colorB: C(0x9a9184), intensity: 1, alpha: 0.55, fadeIn: 0.08, fadeOut: 0.55, spin: 0.8, stretch: 0, twinkle: 0, soft: 0.5, renderOrder: 2,
  }, {
    sprite: SPRITE.glow, blend: 'add', rate: 0, count: 10, life: [0.4, 0.8], size: [0.02, 0.04], sizeEnd: 0.4, shape: 'sphere', radius: 0.1,
    dir: [0, 0.6, 0], spread: 0.9, speed: [2, 4.5], gravity: -7, drag: 2, turb: 0, turbFreq: 1,
    colorA: C(0xfff8e8), colorB: C(0xc8c0a8), intensity: 2.5, alpha: 1, fadeIn: 0.02, fadeOut: 0.5, spin: 0, stretch: 0.04, twinkle: 0, soft: 0.05, renderOrder: 6,
  }],
  puff: [{
    sprite: SPRITE.smokeA, variants: 2, blend: 'alpha', rate: 0, count: 12, life: [0.5, 1.0], size: [0.2, 0.35], sizeEnd: 2.4, shape: 'disc', radius: 0.25,
    dir: [0, 0.5, 0], spread: 0.9, speed: [0.6, 1.8], gravity: -0.6, drag: 2.5, turb: 0.1, turbFreq: 2,
    colorA: C(0x8b7b60), colorB: C(0x6a5f4c), intensity: 1, alpha: 0.5, fadeIn: 0.08, fadeOut: 0.55, spin: 0.7, stretch: 0, twinkle: 0, soft: 0.5, renderOrder: 2,
  }],
  sparkle: [{
    sprite: SPRITE.spark, blend: 'add', rate: 0, count: 34, life: [0.7, 1.4], size: [0.035, 0.08], sizeEnd: 0.3, shape: 'sphere', radius: 0.35,
    dir: [0, 1, 0], spread: 0.6, speed: [0.5, 1.8], gravity: 0.4, drag: 1.2, turb: 0.4, turbFreq: 2,
    colorA: C(0xffffff), colorB: C(0xffd060), intensity: 3.2, alpha: 1, fadeIn: 0.05, fadeOut: 0.5, spin: 3, stretch: 0, twinkle: 1, soft: 0.05, renderOrder: 6,
  }],
  shockDust: [{
    sprite: SPRITE.smokeA, variants: 2, blend: 'alpha', rate: 0, count: 28, life: [0.6, 1.1], size: [0.3, 0.5], sizeEnd: 2.6, shape: 'ring', radius: 0.6,
    dir: [0, 0.35, 0], spread: 0.2, speed: [3, 5], radial: 1, gravity: -1.5, drag: 3.2, turb: 0.1, turbFreq: 2,
    colorA: C(0x9a8a6e), colorB: C(0x6e6454), intensity: 1, alpha: 0.5, fadeIn: 0.05, fadeOut: 0.5, spin: 1, stretch: 0, twinkle: 0, soft: 0.5, renderOrder: 2,
  }],
  runes: [{
    sprite: SPRITE.rune, blend: 'add', rate: 0, count: 10, life: [0.9, 1.5], size: [0.12, 0.2], sizeEnd: 0.6, shape: 'ring', radius: 0.7,
    dir: [0, 1, 0], spread: 0.15, speed: [0.6, 1.2], gravity: 0.2, drag: 1, turb: 0.2, turbFreq: 1.5,
    colorA: C(0xffe9a8), colorB: C(0xffb040), intensity: 2.6, alpha: 1, fadeIn: 0.1, fadeOut: 0.45, spin: 1.2, stretch: 0, twinkle: 0.3, soft: 0.1, renderOrder: 6,
  }],
  emberBurst: [{
    sprite: SPRITE.glow, blend: 'add', rate: 0, count: 40, life: [0.6, 1.4], size: [0.03, 0.06], sizeEnd: 0.4, shape: 'sphere', radius: 0.2,
    dir: [0, 1, 0], spread: 0.8, speed: [2, 6], gravity: -3, drag: 1.6, turb: 0.5, turbFreq: 2,
    colorA: C(0xffd890), colorB: C(0xff3c00), intensity: 3.5, alpha: 1, fadeIn: 0.02, fadeOut: 0.5, spin: 0, stretch: 0.03, twinkle: 0.6, soft: 0.1, renderOrder: 6,
  }, {
    sprite: SPRITE.smokeA, variants: 2, blend: 'alpha', rate: 0, count: 10, life: [1.2, 2.2], size: [0.35, 0.6], sizeEnd: 2.8, shape: 'sphere', radius: 0.3,
    dir: [0, 1, 0], spread: 0.6, speed: [0.8, 2], gravity: 0.3, drag: 1.5, turb: 0.3, turbFreq: 1,
    colorA: C(0x3a3230), colorB: C(0x5a5658), intensity: 1, alpha: 0.4, fadeIn: 0.15, fadeOut: 0.5, spin: 0.8, stretch: 0, twinkle: 0, soft: 0.8, renderOrder: 1,
  }],
  flash: [{
    sprite: SPRITE.glow, blend: 'add', rate: 0, count: 1, life: [0.16, 0.16], size: [0.9, 0.9], sizeEnd: 2.6, shape: 'point', radius: 0,
    dir: [0, 0, 0], spread: 0, speed: [0, 0], gravity: 0, drag: 1, turb: 0, turbFreq: 1,
    colorA: C(0xffffff), colorB: C(0xffd8a0), intensity: 5, alpha: 1, fadeIn: 0.08, fadeOut: 0.75, spin: 0, stretch: 0, twinkle: 0, soft: 0.4, renderOrder: 7,
  }],
  iceShards: [{
    sprite: SPRITE.spark, blend: 'add', rate: 0, count: 24, life: [0.4, 0.8], size: [0.04, 0.09], sizeEnd: 0.5, shape: 'sphere', radius: 0.15,
    dir: [0, 0.5, 0], spread: 0.9, speed: [2, 5], gravity: -7, drag: 1.5, turb: 0, turbFreq: 1,
    colorA: C(0xf0fbff), colorB: C(0x5ac8ff), intensity: 3.5, alpha: 1, fadeIn: 0.02, fadeOut: 0.4, spin: 6, stretch: 0.02, twinkle: 0.3, soft: 0.05, renderOrder: 6,
  }],
  radiantMotes: [{
    sprite: SPRITE.spark, blend: 'add', rate: 0, count: 40, life: [0.8, 1.6], size: [0.04, 0.09], sizeEnd: 0.3, shape: 'disc', radius: 0.7,
    dir: [0, 1, 0], spread: 0.15, speed: [1.5, 3.5], gravity: 0.5, drag: 0.8, turb: 0.3, turbFreq: 2,
    colorA: C(0xffffff), colorB: C(0xffd070), intensity: 3.5, alpha: 1, fadeIn: 0.05, fadeOut: 0.5, spin: 2, stretch: 0, twinkle: 1, soft: 0.1, renderOrder: 6,
  }],
  arcaneMotes: [{
    sprite: SPRITE.glow, blend: 'add', rate: 0, count: 30, life: [0.5, 1.0], size: [0.03, 0.07], sizeEnd: 0.3, shape: 'sphere', radius: 0.2,
    dir: [0, 0.3, 0], spread: 0.95, speed: [1.5, 4], gravity: -1, drag: 2, turb: 0.4, turbFreq: 3,
    colorA: C(0xf2e0ff), colorB: C(0x8a3cff), intensity: 3.5, alpha: 1, fadeIn: 0.02, fadeOut: 0.5, spin: 0, stretch: 0.03, twinkle: 0.5, soft: 0.1, renderOrder: 6,
  }],
  ringBurst: [{
    sprite: SPRITE.glow, blend: 'add', rate: 0, count: 36, life: [0.5, 0.9], size: [0.05, 0.1], sizeEnd: 0.3, shape: 'ring', radius: 0.5,
    dir: [0, 0.15, 0], spread: 0.1, speed: [4, 6], radial: 1, gravity: -0.5, drag: 2.5, turb: 0, turbFreq: 1,
    colorA: C(0xffffff), colorB: C(0x80c8ff), intensity: 3.5, alpha: 1, fadeIn: 0.02, fadeOut: 0.5, spin: 0, stretch: 0.04, twinkle: 0, soft: 0.1, renderOrder: 6,
  }],
  poisonBubbles: [{
    sprite: SPRITE.ring, blend: 'add', rate: 6, life: [0.8, 1.4], size: [0.04, 0.09], sizeEnd: 1.6, shape: 'disc', radius: 0.35, offset: [0, 0.4, 0],
    dir: [0, 1, 0], spread: 0.3, speed: [0.4, 0.9], gravity: 0.3, drag: 1, turb: 0.15, turbFreq: 2,
    colorA: C(0xa6ff5a), colorB: C(0x2f8a2a), intensity: 2, alpha: 1, fadeIn: 0.1, fadeOut: 0.4, spin: 0, stretch: 0, twinkle: 0, soft: 0.1, renderOrder: 6, cull: 60,
  }],
  // ---------------- continuous helpers for vfx ----------------
  castCharge: [{
    sprite: SPRITE.spark, blend: 'add', rate: 45, life: [0.35, 0.55], size: [0.03, 0.07], sizeEnd: 0.5, shape: 'sphere', radius: 0.55,
    dir: [0, 0, 0], spread: 0, speed: [0.9, 1.5], radial: -1, gravity: 0, drag: 0.05, turb: 0.05, turbFreq: 4,
    colorA: C(0xffffff), colorB: C(0xc8a0ff), intensity: 3, alpha: 1, fadeIn: 0.2, fadeOut: 0.3, spin: 3, stretch: 0.03, twinkle: 0.4, soft: 0.05, renderOrder: 6, cull: 80,
  }],
  projTrail: [{
    sprite: SPRITE.glow, blend: 'add', rate: 90, life: [0.25, 0.5], size: [0.05, 0.11], sizeEnd: 0.2, shape: 'sphere', radius: 0.08,
    dir: [0, 0.2, 0], spread: 1, speed: [0.2, 0.6], gravity: 0.6, drag: 1.5, turb: 0.15, turbFreq: 3,
    colorA: C(0xffd090), colorB: C(0xff4a10), intensity: 3, alpha: 1, fadeIn: 0.05, fadeOut: 0.6, spin: 0, stretch: 0, twinkle: 0.3, soft: 0.05, renderOrder: 6,
  }],
  stunStars: [{
    sprite: SPRITE.spark, blend: 'add', rate: 10, life: [0.5, 0.8], size: [0.05, 0.08], sizeEnd: 0.4, shape: 'ring', radius: 0.28,
    dir: [0, 1, 0], spread: 0.1, speed: [0.1, 0.25], gravity: 0, drag: 1, turb: 0.06, turbFreq: 3,
    colorA: C(0xfff6b0), colorB: C(0xffc040), intensity: 3, alpha: 1, fadeIn: 0.1, fadeOut: 0.4, spin: 4, stretch: 0, twinkle: 0.5, soft: 0.05, renderOrder: 6, cull: 60,
  }],
  interactMotes: [{
    sprite: SPRITE.spark, blend: 'add', rate: 5, life: [1.0, 1.6], size: [0.03, 0.06], sizeEnd: 0.4, shape: 'disc', radius: 0.5,
    dir: [0, 1, 0], spread: 0.2, speed: [0.3, 0.6], gravity: 0.1, drag: 1, turb: 0.2, turbFreq: 1.5,
    colorA: C(0xffe9a8), colorB: C(0xffb040), intensity: 2.5, alpha: 1, fadeIn: 0.15, fadeOut: 0.5, spin: 2, stretch: 0, twinkle: 0.8, soft: 0.05, renderOrder: 6, cull: 60,
  }],
  soulWisps: [{
    sprite: SPRITE.glow, blend: 'add', rate: 0, count: 22, life: [1.2, 2.2], size: [0.04, 0.08], sizeEnd: 0.4, shape: 'box', radius: 0.35, height: [0.1, 1.4],
    dir: [0, 1, 0], spread: 0.35, speed: [0.5, 1.2], gravity: 0.35, drag: 0.8, turb: 0.5, turbFreq: 1.5,
    colorA: C(0xd6fff2), colorB: C(0x3fb8a0), intensity: 3, alpha: 1, fadeIn: 0.15, fadeOut: 0.5, spin: 0, stretch: 0, twinkle: 0.7, soft: 0.1, renderOrder: 6,
  }],
  auraEmbers: [{
    sprite: SPRITE.glow, blend: 'add', rate: 22, life: [0.7, 1.3], size: [0.03, 0.06], sizeEnd: 0.4, shape: 'disc', radius: 0.55, offset: [0, 0.2, 0],
    dir: [0, 1, 0], spread: 0.3, speed: [0.8, 1.6], gravity: 0.6, drag: 1, turb: 0.3, turbFreq: 3,
    colorA: C(0xffb080), colorB: C(0xff2a10), intensity: 3, alpha: 1, fadeIn: 0.05, fadeOut: 0.5, spin: 0, stretch: 0.02, twinkle: 0.5, soft: 0.05, renderOrder: 6, cull: 80,
  }],
  blessMotes: [{
    sprite: SPRITE.spark, blend: 'add', rate: 4, life: [0.9, 1.5], size: [0.03, 0.05], sizeEnd: 0.4, shape: 'disc', radius: 0.45, offset: [0, 0.3, 0],
    dir: [0, 1, 0], spread: 0.2, speed: [0.3, 0.6], gravity: 0.1, drag: 1, turb: 0.15, turbFreq: 2,
    colorA: C(0xfff6d0), colorB: C(0xffd070), intensity: 2.5, alpha: 1, fadeIn: 0.15, fadeOut: 0.5, spin: 2, stretch: 0, twinkle: 0.9, soft: 0.05, renderOrder: 6, cull: 80,
  }],
};

// ---------------------------------------------------------------- shaders
const VERT = /* glsl */ `
attribute vec4 aSpawn; attribute vec4 aVel; attribute vec4 aRand; attribute vec4 aExtra;
uniform float uTime; uniform float uGravity; uniform vec3 uWind; uniform float uDrag; uniform float uTurb; uniform float uTurbFreq;
uniform float uSizeEnd; uniform vec3 uColorA; uniform vec3 uColorB; uniform float uIntensity; uniform float uAlpha; uniform vec2 uFade;
uniform float uSpin; uniform float uStretch; uniform float uTwinkle; uniform float uTumble; uniform vec4 uCell; uniform float uCols;
varying vec2 vUv; varying vec4 vColor; varying float vViewZ;
#include <fog_pars_vertex>
void main() {
  float age = uTime - aSpawn.w; float life = aVel.w; float t = age / life;
  if (t < 0.0 || t > 1.0 || life <= 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vColor = vec4(0.0); vUv = vec2(0.0); vViewZ = 1.0; vFogDepth = 0.0; return; }
  // exact solution of dv/dt = g - k (v - wind):  v = wind + g/k + (v0 - wind - g/k) e^{-kt}
  float k = max(uDrag, 0.05); vec3 g = vec3(0.0, uGravity, 0.0);
  vec3 vinf = uWind + g / k; vec3 dv = aVel.xyz - vinf; float e = exp(-k * age);
  vec3 p = aSpawn.xyz + vinf * age + dv * (1.0 - e) / k;
  vec3 vel = vinf + dv * e;
  // turbulence: layered sines with per-particle phase, ramps in over the first part of life
  vec3 ph = aRand.xyz * 6.2831853; float f = uTurbFreq * (0.8 + 0.5 * aRand.w);
  vec3 turb = vec3(sin(age * f + ph.x) + 0.5 * sin(age * f * 2.3 + ph.y), 0.6 * sin(age * f * 1.7 + ph.z), cos(age * f * 0.9 + ph.y) + 0.5 * cos(age * f * 2.1 + ph.x));
  p += turb * uTurb * smoothstep(0.0, 0.25, t) * (0.5 + 0.5 * t);
  // size / alpha / colour curves
  float sz = aExtra.x * mix(1.0, uSizeEnd, t) * smoothstep(0.0, 0.06, t);
  float a = uAlpha * smoothstep(0.0, max(uFade.x, 1e-3), t) * (1.0 - smoothstep(1.0 - uFade.y, 1.0, t));
  if (uTwinkle > 0.0) { float tw = 0.5 + 0.5 * sin(age * (2.5 + 3.0 * aRand.x) + ph.z); tw = tw * tw * tw; a *= mix(1.0, tw, uTwinkle); }
  vec3 col = mix(uColorA, uColorB, smoothstep(0.05, 0.9, t)) * uIntensity * (0.85 + 0.3 * aRand.y);
  vColor = vec4(col, a);
  // billboard in view space
  vec4 mv = viewMatrix * vec4(p, 1.0);
  vec2 q = position.xy;
  q.x *= mix(1.0, abs(cos(age * 2.4 + ph.x)), uTumble);
  float rot = aExtra.y + uSpin * age * sign(aRand.z - 0.5);
  float cr = cos(rot), sr = sin(rot); q = vec2(q.x * cr - q.y * sr, q.x * sr + q.y * cr) * sz;
  if (uStretch > 0.0) {
    vec3 vv = (viewMatrix * vec4(vel, 0.0)).xyz; float vl = length(vv.xy);
    if (vl > 0.05) { vec2 ax = vv.xy / vl; vec2 pp = vec2(-ax.y, ax.x); q = pp * (position.x * sz) + ax * (position.y * (sz + vl * uStretch)); }
  }
  mv.xy += q;
  vViewZ = -mv.z;
  vFogDepth = vViewZ;
  float variant = floor(aExtra.z);
  vUv = uCell.xy + vec2(variant / uCols, 0.0) + uv * uCell.zw;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform sampler2D uMap; uniform float uSoft;
varying vec2 vUv; varying vec4 vColor; varying float vViewZ;
#include <fog_pars_fragment>
${SOFT_GLSL}
void main() {
  vec4 tex = texture2D(uMap, vUv);
  float a = tex.a * vColor.a;
  a *= softFade(vViewZ, uSoft);
  a *= smoothstep(0.12, 0.7, vViewZ);
  if (a <= 0.003) discard;
  vec3 col = tex.rgb * vColor.rgb;
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
  #else
    float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
  #endif
  #ifdef BLEND_ADD
    gl_FragColor = vec4(col * (1.0 - fogFactor), a);
  #else
    gl_FragColor = vec4(mix(col, fogColor, fogFactor), a);
  #endif
}`;

// ---------------------------------------------------------------- layer
const quadGeo = (() => { const g = new THREE.PlaneGeometry(1, 1); return g; })();
let seq = 0;

class Layer {
  mesh: THREE.Mesh; geo: THREE.InstancedBufferGeometry; mat: THREE.ShaderMaterial;
  spawnA: THREE.InstancedBufferAttribute; velA: THREE.InstancedBufferAttribute; randA: THREE.InstancedBufferAttribute; extraA: THREE.InstancedBufferAttribute;
  cap: number; head = 0; acc = 0; lastSpawn = -1e9; alive = 0;
  dirtyMin = Infinity; dirtyMax = -Infinity;
  constructor(public p: LayerParams, public em: Emitter, cap: number) {
    this.cap = cap = Math.max(1, cap | 0);
    const geo = this.geo = new THREE.InstancedBufferGeometry(); geo.index = quadGeo.index; geo.attributes.position = quadGeo.attributes.position; geo.attributes.uv = quadGeo.attributes.uv;
    geo.instanceCount = cap;
    const mk = () => { const a = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4); a.setUsage(THREE.DynamicDrawUsage); return a; };
    this.spawnA = mk(); this.velA = mk(); this.randA = mk(); this.extraA = mk();
    geo.setAttribute('aSpawn', this.spawnA); geo.setAttribute('aVel', this.velA); geo.setAttribute('aRand', this.randA); geo.setAttribute('aExtra', this.extraA);
    const [u0, v0, u1, v1] = cellUV(p.sprite);
    const cA = new THREE.Color(em.colorOverride ?? p.colorA), cB = new THREE.Color(em.color2Override ?? (em.colorOverride ?? p.colorB));
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, depthTest: true, fog: true,
      blending: p.blend === 'add' ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide,
      defines: p.blend === 'add' ? { BLEND_ADD: '1' } : {},
      uniforms: {
        ...softUniforms(), uMap: { value: getAtlas() }, uSoft: { value: p.soft }, uTime: { value: 0 },
        uGravity: { value: p.gravity }, uWind: { value: new THREE.Vector3(...(p.wind ?? [0, 0, 0])) }, uDrag: { value: p.drag }, uTurb: { value: p.turb * em.scale }, uTurbFreq: { value: p.turbFreq },
        uSizeEnd: { value: p.sizeEnd }, uColorA: { value: cA }, uColorB: { value: cB }, uIntensity: { value: p.intensity * em.intensity }, uAlpha: { value: p.alpha * Math.min(1, em.intensity) },
        uFade: { value: new THREE.Vector2(p.fadeIn, p.fadeOut) }, uSpin: { value: p.spin }, uStretch: { value: p.stretch }, uTwinkle: { value: p.twinkle }, uTumble: { value: p.tumble ?? 0 },
        uCell: { value: new THREE.Vector4(u0, v0, u1 - u0, v1 - v0) }, uCols: { value: ATLAS_COLS },
        fogColor: { value: new THREE.Color() }, fogDensity: { value: 0.001 }, fogNear: { value: 1 }, fogFar: { value: 1000 },
      },
    });
    const mesh = this.mesh = new THREE.Mesh(geo, this.mat); mesh.frustumCulled = false; mesh.layers.set(FX_LAYER); mesh.renderOrder = p.renderOrder ?? 3; mesh.name = 'particles:' + (seq++);
    mesh.castShadow = false; mesh.receiveShadow = false; mesh.matrixAutoUpdate = true;
    // start with everything dead
    for (let i = 0; i < cap; i++) this.velA.array[i * 4 + 3] = 0;
  }
  spawnOne(time: number) {
    const p = this.p, em = this.em, i = this.head; this.head = (this.head + 1) % this.cap;
    const s = em.scale; const o = em.position;
    const ox = (p.offset?.[0] ?? 0) * s, oy = (p.offset?.[1] ?? 0) * s, oz = (p.offset?.[2] ?? 0) * s;
    let x = o.x + ox, y = o.y + oy, z = o.z + oz; const r = p.radius * s;
    let nx = 0, ny = 1, nz = 0; // radial direction (for ring/sphere shapes)
    switch (p.shape) {
      case 'disc': { const a = Math.random() * 6.2832, d = Math.sqrt(Math.random()) * r; x += Math.cos(a) * d; z += Math.sin(a) * d; nx = Math.cos(a); ny = 0; nz = Math.sin(a); break; }
      case 'ring': { const a = Math.random() * 6.2832; x += Math.cos(a) * r; z += Math.sin(a) * r; nx = Math.cos(a); ny = 0; nz = Math.sin(a); break; }
      case 'sphere': case 'hemisphere': { const u = Math.random() * 2 - 1, a = Math.random() * 6.2832, q = Math.sqrt(1 - u * u); nx = q * Math.cos(a); ny = p.shape === 'hemisphere' ? Math.abs(u) : u; nz = q * Math.sin(a); const d = Math.cbrt(Math.random()) * r; x += nx * d; y += ny * d; z += nz * d; break; }
      case 'box': { x += (Math.random() * 2 - 1) * r; z += (Math.random() * 2 - 1) * r; break; }
    }
    if (p.height) { const h0 = p.height[0] * s, h1 = p.height[1] * s; y = (p.groundRelative ? terrainHeight(x, z) : (p.waterOnly ? LAKE.level : o.y)) + h0 + Math.random() * (h1 - h0); }
    if (p.waterOnly && terrainHeight(x, z) > LAKE.level + 0.9) return false;
    if (p.groundRelative && terrainHeight(x, z) < LAKE.level - 0.2 && p.sprite === SPRITE.leaf) return false;
    // velocity: base dir blended toward a random direction by `spread`, plus radial component
    const dir = em.dirOverride ?? p.dir; let dx = dir[0], dy = dir[1], dz = dir[2]; const dl = Math.hypot(dx, dy, dz) || 1; dx /= dl; dy /= dl; dz /= dl;
    const u = Math.random() * 2 - 1, a = Math.random() * 6.2832, q = Math.sqrt(1 - u * u); const rx = q * Math.cos(a), ry = u, rz = q * Math.sin(a);
    let vx = dx + (rx - dx) * p.spread, vy = dy + (ry - dy) * p.spread, vz = dz + (rz - dz) * p.spread;
    if (p.radial) { vx += nx * p.radial; vy += ny * p.radial * 0.2; vz += nz * p.radial; }
    const vl = Math.hypot(vx, vy, vz) || 1; const speed = (p.speed[0] + Math.random() * (p.speed[1] - p.speed[0])) * s;
    vx = (vx / vl) * speed; vy = (vy / vl) * speed; vz = (vz / vl) * speed;
    const life = (p.life[0] + Math.random() * (p.life[1] - p.life[0])) * em.lifeMul;
    const size = (p.size[0] + Math.random() * (p.size[1] - p.size[0])) * s;
    const i4 = i * 4;
    const sp = this.spawnA.array as Float32Array, ve = this.velA.array as Float32Array, ra = this.randA.array as Float32Array, ex = this.extraA.array as Float32Array;
    sp[i4] = x; sp[i4 + 1] = y; sp[i4 + 2] = z; sp[i4 + 3] = time;
    ve[i4] = vx; ve[i4 + 1] = vy; ve[i4 + 2] = vz; ve[i4 + 3] = life;
    ra[i4] = Math.random(); ra[i4 + 1] = Math.random(); ra[i4 + 2] = Math.random(); ra[i4 + 3] = Math.random();
    ex[i4] = size; ex[i4 + 1] = Math.random() * 6.2832; ex[i4 + 2] = p.variants ? Math.floor(Math.random() * p.variants) : 0; ex[i4 + 3] = 0;
    if (i < this.dirtyMin) this.dirtyMin = i; if (i > this.dirtyMax) this.dirtyMax = i;
    this.lastSpawn = time; return true;
  }
  spawn(n: number, time: number) { for (let k = 0; k < n; k++) this.spawnOne(time); }
  update(dt: number, time: number, canSpawn: boolean, rateMul: number) {
    const p = this.p;
    if (p.rate > 0 && canSpawn && this.em.enabled) {
      this.acc += p.rate * rateMul * dt;
      const n = Math.min(this.cap, Math.floor(this.acc)); this.acc -= n;
      for (let k = 0; k < n; k++) this.spawnOne(time - Math.random() * dt);
    } else this.acc = 0;
    this.mat.uniforms.uTime.value = time;
    if (this.dirtyMax >= this.dirtyMin) {
      // upload only the touched slice (ring wrap → whole buffer, still cheap for our sizes)
      const wrapped = this.dirtyMax - this.dirtyMin > this.cap * 0.75; const start = wrapped ? 0 : this.dirtyMin * 4, count = wrapped ? this.cap * 4 : (this.dirtyMax - this.dirtyMin + 1) * 4;
      for (const a of [this.spawnA, this.velA, this.randA, this.extraA]) { a.clearUpdateRanges(); a.addUpdateRange(start, count); a.needsUpdate = true; }
      this.dirtyMin = Infinity; this.dirtyMax = -Infinity;
    }
    const maxLife = p.life[1] * this.em.lifeMul;
    this.mesh.visible = time - this.lastSpawn < maxLife + 0.1;
    this.mesh.position.copy(this.em.position);
  }
  dispose() { this.geo.dispose(); this.mat.dispose(); this.mesh.parent?.remove(this.mesh); }
}

// ---------------------------------------------------------------- emitter
export class Emitter {
  position = new THREE.Vector3();
  layers: Layer[] = [];
  enabled = true;
  intensity: number; scale: number; lifeMul: number; rateMul: number; countMul: number;
  colorOverride: THREE.ColorRepresentation | null; color2Override: THREE.ColorRepresentation | null;
  dirOverride: [number, number, number] | null;
  follow: THREE.Vector3 | null;
  oneShot: boolean; born: number; done = false;
  maxLife = 0;
  constructor(public kind: EmitterKind, pos: Vec3, opts: EmitterOpts, public q: number, time: number) {
    this.position.set(pos.x, pos.y, pos.z);
    this.intensity = opts.intensity ?? 1; this.scale = opts.scale ?? 1; this.lifeMul = opts.life ?? 1; this.rateMul = opts.rate ?? 1; this.countMul = opts.count ?? 1;
    this.colorOverride = opts.color ?? null; this.color2Override = opts.color2 ?? null;
    this.dirOverride = opts.dir ? [opts.dir.x, opts.dir.y, opts.dir.z] : null; this.follow = opts.follow ?? null;
    const recipe = KINDS[kind]; this.oneShot = recipe.every((l) => l.rate === 0); this.born = time;
    for (const lp of recipe) {
      const life = lp.life[1] * this.lifeMul; this.maxLife = Math.max(this.maxLife, life);
      const cap = lp.rate > 0 ? Math.ceil(lp.rate * this.rateMul * q * life * 1.15) + 4 : Math.max(1, Math.round((lp.count ?? 1) * this.countMul * Math.max(0.4, q)));
      const layer = new Layer(lp, this, cap); this.layers.push(layer);
      if (lp.rate === 0) layer.spawn(cap, time);
    }
  }
  setPosition(x: number | Vec3, y = 0, z = 0) { if (typeof x === 'number') this.position.set(x, y, z); else this.position.set(x.x, x.y, x.z); return this; }
  setIntensity(i: number) { this.intensity = i; for (const l of this.layers) { l.mat.uniforms.uIntensity.value = l.p.intensity * i; l.mat.uniforms.uAlpha.value = l.p.alpha * Math.min(1, i); } return this; }
  /** Fire `n` extra particles from every layer right now (e.g. a campfire flare). */
  burst(n: number, time: number) { for (const l of this.layers) l.spawn(n, time); }
  get meshes() { return this.layers.map((l) => l.mesh); }
}

// ---------------------------------------------------------------- system
export class Particles {
  group = new THREE.Group();
  emitters = new Set<Emitter>();
  time = 0;
  q: number;
  constructor(public scene: THREE.Scene, public quality: QualitySettings) {
    this.q = Math.max(0.2, quality.particles); this.group.name = 'particles'; scene.add(this.group);
  }
  addEmitter(kind: EmitterKind, pos: Vec3, opts: EmitterOpts = {}): Emitter {
    const e = new Emitter(kind, pos, opts, this.q, this.time);
    for (const l of e.layers) { this.group.add(l.mesh); l.mesh.position.copy(e.position); }
    this.emitters.add(e); return e;
  }
  remove(e: Emitter) { if (!this.emitters.has(e)) return; for (const l of e.layers) l.dispose(); this.emitters.delete(e); e.done = true; }
  update(dt: number, camPos: THREE.Vector3, time?: number) {
    this.time = time ?? this.time + dt; const t = this.time;
    for (const e of this.emitters) {
      if (e.follow) e.position.copy(e.follow);
      if (e.oneShot) {
        for (const l of e.layers) l.update(dt, t, false, 0);
        if (t - e.born > e.maxLife + 0.2) this.remove(e);
        continue;
      }
      const d = e.position.distanceTo(camPos);
      for (const l of e.layers) l.update(dt, t, d < (l.p.cull ?? 1e9), e.rateMul * this.q);
    }
  }
  dispose() { for (const e of [...this.emitters]) this.remove(e); this.group.parent?.remove(this.group); }
}
