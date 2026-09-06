// Small vector helpers shared by sim and render. No three.js here.
export interface Vec3 { x: number; y: number; z: number }
export interface Vec2 { x: number; z: number }

export const v3 = (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z });
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const TAU = Math.PI * 2;
/** Wrap an angle to (-PI, PI]. */
export const wrapAngle = (a: number) => {
  a = a % TAU;
  if (a > Math.PI) a -= TAU;
  if (a <= -Math.PI) a += TAU;
  return a;
};
/** Move angle `a` toward `b` by at most `max` radians. */
export const approachAngle = (a: number, b: number, max: number) => {
  const d = wrapAngle(b - a);
  return Math.abs(d) <= max ? b : a + Math.sign(d) * max;
};
/** Exponential damping toward target: frame-rate independent. */
export const damp = (a: number, b: number, lambda: number, dt: number) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const dampAngle = (a: number, b: number, lambda: number, dt: number) => a + wrapAngle(b - a) * (1 - Math.exp(-lambda * dt));

/** Forward unit vector for a yaw. yaw=0 faces +Z; yaw=PI/2 faces +X. */
export const forwardFromYaw = (yaw: number): Vec3 => ({ x: Math.sin(yaw), y: 0, z: Math.cos(yaw) });
export const yawFromDir = (x: number, z: number) => Math.atan2(x, z);
export const dist2 = (a: { x: number; z: number }, b: { x: number; z: number }) => {
  const dx = a.x - b.x, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
};
export const dist3 = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
export const len2 = (x: number, z: number) => Math.sqrt(x * x + z * z);
