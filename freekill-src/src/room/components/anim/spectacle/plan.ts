/**
 * What to draw, decided without a DOM.
 *
 * Every effect in this lane is described here as a plain object — a root class,
 * a bag of custom properties, and a list of parts — and turned into elements by
 * `paint.ts`. The split is not ceremony. It is what makes the interesting half
 * testable: this project's vitest has no jsdom (`dialogs/__tests__` render with
 * `renderToStaticMarkup` precisely because there is no document), so anything
 * that decides what an effect looks like has to be able to decide it without
 * one. `__tests__/spectacle.test.ts` asserts on these objects.
 *
 * It also keeps a rule enforceable. `text` is engine data — a translated skill
 * name — and is written with `textContent`; `svg` is a constant from this file
 * and is the only thing ever written with `innerHTML`. Nothing that came off
 * the wire can reach the second path.
 */
import { brushChar, motifClasses, motifParts, motifVars } from './compose';
import type { Cutscene } from './cutscene';
import { PALETTES, resolveMotif, type Motif } from './motif';
import {
  ELEMENT_LIT, ELEMENT_RGB, KINGDOM_BANNER, ROLE_RITE, SIGNATURE,
  type Element, type Kingdom, type Role, type SkillCategory,
} from './palette';
import { signatureOf } from './signatures';

/** One child node of an effect. `n` repeats it, numbering the copies. */
export interface Part {
  readonly cls: string;
  /** Engine text. Written with `textContent`, never `innerHTML`. */
  readonly text?: string;
  /** Authored markup from this file. The only `innerHTML` in the lane. */
  readonly svg?: string;
  /** Repeat count. Each copy gets `--fk-i`, `--fk-n` and a stable jitter. */
  readonly n?: number;
  readonly vars?: Readonly<Record<string, string>>;
}

export interface Burst {
  /** Classes on the effect root. */
  readonly cls: string;
  readonly vars: Readonly<Record<string, string>>;
  readonly ms: number;
  readonly parts: readonly Part[];
  /**
   * Space-separated `data-fk-spec` tokens put on the seat portrait itself for
   * the same duration.
   *
   * The portrait is `overflow: hidden`, so this is the surface for anything
   * that should be clipped to the frame — a corrosion vignette, a recoil, a
   * desaturation — while the burst above it spills across the table. It is an
   * attribute rather than a class because React owns `className` on that
   * element and does not know this one exists; see `Sky.accent`.
   */
  readonly host?: string;
  /** Where the burst is drawn. `seat` is placed over one photo; `table` over
   *  the processing area; `sky` fills the room. */
  readonly scope: 'seat' | 'table' | 'sky';
}

/* ------------------------------------------------------------------ glyphs */

/** A rune seal. Two dashed rings that turn against each other, plus spokes. */
const SEAL = `<svg viewBox="0 0 120 120" aria-hidden="true">
<circle class="fk-spec-ring fk-spec-ring--out" cx="60" cy="60" r="52"/>
<circle class="fk-spec-ring fk-spec-ring--in" cx="60" cy="60" r="34"/>
<g class="fk-spec-spokes">
<path d="M60 4v18M60 98v18M4 60h18M98 60h18"/>
<path d="M20 20l13 13M100 20L87 33M20 100l13-13M100 100L87 87"/>
</g>
<path class="fk-spec-core" d="M60 40l14 20-14 20-14-20z"/>
</svg>`;

/** The guard: a hexagon that draws itself closed. */
const AEGIS = `<svg viewBox="0 0 120 120" aria-hidden="true">
<path class="fk-spec-draw" d="M60 8l45 26v52L60 112 15 86V34z"/>
<path class="fk-spec-draw fk-spec-draw--inner" d="M60 26l30 17v34L60 94 30 77V43z"/>
</svg>`;

/** Two curved arrows chasing each other — the switch. */
const SWAP = `<svg viewBox="0 0 120 120" aria-hidden="true">
<path class="fk-spec-arc fk-spec-arc--a" d="M22 60a38 38 0 0 1 38-38 38 38 0 0 1 33 20"/>
<path class="fk-spec-arc fk-spec-arc--b" d="M98 60a38 38 0 0 1-38 38 38 38 0 0 1-33-20"/>
<path class="fk-spec-head fk-spec-head--a" d="M93 22v22h-22z"/>
<path class="fk-spec-head fk-spec-head--b" d="M27 98V76h22z"/>
</svg>`;

