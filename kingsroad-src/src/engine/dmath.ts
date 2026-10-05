// Deterministic transcendental functions built only from IEEE-754 exact operations
// (+ - * / sqrt floor and comparisons), so results are bit-identical across JS engines.
// Reductions and polynomial coefficients follow fdlibm (k_sin.c, k_cos.c, s_atan.c, e_exp.c).

export const DMATH_VERSION = 1;

const PI = 3.14159265358979311600e+00;
const PI_LO = 1.22464679914735317720e-16;
const PIO2 = 1.57079632679489655800e+00;
const PIO4 = 7.85398163397448278999e-01;
const PI3O4 = 2.35619449019234483700e+00;

// π/2 split so k * PIO2_HI is exact for |k| < 2^21 (PIO2_HI has 33 significant bits).
const INV_PIO2 = 6.36619772367581382433e-01;
const PIO2_HI = 1.57079632673412561417e+00;
const PIO2_LO = 6.07710050650619224932e-11;

const S1 = -1.66666666666666324348e-01, S2 = 8.33333333332248946124e-03, S3 = -1.98412698298579493134e-04;
const S4 = 2.75573137070700676789e-06, S5 = -2.50507602534068634195e-08, S6 = 1.58969099521155010221e-10;
const C1 = 4.16666666666666019037e-02, C2 = -1.38888888888741095749e-03, C3 = 2.48015872894767294178e-05;
const C4 = -2.75573143513906633035e-07, C5 = 2.08757232129817482790e-09, C6 = -1.13596475577881948265e-11;

/** sin on [-π/4, π/4] (degree 13). */
const ksin = (x: number): number => {
  if (x > -7.450580596923828e-09 && x < 7.450580596923828e-09) return x;
  const z = x * x, v = z * x;
  const r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)));
  return x + v * (S1 + z * r);
};

/** cos on [-π/4, π/4] (degree 14). */
const kcos = (x: number): number => {
  const z = x * x;
  const r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))));
  const hz = 0.5 * z, w = 1 - hz;
  return w + ((1 - w - hz) + z * r);
};

export function dsin(x: number): number {
  if (x - x !== 0) return NaN;
  if (x > -PIO4 && x < PIO4) return ksin(x);
  const k = Math.floor(x * INV_PIO2 + 0.5);
  const r = (x - k * PIO2_HI) - k * PIO2_LO;
  switch (k & 3) {
    case 0: return ksin(r);
    case 1: return kcos(r);
    case 2: return -ksin(r);
    default: return -kcos(r);
  }
}

export function dcos(x: number): number {
  if (x - x !== 0) return NaN;
  if (x > -PIO4 && x < PIO4) return kcos(x);
  const k = Math.floor(x * INV_PIO2 + 0.5);
  const r = (x - k * PIO2_HI) - k * PIO2_LO;
  switch (k & 3) {
    case 0: return kcos(r);
    case 1: return -ksin(r);
    case 2: return -kcos(r);
    default: return ksin(r);
  }
}

const ATAN_HI = [4.63647609000806093515e-01, 7.85398163397448278999e-01, 9.82793723247329054082e-01, 1.57079632679489655800e+00];
const ATAN_LO = [2.26987774529616870924e-17, 3.06161699786838301793e-17, 1.39033110312309984516e-17, 6.12323399573676603587e-17];
const AT0 = 3.33333333333329318027e-01, AT1 = -1.99999999998764832476e-01, AT2 = 1.42857142725034663711e-01;
const AT3 = -1.11111104054623557880e-01, AT4 = 9.09088713343650656196e-02, AT5 = -7.69187620504482999495e-02;
const AT6 = 6.66107313738753120669e-02, AT7 = -5.83357013379057348645e-02, AT8 = 4.97687799461593236017e-02;
const AT9 = -3.65315727442169155270e-02, AT10 = 1.62858201153657823623e-02;

