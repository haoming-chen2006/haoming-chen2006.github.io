/**
 * The vocabulary an individual skill is drawn in.
 *
 * WHY THIS EXISTS. `palette.ts` separates the engine's nine `skill_type`
 * categories, and it does that well: nine directions of motion, nine shapes,
 * no two alike. But nine is not 537. Across the 274 generals in this build
 * there are 537 distinct skills, and the engine's own field puts 97 of them in
 * `offensive`, 88 in `control`, 74 in `drawcard` — and 148 in nothing at all,
 * which `RoomLogic.js` reads as `special`. That is 160 skills, thirty percent
 * of the roster, sharing one rune seal. 洛神 and 集智 are both `drawcard`;
 * 反间 and 离间 and 武圣 are all `offensive`. They are not alike, and a
 * category cannot say so.
 *
 * WHY NOT 537 HAND-DRAWN EFFECTS. Because that is unmaintainable, weighs what
 * 537 hand-drawn effects weigh, and — worse — is not actually how the eye
 * separates things. What separates 洛神 from 集智 is not that somebody drew two
 * unrelated pictures. It is that one is a rippling veil of river light with
 * droplets rising off it, and the other is a fan of scholar's slips converging
 * on a seat. Four independent choices, each from a small vocabulary.
 *
 * So an effect is COMPOSED, from five slots that are drawn on five separate
 * layers and whose CSS never has to know about each other:
 *
 *   ground   what happens to the field behind the seat  (10 values)
 *   figure   the principal form, the thing you name      (30 values)
 *   swarm    what the particles ARE                      (22 values)
 *   flight   how those particles move                    (12 values)
 *   hue      the colour pair                             (28 values)
 *
 * plus `stance` (what the portrait itself does, 14 values), `tempo`, a count, an
 * axis, and an optional brushed glyph. Every one of those is one CSS selector
 * that composes with every other, so the file grows by the size of the
 * vocabulary and not by the size of the roster: thirty figures and twenty-two
 * swarms is fifty-two blocks of CSS and 660 pictures, before flight, ground,
 * colour or rhythm are chosen.
 *
 * THE GLYPH IS FREE. `glyph: true` brushes the skill's OWN first character huge
 * and ghosted behind the effect. Every character of every skill name is already
 * in the shipped font subset — the plaque prints it, the skill panel prints it —
 * so this adds no glyph to the subset and needs no font rebuild, and it is
 * per-skill by construction rather than by a table somebody has to maintain.
 *
 * NOTHING HERE IS A RULE. A motif is a drawing. It reads no state, knows
 * nothing about legality or targets, and is chosen by the skill name the engine
 * put on the wire — the same way `cards.ts` chooses a card's effect by the name
 * the engine put in the sound path. A skill with no motif still animates,
 * because the fallback is the category effect and the category effect is good.
 */

/* ------------------------------------------------------------------ colour */

/**
 * The colour pairs, named for what they are made of rather than for their hue.
 *
 * Two values each: `rgb` is the body of the effect and `lit` is the core and
 * the highlights. They are pairs and not ramps because every keyframe in this
 * lane interpolates between them with alpha, and a third stop would have to be
 * threaded through forty CSS blocks to be used twice.
 *
 * They are deliberately not evenly spaced around a wheel. A palette this lane
 * needs is one a Chinese card table would recognise — 朱 cinnabar, 墨 ink, 玉
 * jade, 霜 frost — and those cluster, because a rich red and a lacquer red are
 * two different things and both get used.
 */