/** The binding: a broken ring with inward barbs. */
const FETTER = `<svg viewBox="0 0 120 120" aria-hidden="true">
<circle class="fk-spec-ring fk-spec-ring--out" cx="60" cy="60" r="50"/>
<circle class="fk-spec-ring fk-spec-ring--in" cx="60" cy="60" r="38"/>
</svg>`;

/** A crack, for a hit that mattered and for a portrait going dark. */
const CRACK = `<svg viewBox="0 0 120 120" preserveAspectRatio="none" aria-hidden="true">
<path class="fk-spec-draw" d="M60 0l-9 34 15 12-12 26 14 18-8 30"/>
<path class="fk-spec-draw" d="M51 34L18 26M64 46l34-14M67 72l30 12M53 90l-32 8"/>
</svg>`;

/** The judgement passed. A brush tick, drawn in one stroke. */
const TICK = `<svg viewBox="0 0 120 120" aria-hidden="true">
<path class="fk-spec-draw" d="M22 62l26 28 52-64"/>
</svg>`;

/** The judgement failed. */
const CROSS = `<svg viewBox="0 0 120 120" aria-hidden="true">
<path class="fk-spec-draw" d="M28 28l64 64"/>
<path class="fk-spec-draw fk-spec-draw--inner" d="M92 28l-64 64"/>
</svg>`;

/**
 * A character for `content:`, quoted and escaped.
 *
 * `--fk-spec-mark` is interpolated straight into a `content` property, so a
 * quote or a backslash in it would end the string early. The value is one
 * character out of the engine's dictionary and has never been either, which is
 * exactly the sort of thing that stays true until a pack ships something odd.
 */
function quote(mark: string): string {
  return `"${[...(mark || '·')][0].replace(/["\\]/g, '')}"`;
}

/* ------------------------------------------------------------------ skills */

export interface SkillOptions {
  readonly category: SkillCategory;
  /**
   * The skill's own engine name — `luoshen`, `kurou`, `paoxiao`. The key
   * `signatures.ts` is written against, and the only thing that lets 洛神 and
   * 集智 stop being the same `drawcard` burst.
   */
  readonly name?: string;
  /** The translated skill name. Engine text. */
  readonly label: string;
  readonly kingdom: Kingdom;
  /** The kingdom's own character, from `markOf` — the engine's dictionary. */
  readonly mark: string;
  /**
   * The element of the last damage this seat took, when the category is
   * `masochism`. A 反馈 answering a fire 杀 should look like it was answering
   * fire, and the engine already said which element landed.
   */
  readonly element?: Element;
  /**
   * 锁定技. `Animate{type="InvokeSkill"}.compulsory`, sourced from the engine's
   * own `Skill:hasTag(Skill.Compulsory)` — see `lua/web/skillwire.lua`. Counts
   * a 觉醒技 as compulsory, because that is what the engine means by the tag.
   */
  readonly compulsory?: boolean;
  readonly ms: number;
}

/**
 * A skill firing.
 *
 * TWO PATHS, AND THE FIRST IS THE POINT. If `signatures.ts` has an entry for
 * this skill's engine name, the effect is that entry's motif — composed out of
 * `motif.ts`'s vocabulary and drawn by `motif.css`. If it does not, the effect
 * is the skill's `skill_type` category, exactly as before. The category layer
 * is not deprecated by the signature layer; it is what the signature layer
 * falls back to, and it has to stay good, because a pack shipped in 2027 will
 * land on it.
 */
export function skillBurst(o: SkillOptions): Burst {
  const banner = KINGDOM_BANNER[o.kingdom];
  const motif = o.name ? signatureOf(o.name) : undefined;
  const design = motif ? designed(motif, o) : byCategory(o);

  return {
    ...design,
    cls: [
      design.cls,
      // 锁定技 is not invoked; it is simply true of this player. The class
      // hangs an aura on the seat's own outline and takes the wind-up out of
      // everything else — see `motif.css`. It applies on both paths, so a skill
      // nobody has designed yet still reads as locked when it is.
      o.compulsory ? 'fk-spec--locked' : '',
    ].filter(Boolean).join(' '),
    vars: {
      ...design.vars,
      '--fk-spec-ms': `${o.ms}ms`,
      '--fk-spec-rim': banner.rim,
      '--fk-spec-seal': banner.seal,
    },
    ms: o.ms,
    scope: 'seat',
    parts: [
      ...design.parts,
      ...(o.compulsory ? [{ cls: 'fk-spec__aura' }] : []),
      plaque(o.label, o.mark),
    ],
  };
}

