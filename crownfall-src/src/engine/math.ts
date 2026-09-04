export interface Vec { x: number; y: number }

export const v = (x: number, y: number): Vec => ({ x, y });
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec, s: number): Vec => ({ x: a.x * s, y: a.y * s });
export const len = (a: Vec): number => Math.hypot(a.x, a.y);
export const dist = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);
export const dist2 = (a: Vec, b: Vec): number => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
export const norm = (a: Vec): Vec => {
  const l = Math.hypot(a.x, a.y);
  return l < 1e-9 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
};
export const fromAngle = (ang: number, mag = 1): Vec => ({ x: Math.cos(ang) * mag, y: Math.sin(ang) * mag });
export const angleOf = (a: Vec): number => Math.atan2(a.y, a.x);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const clamp = (x: number, lo: number, hi: number): number => (x < lo ? lo : x > hi ? hi : x);
export const clamp01 = (x: number): number => clamp(x, 0, 1);
export const smoothstep = (t: number): number => { const c = clamp01(t); return c * c * (3 - 2 * c); };
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - clamp01(t), 3);
export const easeOutBack = (t: number): number => { const c = clamp01(t); const s = 1.70158; return 1 + (s + 1) * Math.pow(c - 1, 3) + s * Math.pow(c - 1, 2); };
export const TAU = Math.PI * 2;

/** Smallest signed difference between two angles. */
export const angleDiff = (a: number, b: number): number => {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
};

/** Move value toward target by at most `step`. */
export const approach = (cur: number, target: number, step: number): number =>
  cur < target ? Math.min(cur + step, target) : Math.max(cur - step, target);

/** Exponential damping factor for frame-rate independent lerps. */
export const damp = (rate: number, dt: number): number => 1 - Math.exp(-rate * dt);

/** Distance from point p to segment ab. */
export function pointSegDist(p: Vec, a: Vec, b: Vec): number {
  const abx = b.x - a.x, aby = b.y - a.y;
  const l2 = abx * abx + aby * aby;
  if (l2 < 1e-9) return dist(p, a);
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / l2;
  t = clamp01(t);
  return Math.hypot(p.x - (a.x + abx * t), p.y - (a.y + aby * t));
}
