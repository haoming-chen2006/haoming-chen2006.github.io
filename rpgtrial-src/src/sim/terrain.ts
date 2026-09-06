// Deterministic terrain heightfield shared by sim (collision) and render (mesh). No three.js.
import { LAKE, MAP_HALF, CRYPT_ORIGIN } from '../content/level.ts';
import { smoothstep, clamp } from '../core/math.ts';

// --- value noise with smooth interpolation, hashed on the lattice ---
const hashf = (x: number, y: number) => {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + 0x2545f491;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
export function noise2(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = fade(xf), v = fade(yf);
  const a = hashf(xi, yi), b = hashf(xi + 1, yi), c = hashf(xi, yi + 1), d = hashf(xi + 1, yi + 1);
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}
export function fbm(x: number, y: number, octaves = 5, lac = 2.0, gain = 0.5): number {
  let s = 0, a = 1, f = 1, n = 0;
  for (let i = 0; i < octaves; i++) { s += a * (noise2(x * f, y * f) * 2 - 1); n += a; a *= gain; f *= lac; }
  return s / n;
}

/** Distance to the nearest point on a polyline path, used to flatten paths and carve the road. */
export interface PathSeg { x0: number; z0: number; x1: number; z1: number }
export function distToPath(x: number, z: number, path: PathSeg[]): number {
  let best = Infinity;
  for (const s of path) {
    const dx = s.x1 - s.x0, dz = s.z1 - s.z0; const l2 = dx * dx + dz * dz || 1;
    let t = ((x - s.x0) * dx + (z - s.z0) * dz) / l2; t = clamp(t, 0, 1);
    const px = s.x0 + dx * t, pz = s.z0 + dz * t;
    const d = Math.hypot(x - px, z - pz);
    if (d < best) best = d;
  }
  return best;
}

/** Main path from the shore to the crypt gate, as a polyline. Terrain is flattened along it. */
export const MAIN_PATH: PathSeg[] = [
  { x0: 0, z0: 22, x1: 10, z1: 26 }, { x0: 10, z0: 26, x1: 28, z1: 30 },   // shore → camp
  { x0: 28, z0: 30, x1: 40, z1: 22 }, { x0: 40, z0: 22, x1: 50, z1: 10 },  // camp → forest path
  { x0: 50, z0: 10, x1: 60, z1: -5 },                                      // → chapel
  { x0: 60, z0: -5, x1: 68, z1: -18 }, { x0: 68, z0: -18, x1: 75, z1: -30 }, // chapel → crypt gate
];

/**
 * Terrain height in metres. Lake basin dips below LAKE.level; the shore is sandy and flat;
 * hills rise toward the map edge; paths and landmark plazas are flattened.
 */
export function terrainHeight(x: number, z: number): number {
  // Crypt interior is a flat separate area far away.
  if (Math.abs(z - CRYPT_ORIGIN.z) < 120 && Math.abs(x - CRYPT_ORIGIN.x) < 120) return CRYPT_ORIGIN.y;
  const dLake = Math.hypot(x - LAKE.x, z - LAKE.z);
  const lakeT = smoothstep(LAKE.r - 6, LAKE.r + 14, dLake); // 0 inside lake, 1 on land
  // rolling hills + ridge toward edges
  const h1 = fbm(x * 0.012 + 3.1, z * 0.012 + 7.7, 5) * 6.0;
  const h2 = fbm(x * 0.05, z * 0.05, 3) * 0.9;
  const edge = smoothstep(MAP_HALF * 0.55, MAP_HALF, Math.max(Math.abs(x), Math.abs(z)));
  let land = 1.2 + h1 + h2 + edge * 24 + Math.max(0, h1) * edge * 2;
  // gentle rise to the north-east where the chapel and crypt gate sit
  land += smoothstep(20, 90, x - z * 0.5) * 3.0;
  const lakeBed = LAKE.level - 4.5 - smoothstep(LAKE.r - 6, 0, dLake) * 4;
  let h = lakeBed + (land - lakeBed) * lakeT;
  // shore: keep beach nearly flat just above the water
  const shoreBand = smoothstep(LAKE.r - 2, LAKE.r + 10, dLake) * (1 - smoothstep(LAKE.r + 10, LAKE.r + 22, dLake));
  h = h * (1 - shoreBand * 0.7) + (LAKE.level + 0.9 + h2 * 0.2) * shoreBand * 0.7;
  // flatten along main path and plazas
  const dp = distToPath(x, z, MAIN_PATH);
  const pathW = 3.5;
  if (dp < pathW + 6) {
    // sample path centreline height by smoothing (approx: average of low-frequency part)
    const base = 1.2 + fbm(x * 0.012 + 3.1, z * 0.012 + 7.7, 2) * 6.0 + smoothstep(20, 90, x - z * 0.5) * 3.0 + edge * 24;
    const pathH = base * lakeT + lakeBed * (1 - lakeT);
    const t = 1 - smoothstep(pathW, pathW + 6, dp);
    h = h * (1 - t) + Math.min(h, pathH) * t + t * 0; 
  }
  for (const p of PLAZAS) {
    const d = Math.hypot(x - p.x, z - p.z);
    if (d < p.r + 8) { const t = 1 - smoothstep(p.r, p.r + 8, d); h = h * (1 - t) + p.y * t; }
  }
  return h;
}
/** Flat circular areas for landmarks: campfire, chapel courtyard, gate. */
export const PLAZAS = [
  { x: 28, z: 30, r: 9, y: 2.4 },    // camp
  { x: 60, z: -5, r: 16, y: 5.2 },   // chapel ruin courtyard
  { x: 75, z: -30, r: 7, y: 7.0 },   // crypt gate
  { x: 0, z: 22, r: 7, y: 1.05 },    // wake-up beach
];
export function terrainNormal(x: number, z: number, eps = 0.35): { x: number; y: number; z: number } {
  const hl = terrainHeight(x - eps, z), hr = terrainHeight(x + eps, z), hd = terrainHeight(x, z - eps), hu = terrainHeight(x, z + eps);
  const nx = hl - hr, nz = hd - hu, ny = 2 * eps;
  const l = Math.hypot(nx, ny, nz); return { x: nx / l, y: ny / l, z: nz / l };
}
/** Texture blend weights for the splat shader (also used for footstep surface). */
export function surfaceAt(x: number, z: number): 'grass' | 'dirt' | 'stone' | 'water' | 'wood' {
  const h = terrainHeight(x, z);
  if (h < LAKE.level + 0.05) return 'water';
  if (distToPath(x, z, MAIN_PATH) < 2.6) return 'dirt';
  const n = terrainNormal(x, z); if (n.y < 0.8) return 'stone';
  const dLake = Math.hypot(x - LAKE.x, z - LAKE.z); if (dLake < LAKE.r + 9) return 'dirt';
  return 'grass';
}
