import type { Vec } from '../engine/math.ts';

export const ARENA_W = 18;
export const ARENA_H = 32;
export const RIVER_TOP = 15;
export const RIVER_BOT = 17;
export const RIVER_MID = 16;
export const BRIDGES: readonly { x: number; halfW: number }[] = [
  { x: 3.5, halfW: 1.0 },
  { x: 14.5, halfW: 1.0 },
];
export const LANE_X = [3.5, 14.5] as const; // left, right

export const TICK = 1 / 60;
export const MAX_ELIXIR = 10;
export const START_ELIXIR = 5;
export const ELIXIR_PER_SEC = 1 / 2.8;
export const REGULATION_TIME = 180;
export const COUNTDOWN_TIME = 3;
export const COMEBACK_ELIXIR_MULT = 1.1; // the side with fewer crowns regenerates a little faster
export const STREAK_WINDOW = 4; // seconds between champion kills that still count as a streak
export const OVERTIME_TIME = 120;
export const DOUBLE_ELIXIR_AT = 60; // seconds remaining in regulation

export const PRINCESS_TOWER = { hp: 2900, damage: 108, hitSpeed: 0.8, range: 7.5, radius: 1.4 };
export const KING_TOWER = { hp: 4800, damage: 140, hitSpeed: 1.0, range: 7.0, radius: 1.9 };

export const SIGHT_DEFAULT = 5.5;
export const SPELL_TOWER_MULT = 0.4;

/** Possession tuning. */
export const POSSESS = {
  hpBonus: 0.25, // soulbound units get +25% max hp
  speedMult: 1.1,
  zoom: 1.75,
  cooldownAfterDeath: 4,
  cooldownAfterRelease: 6,
  summonRadius: 4.0, // cards may be deployed this close to the hero
  dashDist: 3.2,
  dashTime: 0.22,
  dashCooldown: 4,
  possessRange: 2.5, // cursor must be this close to a troop to possess it with F
  elixirPerKill: 0.3, // Soul Harvest: elixir granted for each troop your champion kills
  harvestCap: 3, // Soul Harvest elixir cap per possession, so swarms don't snowball
};

/** Tower layout for team 0 (bottom). Team 1 is mirrored vertically. */
export interface TowerSpec { type: 'king' | 'princess'; side: 'left' | 'right' | 'center'; pos: Vec; radius: number }
export const TOWER_LAYOUT: readonly TowerSpec[] = [
  { type: 'princess', side: 'left', pos: { x: 3.5, y: 25.5 }, radius: PRINCESS_TOWER.radius },
  { type: 'princess', side: 'right', pos: { x: 14.5, y: 25.5 }, radius: PRINCESS_TOWER.radius },
  { type: 'king', side: 'center', pos: { x: 9, y: 29.5 }, radius: KING_TOWER.radius },
];

export const mirrorY = (y: number): number => ARENA_H - y;
export const mirrorPos = (p: Vec): Vec => ({ x: ARENA_W - p.x, y: ARENA_H - p.y });