export const PALETTES = {
  /* --- reds and fire ---------------------------------------------------- */
  /** 朱 — cinnabar, the seal-ink red. The default for anything martial. */
  cinnabar: { rgb: '236, 74, 58', lit: '255, 208, 172' },
  /** 血 — arterial, darker and wetter than cinnabar. Wounds and costs. */
  blood: { rgb: '196, 40, 48', lit: '255, 158, 148' },
  /** 焰 — open flame. */
  flame: { rgb: '255, 128, 36', lit: '255, 238, 168' },
  /** 烬 — embers dying, more brown than orange. */
  ember: { rgb: '214, 104, 46', lit: '255, 196, 128' },
  /** 胭脂 — rouge. Cosmetic red, for beauty rather than blood. */
  rouge: { rgb: '232, 92, 124', lit: '255, 214, 226' },
  /** 桃 — peach. Warm, soft, alive. Healing. */
  peach: { rgb: '255, 148, 138', lit: '255, 232, 214' },

  /* --- golds and earths -------------------------------------------------- */
  /** 金 — imperial gold. Lordship, decrees, the throne. */
  gold: { rgb: '240, 198, 84', lit: '255, 248, 216' },
  /** 琥珀 — amber. Warmer and softer than gold; wealth, not power. */
  amber: { rgb: '236, 166, 66', lit: '255, 230, 176' },
  /** 铜 — bronze. Armour, bells, ritual vessels. */
  bronze: { rgb: '198, 142, 78', lit: '246, 216, 168' },
  /** 曦 — first light. Pale warm gold with no metal in it. */
  dawn: { rgb: '255, 202, 150', lit: '255, 244, 226' },
  /** 骨 — bone. Dry, pale, dead. */
  bone: { rgb: '206, 192, 166', lit: '250, 244, 228' },
  /** 硫 — sulphur. Yellow-green, poisonous. */
  sulphur: { rgb: '198, 206, 70', lit: '244, 250, 176' },

  /* --- greens ------------------------------------------------------------ */
  /** 玉 — jade. Virtue, benevolence, gifts. */
  jade: { rgb: '108, 212, 148', lit: '236, 255, 226' },
  /** 松 — pine. Deep, still, old. */
  pine: { rgb: '62, 148, 106', lit: '182, 236, 196' },
  /** 青瓷 — celadon. Grey-green glaze; scholarship, ceramics, quiet. */
  celadon: { rgb: '146, 196, 178', lit: '234, 250, 240' },
  /** 铜绿 — verdigris. Corroded bronze; decay with a metal under it. */
  verdigris: { rgb: '76, 178, 168', lit: '198, 244, 236' },

  /* --- blues ------------------------------------------------------------- */
  /** 苍 — the blue of distance and of sky. */
  azure: { rgb: '96, 168, 248', lit: '224, 242, 255' },
  /** 靛 — indigo. Deeper, heavier, night-leaning. */
  indigo: { rgb: '84, 108, 220', lit: '198, 212, 255' },
  /** 霜 — frost. Almost white, with the cold left in. */
  frost: { rgb: '176, 232, 250', lit: '244, 254, 255' },
  /** 月 — moonlight. Silver-blue, the colour of a night scene. */
  moon: { rgb: '176, 200, 236', lit: '246, 250, 255' },
  /** 银 — silver. Metal, mirrors, coins, blades held still. */
  silver: { rgb: '206, 216, 226', lit: '255, 255, 255' },

  /* --- violets and darks -------------------------------------------------- */
  /** 紫 — violet. Court intrigue, omens, prophecy. */
  violet: { rgb: '172, 116, 244', lit: '234, 214, 255' },
  /** 兰 — orchid. Softer violet; grace, refinement. */
  orchid: { rgb: '196, 152, 232', lit: '244, 230, 255' },
  /** 梅 — plum blossom. Magenta-pink against winter. */
  plum: { rgb: '226, 104, 178', lit: '255, 218, 240' },
  /** 暮 — dusk. Purple over orange, the last light. */
  dusk: { rgb: '190, 108, 156', lit: '255, 200, 160' },
  /**
   * 玄 — the dark. Black-violet; what cannot be seen into.
   *
   * Lifted off its first value. The table is a dark green felt lit from above,
   * and a palette darker than the felt is not moody, it is missing: at
   * `96, 82, 136` a whole night raid rendered as a slightly different shade of
   * nothing. This is as dark as a body colour can be and still be a colour.
   */
  void: { rgb: '126, 106, 184', lit: '212, 196, 255' },
  /** 墨 — ink. Near-black body with a silver core, for writing and painting. */
  ink: { rgb: '78, 82, 96', lit: '226, 232, 240' },
  /** 灰 — ash-grey. Neutral, worn, unremarkable on purpose. */
  ash: { rgb: '150, 148, 142', lit: '236, 234, 228' },
} as const;

export type PaletteName = keyof typeof PALETTES;

/* ------------------------------------------------------------------ slots */

/**
 * The principal form. The thing a player would name if asked what they saw.
 *
 * Each is one block of CSS on `.fk-spec__fig`, and several take `n` copies so
 * that "three rings" and "one ring" are the same block with a different count.
 */
