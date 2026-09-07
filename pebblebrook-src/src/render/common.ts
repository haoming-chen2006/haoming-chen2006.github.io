import type { TileKind, Vec, World } from '../core/types.ts';

/** Shared renderer types and helpers. All "device px" values are canvas backing-store pixels. */

export const TILE = 16;

/** The current viewport transform, recomputed every frame. */
export interface View {
  /** device pixels per source pixel (zoom × dpr, integer) */
  scale: number;
  dpr: number;
  /** device-pixel origin of tile (0,0) */
  ox: number;
  oy: number;
  /** canvas size in device px */
  W: number;
  H: number;
  /** visible tile range (inclusive/exclusive) */
  x0: number; y0: number; x1: number; y1: number;
  /** seconds since the renderer started (animation clock) */
  t: number;
}

/** What the world may optionally tell us about a tile beyond kind/variant (see specs/NOTES-world.md). */
export interface TileInfo {
  kind: TileKind;
  variant: number;
  /** wall style / roof colour index 0..3 */
  style?: number;
  colour?: number;
  /** roof rows/ends as the world sees them (src/world describeTile); derived from neighbours when absent */
  roofEdge?: boolean | string;
  roofRidge?: boolean;
  edgeLeft?: boolean;
  edgeRight?: boolean;
  interior?: boolean;
  placeId?: string;
  window?: boolean;
  /** water depth 0..1 (deeper = darker) */
  depth?: number;
}

export interface WorldExt extends World {
  describeTile?(x: number, y: number): TileInfo | undefined;
}

/** Deterministic 0..1 hash of a tile position (decoration placement, variant picking). */
export function hash2(x: number, y: number, salt = 0): number {
  let h = (x * 374761393 + y * 668265263 + salt * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export const tileOf = (p: Vec): Vec => ({ x: Math.floor(p.x), y: Math.floor(p.y) });
export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/** device-px position of a tile's top-left */
export const tileToDevice = (v: View, x: number, y: number): [number, number] => [v.ox + x * TILE * v.scale, v.oy + y * TILE * v.scale];

export function describe(world: WorldExt, x: number, y: number): TileInfo {
  const d = world.describeTile?.(x, y);
  if (d) return d;
  return { kind: world.tile(x, y), variant: world.tileVariant(x, y) };
}

export function inBounds(world: World, x: number, y: number): boolean { return x >= 0 && y >= 0 && x < world.width && y < world.height; }
