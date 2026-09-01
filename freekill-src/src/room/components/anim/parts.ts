/**
 * The pieces every card effect is built out of.
 *
 * WHY NOT MORE SPRITE FRAMES. The 22 shipped card sheets cost 15.6 MB of source
 * PNG to produce 22 fixed-size, fixed-colour results, and 53 cards want 53. They
 * also cannot be tinted: a 火杀 and a 雷杀 are the same drawing in the upstream
 * art with a different palette baked in, which is one sheet each. Everything
 * here is a handful of divs and one SVG path, sized from the measured photo and
 * coloured from a custom property, so 杀 / 火杀 / 雷杀 are one recipe and three
 * palettes, they are sharp on a 4K panel and on a 13" laptop, and the whole
 * library adds nothing to the transfer.
 *
 * WHAT THE COMPOSITOR IS ALLOWED TO SEE. Every keyframe in `effects.css`
 * animates `transform` and `opacity` and nothing else. `filter` appears only as
 * a static declaration, never in a keyframe, because an animated blur is a
 * full-raster repaint per frame and eight seats cannot afford one. Particles are
 * positioned once and moved by transform; nothing here reads layout after the
 * effect is built, so an effect costs one style recalc and then runs on the
 * compositor while the Lua VM has the main thread.
 *
 * HOW A PART IS PARAMETERISED. Angles, distances, delays and colours cross into
 * CSS as custom properties on each node, so one keyframe rule drives fourteen
 * shards that all move differently. That is the whole trick: the variety is in
 * the numbers, the motion is in one place, and adding a card costs a recipe
 * rather than a stylesheet.
 */

/** Every length is a multiple of this — the measured photo width. See `Scene`. */
export interface Scene {
  /** The unit. One `u` is the width of a seat photo at the current table size. */
  readonly u: number;
  /** Source-to-target span in px, for `link` builders. 0 for the others. */
  readonly span: number;
  /** Source-to-target bearing in degrees, for `link` builders. */
  readonly angle: number;
  /** Which target this is, and how many there are. Lets a build stagger itself. */
  readonly index: number;
  readonly count: number;
}

export type Build = (root: HTMLElement, s: Scene) => void;

/* ------------------------------------------------------------------ atoms */

type Props = Record<string, string | number>;

/** A part. `cls` is styled by `effects.css`; `props` are its custom properties. */
export function part(cls: string, props?: Props): HTMLElement {
  const e = document.createElement('i');
  e.className = cls;
  if (props) for (const k in props) e.style.setProperty(`--${k}`, String(props[k]));
  return e;
}

export function add(root: HTMLElement, cls: string, props?: Props): HTMLElement {
  const e = part(cls, props);
  root.appendChild(e);
  return e;
}

const NS = 'http://www.w3.org/2000/svg';

/**
 * An SVG overlay in the part's own coordinate space.
 *
 * `viewBox` plus `preserveAspectRatio="none"` where a shape should stretch with
 * the span, and a plain square box where it should not. Paths are the one thing
 * CSS genuinely cannot draw — a lightning fork, a chain, a seal — and one path
 * with a `stroke-dasharray` reveal is cheaper than a sprite strip and sharper
 * than either.
 */
export function svg(root: HTMLElement, cls: string, viewBox: string, stretch = false): SVGSVGElement {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('class', cls);
  s.setAttribute('viewBox', viewBox);
  if (stretch) s.setAttribute('preserveAspectRatio', 'none');
  root.appendChild(s);
  return s;
}

export function path(into: SVGSVGElement, d: string, cls?: string, props?: Props): SVGPathElement {
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', d);
  // Normalised length, so every dash-reveal in `effects.css` is the same
  // `stroke-dasharray: 1; stroke-dashoffset: 1 -> 0` regardless of the path.
  p.setAttribute('pathLength', '1');
  if (cls) p.setAttribute('class', cls);
  if (props) for (const k in props) p.style.setProperty(`--${k}`, String(props[k]));
  into.appendChild(p);
  return p;
}

