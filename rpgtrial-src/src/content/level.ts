// Level layout: fixed landmarks (lead-owned) + arrays other agents append to.
import type { Vec3 } from '../core/math.ts';
import type { AnyCollider, Trigger, Interactable } from '../sim/types.ts';
import { lazyColliders, scatterColliders } from './scatter.ts'; // env-terrain

export const MAP_HALF = 150;                 // playable terrain spans ±150 m
export const LAKE = { x: 0, z: -40, r: 55, level: 0 };   // the Hollowmere
export const LAKE_LEVEL = LAKE.level;
export const WADE_DEPTH = 0.9;               // deeper than this = can't walk (blocked)

/** Named world positions; every agent references these instead of literal coordinates. */
export const LANDMARKS = {
  start: { x: 0, y: 0, z: 22, yaw: Math.PI },          // wake-up point on the south shore, facing the lake (−Z)
  wreck: { x: 5, y: 0, z: 18 },                         // splintered boat, sword lies here
  sword: { x: 4.5, y: 0, z: 19.5 },
  cache: { x: -9, y: 0, z: 25 },                        // hidden cache (Perception)
  ilyraStart: { x: 3, y: 0, z: 24, yaw: -2.2 },
  camp: { x: 28, y: 0, z: 30 },                         // campfire clearing
  campfire: { x: 28, y: 0, z: 30 },
  chest: { x: 33, y: 0, z: 27, yaw: -0.7 },             // treasure chest at camp
  boulder: { x: 45, y: 0, z: 14 },                      // Athletics check (rolls off the path)
  chapel: { x: 60, y: 0, z: -5 },                       // ruined chapel courtyard (first fight)
  chapelAltar: { x: 66, y: 0, z: -12 },
  graves: [{ x: 66, y: 0, z: 0 }, { x: 55, y: 0, z: -10 }, { x: 63, y: 0, z: 3 }],
  gate: { x: 75, y: 0, z: -30, yaw: -0.85 },            // iron gate into the hillside crypt
  crypt: { x: 0, y: 0, z: -500 },                       // crypt interior origin (separate area)
  cryptEntrance: { x: 0, y: 0, z: -480 },               // where the player appears after the gate
  cryptBoss: { x: 0, y: 0, z: -540 },                   // boss chamber centre
  cryptExit: { x: 0, y: 0, z: -478 },
} as const;
export const CRYPT_ORIGIN: Vec3 = { x: 0, y: 0, z: -500 };

export interface PropPlacement { model: string; x: number; y?: number; z: number; yaw?: number; scale?: number; tag?: string }
export interface LightPlacement { kind: 'torch' | 'candle' | 'fire' | 'magic'; x: number; y: number; z: number; color?: number; intensity?: number; range?: number }

/** Environment agent: append hand-placed props here (scatter is procedural in content/scatter.ts). */
export const PROPS: PropPlacement[] = [];
/** Environment agent: hand-placed lights (torches on the chapel, candles in the crypt...). */
export const LIGHTS: LightPlacement[] = [];
/** Sim colliders for hand-placed things; scatter colliders come from content/scatter.ts. */
// env-terrain: tree trunks / boulders / stumps from scatter.ts are merged in lazily (first read after module init):
// scatter.ts → sim/terrain.ts → this file is an import cycle, so they cannot be computed while this module evaluates.
// Pushing hand-placed colliders works exactly as before. See scatter.ts: lazyColliders().
export const COLLIDERS: AnyCollider[] = lazyColliders(() => scatterColliders());
/** Quest triggers (sim fires `trigger` when the player enters). */
export const TRIGGERS: Trigger[] = [
  { id: 'shore', x: 0, z: 22, r: 8, once: true },
  { id: 'camp', x: 28, z: 30, r: 9, once: true },
  { id: 'boulder', x: 45, z: 16, r: 6, once: true },
  { id: 'chapel', x: 60, z: -5, r: 12, once: true },
  { id: 'gate', x: 75, z: -30, r: 6, once: true },
  { id: 'cryptEntrance', x: 0, z: -480, r: 6, once: true },
  { id: 'cryptBoss', x: 0, z: -530, r: 8, once: true },
];
/** World interactables (chests, sword, campfire, gate...). Content/sim agents append. */
export const INTERACTABLES: Interactable[] = [
  { id: 'sword', label: 'Take the longsword', x: 4.5, y: 0, z: 19.5, r: 2.2, enabled: true, kind: 'pickup' },
  { id: 'cache', label: 'Search the rocks', x: -9, y: 0, z: 25, r: 2.2, enabled: false, kind: 'loot' },
  { id: 'campfire', label: 'Rest at the campfire', x: 28, y: 0, z: 30, r: 2.8, enabled: true, kind: 'rest' },
  { id: 'chest', label: 'Open the chest', x: 33, y: 0, z: 27, r: 2.2, enabled: true, kind: 'loot' },
  { id: 'boulder', label: 'Push the boulder (Athletics)', x: 45, y: 0, z: 14, r: 3.0, enabled: true, kind: 'check' },
  { id: 'gate', label: 'Pick the lock (Sleight of Hand)', x: 75, y: 0, z: -30, r: 3.0, enabled: true, kind: 'check' },
  { id: 'cryptExit', label: 'Leave the crypt', x: 0, y: 0, z: -478, r: 2.5, enabled: false, kind: 'door' },
];

// env-dressing: colliders + lights for every hand-placed thing (walls, gate, boulder, camp props, crypt rooms).
// Layout lives in content/dressing.ts so render/props.ts and render/crypt.ts build exactly what the sim collides with.
// Collider tags: 'boulder' (remove on pushBoulder), 'gate' (remove on openGate), 'cryptDoor' (remove on openCryptExit),
// 'chapelWall' | 'yardWall' | 'gateWall' | 'cryptWall' | 'cryptPillar' | 'dais' | 'coffin' | 'altar' | ... (static).
import { dressingColliders, dressingLights } from './dressing.ts';
COLLIDERS.push(...dressingColliders(LANDMARKS));
LIGHTS.push(...dressingLights(LANDMARKS).map((l) => ({ kind: l.kind, x: l.x, y: l.y, z: l.z, color: l.color, intensity: l.intensity, range: l.range })));