export const FIGURES = [
  /** No principal form at all — the swarm is the whole picture. Used where
   *  a single clean idea (falling snow, rising motes) is stronger alone. */
  'none',
  /** A translucent sheet drawn down across the seat, its lower edge rippling.
   *  Water, silk, moonlight on a river. */
  'veil',
  /** A broad crescent ground-wave rolling outward and flattening. */
  'wave',
  /** One hard ring punching out from the seat. */
  'ring',
  /** Nested rings leaving at staggered delays. */
  'rings',
  /** An arc opening over the head. Virtue, blessing, rank. */
  'halo',
  /** A core that swells and lets go. */
  'orb',
  /** A vertical shaft standing on the seat. Heaven's attention. */
  'column',
  /** A wide arc sweeping across the frame — a sleeve, a banner, a blade. */
  'sweep',
  /** Blades opening from one pivot, like a folding fan. */
  'fan',
  /** An orthogonal grid closing in and locking. Walls, order, refusal. */
  'lattice',
  /** A logarithmic arm turning about the seat. */
  'spiral',
  /** A thick curved blade, heavy at its middle. */
  'crescent',
  /** A hard triangular slam from one side. Cavalry, a rammed gate. */
  'wedge',
  /** Two or three calligraphic strokes crossing. Writing, painting, orders. */
  'strokes',
  /** A run of links drawing taut. */
  'chain',
  /** Radial threads with cross-strands between them. Schemes, traps. */
  'web',
  /** A disc with a shadow crossing it. Night, concealment, the moon. */
  'moon',
  /** A long-axis starburst with four short arms. */
  'star',
  /** A vertical banner unrolling from the top of the frame. */
  'banner',
  /** Two panels, sliding apart or shut. */
  'gate',
  /** The frame doubled and offset, one copy reversed. Deception, doubles. */
  'mirror',
  /** A serpentine ribbon winding around the seat. */
  'coil',
  /** Petals opening from the centre. */
  'bloom',
  /** A lens opening and closing. Watching, foresight, the eye of a storm. */
  'eye',
  /** A balance beam that tips and settles. */
  'scale',
  /** A net falling over the frame and drawing shut. */
  'net',
  /** A rank of vertical bars rising in sequence. Zither strings, a spear wall. */
  'pillars',
  /** The rune seal — two counter-turning dashed rings, spokes, a bright core.
   *  Kept from the category layer, because it is good and because a skill whose
   *  research says "an occult, unexplained thing" should have it. */
  'sigil',
  /** The hexagon that draws itself shut. Also kept from the category layer. */
  'aegis',
] as const;

export type Figure = (typeof FIGURES)[number];

/** What a particle IS. Shape carries more than colour does. */
export const SWARMS = [
  'none',
  /** A thin hot line, brightest at its head. */
  'spark',
  /** A soft round glow with no edge. */
  'mote',
  /** A teardrop with a point, turned to its flight. Flowers, blood. */
  'petal',
  /** A rectangle with a patterned back. Cards, and only cards. */
  'card',
  /** A long slim quill with a curved spine. */
  'feather',
  /** A round-bottomed drop. Water, tears, ink. */
  'drop',
  /** A small six-armed crystal. */
  'snow',
  /** An irregular flake with a burnt edge. */
  'cinder',
  /** An angular splinter. Broken things. */
  'shard',
  /** A disc with a square hole. Money, tribute, bribes. */
  'coin',
  /** A zigzag. */
  'bolt',
  /** A slim triangle with a tail. */
  'arrow',
  /** A small crescent blade. */
  'blade',
  /** A hollow ring. */
  'bubble',
  /** A soft elongated wisp. Smoke, breath, mist. */
  'plume',
  /** A narrow spike. Thorns, caltrops, barbs. */
  'thorn',
  /** A filled circle with a bright rim. Beads, pearls, seeds. */
  'bead',
  /** A small square frame. Seals, characters, tallies. */
  'rune',
  /** A thin wavy strip. Silk, ribbon, sleeves. */
  'ribbon',
  /** A four-point sparkle. */
  'glint',
  /** Specks barely a pixel across. */
  'dust',
  /** A long thin rectangle. A bamboo slip: writing, records, orders. */
  'slip',
] as const;

export type Swarm = (typeof SWARMS)[number];

/** How the swarm moves. Direction is the first thing the eye reads. */
export const FLIGHTS = [
  /** Straight out from the seat. */
  'out',
  /** In from off the table, absorbed by the seat. */
  'in',
  /** Up, with a lateral drift. */
  'rise',
  /** Down, with a lateral drift. */
  'fall',
  /** Around the seat at a fixed radius. */
  'orbit',
  /** Around and inward at once. */
  'curl',
  /** Around and outward at once. */
  'flare',
  /** Across the frame, all on the same heading. */
  'across',
  /** In, then out — the two-beat answer. */
  'recoil',
  /** Barely moves; pulses where it is. */
  'hover',
  /** Out and then down, on a gravity arc. */
  'arc',
  /** A directed jet along `--fk-spec-turn`. */
  'jet',
] as const;

