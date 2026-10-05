import { dist, type Vec } from '../engine/math.ts';
import { MAP_H, MAP_W } from './constants.ts';
import { clearLine, findPath, resolveWalls } from './map.ts';
import type { Entity } from './types.ts';

/** Push a ground position out of walls and inside the map. */
export const resolveGround = (p: Vec, r: number): Vec => resolveWalls(p, r);

export function clampArena(p: Vec, r: number): Vec {
  return { x: Math.min(MAP_W - r, Math.max(r, p.x)), y: Math.min(MAP_H - r, Math.max(r, p.y)) };
}

/** Push p out of solid circular obstacles (towers). */
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

/** Next waypoint toward `to`, routing around walls. */
export function nextWaypoint(from: Vec, to: Vec, flying: boolean, r: number): Vec {
  if (flying || clearLine(from, to, r)) return to;
  const path = findPath(from, to, r);
  return path[0] ?? to;
}

/** Walking distance estimate. */
export function pathDistance(from: Vec, to: Vec, flying: boolean): number {
  if (flying || clearLine(from, to, 0.3)) return dist(from, to);
  const path = findPath(from, to, 0.3);
  let l = 0, cur = from;
  for (const p of path) { l += dist(cur, p); cur = p; }
  return l;
}