/** What a skill nobody has designed yet looks like: its category. */
function byCategory(o: SkillOptions): Omit<Burst, 'ms' | 'scope'> {
  const sig = SIGNATURE[o.category];
  // Masochism is the one category whose colour is not its own: it takes the
  // element of the damage that provoked it. Everything else keeps its signature.
  const inherited = o.category === 'masochism' && o.element && o.element !== 'normal';
  const rgb = inherited ? ELEMENT_RGB[o.element as Element] : sig.rgb;
  const lit = inherited ? ELEMENT_LIT[o.element as Element] : sig.lit;
  return {
    cls: `fk-spec fk-spec--skill fk-spec--${o.category} fk-spec-move--${sig.move}`,
    vars: { '--fk-spec-rgb': rgb, '--fk-spec-lit': lit },
    // A locked skill holds still by default. The character is not reacting to
    // its own skill firing; the skill is a fact about the character.
    host: (o.compulsory ? '' : sig.host) || undefined,
    parts: field(o.category, sig.motes),
  };
}

/**
 * What a skill somebody has designed looks like.
 *
 * The one thing a signature does not get to keep is the element of the damage
 * that provoked it. A masochism skill answering a fire 杀 should look like it
 * was answering fire — the engine said which element landed, and ignoring it
 * would make the designed path less true than the category path.
 *
 * But it takes the element on the SECOND colour, not the first. `--fk-spec-rgb`
 * is the figure — 夏侯惇's eye, 司马懿's chain — and that is the character,
 * which does not change colour because somebody set him on fire. `--fk-spec-rgb2`
 * is the swarm, which is the incoming blow made of pieces, and that is exactly
 * the thing that was on fire. A designed masochism motif therefore always has a
 * swarm; the category path, which has no such split, keeps overriding both.
 */
function designed(raw: Motif, o: SkillOptions): Omit<Burst, 'ms' | 'scope'> {
  const m = resolveMotif(raw);
  const inherited = o.category === 'masochism' && o.element && o.element !== 'normal';
  const vars = motifVars(m);
  return {
    cls: `fk-spec fk-spec--skill ${motifClasses(m)}`,
    vars: inherited
      ? {
        ...vars,
        '--fk-spec-rgb2': ELEMENT_RGB[o.element as Element],
        '--fk-spec-lit2': ELEMENT_LIT[o.element as Element],
      }
      : vars,
    // A locked skill holds still whatever the motif asked for: the character is
    // not reacting to its own skill firing.
    host: o.compulsory || m.stance === 'still' ? undefined : m.stance,
    parts: motifParts(m, o.label),
  };
}

/** The parts that carry a category's direction. One arm per category. */
function field(category: SkillCategory, motes: number): Part[] {
  switch (category) {
    case 'offensive':
      return [
        { cls: 'fk-spec__blade', n: 3 },
        { cls: 'fk-spec__shock' },
        { cls: 'fk-spec__spark', n: motes },
      ];
    case 'defensive':
      // No particles at all — see `SIGNATURE`. Plates converge, the hexagon
      // draws itself shut, and the rim holds lit for the last third.
      return [
        { cls: 'fk-spec__plate', n: 8 },
        { cls: 'fk-spec__glyph fk-spec__glyph--aegis', svg: AEGIS },
        { cls: 'fk-spec__rim' },
      ];
    case 'control':
      return [
        { cls: 'fk-spec__glyph fk-spec__glyph--fetter', svg: FETTER },
        { cls: 'fk-spec__pin', n: motes },
        { cls: 'fk-spec__grip' },
      ];
    case 'support':
      return [
        { cls: 'fk-spec__bloom' },
        { cls: 'fk-spec__halo' },
        { cls: 'fk-spec__mote', n: motes },
      ];
    case 'drawcard':
      return [
        { cls: 'fk-spec__fan' },
        { cls: 'fk-spec__leaf', n: motes },
      ];
    case 'masochism':
      return [
        { cls: 'fk-spec__shard', n: motes },
        { cls: 'fk-spec__burst' },
        { cls: 'fk-spec__glyph fk-spec__glyph--crack', svg: CRACK },
      ];
    case 'negative':
      return [
        { cls: 'fk-spec__rot' },
        { cls: 'fk-spec__drip', n: motes },
      ];
    case 'switch':
      return [
        { cls: 'fk-spec__half fk-spec__half--l' },
        { cls: 'fk-spec__half fk-spec__half--r' },
        { cls: 'fk-spec__glyph fk-spec__glyph--swap', svg: SWAP },
      ];
    case 'special':
    default:
      return [
        { cls: 'fk-spec__glyph fk-spec__glyph--seal', svg: SEAL },
        { cls: 'fk-spec__ray', n: motes },
      ];
  }
}

