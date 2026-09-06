/** Seeded PRNG (mulberry32). All gameplay randomness goes through an Rng instance. */
export class Rng {
  private s: number;
  constructor(seed = 1) { this.s = seed >>> 0 || 1; }
  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(min: number, max: number) { return min + Math.floor(this.next() * (max - min + 1)); }
  range(min: number, max: number) { return min + this.next() * (max - min); }
  pick<T>(arr: readonly T[]): T { return arr[Math.floor(this.next() * arr.length)]; }
  chance(p: number) { return this.next() < p; }
  fork() { return new Rng(Math.floor(this.next() * 0xffffffff)); }
}
/** Deterministic hash → [0,1) for scatter placement (no state). */
export const hash2 = (x: number, y: number, seed = 0) => {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
