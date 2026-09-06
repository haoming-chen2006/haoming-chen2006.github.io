// Deterministic vegetation / rock scatter for the Hollowmere outdoors. Pure data: no three.js, no DOM.
// Everything is derived from hash2() on a jittered grid so sim (colliders) and render (instances) agree exactly.
import { hash2 } from '../sim/rng.ts';
import { terrainHeight, terrainNormal, distToPath, MAIN_PATH, PLAZAS, fbm } from '../sim/terrain.ts';
import { LAKE, MAP_HALF, LANDMARKS, CRYPT_ORIGIN } from './level.ts';
import type { AnyCollider } from '../sim/types.ts';
import { smoothstep, clamp } from '../core/math.ts';

export type TreeKind = 'pine' | 'fir' | 'birch' | 'oak' | 'smallTree' | 'pineSapling' | 'firSapling';
export type RockKind = 'mossRocks1' | 'mossRocks2' | 'boulder' | 'rock7' | 'rock9' | 'stone' | 'coastRocks1' | 'coastRocks3';
export type FoliageKind = 'fern' | 'grassTuft1' | 'grassTuft2' | 'shrub1' | 'shrub2' | 'shrub3' | 'shrub4' | 'moss' | 'deadTrunk' | 'stump1' | 'stump2' | 'roots' | 'branches';
export type ScatterKind = TreeKind | RockKind | FoliageKind;

export interface Placement {
  kind: ScatterKind;
  x: number; y: number; z: number;
  yaw: number;
  scale: number;
  /** lean/tilt in radians (trees: tiny lean, rocks: follow the ground) */
  tilt: number; tiltDir: number;
  /** 0..1 per-instance variation seed (colour / wind phase) */
  v: number;
  /** collision radius in metres (0 = none) */
  r: number;
}

// --------------------------------------------------------------------------------------------- zoning
const dLake = (x: number, z: number) => Math.hypot(x - LAKE.x, z - LAKE.z);
let landmarkCache: { x: number; z: number; r: number }[] | null = null;
/** Lazy: LANDMARKS lives in level.ts, which is mid-evaluation when this module initialises (import cycle). */
function landmarkPoints() {
  if (landmarkCache) return landmarkCache;
  const pts: { x: number; z: number; r: number }[] = [];
  for (const [k, v] of Object.entries(LANDMARKS)) {
    if (k.startsWith('crypt')) continue;
    if (Array.isArray(v)) for (const p of v) pts.push({ x: p.x, z: p.z, r: 3 });
    else pts.push({ x: (v as any).x, z: (v as any).z, r: k === 'camp' || k === 'chapel' ? 0 : 3.5 });
  }
  return (landmarkCache = pts);
}
/** Camp clearing: a meadow, few trees. */
const CAMP = { x: 28, z: 30 }; // = LANDMARKS.camp (see landmarkPoints for why this is not read at init)

function inCrypt(x: number, z: number) { return Math.abs(z - CRYPT_ORIGIN.z) < 130 && Math.abs(x - CRYPT_ORIGIN.x) < 130; }
function nearLandmark(x: number, z: number, margin: number) {
  for (const p of landmarkPoints()) if (p.r > 0 && Math.hypot(x - p.x, z - p.z) < p.r + margin) return true;
  return false;
}
function nearPlaza(x: number, z: number, margin: number) {
  for (const p of PLAZAS) if (Math.hypot(x - p.x, z - p.z) < p.r + margin) return true;
  return false;
}
/** Generic keep-out for anything with volume (trees, rocks, shrubs). */
function blocked(x: number, z: number, pathMargin: number, plazaMargin: number, minHeight: number) {
  if (Math.abs(x) > MAP_HALF - 3 || Math.abs(z) > MAP_HALF - 3) return true;
  if (inCrypt(x, z)) return true;
  if (distToPath(x, z, MAIN_PATH) < 3.5 + pathMargin) return true;
  if (nearPlaza(x, z, plazaMargin)) return true;
  if (nearLandmark(x, z, 1.0)) return true;
  if (terrainHeight(x, z) < LAKE.level + minHeight) return true;
  return false;
}
/** Forest density 0..1: clumpy noise, thin near the lake shore and the camp meadow, thick along the forest path. */
export function forestDensity(x: number, z: number): number {
  const n = fbm(x * 0.035 + 11.3, z * 0.035 - 4.1, 3) * 0.5 + 0.5;         // 0..1 clumps
  let d = 0.35 + 0.75 * n;
  d *= smoothstep(LAKE.r + 6, LAKE.r + 24, dLake(x, z));                     // beach → forest
  d *= 1 - 0.85 * (1 - smoothstep(14, 24, Math.hypot(x - CAMP.x, z - CAMP.z))); // camp meadow
  const dp = distToPath(x, z, MAIN_PATH);
  d *= 0.75 + 0.35 * (1 - smoothstep(6, 18, dp));                            // hug the path
  const edge = smoothstep(MAP_HALF * 0.6, MAP_HALF * 0.95, Math.max(Math.abs(x), Math.abs(z)));
  d *= 1 - 0.35 * edge;
  return clamp(d, 0, 1);
}

