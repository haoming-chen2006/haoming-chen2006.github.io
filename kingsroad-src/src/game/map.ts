import { dist, type Vec } from '../engine/math.ts';
import {
  BUSHES_HALF, FOUNTAIN_RADIUS, LANE_PATHS, MAP_H, MAP_W, RIVER_HALF, SPAWN_POINT, TOWER_LAYOUT, WALLS_HALF, mirrorPos,
  type Box, type LaneId,
} from './constants.ts';
import type { Team } from './types.ts';

/** All walls (both halves) as boxes. */
export const WALLS: readonly Box[] = (() => {
  const out: Box[] = [...WALLS_HALF];
  for (const b of WALLS_HALF) {
    const far = mirrorPos({ x: b.x + b.w, y: b.y + b.h });
    out.push({ x: far.x, y: far.y, w: b.w, h: b.h });
  }
  return out;
})();

export const BUSHES: readonly { pos: Vec; r: number }[] = (() => {
  const out = [...BUSHES_HALF];
  for (const b of BUSHES_HALF) out.push({ pos: mirrorPos(b.pos), r: b.r });
  return out;
})();

/** Lane polylines per team, from the team's own base toward the enemy. */
export function lanePath(lane: LaneId, team: Team): Vec[] {
  const base = LANE_PATHS[lane];
  // point mirroring already swaps the ends: the mirrored path runs from red's base toward blue's
  return team === 0 ? base.map((p) => ({ ...p })) : base.map(mirrorPos);
}

export function spawnPoint(team: Team): Vec { return team === 0 ? { ...SPAWN_POINT } : mirrorPos(SPAWN_POINT); }
export function crystalPos(team: Team): Vec { const c = TOWER_LAYOUT.find((t) => t.tier === 'crystal')!.pos; return team === 0 ? { ...c } : mirrorPos(c); }
export function inFountain(p: Vec, team: Team): boolean { return dist(p, spawnPoint(team)) <= FOUNTAIN_RADIUS; }

/** Which side of the river a point is on (the river is the diagonal x = y). Team 0 owns x < y. */
export const sideOf = (p: Vec): Team => (p.x < p.y ? 0 : 1);
export const inRiver = (p: Vec): boolean => Math.abs(p.x - p.y) < RIVER_HALF && p.x > 8 && p.x < MAP_W - 8;

export function inBush(p: Vec): boolean {
  for (const b of BUSHES) if (dist(p, b.pos) <= b.r) return true;
  return false;
}
export function bushAt(p: Vec): { pos: Vec; r: number } | null {
  for (const b of BUSHES) if (dist(p, b.pos) <= b.r) return b;
  return null;
}

/** Solid circles that block walking in addition to the walls (standing towers and the crystals). */
let obstacles: { x: number; y: number; r: number }[] = [];
export function setObstacles(list: { x: number; y: number; r: number }[]): void {
  obstacles = list;
  rebuildGrid();
  pathCache.clear();
}

export function inWall(p: Vec, r = 0): boolean {
  for (const b of WALLS) if (p.x + r > b.x && p.x - r < b.x + b.w && p.y + r > b.y && p.y - r < b.y + b.h) return true;
  for (const o of obstacles) { const dx = p.x - o.x, dy = p.y - o.y; if (dx * dx + dy * dy < (o.r + r) * (o.r + r)) return true; }
  return false;
}

/** Push a circle out of walls and inside the map. */
export function resolveWalls(p: Vec, r: number): Vec {
  let x = Math.min(MAP_W - r, Math.max(r, p.x));
  let y = Math.min(MAP_H - r, Math.max(r, p.y));
  for (let iter = 0; iter < 3; iter++) {
    let moved = false;
    for (const b of WALLS) {
      if (!(x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h)) continue;
      // smallest push-out
      const pl = x + r - b.x, pr = b.x + b.w - (x - r), pu = y + r - b.y, pd = b.y + b.h - (y - r);
      const m = Math.min(pl, pr, pu, pd);
      if (m === pl) x = b.x - r; else if (m === pr) x = b.x + b.w + r; else if (m === pu) y = b.y - r; else y = b.y + b.h + r;
      moved = true;
    }
    if (!moved) break;
  }
  return { x, y };
}

/** Segment-vs-walls test with a radius margin. */
export function clearLine(a: Vec, b: Vec, r = 0.3): boolean {
  const n = Math.max(2, Math.ceil(dist(a, b) / 0.5));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (inWall({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, r)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------------------------------
// Navigation grid: 1 cell per tile, A* with an 8-neighbourhood, string pulling on the result.

const GW = MAP_W, GH = MAP_H;
const blocked = new Uint8Array(GW * GH);
function rebuildGrid(): void { for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) blocked[y * GW + x] = inWall({ x: x + 0.5, y: y + 0.5 }, 0.1) ? 1 : 0; }
rebuildGrid();
const cellOf = (p: Vec): [number, number] => [Math.min(GW - 1, Math.max(0, Math.floor(p.x))), Math.min(GH - 1, Math.max(0, Math.floor(p.y)))];
const isBlocked = (x: number, y: number): boolean => x < 0 || y < 0 || x >= GW || y >= GH || blocked[y * GW + x] === 1;

/** Nearest unblocked cell centre to a point. */
export function nearestFree(p: Vec): Vec {
  const [cx, cy] = cellOf(p);
  if (!isBlocked(cx, cy)) return p;
  for (let r = 1; r < 6; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      if (!isBlocked(cx + dx, cy + dy)) return { x: cx + dx + 0.5, y: cy + dy + 0.5 };
    }
  }
  return p;
}

const pathCache = new Map<string, Vec[] | null>();

/** A* path from `from` to `to`; returns waypoints excluding `from`, ending at `to`. Straight line when clear.
 *  Searches starting on the red half are solved in the mirrored frame so tie-breaking in A* and string pulling
 *  gives both sides exactly mirrored routes. */
export function findPath(from: Vec, to: Vec, r = 0.35): Vec[] {
  if (clearLine(from, to, r)) return [{ ...to }];
  if (sideOf(from) === 1) return findPathRaw(mirrorPos(from), mirrorPos(to), r).map(mirrorPos);
  return findPathRaw(from, to, r);
}

function findPathRaw(from: Vec, to: Vec, r: number): Vec[] {
  const goal = nearestFree(to);
  const start = nearestFree(from);
  const [sx, sy] = cellOf(start), [gx, gy] = cellOf(goal);
  const key = `${sx},${sy}>${gx},${gy}`;
  let cells = pathCache.get(key);
  if (cells === undefined) {
    cells = astar(sx, sy, gx, gy);
    if (pathCache.size > 4000) pathCache.clear();
    pathCache.set(key, cells);
  }
  if (!cells) return [{ ...to }];
  const pts = cells.map((c) => ({ x: c.x + 0.5, y: c.y + 0.5 }));
  pts.push({ ...to });
  // string pulling
  const out: Vec[] = [];
  let cur = from;
  let i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    while (j > i && !clearLine(cur, pts[j], r)) j--;
    cur = pts[j];
    out.push(cur);
    i = j + 1;
  }
  return out;
}

