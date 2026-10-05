import type { Vec } from '../engine/math.ts';

/** The map is a square; team 0 (blue) sits bottom-left (small x, large y), team 1 (red) top-right. */
export const MAP_W = 56;
export const MAP_H = 56;
export const ARENA_W = MAP_W;
export const ARENA_H = MAP_H;

export const TICK = 1 / 60;
export const COUNTDOWN_TIME = 3;

/** Economy. */
export const START_GOLD = 500;
export const PASSIVE_GOLD_PER_SEC = 3;
export const MINION_GOLD = { melee: 40, ranged: 48, siege: 90 } as const;
export const MINION_XP = { melee: 48, ranged: 48, siege: 90 } as const;
export const HERO_KILL_GOLD = 300;
export const HERO_KILL_XP = 180;
export const ASSIST_GOLD = 120;
export const TOWER_GOLD = { local: 250, team: 100 } as const; // destroyer + every ally
export const XP_SHARE_RANGE = 10;
export const LEVEL_XP: readonly number[] = [0, 120, 300, 560, 900, 1340, 1880, 2500, 3200, 4000, 4900, 5900, 7000, 8200, 9500]; // xp needed to reach level i+1
export const MAX_LEVEL = 15;
export const RESPAWN_BASE = 5;
export const RESPAWN_PER_LEVEL = 1.6;
export const RECALL_TIME = 3.2;
export const STREAK_WINDOW = 8;

/** Waves. */
export const FIRST_WAVE_AT = 25;
export const WAVE_EVERY = 30;
export const SIEGE_EVERY = 3;

/** Structures (per tier: outer, inner, base, crystal). */
export const TOWER_STATS = {
  outer: { hp: 4200, damage: 180, hitSpeed: 1.0, range: 7.5, radius: 1.3, armor: 60 },
  inner: { hp: 5200, damage: 230, hitSpeed: 1.0, range: 7.5, radius: 1.3, armor: 80 },
  base: { hp: 6200, damage: 280, hitSpeed: 0.95, range: 7.5, radius: 1.4, armor: 100 },
  crystal: { hp: 9000, damage: 320, hitSpeed: 0.8, range: 8, radius: 2.0, armor: 120 },
} as const;
export type TowerTier = keyof typeof TOWER_STATS;

export const SIGHT_DEFAULT = 8;
export const BUSH_SIGHT = 2.2; // enemies in a bush are visible only this close

/** Hero control tuning. */
export const POSSESS = {
  speedMult: 1.0,
  dashDist: 3.2,
  dashTime: 0.22,
  dashCooldown: 6,
  flashDist: 5,
  flashCooldown: 60,
  cooldownAfterDeath: 0,
  cooldownAfterRelease: 0,
  zoom: 1.75,
};

export const mirrorPos = (p: Vec): Vec => ({ x: MAP_W - p.x, y: MAP_H - p.y });
export const mirrorY = (y: number): number => MAP_H - y;

/** Where the three lanes run for team 0, from its base to the enemy base. */
export type LaneId = 0 | 1 | 2; // top, mid, bot
export const LANE_NAMES = ['top', 'mid', 'bot'] as const;
export const LANE_PATHS: readonly (readonly Vec[])[] = [
  [{ x: 7, y: 47 }, { x: 6, y: 42 }, { x: 6, y: 9 }, { x: 9, y: 6 }, { x: 42, y: 6 }, { x: 47, y: 7 }],
  [{ x: 8.5, y: 47.5 }, { x: 47.5, y: 8.5 }],
  [{ x: 9, y: 49 }, { x: 14, y: 50 }, { x: 47, y: 50 }, { x: 50, y: 47 }, { x: 50, y: 14 }, { x: 49, y: 9 }],
];

export interface TowerSpec { tier: TowerTier; lane: LaneId | -1; pos: Vec }
/** Team 0's towers; team 1's are mirrored. Order along each lane matters: outer first. */
export const TOWER_LAYOUT: readonly TowerSpec[] = [
  { tier: 'outer', lane: 0, pos: { x: 6, y: 22 } },
  { tier: 'inner', lane: 0, pos: { x: 6, y: 33 } },
  { tier: 'base', lane: 0, pos: { x: 7, y: 42 } },
  { tier: 'outer', lane: 1, pos: { x: 19.5, y: 36.5 } },
  { tier: 'inner', lane: 1, pos: { x: 14.5, y: 41.5 } },
  { tier: 'base', lane: 1, pos: { x: 11, y: 45 } },
  { tier: 'outer', lane: 2, pos: { x: 34, y: 50 } },
  { tier: 'inner', lane: 2, pos: { x: 23, y: 50 } },
  { tier: 'base', lane: 2, pos: { x: 14, y: 49 } },
  { tier: 'crystal', lane: -1, pos: { x: 6, y: 50 } },
];
export const SPAWN_POINT: Vec = { x: 4.5, y: 51.5 };
export const FOUNTAIN_RADIUS = 5;