// --------------------------------------------------------------------------------------------- trees
export function scatterTrees(): Placement[] {
  const out: Placement[] = [];
  const cell = 4.2, n = Math.ceil((MAP_HALF * 2) / cell);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const s0 = hash2(i, j, 1), s1 = hash2(i, j, 2), s2 = hash2(i, j, 3), s3 = hash2(i, j, 4), s4 = hash2(i, j, 5);
    const x = -MAP_HALF + (i + 0.1 + s0 * 0.8) * cell, z = -MAP_HALF + (j + 0.1 + s1 * 0.8) * cell;
    const dens = forestDensity(x, z);
    if (s2 > dens * 0.78) continue;
    if (blocked(x, z, 1.6, 1.5, 0.35)) continue;
    const y = terrainHeight(x, z);
    const nrm = terrainNormal(x, z, 1.0);
    if (nrm.y < 0.55) continue;                                            // cliffs: no big trees
    const shore = 1 - smoothstep(LAKE.r + 8, LAKE.r + 30, dLake(x, z));   // 1 near the water
    const high = smoothstep(4, 16, y);
    // species mix: pines/firs dominate the high forest, birch/oak like the lakeside and the camp meadow
    let kind: TreeKind;
    const pick = s3;
    const conifer = 0.35 + 0.45 * high - 0.35 * shore;
    if (pick < conifer) kind = s4 < 0.6 ? 'pine' : 'fir';
    else if (pick < conifer + 0.28) kind = s4 < 0.55 ? 'birch' : 'oak';
    else if (pick < conifer + 0.4) kind = 'smallTree';
    else kind = s4 < 0.5 ? 'pineSapling' : 'firSapling';
    const big = kind === 'pine' || kind === 'fir' || kind === 'birch' || kind === 'oak';
    if (!big && dens < 0.25) continue;
    const scale = big ? 0.85 + s4 * 0.45 : 0.8 + s4 * 0.5;
    const r = kind === 'pine' || kind === 'fir' ? 0.55 * scale : kind === 'birch' || kind === 'oak' ? 0.7 * scale : kind === 'smallTree' ? 0.4 * scale : 0;
    out.push({ kind, x, y, z, yaw: hash2(i, j, 6) * Math.PI * 2, scale, tilt: hash2(i, j, 7) * 0.05, tiltDir: hash2(i, j, 8) * Math.PI * 2, v: hash2(i, j, 9), r });
  }
  // a few big lakeside birches framing the wake-up beach (hand-tuned, still through the exclusion tests)
  const framing: [number, number, TreeKind, number][] = [[-14, 30, 'birch', 1.3], [16, 34, 'oak', 1.25], [-22, 18, 'birch', 1.1], [22, 24, 'birch', 1.15], [-6, 38, 'oak', 1.2], [12, 42, 'birch', 1.05]];
  framing.forEach(([x, z, kind, scale], k) => {
    if (blocked(x, z, 1.2, 0.5, 0.35)) return;
    out.push({ kind, x, y: terrainHeight(x, z), z, yaw: hash2(k, 77, 6) * 6.28, scale, tilt: 0.02, tiltDir: 0, v: hash2(k, 77, 9), r: 0.7 * scale });
  });
  return out;
}