export function datan(x: number): number {
  if (x !== x) return NaN;
  const neg = x < 0;
  let t = neg ? -x : x, id = -1;
  if (t < 1.862645149230957e-09) return x;
  if (t >= 0.4375) {
    if (t < 1.1875) {
      if (t < 0.6875) { id = 0; t = (2 * t - 1) / (2 + t); } else { id = 1; t = (t - 1) / (t + 1); }
    } else if (t < 2.4375) { id = 2; t = (t - 1.5) / (1 + 1.5 * t); } else { id = 3; t = -1 / t; }
  } else t = x;
  const z = t * t, w = z * z;
  const s1 = z * (AT0 + w * (AT2 + w * (AT4 + w * (AT6 + w * (AT8 + w * AT10)))));
  const s2 = w * (AT1 + w * (AT3 + w * (AT5 + w * (AT7 + w * AT9))));
  if (id < 0) return t - t * (s1 + s2);
  const r = ATAN_HI[id] - ((t * (s1 + s2) - ATAN_LO[id]) - t);
  return neg ? -r : r;
}

/** Same conventions as Math.atan2, including signed zeros and infinities. */
export function datan2(y: number, x: number): number {
  if (x !== x || y !== y) return NaN;
  if (x === 1) return datan(y);
  const ys = y < 0 || (y === 0 && 1 / y < 0), xs = x < 0 || (x === 0 && 1 / x < 0);
  if (y === 0) return xs ? (ys ? -PI : PI) : y;
  if (x === 0) return ys ? -PIO2 : PIO2;
  const ax = xs ? -x : x, ay = ys ? -y : y;
  if (ax === Infinity) {
    if (ay === Infinity) return xs ? (ys ? -PI3O4 : PI3O4) : ys ? -PIO4 : PIO4;
    return xs ? (ys ? -PI : PI) : ys ? -0 : 0;
  }
  if (ay === Infinity) return ys ? -PIO2 : PIO2;
  const z = datan(ay / ax);
  if (!xs) return ys ? -z : z;
  return ys ? (z - PI_LO) - PI : PI - (z - PI_LO);
}

const LN2_HI = 6.93147180369123816490e-01, LN2_LO = 1.90821492927058770002e-10, INV_LN2 = 1.44269504088896338700e+00;
const P1 = 1.66666666666666019037e-01, P2 = -2.77777777770155933842e-03, P3 = 6.61375632143793436117e-05;
const P4 = -1.65339022054652515390e-06, P5 = 4.13813679705723846039e-08;

// POW2[k + 1074] === 2^k for k in [-1074, 1023]; every entry is exact.
const POW2 = new Float64Array(2098);
{
  let p = 1;
  for (let k = 0; k <= 1023; k++) { POW2[k + 1074] = p; p *= 2; }
  p = 1;
  for (let k = -1; k >= -1074; k--) { p *= 0.5; POW2[k + 1074] = p; }
}

export function dexp(x: number): number {
  if (x !== x) return NaN;
  if (x > 7.09782712893383973096e+02) return Infinity;
  if (x < -7.45133219101941108420e+02) return 0;
  const ax = x < 0 ? -x : x;
  if (ax < 3.72529029846191406250e-09) return 1 + x;
  let k = 0, hi = x, lo = 0;
  if (ax > 3.46573590279972654709e-01) {
    k = Math.floor(x * INV_LN2 + 0.5);
    hi = x - k * LN2_HI;
    lo = k * LN2_LO;
  }
  const r = hi - lo, t = r * r;
  const c = r - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))));
  if (k === 0) return 1 - ((r * c) / (c - 2) - r);
  const y = 1 - ((lo - (r * c) / (2 - c)) - hi);
  if (k > 1023) return y * POW2[2097] * 2;
  if (k < -1021) return (y * POW2[k + 2074]) * POW2[74];
  return y * POW2[k + 1074];
}

export const dhypot = (x: number, y: number): number => Math.sqrt(x * x + y * y);

/** x^n for integer n >= 0 by square-and-multiply. */
export function dpowi(x: number, n: number): number {
  let r = 1, b = x, e = Math.floor(n);
  while (e > 0) {
    if (e % 2 === 1) r *= b;
    b *= b;
    e = Math.floor(e / 2);
  }
  return r;
}