export type Flight = (typeof FLIGHTS)[number];

/** What the field behind and around the seat does. */
export const GROUNDS = [
  'none',
  /** A flat coloured wash over the seat. */
  'wash',
  /** Dark closing in from the corners. */
  'vignette',
  /** A soft bright glow swelling behind. */
  'bloom',
  /** The room around the seat darkens. */
  'dim',
  /** A hard shadow sweeps across. */
  'shade',
  /** Concentric rings of distortion leaving the seat. */
  'ripple',
  /** A crystalline overlay creeping in from the edges. */
  'frost',
  /** Drifting fog. */
  'smoke',
  /** A fan of light rays from behind the seat. */
  'rays',
] as const;

export type Ground = (typeof GROUNDS)[number];

/**
 * What the portrait itself does. Clipped to the frame — that is the whole
 * reason it is a separate surface from the burst above it.
 */
export const STANCES = [
  'still',
  /** Leans into a swing. */
  'lunge',
  /** Plants and hardens. */
  'brace',
  /** Rises. */
  'lift',
  /** Takes a blow and sets itself again. */
  'reel',
  /** Sags and loses colour. */
  'wilt',
  /** Turns over. */
  'turn',
  /** Dips, the way a bow does. */
  'bow',
  /** A single bright pulse with no movement. */
  'flare',
  /** A fast small tremor. */
  'shiver',
  /** Swells and settles. */
  'swell',
  /** Sinks straight down. */
  'sink',
  /** Colour drains out and comes back. */
  'pale',
  /** Colour floods in. */
  'blush',
] as const;

export type Stance = (typeof STANCES)[number];

/**
 * The rhythm. Two easings and two stagger widths, which is enough: the same
 * picture arriving slowly and arriving all at once are two different events.
 */
export const TEMPOS = ['even', 'quick', 'slow', 'toll'] as const;

export type Tempo = (typeof TEMPOS)[number];

/* ------------------------------------------------------------------ motif */

export interface Motif {
  readonly figure: Figure;
  readonly swarm?: Swarm;
  readonly flight?: Flight;
  readonly ground?: Ground;
  readonly stance?: Stance;
  readonly tempo?: Tempo;
  /** The colour pair. */
  readonly hue: PaletteName;
  /**
   * A second pair, for the figures that need two things to be two things —
   * `mirror`, `gate`, `scale` — and for a swarm that should not be the same
   * colour as the form it comes off. Absent means "the same as `hue`".
   */
  readonly hue2?: PaletteName;
  /** Particles. Defaults to 12; 0 means the swarm is omitted. */
  readonly n?: number;
  /** The axis the figure works along, in degrees from horizontal. */
  readonly turn?: number;
  /**
   * How far the swarm travels, in seat widths. 0.92 is the default and reaches
   * a little past the frame; below 0.6 the particles stay inside the portrait,
   * and above 1.3 they cross into the neighbouring seat's air, which is right
   * for a skill that is about the rest of the table and wrong for one that is
   * not.
   */
  readonly spread?: number;
  /** Brush the skill's own first character huge behind the effect. */
  readonly glyph?: boolean;
}

/** Every slot resolved, so `plan.ts` and the tests never handle `undefined`. */
export interface ResolvedMotif extends Required<Omit<Motif, 'hue2'>> {
  readonly hue2: PaletteName;
}

const DEFAULTS = {
  swarm: 'mote',
  flight: 'out',
  ground: 'none',
  stance: 'still',
  tempo: 'even',
  n: 12,
  turn: 0,
  spread: 0.92,
  glyph: false,
} as const;

export function resolveMotif(m: Motif): ResolvedMotif {
  return { ...DEFAULTS, hue2: m.hue, ...m };
}

/**
 * How many particle nodes a motif may ask for.
 *
 * One effect is one paint, and a seat is 118 px wide at the default table size.
 * Past about two dozen nodes the particles stop being separable and start being
 * a haze, which is both worse to look at and more to composite.
 */
export const MAX_SWARM = 26;

/** The swarm count, clamped. `0` means the motif drew no particles on purpose. */
export function swarmCount(m: ResolvedMotif): number {
  if (m.swarm === 'none') return 0;
  const n = Math.trunc(m.n);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(MAX_SWARM, n);
}