// --------------------------------------------------------------------------------------------- rocks
export function scatterRocks(): Placement[] {
  const out: Placement[] = [];
  const cell = 7, n = Math.ceil((MAP_HALF * 2) / cell);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const s0 = hash2(i, j, 21), s1 = hash2(i, j, 22), s2 = hash2(i, j, 23), s3 = hash2(i, j, 24), s4 = hash2(i, j, 25);
    const x = -MAP_HALF + (i + 0.1 + s0 * 0.8) * cell, z = -MAP_HALF + (j + 0.1 + s1 * 0.8) * cell;
    if (inCrypt(x, z) || Math.abs(x) > MAP_HALF - 3 || Math.abs(z) > MAP_HALF - 3) continue;
    const y = terrainHeight(x, z);
    const dl = dLake(x, z);
    const shore = dl > LAKE.r - 4 && dl < LAKE.r + 9 && y > LAKE.level - 0.6;
    const nrm = terrainNormal(x, z, 1.0);
    const steep = nrm.y < 0.8;
    let p = 0.16 + (steep ? 0.4 : 0) + (shore ? 0.35 : 0) + smoothstep(8, 20, y) * 0.2;
    if (s2 > p) continue;
    if (!shore && blocked(x, z, 0.8, 1.0, 0.25)) continue;
    if (shore && (distToPath(x, z, MAIN_PATH) < 4.5 || nearPlaza(x, z, 1.5) || nearLandmark(x, z, 1.5))) continue;
    let kind: RockKind; let scale: number;
    if (shore) { kind = s3 < 0.5 ? 'coastRocks1' : s3 < 0.8 ? 'coastRocks3' : 'stone'; scale = 0.6 + s4 * 0.8; }
    else if (steep && s3 < 0.5) { kind = 'boulder'; scale = 0.9 + s4 * 1.2; }
    else { const r = s3; kind = r < 0.3 ? 'mossRocks1' : r < 0.55 ? 'mossRocks2' : r < 0.7 ? 'rock7' : r < 0.85 ? 'rock9' : r < 0.95 ? 'stone' : 'boulder'; scale = 0.7 + s4 * 0.9; }
    const tilt = Math.acos(clamp(nrm.y, -1, 1)) * 0.8;
    const tiltDir = Math.atan2(nrm.x, nrm.z);
    const big = kind === 'boulder' || kind === 'coastRocks1' || kind === 'coastRocks3';
    out.push({ kind, x, y: y - 0.05 * scale, z, yaw: hash2(i, j, 26) * Math.PI * 2, scale, tilt, tiltDir, v: hash2(i, j, 27), r: big ? 1.1 * scale : kind === 'mossRocks1' || kind === 'mossRocks2' ? 0.9 * scale : 0 });
  }
  // the Athletics boulder by the path is hand-placed by the content agent via PROPS; leave its spot clear
  return out.filter((p) => Math.hypot(p.x - LANDMARKS.boulder.x, p.z - LANDMARKS.boulder.z) > 4);
}