/**
 * The name plate.
 *
 * `SkillInvokeAnimation.qml` slides the skill name in from the right and holds
 * it, and the name is most of what the banner is for — the picture says what
 * kind of thing happened, the text says which one. The rim and the seal
 * character are the kingdom's, which is the whole of the kingdom treatment:
 * enough to tell four 蜀 players' turn from four 魏 players' at a glance,
 * nowhere near enough to disturb the category reading.
 */
function plaque(label: string, mark: string): Part {
  return {
    cls: 'fk-spec__plaque',
    text: label,
    vars: { '--fk-spec-mark': `"${mark}"` },
  };
}

/* --------------------------------------------------------------------- ult */

export interface UltOptions {
  readonly label: string;
  readonly kingdom: Kingdom;
  readonly mark: string;
  readonly ms: number;
}

/**
 * `InvokeUltSkill` — a limited skill firing its once-per-game.
 *
 * The engine treats this as a full stop: `notifySkillInvoked` sends it and then
 * calls `self:delay(2000)`, and the Qt client fills that pause with a
 * whole-screen takeover — the table dims, forty copies of the character's voice
 * line scroll past in two counter-moving bands, the general's card flies in at
 * 3.3x and the skill name lands under it (`UltSkillAnimation.qml`).
 *
 * This is that, minus the two things the web room cannot do: it has no general
 * card component to fly in, and the voice lines are `$<skill>_<general>` keys
 * whose audio does not ship. The name itself scrolls in the bands instead, at
 * two speeds, and the table dims behind it. Nothing takes a pointer event, so
 * the 1.9 s hold cannot cost anyone a click even though the engine has stopped
 * the room anyway.
 */
export function ultBurst(o: UltOptions): Burst {
  const banner = KINGDOM_BANNER[o.kingdom];
  return {
    cls: 'fk-spec fk-spec--ult',
    vars: {
      '--fk-spec-ms': `${o.ms}ms`,
      '--fk-spec-rgb': banner.rim,
      '--fk-spec-lit': '255, 246, 214',
      '--fk-spec-rim': banner.rim,
      '--fk-spec-seal': banner.seal,
    },
    ms: o.ms,
    scope: 'sky',
    parts: [
      { cls: 'fk-spec__dim' },
      { cls: 'fk-spec__band fk-spec__band--a', text: o.label, n: 14 },
      { cls: 'fk-spec__band fk-spec__band--b', text: o.label, n: 14 },
      { cls: 'fk-spec__streak', n: 18 },
      { cls: 'fk-spec__wave' },
      { cls: 'fk-spec__ult-name', text: o.label },
      { cls: 'fk-spec__ult-mark', vars: { '--fk-spec-mark': quote(o.mark) } },
    ],
  };
}

/* ---------------------------------------------------------------- cutscene */

export interface CutsceneOptions {
  readonly scene: Cutscene;
  /** The skill's translated name — the title. Engine text. */
  readonly title: string;
  /** The translated name of the skill gained, or `''`. Engine text. */
  readonly gained: string;
  /** One of the character's own lines, translated, or `''`. Engine text. */
  readonly line: string;
  /** The kingdom's own character, from `markOf`. */
  readonly mark: string;
  readonly kingdom: Kingdom;
  /** Portrait URLs, already resolved and already checked by `faceUrl`. */
  readonly face?: string;
  readonly faceAfter?: string;
  readonly ms: number;
}

