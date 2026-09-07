export * from './types.ts';
export { SeededRng, hashString } from './rng.ts';
export { Bus, bus, type BusEvent } from './bus.ts';
export * from './time.ts';
export * from './items.ts';

/** Grid helpers shared everywhere. */
export const tileKey = (x: number, y: number): string => `${x},${y}`;
export const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.hypot(a.x - b.x, a.y - b.y);
export const manhattan = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export * from './places.ts';
export * from './villagers.ts';