function astar(sx: number, sy: number, gx: number, gy: number): Vec[] | null {
  const n = GW * GH;
  const g = new Float32Array(n).fill(Infinity);
  const came = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const open: number[] = [];
  const f = new Float32Array(n).fill(Infinity);
  const h = (x: number, y: number) => { const dx = Math.abs(x - gx), dy = Math.abs(y - gy); return Math.max(dx, dy) + 0.4142 * Math.min(dx, dy); };
  const si = sy * GW + sx, gi = gy * GW + gx;
  g[si] = 0; f[si] = h(sx, sy); open.push(si);
  const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]];
  let guard = 0;
  while (open.length && guard++ < 20000) {
    // pick lowest f (small open sets; linear scan is fine at this grid size)
    let bi = 0;
    for (let k = 1; k < open.length; k++) if (f[open[k]] < f[open[bi]]) bi = k;
    const ci = open[bi]; open[bi] = open[open.length - 1]; open.pop();
    if (ci === gi) {
      const path: Vec[] = [];
      let c = ci;
      while (c !== si && c >= 0) { path.push({ x: c % GW, y: Math.floor(c / GW) }); c = came[c]; }
      return path.reverse();
    }
    closed[ci] = 1;
    const cx = ci % GW, cy = Math.floor(ci / GW);
    for (const [dx, dy, cost] of dirs) {
      const nx = cx + dx, ny = cy + dy;
      if (isBlocked(nx, ny)) continue;
      if (dx !== 0 && dy !== 0 && (isBlocked(cx + dx, cy) || isBlocked(cx, cy + dy))) continue; // no corner cutting
      const ni = ny * GW + nx;
      if (closed[ni]) continue;
      const ng = g[ci] + cost;
      if (ng < g[ni]) { g[ni] = ng; f[ni] = ng + h(nx, ny); came[ni] = ci; if (!open.includes(ni)) open.push(ni); }
    }
  }
  return null;
}

/** Closest point on a lane path and the progress index for a unit joining a lane mid-way. */
export function laneProgress(path: Vec[], p: Vec): number {
  let best = 0, bd = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    const abx = b.x - a.x, aby = b.y - a.y;
    const l2 = abx * abx + aby * aby;
    let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / l2;
    t = Math.max(0, Math.min(1, t));
    const q = { x: a.x + abx * t, y: a.y + aby * t };
    const d = dist(p, q);
    if (d < bd) { bd = d; best = i + t; }
  }
  return best;
}

/** Point on a lane path at fractional progress. */
export function lanePoint(path: Vec[], prog: number): Vec {
  const i = Math.min(path.length - 2, Math.max(0, Math.floor(prog)));
  const t = Math.min(1, Math.max(0, prog - i));
  const a = path[i], b = path[i + 1];
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Move `delta` tiles along a lane polyline from fractional progress `prog` (negative = back toward the start). */
export function laneAdvance(path: Vec[], prog: number, delta: number): number {
  let i = Math.min(path.length - 2, Math.max(0, Math.floor(prog)));
  let t = Math.min(1, Math.max(0, prog - i));
  let rem = delta;
  while (Math.abs(rem) > 1e-6) {
    const segLen = dist(path[i], path[i + 1]) || 1e-6;
    if (rem > 0) {
      const can = (1 - t) * segLen;
      if (rem <= can) { t += rem / segLen; rem = 0; }
      else { rem -= can; if (i >= path.length - 2) { t = 1; break; } i++; t = 0; }
    } else {
      const can = t * segLen;
      if (-rem <= can) { t += rem / segLen; rem = 0; }
      else { rem += can; if (i <= 0) { t = 0; break; } i--; t = 1; }
    }
  }
  return i + t;
}

export function laneLength(path: Vec[]): number { let l = 0; for (let i = 0; i < path.length - 1; i++) l += dist(path[i], path[i + 1]); return l; }

/** Which lane a point is nearest to (and the distance). */
export function nearestLane(p: Vec): { lane: LaneId; d: number } {
  let best: LaneId = 1, bd = Infinity;
  for (const lane of [0, 1, 2] as LaneId[]) {
    const path = lanePath(lane, 0);
    const q = lanePoint(path, laneProgress(path, p));
    const d = dist(p, q);
    if (d < bd) { bd = d; best = lane; }
  }
  return { lane: best, d: bd };
}