// --------------------------------------------------------------------------------------------- foliage
export function scatterFoliage(): Placement[] {
  const out: Placement[] = [];
  const cell = 2.6, n = Math.ceil((MAP_HALF * 2) / cell);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const s0 = hash2(i, j, 41), s1 = hash2(i, j, 42), s2 = hash2(i, j, 43), s3 = hash2(i, j, 44), s4 = hash2(i, j, 45);
    const x = -MAP_HALF + (i + 0.1 + s0 * 0.8) * cell, z = -MAP_HALF + (j + 0.1 + s1 * 0.8) * cell;
    if (inCrypt(x, z) || Math.abs(x) > MAP_HALF - 3 || Math.abs(z) > MAP_HALF - 3) continue;
    const y = terrainHeight(x, z);
    if (y < LAKE.level + 0.2) continue;
    const dp = distToPath(x, z, MAIN_PATH);
    if (dp < 2.9) continue;
    if (nearPlaza(x, z, 0.5) || nearLandmark(x, z, 0.6)) continue;
    const nrm = terrainNormal(x, z, 0.6);
    if (nrm.y < 0.7) continue;
    const dens = forestDensity(x, z);
    const dl = dLake(x, z);
    const beach = dl < LAKE.r + 12;
    const camp = Math.hypot(x - CAMP.x, z - CAMP.z) < 20;
    // probability by biome: ferns/shrubs in the forest, grass tufts in meadow/beach edge, moss+stumps deep forest
    const pathEdge = 1 - smoothstep(3, 7, dp);
    let kind: FoliageKind; let p: number;
    if (s3 < 0.42) { kind = 'fern'; p = 0.15 + dens * 0.55 + pathEdge * 0.2; if (beach) p *= 0.2; }
    else if (s3 < 0.62) { kind = s4 < 0.25 ? 'shrub1' : s4 < 0.5 ? 'shrub2' : s4 < 0.75 ? 'shrub3' : 'shrub4'; p = 0.12 + dens * 0.35 + pathEdge * 0.15; if (beach) p *= 0.4; }
    else if (s3 < 0.82) { kind = s4 < 0.5 ? 'grassTuft1' : 'grassTuft2'; p = 0.25 + (camp ? 0.35 : 0) + (beach ? 0.15 : 0) + (1 - dens) * 0.25; }
    else if (s3 < 0.92) { kind = 'moss'; p = dens * 0.5; if (beach) p = 0; }
    else if (s3 < 0.955) { kind = s4 < 0.5 ? 'stump1' : 'stump2'; p = dens * 0.25; if (beach) p = 0; }
    else if (s3 < 0.975) { kind = 'deadTrunk'; p = dens * 0.22; if (beach) p = 0; }
    else if (s3 < 0.99) { kind = 'roots'; p = dens * 0.2; if (beach) p = 0; }
    else { kind = 'branches'; p = 0.25 * dens + (beach ? 0.1 : 0); }
    if (s2 > p) continue;
    const solid = kind === 'stump1' || kind === 'stump2' || kind === 'deadTrunk' || kind === 'roots';
    if (solid && (dp < 4.5 || nearPlaza(x, z, 2))) continue;
    const scale = (kind === 'fern' ? 0.8 + s4 * 0.7 : kind === 'moss' ? 1.2 + s4 * 1.2 : 0.75 + s4 * 0.6);
    const tilt = solid || kind === 'moss' ? Math.acos(clamp(nrm.y, -1, 1)) * 0.9 : 0;
    const tiltDir = Math.atan2(nrm.x, nrm.z);
    out.push({ kind, x, y: y - (kind === 'moss' ? 0.02 : 0.03), z, yaw: hash2(i, j, 46) * Math.PI * 2, scale, tilt, tiltDir, v: hash2(i, j, 47), r: solid ? (kind === 'deadTrunk' ? 0.9 * scale : 0.5 * scale) : 0 });
  }
  return out;
}

// --------------------------------------------------------------------------------------------- colliders
let treeCache: Placement[] | null = null, rockCache: Placement[] | null = null, foliageCache: Placement[] | null = null;
export const trees = () => (treeCache ??= scatterTrees());
export const rocks = () => (rockCache ??= scatterRocks());
export const foliage = () => (foliageCache ??= scatterFoliage());

const toCollider = (p: Placement): AnyCollider => ({ kind: 'circle', x: p.x, z: p.z, r: p.r, tag: 'scatter:' + p.kind });
/** Circle colliders for tree trunks (r ≈ 0.5–0.9 m). */
export function treeColliders(): AnyCollider[] { return trees().filter((p) => p.r > 0).map(toCollider); }
/** Trees + big rocks + stumps/logs: everything the player should not walk through. */
export function scatterColliders(): AnyCollider[] {
  return [...trees(), ...rocks(), ...foliage()].filter((p) => p.r > 0).map(toCollider);
}

/**
 * An array that merges `fill()` into itself the first time it is read *after* the module graph is initialised.
 * Needed because content/level.ts → scatter.ts → sim/terrain.ts → content/level.ts is an import cycle: when
 * sim/terrain.ts is imported first, level.ts's body runs while terrain.ts's consts are still in their TDZ, so the
 * colliders cannot be computed eagerly at that point. Reads that happen too early (a ReferenceError from the TDZ)
 * simply retry on the next access; pushing hand-placed colliders works as usual.
 */
export function lazyColliders(fill: () => AnyCollider[]): AnyCollider[] {
  const base: AnyCollider[] = []; let done = false;
  const ensure = () => {
    if (done) return;
    try { const extra = fill(); done = true; base.push(...extra); }
    catch (e) { if (!(e instanceof ReferenceError)) throw e; }
  };
  return new Proxy(base, { get(t, k, r) { ensure(); return Reflect.get(t, k, r); }, has(t, k) { ensure(); return Reflect.has(t, k); }, ownKeys(t) { ensure(); return Reflect.ownKeys(t); } });
}