/**
 * One of the four moments the game stops for.
 *
 * WHAT MAKES IT DIFFERENT FROM `ultBurst`, WHICH IS ALREADY A TAKEOVER. Three
 * things, and they are the three the mobile game spends its budget on:
 *
 *   the face   these are the only skills in the build that change *who is
 *              sitting there*. 忠傲 writes `player.general = "m_shi2__weiyan"`
 *              or `"m_shi3__weiyan"`; 雄姿 writes `"m_shi2__zhouyu"`. So the
 *              scene is built around two portraits: the man who sat down, and
 *              the man the table is looking at now. Where there is only one
 *              (曹髦, 神姜维) the plate holds and the light changes behind it.
 *   the words  a line the character actually says, printed. `ultBurst` scrolls
 *              the skill name because there was nothing else to scroll; here
 *              there is — `$zhongao4`, `$xiongzi3`, `$shenpeij1` are engine
 *              keys with prose behind them, and the voice lane is speaking the
 *              same line at the same moment.
 *   the music  see `audio/themes.ts`. Two of these displace the soundtrack.
 *
 * It also runs longer than anything else in the lane, and that is a deliberate
 * exception rather than an oversight — see `budget.ts`'s `cutscene` entry.
 *
 * THIS DOES NOT REPLACE THE SIGNATURE. The same moment already produced one:
 * 雄姿 and 神霈 send `InvokeUltSkill`, 潜龙 sends `InvokeSkill` every time the
 * counter moves, and both draw on the seat. This is the layer above them, and
 * it is coloured out of the same `motif.ts` palettes so that the two read as
 * one event rather than as two effects that happened to collide.
 */
export function cutsceneBurst(o: CutsceneOptions): Burst {
  const { scene } = o;
  const a = PALETTES[scene.hue];
  const b = PALETTES[scene.hue2];
  const banner = KINGDOM_BANNER[o.kingdom];
  const sky = scene.scope === 'sky';

  const vars: Record<string, string> = {
    '--fk-spec-ms': `${o.ms}ms`,
    '--fk-spec-rgb': a.rgb,
    '--fk-spec-lit': a.lit,
    '--fk-spec-rgb2': b.rgb,
    '--fk-spec-lit2': b.lit,
    '--fk-spec-rim': banner.rim,
    '--fk-spec-seal': banner.seal,
    '--fk-spec-mark': quote(o.mark),
  };
  if (o.face) vars['--fk-cut-face'] = `url("${o.face}")`;
  if (o.faceAfter) vars['--fk-cut-face2'] = `url("${o.faceAfter}")`;

  const parts: Part[] = [];

  if (sky) {
    parts.push({ cls: 'fk-cut__dim' });
    parts.push({ cls: 'fk-cut__rays' });
    parts.push({ cls: 'fk-cut__streak', n: 14 });
    // The skill's own first character, brushed across the whole room behind
    // everything. Free, exactly as it is for a signature: the character is
    // already in the shipped font subset because the plaque prints it.
    const ch = brushChar(o.title);
    if (ch) parts.push({ cls: 'fk-cut__brush', text: ch });
    if (o.face) {
      parts.push({ cls: 'fk-cut__face' });
      // Two plates, cross-dissolving, only when the engine actually said the
      // seat became somebody else. One plate is not a transformation and must
      // not be dressed as one.
      if (o.faceAfter) parts.push({ cls: 'fk-cut__face fk-cut__face--after' });
    }
    parts.push({ cls: 'fk-cut__rule' });
  }

  parts.push({ cls: 'fk-cut__title', text: o.title });
  if (o.gained) parts.push({ cls: 'fk-cut__gain', text: o.gained });
  if (sky && o.line) parts.push({ cls: 'fk-cut__line', text: o.line });
  parts.push({ cls: 'fk-cut__flare' });

  return {
    cls: [
      'fk-spec', 'fk-cut', `fk-cut--${scene.scope}`, `fk-cut--${scene.key}`,
      o.faceAfter ? 'fk-cut--turns' : '',
    ].filter(Boolean).join(' '),
    vars,
    ms: o.ms,
    scope: scene.scope,
    // The seat itself lifts under a scene it is the subject of. On the small
    // 潜龙 thresholds that is the whole of the reaction.
    host: 'lift',
    parts,
  };
}

