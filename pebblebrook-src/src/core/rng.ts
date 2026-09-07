import type { Rng } from './types.ts';

/** mulberry32: small, seeded, and identical everywhere. */
export class SeededRng implements Rng {
  private s: number;
  constructor(seed: number) { this.s = seed >>> 0; }
  get state(): number { return this.s; }
  set state(v: number) { this.s = v >>> 0; }
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(lo: number, hi: number): number { return lo + (hi - lo) * this.next(); }
  int(lo: number, hi: number): number { return lo + Math.floor(this.next() * (hi - lo + 1)); }
  chance(p: number): boolean { return this.next() < p; }
  pick<T>(arr: readonly T[]): T { return arr[Math.floor(this.next() * arr.length)]; }
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  }
  /** a child generator, so subsystems can be seeded independently and stay reproducible */
  fork(salt: number): SeededRng { return new SeededRng((this.s ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0); }
}

/** Stable string hash for ids and salts. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