/** Uniform in `[lo, hi)`. Variety, not a decision — see the module header. */
export function rnd(lo: number, hi: number): number {
  return lo + Math.random() * (hi - lo);
}

const round = (n: number) => Math.round(n * 100) / 100;

/* ------------------------------------------------------------- primitives */

export interface BurstOpts {
  /** Particles. Fourteen is the point where a burst reads as debris rather
   *  than as a countable row of dots; past twenty nothing is added. */
  readonly n?: number;
  /** Bearing the cone points along, in degrees. Omit for a full circle. */
  readonly along?: number;
  /** Half-width of the cone, in degrees. */
  readonly spread?: number;
  /** Fling distance, in `u`. */
  readonly reach?: number;
  /** Shard length, in `u`. */
  readonly len?: number;
  readonly cls?: string;
  readonly delay?: number;
}

/**
 * Debris thrown out of an impact.
 *
 * A cone rather than a circle whenever the effect has a direction: a 杀 that
 * came in from the left throws its shards to the right, and that one detail is
 * most of what makes an impact read as an impact instead of a sparkle.
 */
export function burst(root: HTMLElement, s: Scene, o: BurstOpts = {}): void {
  const n = o.n ?? 14;
  const spread = o.spread ?? (o.along === undefined ? 180 : 52);
  const base = o.along ?? 0;
  const reach = (o.reach ?? 0.62) * s.u;
  const len = (o.len ?? 0.14) * s.u;
  for (let i = 0; i < n; i += 1) {
    // Spaced, then jittered: pure random clumps and leaves gaps, and a burst
    // with a gap in it looks like a bug rather than like debris.
    const t = (i + rnd(0.15, 0.85)) / n;
    add(root, o.cls ?? 'fx-shard', {
      a: `${round(base - spread + t * spread * 2)}deg`,
      r0: `${round(reach * rnd(0.1, 0.22))}px`,
      r1: `${round(reach * rnd(0.62, 1.25))}px`,
      l: `${round(len * rnd(0.55, 1.5))}px`,
      d: `${Math.round((o.delay ?? 0) + rnd(0, 90))}ms`,
      sp: round(rnd(0.5, 1.1)),
    });
  }
}

export interface MoteOpts {
  readonly n?: number;
  /** Where they drift, in `u`. Negative `dy` rises. */
  readonly dx?: number;
  readonly dy?: number;
  readonly size?: number;
  readonly spread?: number;
  readonly cls?: string;
  readonly delay?: number;
}

/**
 * Soft particles with a life of their own: embers rising, ash falling, petals,
 * grain. Slower and rounder than `burst`, and the aftermath rather than the
 * impact — the thing that is still happening when the flash has gone.
 */
export function motes(root: HTMLElement, s: Scene, o: MoteOpts = {}): void {
  const n = o.n ?? 9;
  const spread = (o.spread ?? 0.5) * s.u;
  for (let i = 0; i < n; i += 1) {
    add(root, o.cls ?? 'fx-mote', {
      x0: `${round(rnd(-spread, spread))}px`,
      y0: `${round(rnd(-spread * 0.4, spread * 0.4))}px`,
      dx: `${round(((o.dx ?? 0) + rnd(-0.24, 0.24)) * s.u)}px`,
      dy: `${round(((o.dy ?? -0.55) + rnd(-0.18, 0.18)) * s.u)}px`,
      sz: `${round((o.size ?? 0.05) * s.u * rnd(0.6, 1.5))}px`,
      d: `${Math.round((o.delay ?? 0) + rnd(0, 190))}ms`,
      sp: round(rnd(0.7, 1.3)),
    });
  }
}