/**
 * A portrait URL, or nothing.
 *
 * The value goes into a CSS `url()` through a custom property, so this is the
 * one place in the lane where a string reaches a stylesheet. Everything the
 * manifest holds is a content-hashed relative path under the deployment's own
 * base — `assets/f771cbbeeeac.webp` — and nothing else is accepted: no scheme,
 * no protocol-relative `//host`, no quote, no parenthesis, no whitespace. A URL
 * that fails is dropped and the plate simply does not draw, which is a scene
 * without a face rather than a page with an injected style.
 */
export function faceUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  if (raw.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(raw)) return undefined;
  return /^[\w./-]+$/.test(raw) ? raw : undefined;
}

/* ---------------------------------------------------------- general events */

export interface StrikeOptions {
  readonly element: Element;
  /** 1, 2 or 3+, from `damageNum`. */
  readonly weight: 1 | 2 | 3;
  readonly ms: number;
}

/**
 * How much damage that was.
 *
 * DELIBERATELY NOT AN IMPACT. The card lane authors the impact itself, per
 * element — cracks for a plain hit, a column of flame for fire, a strobe and
 * crawling arcs for thunder, frost spidering across the portrait for ice — and
 * a second burst on top of a good one is worse than either alone. What that
 * effect cannot say is HOW BIG the hit was, because `damageNum` is on the
 * message and nothing reads it: the Qt client uses it once, to append "2" to a
 * sound file name (`RoomLogic.js:1381`).
 *
 * So this is the magnitude and only the magnitude — the number over the seat,
 * and, at two points or more, the table itself reeling. A 3-point 火杀 and a
 * 1-point 酒杀 stop being the same event.
 */
export function strikeBurst(o: StrikeOptions): Burst {
  return {
    cls: `fk-spec fk-spec--strike fk-spec--elem-${o.element} fk-spec--w${o.weight}`,
    vars: {
      '--fk-spec-ms': `${o.ms}ms`,
      '--fk-spec-rgb': ELEMENT_RGB[o.element],
      '--fk-spec-lit': ELEMENT_LIT[o.element],
    },
    ms: o.ms,
    scope: 'seat',
    parts: [{ cls: 'fk-spec__pip', text: '−'.repeat(o.weight) }],
  };
}

/**
 * An hp drop that was not damage — a skill cost, 失去体力, 兵粮寸断's bite.
 *
 * `LogEvent{type="LoseHP"}` is sent with an empty table (`events/hp.lua:111`),
 * so it cannot be placed on a seat; the drop is seen instead on the `hp`
 * property. What matters is that it reads as *different from a hit*: a hit
 * strikes the seat from outside, this drains out of it. No shake, no impact —
 * the light runs down and out of the frame.
 */
export function drainBurst(ms: number): Burst {
  return {
    cls: 'fk-spec fk-spec--drain',
    vars: { '--fk-spec-ms': `${ms}ms`, '--fk-spec-rgb': '198, 66, 74', '--fk-spec-lit': '255, 190, 180' },
    ms,
    host: 'drained',
    scope: 'seat',
    parts: [{ cls: 'fk-spec__bleed' }, { cls: 'fk-spec__fall', n: 7 }],
  };
}

/** A recovery. Rises, where a drain sinks. */
export function mendBurst(ms: number): Burst {
  return {
    cls: 'fk-spec fk-spec--mend',
    vars: { '--fk-spec-ms': `${ms}ms`, '--fk-spec-rgb': '110, 224, 130', '--fk-spec-lit': '236, 255, 214' },
    ms,
    host: 'mended',
    scope: 'seat',
    parts: [{ cls: 'fk-spec__mend-ring' }, { cls: 'fk-spec__cross', n: 9 }],
  };
}

/**
 * `LogEvent{type="ChangeMaxHp"}` — `{player, num}`, `events/hp.lua:480`.
 *
 * A wire event with a player on it, a signed magnitude, and until now no
 * rendering at all: the seat's hp bar simply had a different number of slots
 * the next time anyone looked. Growing pushes the frame outward and settles;
 * shrinking pulls it in and leaves the rim dull.
 */
export function vigourBurst(num: number, ms: number): Burst {
  const up = num > 0;
  return {
    cls: `fk-spec fk-spec--vigour fk-spec--vigour-${up ? 'up' : 'down'}`,
    vars: {
      '--fk-spec-ms': `${ms}ms`,
      '--fk-spec-rgb': up ? '236, 200, 120' : '120, 128, 132',
      '--fk-spec-lit': up ? '255, 246, 214' : '206, 212, 216',
    },
    ms,
    scope: 'seat',
    parts: [{ cls: 'fk-spec__girth' }, { cls: 'fk-spec__pip', text: `${up ? '+' : '−'}${Math.abs(num)}` }],
  };
}

