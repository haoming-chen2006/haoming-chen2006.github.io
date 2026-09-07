import type { Vec } from '../core/types.ts';
import { ROAD_COST, type Grid } from './grid.ts';

/**
 * A* over the walkable grid. 4-directional, integer tile costs (roads cheaper than grass), a binary
 * heap keyed by f with h as tie-break, and generation-stamped scratch arrays so nothing is cleared
 * between calls. Returns the path excluding the start and including the goal, or null.
 *
 * The goal tile is always accepted even when it is not walkable (a building interior, a bench, a
 * plot): callers path "to" things, and the last step is theirs to interpret.
 */
export class Pathfinder {
  private readonly grid: Grid;
  private readonly w: number;
  private readonly h: number;
  private readonly gScore: Int32Array;
  private readonly cameFrom: Int32Array;
  private readonly seen: Uint32Array;
  private readonly closed: Uint32Array;
  private readonly heapIdx: Int32Array;
  private readonly heapF: Int32Array;
  private readonly heapH: Int32Array;
  private heapSize = 0;
  private gen = 0;
  /** nodes expanded by the last search, for tests */
  expanded = 0;

  constructor(grid: Grid) {
    this.grid = grid;
    this.w = grid.width; this.h = grid.height;
    const n = this.w * this.h;
    this.gScore = new Int32Array(n);
    this.cameFrom = new Int32Array(n);
    this.seen = new Uint32Array(n);
    this.closed = new Uint32Array(n);
    // lazy deletion: a node may sit in the heap more than once; 4 entries per node is a safe bound
    this.heapIdx = new Int32Array(n * 4);
    this.heapF = new Int32Array(n * 4);
    this.heapH = new Int32Array(n * 4);
  }

  find(from: Vec, to: Vec, maxNodes = 6000): Vec[] | null {
    const g = this.grid, w = this.w, h = this.h;
    const sx = Math.round(from.x), sy = Math.round(from.y), tx = Math.round(to.x), ty = Math.round(to.y);
    if (!g.inBounds(sx, sy) || !g.inBounds(tx, ty)) return null;
    const start = sy * w + sx, goal = ty * w + tx;
    if (start === goal) return [];
    if (!g.walk[goal] && !this.hasWalkableNeighbour(tx, ty)) return null;

    this.gen++;
    if (this.gen === 0xffffffff) { this.seen.fill(0); this.closed.fill(0); this.gen = 1; }
    const gen = this.gen;
    this.heapSize = 0;
    this.expanded = 0;
    this.gScore[start] = 0;
    this.cameFrom[start] = -1;
    this.seen[start] = gen;
    const h0 = this.heur(sx, sy, tx, ty);
    this.push(start, h0, h0);

    const cost = g.cost;
    while (this.heapSize > 0) {
      const cur = this.pop();
      if (this.closed[cur] === gen) continue;
      this.closed[cur] = gen;
      if (cur === goal) return this.reconstruct(goal);
      if (++this.expanded > maxNodes) return null;
      const cx = cur % w, cy = (cur - cx) / w;
      const gc = this.gScore[cur];
      if (cy > 0) this.relax(cur - w, cx, cy - 1, cur, gc, goal, tx, ty, cost, gen);
      if (cy < h - 1) this.relax(cur + w, cx, cy + 1, cur, gc, goal, tx, ty, cost, gen);
      if (cx > 0) this.relax(cur - 1, cx - 1, cy, cur, gc, goal, tx, ty, cost, gen);
      if (cx < w - 1) this.relax(cur + 1, cx + 1, cy, cur, gc, goal, tx, ty, cost, gen);
    }
    return null;
  }

  private relax(n: number, nx: number, ny: number, parent: number, gc: number, goal: number, tx: number, ty: number, cost: Uint8Array, gen: number): void {
    if (this.closed[n] === gen) return;
    let c = cost[n];
    if (c === 0) { if (n !== goal) return; c = ROAD_COST; }
    const ng = gc + c;
    if (this.seen[n] === gen && ng >= this.gScore[n]) return;
    this.seen[n] = gen;
    this.gScore[n] = ng;
    this.cameFrom[n] = parent;
    const hh = this.heur(nx, ny, tx, ty);
    this.push(n, ng + hh, hh);
  }

  private heur(x: number, y: number, tx: number, ty: number): number { return (Math.abs(x - tx) + Math.abs(y - ty)) * ROAD_COST; }

  private hasWalkableNeighbour(x: number, y: number): boolean {
    const g = this.grid;
    return g.walkable(x - 1, y) || g.walkable(x + 1, y) || g.walkable(x, y - 1) || g.walkable(x, y + 1);
  }

  private reconstruct(goal: number): Vec[] {
    const w = this.w;
    let n = goal, len = 0;
    while (n !== -1) { len++; n = this.cameFrom[n]; }
    const out: Vec[] = new Array(len - 1);
    n = goal;
    for (let i = len - 2; i >= 0; i--) { out[i] = { x: n % w, y: Math.floor(n / w) }; n = this.cameFrom[n]; }
    return out;
  }

  private push(idx: number, f: number, h: number): void {
    let i = this.heapSize++;
    const hi = this.heapIdx, hf = this.heapF, hh = this.heapH;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (hf[p] < f || (hf[p] === f && hh[p] <= h)) break;
      hi[i] = hi[p]; hf[i] = hf[p]; hh[i] = hh[p];
      i = p;
    }
    hi[i] = idx; hf[i] = f; hh[i] = h;
  }

  private pop(): number {
    const hi = this.heapIdx, hf = this.heapF, hh = this.heapH;
    const top = hi[0];
    const n = --this.heapSize;
    if (n > 0) {
      const idx = hi[n], f = hf[n], h = hh[n];
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= n) break;
        const r = c + 1;
        if (r < n && (hf[r] < hf[c] || (hf[r] === hf[c] && hh[r] < hh[c]))) c = r;
        if (hf[c] < f || (hf[c] === f && hh[c] < h)) { hi[i] = hi[c]; hf[i] = hf[c]; hh[i] = hh[c]; i = c; } else break;
      }
      hi[i] = idx; hf[i] = f; hh[i] = h;
    }
    return top;
  }
}

/** The 4 walkable neighbours of a tile, in up/down/left/right order. */
export function walkableNeighboursOf(grid: Grid, pos: Vec): Vec[] {
  const x = Math.round(pos.x), y = Math.round(pos.y);
  const out: Vec[] = [];
  if (grid.walkable(x, y - 1)) out.push({ x, y: y - 1 });
  if (grid.walkable(x, y + 1)) out.push({ x, y: y + 1 });
  if (grid.walkable(x - 1, y)) out.push({ x: x - 1, y });
  if (grid.walkable(x + 1, y)) out.push({ x: x + 1, y });
  return out;
}

/** The walkable tile nearest to `pos` within `radius` (Chebyshev rings, then Euclid tie-break); falls back to `fallback`. */
export function nearestWalkableOn(grid: Grid, pos: Vec, radius: number, fallback: Vec): Vec {
  const px = Math.round(pos.x), py = Math.round(pos.y);
  if (grid.walkable(px, py)) return { x: px, y: py };
  for (let r = 1; r <= radius; r++) {
    let best: Vec | null = null, bestD = Infinity;
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = px + dx, y = py + dy;
        if (!grid.walkable(x, y)) continue;
        const d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = { x, y }; }
      }
    }
    if (best) return best;
  }
  return { x: fallback.x, y: fallback.y };
}