/** An expanding ring. `n` of them, staggered, reads as a shockwave. */
export function rings(root: HTMLElement, s: Scene, n = 1, o: { size?: number; delay?: number; cls?: string } = {}): void {
  for (let i = 0; i < n; i += 1) {
    add(root, o.cls ?? 'fx-ring', {
      sz: `${round((o.size ?? 0.55) * s.u)}px`,
      d: `${Math.round((o.delay ?? 0) + i * 70)}ms`,
    });
  }
}

/** The white core of an impact: one hot flash that is gone in three frames. */
export function flash(root: HTMLElement, s: Scene, o: { size?: number; delay?: number; cls?: string } = {}): void {
  add(root, o.cls ?? 'fx-flash', {
    sz: `${round((o.size ?? 0.9) * s.u)}px`,
    d: `${Math.round(o.delay ?? 0)}ms`,
  });
}

/**
 * A blade's edge: a crescent swept through the target.
 *
 * Two of them crossed is the whole grammar of a 杀 landing, and an arc is a
 * curve — the one shape a rectangle of CSS cannot fake and an SVG path draws
 * for nothing.
 */
export function crescent(root: HTMLElement, s: Scene, o: { turn: number; size?: number; delay?: number; cls?: string } = { turn: 0 }): void {
  const r = (o.size ?? 0.58) * s.u;
  const box = r * 2;
  const wrap = add(root, `fx-crescent ${o.cls ?? ''}`.trim(), {
    sz: `${round(box)}px`,
    a: `${round(o.turn)}deg`,
    d: `${Math.round(o.delay ?? 0)}ms`,
  });
  const s2 = svg(wrap, 'fx-crescent__svg', '0 0 100 100');
  // A bow, not a ribbon: the belly is a fifth of the box wide and the two tips
  // come to nothing. The first draft was a thin sliver of a path and read on the
  // table as a white wisp — thickness is what makes it a blade.
  const OUTER = 'M8 8 C 54 12, 88 28, 89 50 C 88 72, 54 88, 8 92';
  path(s2, `${OUTER} C 52 76, 71 64, 71 50 C 71 36, 52 24, 8 8 Z`, 'fx-crescent__edge');
  path(s2, OUTER, 'fx-crescent__spine');
}

/**
 * A lightning fork from one end of the span to the other.
 *
 * Generated rather than drawn: the jitter is different every time, which is
 * what stops the fourth 雷杀 of a game from looking like a rerun of the first.
 * The wide blurred copy under the sharp one is the whole reason it reads as
 * light rather than as a grey line.
 */
export function bolt(root: HTMLElement, o: { segments?: number; forks?: number; sway?: number; cls?: string } = {}): void {
  const seg = o.segments ?? 7;
  const sway = o.sway ?? 13;
  const main = jag(0, 0, 100, 0, seg, sway);
  const wrap = add(root, `fx-bolt ${o.cls ?? ''}`.trim());
  const s2 = svg(wrap, 'fx-bolt__svg', '-6 -34 112 68', true);
  path(s2, main.d, 'fx-bolt__glow');
  path(s2, main.d, 'fx-bolt__core');
  for (let i = 0; i < (o.forks ?? 2); i += 1) {
    const at = main.pts[1 + Math.floor(rnd(0, main.pts.length - 2))];
    const end: [number, number] = [at[0] + rnd(6, 20), at[1] + rnd(-24, 24)];
    path(s2, jag(at[0], at[1], end[0], end[1], 3, sway * 0.7).d, 'fx-bolt__fork', { d: `${Math.round(rnd(20, 70))}ms` });
  }
}

function jag(x0: number, y0: number, x1: number, y1: number, seg: number, sway: number): { d: string; pts: [number, number][] } {
  const pts: [number, number][] = [[x0, y0]];
  for (let i = 1; i < seg; i += 1) {
    const t = i / seg;
    // The sway tapers to nothing at both ends so the bolt actually connects the
    // two points it was asked for rather than wandering off them.
    const taper = Math.sin(t * Math.PI);
    pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + rnd(-sway, sway) * taper]);
  }
  pts.push([x1, y1]);
  return { d: `M${pts.map(([x, y]) => `${round(x)} ${round(y)}`).join(' L')}`, pts };
}

