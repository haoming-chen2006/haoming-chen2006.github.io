/**
 * A motif, turned into the parts that draw it.
 *
 * Five layers, always in this order, because DOM order is paint order and
 * nothing here uses `z-index`:
 *
 *   ground   the field behind the seat
 *   brush    the skill's own first character, huge and ghosted
 *   figure   the principal form
 *   swarm    the particles
 *   plaque   the name  (added by `plan.ts`, which owns the kingdom framing)
 *
 * The root carries one class per slot — `fk-fig--veil fk-sw--drop fk-fly--rise
 * fk-gr--ripple fk-tempo--slow` — so every slot's CSS is a selector that
 * composes with every other slot's and no combination needs a rule of its own.
 * That is the property that makes 537 skills affordable: the stylesheet grows
 * with the vocabulary, not with the roster.
 *
 * SVG only where a path is genuinely needed. Nine figures are brush strokes, a
 * web, a chain, a lens, a balance, a net, a coil and the two seals inherited
 * from the category layer; everything else is gradients, `clip-path` and
 * `border-radius`, which cost a line each instead of a hundred bytes each.
 */
import {
  PALETTES, resolveMotif, swarmCount,
  type Figure, type Motif, type ResolvedMotif,
} from './motif';
import type { Part } from './plan';

/* ------------------------------------------------------------------- svgs */

/**
 * Two or three strokes of a brush, laid down in the order a hand would lay
 * them. The dash offsets in the CSS draw each one from its start.
 */
const STROKES = `<svg viewBox="0 0 120 120" aria-hidden="true">
<path class="fk-spec-ln fk-spec-ln--1" d="M16 30c22-9 58-11 88-4"/>
<path class="fk-spec-ln fk-spec-ln--2" d="M60 16c-4 30-6 62-2 90"/>
<path class="fk-spec-ln fk-spec-ln--3" d="M22 88c26 10 54 8 78-6"/>
</svg>`;

/** Radial threads with cross-strands drawn between them. */
const WEB = `<svg viewBox="0 0 120 120" aria-hidden="true">
<g class="fk-spec-ln fk-spec-ln--1">
<path d="M60 60L60 4M60 60l40-40M60 60h56M60 60l40 40M60 60v56M60 60l-40 40M60 60H4M60 60L20 20"/>
</g>
<g class="fk-spec-ln fk-spec-ln--2">
<path d="M60 22l27 11 11 27-11 27-27 11-27-11-11-27 11-27z"/>
<path d="M60 40l14 6 6 14-6 14-14 6-14-6-6-14 6-14z"/>
</g>
</svg>`;

/** Links drawing taut along the horizontal, so a rotation aims the whole run. */
const CHAIN = `<svg viewBox="0 0 120 120" aria-hidden="true">
<g class="fk-spec-ln fk-spec-ln--1">
<ellipse cx="16" cy="60" rx="13" ry="8"/>
<ellipse cx="60" cy="60" rx="13" ry="8"/>
<ellipse cx="104" cy="60" rx="13" ry="8"/>
</g>
<g class="fk-spec-ln fk-spec-ln--2">
<ellipse cx="38" cy="60" rx="8" ry="13"/>
<ellipse cx="82" cy="60" rx="8" ry="13"/>
</g>
</svg>`;

/** A lens that opens: two arcs meeting at the corners, with a pupil. */
const EYE = `<svg viewBox="0 0 120 120" aria-hidden="true">
<path class="fk-spec-ln fk-spec-ln--1" d="M8 60c22-30 82-30 104 0-22 30-82 30-104 0z"/>
<circle class="fk-spec-core" cx="60" cy="60" r="15"/>
<path class="fk-spec-ln fk-spec-ln--2" d="M60 22v-14M28 32L20 20M92 32l8-12M60 98v14M28 88l-8 12M92 88l8 12"/>
</svg>`;

/** A balance: a beam on a fulcrum, with a pan hung at each end. */
const SCALE = `<svg viewBox="0 0 120 120" aria-hidden="true">
<g class="fk-spec-beam">
<path class="fk-spec-ln fk-spec-ln--1" d="M14 44h92"/>
<path class="fk-spec-ln fk-spec-ln--2" d="M14 44v22M106 44v22"/>
<path class="fk-spec-ln fk-spec-ln--1" d="M2 66h24M94 66h24"/>
</g>
<path class="fk-spec-ln fk-spec-ln--2" d="M60 44v52M40 104h40"/>
</svg>`;

/** A net: a diamond mesh that falls and draws shut. */
const NET = `<svg viewBox="0 0 120 120" aria-hidden="true">
<g class="fk-spec-ln fk-spec-ln--1">
<path d="M60 2L2 60l58 58 58-58z"/>
<path d="M60 30L30 60l30 30 30-30z"/>
</g>
<g class="fk-spec-ln fk-spec-ln--2">
<path d="M31 31l58 58M89 31L31 89M60 2v116M2 60h116"/>
</g>
</svg>`;

/** A ribbon winding round the seat, drawn as one continuous serpentine. */
const COIL = `<svg viewBox="0 0 120 120" aria-hidden="true">
<path class="fk-spec-ln fk-spec-ln--1"
  d="M12 96c0-26 96-26 96-52S24 22 24 48s84 22 84 48"/>
<path class="fk-spec-ln fk-spec-ln--2"
  d="M20 92c2-20 88-22 88-44"/>
</svg>`;