/* ------------------------------------------------------------------- slay */

export interface SlayOptions {
  readonly role: Role;
  /** The kingdom's own character, from `markOf`. */
  readonly mark: string;
  /** `tr(role)` — 主公 / 忠臣 / 反贼 / 内奸, or the English. Engine text. */
  readonly label: string;
  readonly kingdom: Kingdom;
  /**
   * Degrees from horizontal for the blade, when the engine drew a line at this
   * seat just before it fell. Absent when it did not — see `Spectacle.slay`.
   */
  readonly cut?: number;
  readonly ms: number;
}

/**
 * A player being slain.
 *
 * THE BIGGEST THING IN THE GAME, and until now a 900 ms greyscale fade. It runs
 * on the room's own layer rather than over one seat, because a kill is not a
 * seat-sized event: the blade crosses the whole table, the shockwave leaves the
 * seat and keeps going, and for a 主公 the room itself goes dark.
 *
 * FIVE BEATS, in this order (the fractions are in `budget.SLAY_PHASE`, which
 * the sound lane reads so a hit lands on the cut rather than on the wind-up):
 *
 *   flash    the screen whites out from the victim's seat — the frame the game
 *            stops on, and the closest thing CSS has to time dilation
 *   cut      a full-bleed blade crosses the table through that seat, and the
 *            two halves of the room slip apart for four frames behind it
 *   shatter  the portrait breaks into role-coloured shards that fly clear,
 *            while a shockwave ring leaves the seat
 *   seal     the role's brush seal slams down over the seat and holds
 *   pall     ash lifts, the light goes out, and the seat is left exactly where
 *            `.fk-photo--dead` takes over
 *
 * The four roles are four different sequences, not four tints — see `ROLE_RITE`.
 * A 主公 takes the whole room with it; a 内奸's seal resolves out of the dark
 * instead of slamming, because that death is a revelation rather than a kill.
 */
export function slayBurst(o: SlayOptions): Burst {
  const rite = ROLE_RITE[o.role];
  const banner = KINGDOM_BANNER[o.kingdom];
  return {
    cls: [
      'fk-spec fk-spec--slay',
      `fk-spec--role-${o.role}`,
      `fk-spec-rite--${rite.temper}`,
      rite.roomWide ? 'fk-spec--room-wide' : '',
      // A three-character role name reads as a vertical brush seal, the way
      // `image/photo/death/lord.png` does. "Renegade" stacked letter over
      // letter would be eight rows tall, so a long label stays horizontal.
      o.label.length <= 3 ? 'fk-spec--seal-tall' : 'fk-spec--seal-wide',
    ].filter(Boolean).join(' '),
    vars: {
      '--fk-spec-ms': `${o.ms}ms`,
      '--fk-spec-rgb': rite.rgb,
      '--fk-spec-lit': rite.lit,
      '--fk-spec-rim': banner.rim,
      '--fk-spec-seal': banner.seal,
      // The blade points the way the engine's last indicator line came in, when
      // there was one; otherwise it takes the role's own angle.
      '--fk-slay-cut': `${o.cut ?? rite.cut}deg`,
    },
    ms: o.ms,
    host: `slain slain-${rite.temper}`,
    scope: 'sky',
    parts: [
      { cls: 'fk-spec__whiteout' },
      { cls: 'fk-spec__veil' },
      { cls: 'fk-spec__blade-cut' },
      { cls: 'fk-spec__blade-cut fk-spec__blade-cut--second' },
      { cls: 'fk-spec__rift' },
      { cls: 'fk-spec__wave' },
      { cls: 'fk-spec__shatter', n: rite.shards },
      { cls: 'fk-spec__ash', n: 20 },
      { cls: 'fk-spec__seal-stamp', text: o.label },
      { cls: 'fk-spec__seal-mark', vars: { '--fk-spec-mark': quote(o.mark) } },
    ],
  };
}

/**
 * A seat entering its turn — `PropertyUpdate[id, "phase", 2]`, `Phase.Start`.
 *
 * Once per turn per player, and the only warning anyone gets that the table is
 * about to be somebody else's. A light runs once around the seat's frame and a
 * kingdom seal breathes at its edge; the steady gold border that marks the
 * current seat for the rest of the turn is `.fk-photo--current` and stays.
 */
