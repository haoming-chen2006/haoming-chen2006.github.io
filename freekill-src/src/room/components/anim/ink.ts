/**
 * Brush strokes, from centre-lines.
 *
 * WHY A STROKE ENGINE AND NOT SVG `stroke`. Everything this library has to draw
 * is an OBJECT — a horse, a guandao, a trigram wheel, a rattan cuirass — and an
 * object has to read in silhouette at a 90 px seat photo before it reads in
 * colour. SVG's own `stroke` is a constant width, so a shape built from it is a
 * wire diagram: technically the right outline, visually a bent paperclip. What
 * reads at that size is weight — a thick belly and a tip that comes to nothing,
 * which is exactly what a brush does and exactly what the 水墨 register these
 * cards come from is made of.
 *
 * So a glyph here is a handful of CENTRE-LINES with a width at each point, and
 * this module turns each one into a filled outline: offset both sides along the
 * normal, join them with a Catmull-Rom-derived cubic so the edge is smooth
 * rather than faceted, and cap the ends. A width of 0 at an end makes the cap
 * collapse to a point, which is a brush leaving the paper.
 *
 * WHY THIS IS CHEAP. The path data is generated; what ships is the point list —
 * integers, four to ten points a stroke, three to eight strokes a glyph. A horse
 * is about 300 bytes of source and draws at any size on any panel. The 22
 * upstream sprite sheets cost 15.6 MB of PNG for 22 fixed-size results.
 *
 * WHAT THE COMPOSITOR SEES. Nothing in here animates. A glyph is built once,
 * and `effects.css` moves the element it lives in with `transform` and
 * `opacity` like everything else.
 */

/** `x, y, halfWidth` repeated. Integers, in the glyph's own viewBox units. */
export type Line = readonly number[];

/** One glyph: its viewBox, and the strokes that make it. */
export interface Glyph {
  /** `w h`. The box is always anchored at 0 0. */
  readonly box: readonly [number, number];
  /** Filled brush strokes, painted in order. */
  readonly ink: readonly Line[];
  /** Closed brush loops — a rim, a boss, a wheel. A closed centre-line handed
   *  to `ink` comes out as a SPIRAL, because a brush has two ends; these go
   *  through `loop` instead, which wraps the tangent and has none. */
  readonly rings?: readonly Line[];
  /**
   * Raw filled outlines, painted with the ink.
   *
   * A brush stroke is a swept width and is the right tool for anything
   * gestural — a horse's leg, a tassel, a mane. It is the wrong tool for
   * anything with a definite hard shape: an axe bit, a shield body, a peach.
   * Those are outlines, and pretending they are strokes produces a blob. Both
   * passes share one `<path>`, so this costs nothing.
   */
  readonly fill?: readonly string[];
  /** Strokes painted in the highlight colour over the ink — a blade's edge,
   *  a horse's mane, the lit rim of a shield. Optional. */
  readonly lit?: readonly Line[];
  /** Outlines painted with `lit`. Same reason `fill` exists. */
  readonly litFill?: readonly string[];
  /** Thin constant-width detail in the KEY colour: fletching, chain links,
   *  rivets. A real SVG stroke, because at this weight a taper is invisible and
   *  a centre-line is half the numbers. */
  readonly thin?: readonly { readonly d: string; readonly w: number }[];
  /** The same, in the DEEP colour, drawn over the fill: a weave, a panel seam,
   *  a grip wrap. Detail that has to read as a groove rather than as an
   *  addition, which a key-coloured line over a key-coloured body cannot. */
  readonly cut?: readonly { readonly d: string; readonly w: number }[];
}

const P2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The filled outline of one brush stroke.
 *
 * Two passes over the centre-line — up the left offsets and back down the right
 * — with the corner between them rounded off by the half-width, so a stroke
 * that starts wide starts with a dome and one that starts at zero starts with a
 * point. Catmull-Rom tangents give the offsets the same curvature as the line
 * they came from; with straight line segments a 6-point stroke reads as a
 * hexagon.
 */