/** Jungle camps for team 0 (mirrored for team 1) and the two river objectives. */
export interface CampSpec { id: string; monster: string; count: number; pos: Vec; respawn: number; firstSpawn: number }
export const CAMPS: readonly CampSpec[] = [
  { id: 'blue', monster: 'blueSentinel', count: 1, pos: { x: 11.5, y: 27 }, respawn: 90, firstSpawn: 30 },
  { id: 'wolves', monster: 'wolf', count: 3, pos: { x: 15, y: 20 }, respawn: 70, firstSpawn: 30 },
  { id: 'gromp', monster: 'toad', count: 1, pos: { x: 10, y: 16 }, respawn: 70, firstSpawn: 30 },
  { id: 'red', monster: 'redSentinel', count: 1, pos: { x: 29, y: 44 }, respawn: 90, firstSpawn: 30 },
  { id: 'raptors', monster: 'raptor', count: 3, pos: { x: 36, y: 46 }, respawn: 70, firstSpawn: 30 },
  { id: 'krug', monster: 'golem', count: 2, pos: { x: 40, y: 50.5 }, respawn: 70, firstSpawn: 30 },
  { id: 'stag', monster: 'stag', count: 1, pos: { x: 21, y: 31 }, respawn: 70, firstSpawn: 30 },
];
export interface ObjectiveSpec { id: string; monster: string; pos: Vec; firstSpawn: number; respawn: number }
export const OBJECTIVES: readonly ObjectiveSpec[] = [
  { id: 'tyrant', monster: 'tyrant', pos: { x: 41, y: 41 }, firstSpawn: 120, respawn: 180 },
  { id: 'overlord', monster: 'overlord', pos: { x: 15, y: 15 }, firstSpawn: 480, respawn: 240 },
];

/** Solid jungle walls (axis-aligned boxes, team 0 half; mirrored) and bushes (circles). */
export interface Box { x: number; y: number; w: number; h: number }
export const WALLS_HALF: readonly Box[] = [
  { x: 9, y: 23, w: 5, h: 2.2 }, // above blue buff
  { x: 9.5, y: 30.5, w: 4.5, h: 2 }, // below blue buff
  { x: 13, y: 12, w: 2, h: 6 }, // gromp pocket
  { x: 18, y: 16.5, w: 5, h: 2 }, // wolves pocket
  { x: 19, y: 24, w: 2, h: 5 }, // between wolves and mid
  { x: 24, y: 27, w: 5, h: 2 }, // stag pocket
  { x: 25, y: 40, w: 2.2, h: 5.5 }, // red buff west wall
  { x: 32, y: 40, w: 2.2, h: 4 }, // red buff east wall
  { x: 31, y: 46.5, w: 6, h: 1.8 }, // raptors south-west
  { x: 38, y: 44.5, w: 1.8, h: 4 }, // raptors east
  { x: 43, y: 48, w: 2, h: 3 }, // krug side
  { x: 36.5, y: 37.5, w: 2, h: 6 }, // tyrant pit west wall
  { x: 42, y: 36, w: 5, h: 1.8 }, // tyrant pit north wall
];
export const BUSHES_HALF: readonly { pos: Vec; r: number }[] = [
  { pos: { x: 8.5, y: 27 }, r: 1.6 },
  { pos: { x: 6.5, y: 16 }, r: 1.5 },
  { pos: { x: 16, y: 40 }, r: 1.8 },
  { pos: { x: 23, y: 36 }, r: 1.7 },
  { pos: { x: 28, y: 50.5 }, r: 1.6 },
  { pos: { x: 41, y: 47.5 }, r: 1.5 },
  { pos: { x: 24.5, y: 23.5 }, r: 1.6 },
  { pos: { x: 33.5, y: 44 }, r: 1.4 },
  { pos: { x: 31, y: 30 }, r: 1.6 },
  { pos: { x: 12, y: 38 }, r: 1.4 },
];
/** River band: |x - y| < RIVER_HALF is water (walkable but slow) except at the lane crossings. */
export const RIVER_HALF = 1.6;
export const RIVER_SLOW = 0.8;