/**
 * A taut chain between two points. `iron_chain` and nothing else, and worth a
 * primitive because a dashed stroke whose dash is a link is exactly a chain and
 * costs one path.
 */
export function chain(root: HTMLElement): void {
  const wrap = add(root, 'fx-chain');
  // The slack is a curve, so it is a path. The taut chain is a straight run of
  // identical links, so it is a repeating background on a div: a stroke dash
  // cannot draw a *ring*, and a row of dashes reads as a rope rather than as a
  // chain however carefully the lengths are chosen.
  const s2 = svg(wrap, 'fx-chain__svg', '0 -12 100 24', true);
  path(s2, 'M0 0 Q 50 9, 100 0', 'fx-chain__slack');
  add(wrap, 'fx-chain__taut');
}

/**
 * A rotating seal. The visual shorthand for a trick taking hold, and the reason
 * 乐不思蜀 and 无懈可击 read as something being *imposed* rather than as a
 * generic glow.
 */
export function seal(root: HTMLElement, s: Scene, o: { size?: number; sides?: number; delay?: number; cls?: string } = {}): void {
  const wrap = add(root, `fx-seal ${o.cls ?? ''}`.trim(), {
    sz: `${round((o.size ?? 1.05) * s.u)}px`,
    d: `${Math.round(o.delay ?? 0)}ms`,
  });
  const s2 = svg(wrap, 'fx-seal__svg', '0 0 100 100');
  const sides = o.sides ?? 6;
  const poly: string[] = [];
  for (let i = 0; i < sides; i += 1) {
    const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
    poly.push(`${round(50 + Math.cos(a) * 46)} ${round(50 + Math.sin(a) * 46)}`);
  }
  path(s2, `M${poly.join(' L')} Z`, 'fx-seal__rim');
  path(s2, 'M50 8 A42 42 0 0 1 50 92', 'fx-seal__sweep');
  // Ticks around the inner ring. Six is enough to read as machined; twenty-four
  // is a moire pattern at a 90px photo.
  for (let i = 0; i < sides; i += 1) {
    const a = (i / sides) * Math.PI * 2;
    const c = Math.cos(a), sn = Math.sin(a);
    path(s2, `M${round(50 + c * 28)} ${round(50 + sn * 28)} L${round(50 + c * 36)} ${round(50 + sn * 36)}`, 'fx-seal__tick');
  }
}

/**
 * The clean directional streak a projectile leaves. Lives inside `.fx-link`, so
 * its X axis already points at the target and it only has to travel.
 */
export function streak(root: HTMLElement, s: Scene, o: { cls?: string; delay?: number; thick?: number } = {}): void {
  add(root, `fx-streak ${o.cls ?? ''}`.trim(), {
    th: `${round((o.thick ?? 0.075) * s.u)}px`,
    d: `${Math.round(o.delay ?? 0)}ms`,
  });
}

/**
 * A container pinned at the far end of a link and turned back upright, so a
 * recipe can put an impact on the target while keeping the link's geometry.
 */
export function farEnd(root: HTMLElement): HTMLElement {
  return add(root, 'fx-far');
}

/** Card-shaped ghosts, for the cards a trick conjures, steals or hands out. */
export function ghosts(root: HTMLElement, s: Scene, n: number, o: { fan?: number; rise?: number; delay?: number } = {}): void {
  const fan = o.fan ?? 34;
  for (let i = 0; i < n; i += 1) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    add(root, 'fx-ghost', {
      w: `${round(0.3 * s.u)}px`,
      a: `${round(-fan + t * fan * 2)}deg`,
      dx: `${round((t - 0.5) * 1.15 * s.u)}px`,
      dy: `${round((o.rise ?? -0.42) * s.u)}px`,
      d: `${Math.round((o.delay ?? 0) + i * 55)}ms`,
    });
  }
}