export function brush(line: Line): string {
  const n = (line.length / 3) | 0;
  if (n < 2) return '';
  const px: number[] = [], py: number[] = [], pw: number[] = [];
  for (let i = 0; i < n; i += 1) {
    px.push(line[i * 3]); py.push(line[i * 3 + 1]); pw.push(line[i * 3 + 2]);
  }

  // Unit normal at each knot, from the Catmull-Rom tangent. The endpoints use
  // the one-sided difference so a stroke does not curl at its own tip.
  const nx: number[] = [], ny: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
    const tx = px[b] - px[a], ty = py[b] - py[a];
    const len = Math.hypot(tx, ty) || 1;
    nx.push(-ty / len); ny.push(tx / len);
  }

  const side = (sign: number, from: number, to: number): string => {
    const step = to > from ? 1 : -1;
    const ox: number[] = [], oy: number[] = [];
    for (let i = from; ; i += step) {
      ox.push(px[i] + nx[i] * pw[i] * sign);
      oy.push(py[i] + ny[i] * pw[i] * sign);
      if (i === to) break;
    }
    return curve(ox, oy);
  };

  const start = `M${P2(px[0] + nx[0] * pw[0])} ${P2(py[0] + ny[0] * pw[0])}`;
  const down = side(1, 0, n - 1);
  // The cap: a half-circle of the end's own half-width, so a fat end is domed
  // and a zero-width end is a point that costs nothing.
  const endCap = pw[n - 1] > 0.05
    ? `A${P2(pw[n - 1])} ${P2(pw[n - 1])} 0 0 1 ${P2(px[n - 1] - nx[n - 1] * pw[n - 1])} ${P2(py[n - 1] - ny[n - 1] * pw[n - 1])}`
    : '';
  const back = side(-1, n - 1, 0);
  const startCap = pw[0] > 0.05
    ? `A${P2(pw[0])} ${P2(pw[0])} 0 0 1 ${P2(px[0] + nx[0] * pw[0])} ${P2(py[0] + ny[0] * pw[0])}`
    : '';
  return `${start}${down}${endCap}${back}${startCap}Z`;
}

/** Catmull-Rom through the points, emitted as cubics. */
function curve(x: readonly number[], y: readonly number[]): string {
  const n = x.length;
  if (n < 2) return '';
  let d = '';
  for (let i = 0; i < n - 1; i += 1) {
    const a = Math.max(0, i - 1), b = i, c = i + 1, e = Math.min(n - 1, i + 2);
    d += `C${P2(x[b] + (x[c] - x[a]) / 6)} ${P2(y[b] + (y[c] - y[a]) / 6)}`
      + ` ${P2(x[c] - (x[e] - x[b]) / 6)} ${P2(y[c] - (y[e] - y[b]) / 6)}`
      + ` ${P2(x[c])} ${P2(y[c])}`;
  }
  return d;
}

/**
 * A closed brush loop — a ring, a wheel rim, a shield boss.
 *
 * Same offsets, but the tangent wraps, so there is no cap and no seam. The
 * inner ring is wound BACKWARDS so the pair reads as a band under `fill-rule:
 * nonzero`. Nonzero rather than evenodd because every other path in a glyph is
 * a brush stroke, several of them share one `<path>`, and where two strokes
 * cross — which is most of a horse — evenodd punches a hole in the overlap.
 */
export function loop(line: Line): string {
  const n = (line.length / 3) | 0;
  if (n < 3) return '';
  const px: number[] = [], py: number[] = [], pw: number[] = [];
  for (let i = 0; i < n; i += 1) {
    px.push(line[i * 3]); py.push(line[i * 3 + 1]); pw.push(line[i * 3 + 2]);
  }
  const nx: number[] = [], ny: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i - 1 + n) % n, b = (i + 1) % n;
    const tx = px[b] - px[a], ty = py[b] - py[a];
    const len = Math.hypot(tx, ty) || 1;
    nx.push(-ty / len); ny.push(tx / len);
  }
  const ring = (sign: number, back: boolean): string => {
    const ox: number[] = [], oy: number[] = [];
    for (let i = 0; i <= n; i += 1) {
      const k = back ? (n - (i % n)) % n : i % n;
      ox.push(px[k] + nx[k] * pw[k] * sign);
      oy.push(py[k] + ny[k] * pw[k] * sign);
    }
    return `M${P2(ox[0])} ${P2(oy[0])}${curve(ox, oy)}Z`;
  };
  return `${ring(1, false)}${ring(-1, true)}`;
}

/** An `n`-gon as a closed centre-line, for `loop`. `r` is the circumradius. */
export function polyLine(cx: number, cy: number, r: number, n: number, w: number, turn = 0): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2 + turn;
    out.push(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), w);
  }
  return out;
}

/** A circle as a closed centre-line. Twelve knots is round at any seat size. */
export function ringLine(cx: number, cy: number, r: number, w: number): number[] {
  return polyLine(cx, cy, r, 12, w);
}
