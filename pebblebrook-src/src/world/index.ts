// AGENT A owns this module. Entry point: everything other modules may import from the world.
import type { Bus } from '../core/bus.ts';
import type { Vec, World } from '../core/types.ts';
import { createWorld, type PebbleWorld, type TileInfo, type WorldExtras } from './world.ts';

export type { PebbleWorld, TileInfo, WorldExtras };
export type { Building, BuildingSpec } from './layout.ts';
export { BUILDINGS, REGIONS, MAP_W, MAP_H } from './layout.ts';
export { FESTIVALS, weatherForDay, type Festival, type DayWeather } from './clock.ts';
export { fishTableFor, FISH_TABLES, FORAGE, ANIMALS, type FishEntry, type ForageArea } from './tables.ts';
export { KINDS } from './grid.ts';

/** Build the village for `seed`. See specs/DESIGN.md → The world and specs/NOTES-world.md. */
export function generateWorld(seed: number, opts: { bus?: Bus } = {}): PebbleWorld {
  return createWorld(seed, opts);
}

/** `{ kind, variant, style, roofEdge, placeId, ... }` for a tile, so renderers never decode variant bits. */
export function describeTile(world: World, x: number, y: number): TileInfo {
  return (world as PebbleWorld).describeTile(x, y);
}

/** The 4-neighbours of `pos` that are walkable, in up/down/left/right order. */
export function walkableNeighbours(world: World, pos: Vec): Vec[] {
  return (world as PebbleWorld).walkableNeighbours(pos);
}