export function openBurst(kingdom: Kingdom, mark: string, ms: number): Burst {
  const banner = KINGDOM_BANNER[kingdom];
  return {
    cls: 'fk-spec fk-spec--open',
    vars: {
      '--fk-spec-ms': `${ms}ms`,
      '--fk-spec-rgb': banner.rim,
      '--fk-spec-lit': '255, 246, 214',
      '--fk-spec-mark': quote(mark),
    },
    ms,
    scope: 'seat',
    parts: [{ cls: 'fk-spec__trace' }, { cls: 'fk-spec__standard' }],
  };
}

/**
 * Cards arriving in a hand.
 *
 * On another player's seat the only sign of this is one digit changing, which
 * is how an eight-seat opening deal reads as a row of numbers ticking. One
 * ghost card per card drawn, up to five, arcing in and folding into the frame.
 */
export function drawBurst(count: number, ms: number): Burst {
  const n = Math.max(1, Math.min(5, Math.trunc(count) || 1));
  return {
    cls: 'fk-spec fk-spec--draw',
    vars: { '--fk-spec-ms': `${ms}ms`, '--fk-spec-rgb': '120, 200, 255', '--fk-spec-lit': '236, 250, 255' },
    ms,
    scope: 'seat',
    parts: [{ cls: 'fk-spec__deal', n }, { cls: 'fk-spec__wash' }],
  };
}

/** Equipment landing: a metal edge crosses the portrait and the rim rings. */
export function equipBurst(ms: number): Burst {
  return {
    cls: 'fk-spec fk-spec--equip',
    vars: { '--fk-spec-ms': `${ms}ms`, '--fk-spec-rgb': '255, 226, 160', '--fk-spec-lit': '255, 252, 236' },
    ms,
    host: 'equipped',
    scope: 'seat',
    parts: [{ cls: 'fk-spec__temper' }, { cls: 'fk-spec__clang' }],
  };
}

/**
 * A delayed trick settling into a judge zone — `MoveCards` to
 * `CARD_AREA.PlayerJudge`.
 *
 * 乐不思蜀 and 兵粮寸断 land silently today: a chip appears under the seat and
 * that is the whole of it. A dark ring drops onto the frame and locks.
 */
export function hexBurst(ms: number): Burst {
  return {
    cls: 'fk-spec fk-spec--hex',
    vars: { '--fk-spec-ms': `${ms}ms`, '--fk-spec-rgb': '164, 104, 220', '--fk-spec-lit': '232, 208, 255' },
    ms,
    host: 'hexed',
    scope: 'seat',
    parts: [{ cls: 'fk-spec__glyph fk-spec__glyph--fetter', svg: FETTER }, { cls: 'fk-spec__seal-drop' }],
  };
}

/**
 * A judgement resolving, drawn over the processing area.
 *
 * `Room:setCardEmotion(cid, "judgegood"|"judgebad")` names a CARD, not a
 * player — the mark belongs on the card being judged and that card is on the
 * table, so this is drawn on the table rather than on a seat. The engine holds
 * 900 ms after sending it (`events/judge.lua:102`), which is the pause this
 * fills: the felt takes the verdict's colour, a ring goes out from the pile,
 * and the character stamps over it.
 */
export function verdictBurst(good: boolean, ms: number): Burst {
  return {
    cls: `fk-spec fk-spec--verdict fk-spec--verdict-${good ? 'good' : 'bad'}`,
    vars: {
      '--fk-spec-ms': `${ms}ms`,
      '--fk-spec-rgb': good ? '126, 226, 140' : '232, 74, 62',
      '--fk-spec-lit': good ? '236, 255, 220' : '255, 214, 190',
    },
    ms,
    scope: 'table',
    parts: [
      { cls: 'fk-spec__toll' },
      // Drawn, not written. The engine has no key for "the judgement was good"
      // — `judgegood` is a sprite folder name — so there is nothing to
      // translate, and a stroke that means pass or fail in any language beats
      // inventing a phrase for one.
      { cls: 'fk-spec__glyph fk-spec__glyph--verdict', svg: good ? TICK : CROSS },
      { cls: 'fk-spec__ember', n: 12 },
    ],
  };
}
