import { dist, type Vec } from '../engine/math.ts';
import { ARENA_H, ARENA_W, BRIDGES, RIVER_BOT, RIVER_MID, RIVER_TOP } from './constants.ts';
import type { Entity, Team } from './types.ts';

export const sideOf = (y: number): Team => (y < RIVER_MID ? 1 : 0);

export function onBridge(x: number, tolerance = 0.15): boolean {
  for (const b of BRIDGES) if (Math.abs(x - b.x) <= b.halfW + tolerance) return true;
  return false;
}

export function inRiverBand(y: number, r: number): boolean {
  return y > RIVER_TOP - r && y < RIVER_BOT + r;
}

/** Is a ground position blocked by water? */
export function inWater(p: Vec, r: number): boolean {
  return inRiverBand(p.y, r) && !onBridge(p.x);
}

/** Push a ground position out of water and inside the arena. */
export function resolveGround(p: Vec, r: number): Vec {
  let x = Math.min(ARENA_W - r, Math.max(r, p.x));
  let y = Math.min(ARENA_H - r, Math.max(r, p.y));
  if (inRiverBand(y, r) && !onBridge(x)) {
    // Choose the cheaper escape: back to the bank or sideways onto a bridge.
    const bankY = y < RIVER_MID ? RIVER_TOP - r : RIVER_BOT + r;
    let best: Vec = { x, y: bankY };
    let bestD = Math.abs(bankY - y);
    for (const b of BRIDGES) {
      const bx = x < b.x ? b.x - b.halfW + 0.05 : b.x + b.halfW - 0.05;
      const d = Math.abs(bx - x);
      if (d < bestD) { bestD = d; best = { x: bx, y }; }
    }
    x = best.x; y = best.y;
  }
  return { x, y };
}

export function clampArena(p: Vec, r: number): Vec {
  return { x: Math.min(ARENA_W - r, Math.max(r, p.x)), y: Math.min(ARENA_H - r, Math.max(r, p.y)) };
}

/** Push p out of solid circular obstacles (towers/buildings). */
export function resolveObstacles(p: Vec, r: number, obstacles: Iterable<Entity>, self?: Entity): Vec {
  let { x, y } = p;
  for (const o of obstacles) {
    if (o === self || o.dead) continue;
    if (o.kind === 'unit') continue;
    const dx = x - o.pos.x, dy = y - o.pos.y;
    const minD = o.radius + r;
    const d2 = dx * dx + dy * dy;
    if (d2 < minD * minD) {
      const d = Math.sqrt(d2) || 0.001;
      const nx = d < 0.001 ? 1 : dx / d, ny = d < 0.001 ? 0 : dy / d;
      x = o.pos.x + nx * minD;
      y = o.pos.y + ny * minD;
    }
  }
  return { x, y };
}

/**
 * Next waypoint for a ground unit walking from `from` to `to`. Crosses the river via the
 * bridge with the shortest total route. Flying units go straight.
 */
export function nextWaypoint(from: Vec, to: Vec, flying: boolean, r: number): Vec {
  if (flying) return to;
  const fromSide = sideOf(from.y), toSide = sideOf(to.y);
  const inBand = inRiverBand(from.y, r);
  if (fromSide === toSide && !inBand) return to;
  // Already on a bridge inside the band: head straight across.
  if (inBand && onBridge(from.x, 0)) {
    const b = BRIDGES.reduce((a, c) => (Math.abs(c.x - from.x) < Math.abs(a.x - from.x) ? c : a));
    const exitY = toSide === 1 ? RIVER_TOP - r - 0.2 : RIVER_BOT + r + 0.2;
    if (fromSide === toSide) return to;
    return { x: b.x, y: exitY };
  }
  const ownEdge = fromSide === 1 ? RIVER_TOP - r - 0.1 : RIVER_BOT + r + 0.1;
  const otherEdge = fromSide === 1 ? RIVER_BOT + r + 0.2 : RIVER_TOP - r - 0.2;
  let best: Vec | null = null;
  let bestCost = Infinity;
  for (const b of BRIDGES) {
    const entry = { x: b.x, y: ownEdge };
    const exit = { x: b.x, y: otherEdge };
    const cost = dist(from, entry) + dist(exit, to);
    if (cost < bestCost) { bestCost = cost; best = dist(from, entry) < 0.35 ? exit : entry; }
  }
  return best ?? to;
}

/** Walking distance including a bridge detour when needed. */
export function pathDistance(from: Vec, to: Vec, flying: boolean): number {
  if (flying || sideOf(from.y) === sideOf(to.y)) return dist(from, to);
  let best = Infinity;
  for (const b of BRIDGES) {
    const mid = { x: b.x, y: RIVER_MID };
    best = Math.min(best, dist(from, mid) + dist(mid, to));
  }
  return best;
}
