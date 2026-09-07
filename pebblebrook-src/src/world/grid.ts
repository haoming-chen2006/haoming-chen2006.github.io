import type { TileKind, Vec } from '../core/types.ts';

/** Tile kinds indexed for compact storage. Order is stable; never reorder (saves do not store it, but ids do). */
export const KINDS: TileKind[] = [
  'grass', 'dirt', 'path', 'water', 'deepwater', 'sand', 'stone', 'floor', 'wall', 'roof', 'door', 'bridge',
  'farmland', 'flower', 'tree', 'rock', 'bush', 'fence', 'prop', 'void',
];
export const KIND_INDEX: Record<TileKind, number> = Object.fromEntries(KINDS.map((k, i) => [k, i])) as Record<TileKind, number>;

const WALKABLE_KINDS: TileKind[] = ['grass', 'dirt', 'path', 'sand', 'stone', 'floor', 'door', 'bridge', 'farmland', 'flower'];
export const KIND_WALKABLE: Uint8Array = new Uint8Array(KINDS.map((k) => (WALKABLE_KINDS.includes(k) ? 1 : 0)));

/**
 * Movement cost per tile for A*. Roads are cheapest so villagers prefer them; the heuristic uses the
 * minimum (ROAD_COST) so it stays admissible.
 */
export const ROAD_COST = 2;
const COST_BY_KIND: Partial<Record<TileKind, number>> = {
  path: 2, stone: 2, bridge: 2, door: 2, floor: 2, dirt: 2, grass: 3, sand: 3, farmland: 4, flower: 4,
};
export const KIND_COST: Uint8Array = new Uint8Array(KINDS.map((k) => COST_BY_KIND[k] ?? 3));

export const G = KIND_INDEX;

/** The map. Flat typed arrays; (x, y) → y * width + x. */
export class Grid {
  readonly width: number;
  readonly height: number;
  readonly kind: Uint8Array;
  readonly variant: Uint8Array;
  /** 1 = walkable for everyone (after objects are placed) */
  readonly walk: Uint8Array;
  /** movement cost, 0 when blocked */
  readonly cost: Uint8Array;
  /** index into the places array, -1 = none; buildings overwrite areas so lookups find the most specific */
  readonly placeIdx: Int16Array;
  /** 1 = a building's interior anchor tile (walkable only for the villager who is "inside") */
  readonly interior: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width; this.height = height;
    const n = width * height;
    this.kind = new Uint8Array(n);
    this.variant = new Uint8Array(n);
    this.walk = new Uint8Array(n);
    this.cost = new Uint8Array(n);
    this.placeIdx = new Int16Array(n).fill(-1);
    this.interior = new Uint8Array(n);
  }

  idx(x: number, y: number): number { return y * this.width + x; }
  inBounds(x: number, y: number): boolean { return x >= 0 && y >= 0 && x < this.width && y < this.height; }
  get(x: number, y: number): TileKind { return this.inBounds(x, y) ? KINDS[this.kind[this.idx(x, y)]] : 'void'; }
  is(x: number, y: number, kind: TileKind): boolean { return this.inBounds(x, y) && this.kind[this.idx(x, y)] === KIND_INDEX[kind]; }
  set(x: number, y: number, kind: TileKind, variant = 0): void {
    if (!this.inBounds(x, y)) return;
    const i = this.idx(x, y);
    this.kind[i] = KIND_INDEX[kind];
    this.variant[i] = variant;
  }
  setVariant(x: number, y: number, variant: number): void { if (this.inBounds(x, y)) this.variant[this.idx(x, y)] = variant; }
  getVariant(x: number, y: number): number { return this.inBounds(x, y) ? this.variant[this.idx(x, y)] : 0; }
  fill(x0: number, y0: number, x1: number, y1: number, kind: TileKind, variant: (x: number, y: number) => number = () => 0): void {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, kind, variant(x, y));
  }
  /** rebuild the walkable + cost masks from tile kinds; callers then punch holes for blocking objects */
  recomputeWalk(): void {
    for (let i = 0; i < this.kind.length; i++) {
      const w = KIND_WALKABLE[this.kind[i]] && !this.interior[i] ? 1 : 0;
      this.walk[i] = w;
      this.cost[i] = w ? KIND_COST[this.kind[i]] : 0;
    }
  }
  block(x: number, y: number): void { if (this.inBounds(x, y)) { const i = this.idx(x, y); this.walk[i] = 0; this.cost[i] = 0; } }
  walkable(x: number, y: number): boolean { return this.inBounds(x, y) && this.walk[this.idx(x, y)] === 1; }
  countKind(kind: TileKind): number { const k = KIND_INDEX[kind]; let n = 0; for (let i = 0; i < this.kind.length; i++) if (this.kind[i] === k) n++; return n; }
}

export const vec = (x: number, y: number): Vec => ({ x, y });
export const key = (x: number, y: number): number => (y << 8) | x;