/** The rune seal, kept from the category layer. */
const SIGIL = `<svg viewBox="0 0 120 120" aria-hidden="true">
<circle class="fk-spec-ring fk-spec-ring--out" cx="60" cy="60" r="52"/>
<circle class="fk-spec-ring fk-spec-ring--in" cx="60" cy="60" r="34"/>
<g class="fk-spec-spokes">
<path d="M60 4v18M60 98v18M4 60h18M98 60h18"/>
<path d="M20 20l13 13M100 20L87 33M20 100l13-13M100 100L87 87"/>
</g>
<path class="fk-spec-core" d="M60 40l14 20-14 20-14-20z"/>
</svg>`;

/** The guard hexagon, kept from the category layer. */
const AEGIS = `<svg viewBox="0 0 120 120" aria-hidden="true">
<path class="fk-spec-ln fk-spec-ln--1" d="M60 8l45 26v52L60 112 15 86V34z"/>
<path class="fk-spec-ln fk-spec-ln--2" d="M60 26l30 17v34L60 94 30 77V43z"/>
</svg>`;

/**
 * How many nodes a figure is drawn out of, and the markup for the ones that
 * need a path.
 *
 * A count above one is not decoration: `rings` IS three rings, `bloom` IS six
 * petals, `gate` IS two panels. Each copy gets `--fk-i` and `--fk-n` from
 * `paint.ts`, so the CSS stages them off their own index.
 */
const FIGURE_SHAPE: Readonly<Record<Figure, { n: number; svg?: string }>> = {
  none: { n: 0 },
  veil: { n: 3 },
  wave: { n: 1 },
  ring: { n: 1 },
  rings: { n: 3 },
  halo: { n: 1 },
  orb: { n: 1 },
  column: { n: 1 },
  sweep: { n: 1 },
  fan: { n: 6 },
  lattice: { n: 1 },
  spiral: { n: 2 },
  crescent: { n: 1 },
  wedge: { n: 1 },
  strokes: { n: 1, svg: STROKES },
  chain: { n: 1, svg: CHAIN },
  web: { n: 1, svg: WEB },
  moon: { n: 1 },
  star: { n: 1 },
  banner: { n: 1 },
  gate: { n: 2 },
  mirror: { n: 2 },
  coil: { n: 1, svg: COIL },
  bloom: { n: 6 },
  eye: { n: 1, svg: EYE },
  scale: { n: 1, svg: SCALE },
  net: { n: 1, svg: NET },
  pillars: { n: 5 },
  sigil: { n: 1, svg: SIGIL },
  aegis: { n: 1, svg: AEGIS },
};

/* --------------------------------------------------------------- composing */

/** The root classes that select every slot's CSS. */
export function motifClasses(m: ResolvedMotif): string {
  return [
    'fk-spec--sig',
    `fk-fig--${m.figure}`,
    `fk-sw--${m.swarm}`,
    `fk-fly--${m.flight}`,
    `fk-gr--${m.ground}`,
    `fk-tempo--${m.tempo}`,
  ].join(' ');
}

/** The custom properties a motif sets. Colours, and the axis it works along. */
export function motifVars(m: ResolvedMotif): Record<string, string> {
  const a = PALETTES[m.hue];
  const b = PALETTES[m.hue2];
  return {
    '--fk-spec-rgb': a.rgb,
    '--fk-spec-lit': a.lit,
    '--fk-spec-rgb2': b.rgb,
    '--fk-spec-lit2': b.lit,
    '--fk-spec-turn': `${m.turn}deg`,
    '--fk-spec-spread': `${m.spread}`,
  };
}

/**
 * The first character of the skill's own name, for the brushed glyph.
 *
 * It is the engine's translated name, so in a Chinese room it is a Han
 * character already in the shipped font subset — the plaque under this effect
 * is printing the same string — and in an English room it is a capital, which
 * reads as a monogram rather than as a mistake. Combining marks are stripped so
 * an accented Latin name does not brush a floating diacritic.
 */
export function brushChar(label: string): string {
  const first = [...(label ?? '').trim().normalize('NFD').replace(/\p{M}/gu, '')][0];
  if (!first) return '';
  return /[a-z]/.test(first) ? first.toUpperCase() : first;
}

/**
 * The parts of a designed skill effect, ground first and swarm last.
 *
 * The plaque is NOT here: `plan.ts` adds it, because the plaque is the kingdom's
 * surface and a motif knows nothing about kingdoms.
 */
export function motifParts(raw: Motif, label: string): Part[] {
  const m = resolveMotif(raw);
  const parts: Part[] = [];

  if (m.ground !== 'none') parts.push({ cls: 'fk-spec__ground' });

  if (m.glyph) {
    const ch = brushChar(label);
    // A glyph with nothing in it is a node that paints a shadow over the seat
    // for no reason. An empty skill name is not hypothetical: `tr()` answers
    // with the key, and a key can be missing.
    if (ch) parts.push({ cls: 'fk-spec__brush', text: ch });
  }

  const shape = FIGURE_SHAPE[m.figure];
  if (shape.n > 0) {
    parts.push({ cls: 'fk-spec__fig', n: shape.n, svg: shape.svg });
  }

  const n = swarmCount(m);
  if (n > 0) parts.push({ cls: 'fk-spec__swarm', n });

  return parts;
}
