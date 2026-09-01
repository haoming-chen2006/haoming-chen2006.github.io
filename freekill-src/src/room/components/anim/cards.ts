/**
 * What each card looks like when it resolves.
 *
 * WHERE THE SIGNAL COMES FROM. Not from a table of cards this file invented —
 * from `LogEvent{type="PlaySound"}`, which `Room:playCardEmotionAndSound`
 * (`events/usecard.lua:17`) broadcasts for every card used or played, naming the
 * card in the audio path it asks for. That is the engine saying "this card just
 * resolved", once per resolution, for all 43 card types in the build. The
 * sibling `setEmotion` on the line above it is gated behind
 * `FileIO.exists("./packages/<pkg>/image/anim/<name>")`, and the web VM's
 * filesystem holds `.lua` and nothing else — so over a full recorded game the
 * engine emits 97 card sounds and 10 emotions, and the ninety-seven are the
 * complete list of moments a card actually resolved. Reading the sound is what
 * turns "the twenty-two cards that happen to ship art" into every card in the
 * game.
 *
 * The path also says which of the two it is. `usecard.lua` builds a card-use
 * path with the speaker's gender in it — `…/audio/card/male/duel` — while
 * `events/skill.lua:59` builds an equipment skill's path without one —
 * `…/audio/card/fan`. That distinction is the engine's, not ours, and it is why
 * an equipment proc keeps its upstream sprite while a card use gets an authored
 * effect: they arrive as different shapes.
 *
 * NOTHING HERE DECIDES ANYTHING. A recipe is a drawing. It reads no state, it
 * knows nothing about legality, targets or damage, and it is chosen by a name
 * the engine put on the wire. A card with no recipe still animates, because the
 * fallback is a real effect rather than a blank.
 */
import {
  add, bolt, burst, chain, crescent, farEnd, flash, ghosts, motes, path, rings,
  rnd, seal, streak, svg, type Build, type Scene,
} from './parts';

/* ------------------------------------------------------- reading the cue */

export type CardCue =
  /** A card being used or played. `name` is the card's engine name. */
  | { readonly kind: 'card'; readonly name: string }
  /** A piece of equipment being worn: the engine only says which of the three. */
  | { readonly kind: 'equip'; readonly name: 'weapon' | 'armor' | 'horse' }
  /** An equipment skill firing. Upstream ships art for these and it is good;
   *  `bus.ts` lets the sprite have them. */
  | { readonly kind: 'gear'; readonly name: string }
  /** `./audio/system/*` — the chain toggle and a recast. */
  | { readonly kind: 'system'; readonly name: string };

/**
 * `LogEvent{PlaySound}.name` -> what just happened.
 *
 * Defensive about shape because these strings are assembled in Lua from a
 * package name, a card name and sometimes a gender, and a package nobody has
 * written yet may assemble them slightly differently. An unreadable path is a
 * beat with no effect, never a throw.
 */
export function readCue(soundPath: unknown): CardCue | undefined {
  if (typeof soundPath !== 'string' || !soundPath) return undefined;
  const seg = soundPath.replace(/^\.?\//, '').split('/').filter(Boolean);
  if (seg[0] === 'audio' && seg[1] === 'system' && seg[2]) {
    return { kind: 'system', name: seg[2] };
  }
  // The `audio/card` pair, not the first segment that happens to read `card` —
  // `standard_cards` does not, but a package named `card` would, and the point
  // of resolving by name is that it works for packages nobody has written yet.
  let at = -1;
  for (let i = 1; i < seg.length; i += 1) {
    if (seg[i] === 'card' && seg[i - 1] === 'audio') { at = i; break; }
  }
  if (at < 0) return undefined;
  const rest = seg.slice(at + 1);
  if (!rest.length) return undefined;
  if (rest[0] === 'common') {
    const what = rest[1];
    return what === 'weapon' || what === 'armor' || what === 'horse'
      ? { kind: 'equip', name: what }
      : undefined;
  }
  // `…/card/<gender>/<name>` is a use; `…/card/<name>` is an equipment skill.
  if (rest.length >= 2 && (rest[0] === 'male' || rest[0] === 'female')) {
    return { kind: 'card', name: rest[1] };
  }
  return { kind: 'gear', name: rest[0] };
}

/* ------------------------------------------------------------- the recipe */

export interface CardRecipe {
  /** Root class. `effects.css` hangs the palette and the shapes off it. */
  readonly cls: string;
  /** Drawn on the seat of whoever used the card. */
  readonly source?: Build;
  /** Drawn on each target's seat. */
  readonly target?: Build;
  /** Drawn across the table, once per target, oriented source -> target. */
  readonly link?: Build;
  /** Drawn across the whole table, once, however many targets there are. */
  readonly table?: Build;
  /** Longer than a strike, for the table-wide ones the engine pauses on. */
  readonly wide?: boolean;
}

/* ---------------------------------------------------------- shared shapes */

/**
 * The standard landing: a hot core, two rings, a cone of debris, a ground wave.
 *
 * The debris carries on in the direction the strike came in — which is what an
 * impact looks like — but a pure forward cone reads as a spray rather than as a
 * collision, so a short backwash comes off the point of contact as well.
 */
function land(root: HTMLElement, s: Scene, along: number, o: { n?: number; reach?: number } = {}): void {
  flash(root, s, { size: 0.5, delay: 30 });
  rings(root, s, 2, { size: 0.6, delay: 50 });
  add(root, 'fx-wave', { sz: `${Math.round(s.u * 1.15)}px`, d: '60ms' });
  burst(root, s, { along, spread: 62, n: o.n ?? 16, reach: o.reach ?? 0.82, delay: 30 });
  burst(root, s, { along: along + 180, spread: 34, n: 5, reach: 0.34, len: 0.1, delay: 20 });
}

/** A blade crossing the target twice. The grammar of every 杀 in the game. */
function cut(root: HTMLElement, s: Scene, along: number): void {
  crescent(root, s, { turn: along - 30, size: 0.62 });
  crescent(root, s, { turn: along + 24, size: 0.52, delay: 75 });
}

/** The travelling half of a strike: a streak with a bright head. */
function fly(root: HTMLElement, s: Scene, cls?: string): void {
  streak(root, s, { cls, thick: 0.08 });
  add(root, 'fx-head', { sz: `${Math.round(s.u * 0.3)}px` });
}

/** The wind-up on the attacker's own seat: a short pull-back glint. */
function windUp(root: HTMLElement, s: Scene, along: number): void {
  add(root, 'fx-glint', { a: `${Math.round(along)}deg`, sz: `${Math.round(s.u * 0.7)}px` });
  burst(root, s, { along: along + 180, spread: 30, n: 5, reach: 0.3, len: 0.1 });
}

/* ------------------------------------------------------------- the cards */

/**
 * One entry per card the build ships, keyed by the engine's own name.
 *
 * The shapes are chosen so that two cards are never told apart by colour alone.
 * A 杀 cuts, a 桃 blooms, a 决斗 clashes at the midpoint, a 过河拆桥 tears, a
 * 五谷丰登 rains gold across the whole table: silhouette first, palette second,
 * because a player watching an eight-seat table sees the silhouette.
 */
export const CARD_FX: ReadonlyMap<string, CardRecipe> = new Map<string, CardRecipe>([

  /* ---- basic ---- */

  ['slash', {
    cls: 'fx--slash fx-p--steel',
    source: (r, s) => windUp(r, s, s.angle),
    link: (r, s) => { fly(r, s); },
    target: (r, s) => { cut(r, s, s.angle); land(r, s, s.angle); },
  }],

  ['fire__slash', {
    cls: 'fx--slash fx--fireslash fx-p--fire',
    source: (r, s) => windUp(r, s, s.angle),
    link: (r, s) => { fly(r, s, 'fx-streak--flame'); motes(r, s, { n: 7, dy: -0.3, size: 0.045, spread: 0.2 }); },
    target: (r, s) => {
      cut(r, s, s.angle);
      land(r, s, s.angle, { n: 12 });
      // The aftermath is the whole difference between 火杀 and 杀: the cut is
      // over in 120 ms and the embers are still climbing when the beat ends.
      motes(r, s, { n: 12, dy: -0.85, dx: 0.12, size: 0.055, spread: 0.42, delay: 90 });
      add(r, 'fx-heat', { sz: `${Math.round(s.u * 1.1)}px`, d: '80ms' });
    },
  }],

  ['thunder__slash', {
    cls: 'fx--slash fx--thunderslash fx-p--thunder',
    source: (r, s) => windUp(r, s, s.angle),
    link: (r) => { bolt(r, { segments: 8, forks: 3, sway: 15 }); },
    target: (r, s) => {
      add(r, 'fx-strobe');
      land(r, s, s.angle, { n: 14, reach: 0.9 });
      // Arcs crawling over the portrait after the strike, not another burst.
      for (let i = 0; i < 3; i += 1) {
        const w = add(r, 'fx-arc', { d: `${90 + i * 80}ms`, a: `${Math.round(rnd(0, 360))}deg` });
        const g = svg(w, 'fx-arc__svg', '-6 -20 112 40', true);
        path(g, boltPath(), 'fx-arc__line');
      }
    },
  }],

  ['jink', {
    cls: 'fx--jink fx-p--ice',
    source: (r, s) => {
      // Two after-images sliding off the portrait, plus the speed lines that
      // say the seat moved rather than that something was thrown at it.
      add(r, 'fx-ghostself', { dx: `${Math.round(-s.u * 0.34)}px`, d: '0ms' });
      add(r, 'fx-ghostself', { dx: `${Math.round(s.u * 0.3)}px`, d: '55ms' });
      crescent(r, s, { turn: -70, size: 0.8, cls: 'fx-crescent--wide' });
      for (let i = 0; i < 7; i += 1) {
        add(r, 'fx-speed', {
          y: `${Math.round(rnd(-0.42, 0.42) * s.u)}px`,
          l: `${Math.round(rnd(0.4, 1.05) * s.u)}px`,
          d: `${Math.round(rnd(0, 110))}ms`,
        });
      }
      flash(r, s, { size: 0.55, delay: 30 });
    },
  }],

  ['peach', {
    cls: 'fx--peach fx-p--jade',
    source: (r, s) => {
      rings(r, s, 3, { size: 0.68 });
      add(r, 'fx-bloom', { sz: `${Math.round(s.u * 0.95)}px` });
      // Petals, spiralling. The one thing that stops a heal from being a green
      // circle: they have a shape, they rotate, and they leave upward.
      for (let i = 0; i < 13; i += 1) {
        add(r, 'fx-petal', {
          x0: `${Math.round(rnd(-0.4, 0.4) * s.u)}px`,
          dx: `${Math.round(rnd(-0.42, 0.42) * s.u)}px`,
          dy: `${Math.round(rnd(-1.15, -0.6) * s.u)}px`,
          sz: `${Math.round(rnd(0.1, 0.17) * s.u)}px`,
          a: `${Math.round(rnd(-180, 180))}deg`,
          a2: `${Math.round(rnd(200, 620))}deg`,
          d: `${Math.round(rnd(0, 220))}ms`,
        });
      }
      add(r, 'fx-lift');
    },
  }],

  ['analeptic', {
    cls: 'fx--analeptic fx-p--blood',
    source: (r, s) => {
      // A surge that fills from the bottom of the portrait rather than a burst
      // at its middle — 酒 is something drunk, not something thrown.
      add(r, 'fx-surge');
      add(r, 'fx-rim');
      motes(r, s, { n: 8, dy: -0.7, size: 0.045, spread: 0.3, cls: 'fx-mote fx-mote--bubble' });
      flash(r, s, { size: 0.7, delay: 150 });
    },
  }],

  /* ---- targeted tricks ---- */

  ['duel', {
    cls: 'fx--duel fx-p--steel',
    link: (r, s) => {
      // Both blades travel and meet in the middle. The clash is at 50%, which
      // is the only place a duel can be.
      add(r, 'fx-duelblade fx-duelblade--a');
      add(r, 'fx-duelblade fx-duelblade--b');
      const mid = add(r, 'fx-mid');
      const inner = add(mid, 'fx-mid__in');
      burst(inner, { ...s, u: s.u * 0.9 }, { n: 18, reach: 0.7, len: 0.12, delay: 150 });
      add(inner, 'fx-flash', { sz: `${Math.round(s.u * 0.8)}px`, d: '160ms' });
      add(inner, 'fx-ring', { sz: `${Math.round(s.u * 0.5)}px`, d: '170ms' });
    },
    // Both ends of a duel take a cut. Putting one only on the target read as an
    // attack that happened to start in the middle of the table.
    source: (r, s) => { crescent(r, s, { turn: s.angle + 160, size: 0.42, delay: 210 }); },
    target: (r, s) => { crescent(r, s, { turn: s.angle + 14, size: 0.42, delay: 200 }); },
  }],

  ['dismantlement', {
    cls: 'fx--rip fx-p--amber',
    target: (r, s) => {
      // Three tears opening across the portrait, and the halves sliding apart.
      for (let i = 0; i < 3; i += 1) {
        add(r, 'fx-tear', {
          a: `${Math.round(-24 + i * 22)}deg`,
          y: `${Math.round((i - 1) * 0.22 * s.u)}px`,
          d: `${i * 55}ms`,
        });
      }
      add(r, 'fx-rift', { d: '90ms' });
      burst(r, s, { n: 9, reach: 0.7, len: 0.2, cls: 'fx-scrap', delay: 90 });
      motes(r, s, { n: 6, dy: 0.6, size: 0.05, spread: 0.4, delay: 140 });
    },
  }],

  ['snatch', {
    cls: 'fx--snatch fx-p--amber',
    link: (r, s) => {
      // Out, hook, and back with something in it. The return trip is the point:
      // 顺手牵羊 takes a card, and the card has to be seen to travel.
      add(r, 'fx-line');
      const far = farEnd(r);
      add(far, 'fx-hook', { sz: `${Math.round(s.u * 0.42)}px` });
      add(r, 'fx-haul', { len: `${Math.round(s.span)}px` });
    },
    target: (r, s) => { flash(r, s, { size: 0.55, delay: 120 }); rings(r, s, 1, { size: 0.45, delay: 120 }); },
  }],

  ['collateral', {
    cls: 'fx--collateral fx-p--steel',
    link: (r, s) => {
      add(r, 'fx-thread');
      // The order travelling down the wire. Without it the thread is a static
      // line and 借刀杀人 reads as "these two are connected" rather than as one
      // of them being made to act.
      add(r, 'fx-head', { sz: `${Math.round(s.u * 0.26)}px` });
      const far = farEnd(r);
      seal(far, s, { size: 1.05, sides: 3, delay: 90 });
    },
  }],

  ['fire_attack', {
    cls: 'fx--fireattack fx-p--fire',
    target: (r, s) => {
      // A column from below, and the card that fed it going up with it.
      add(r, 'fx-column');
      add(r, 'fx-column fx-column--b', { d: '70ms' });
      add(r, 'fx-column fx-column--c', { d: '140ms' });
      add(r, 'fx-burncard');
      motes(r, s, { n: 14, dy: -1.0, dx: 0.1, size: 0.05, spread: 0.34, delay: 60 });
      motes(r, s, { n: 7, dy: 0.75, size: 0.04, spread: 0.5, cls: 'fx-mote fx-mote--ash', delay: 260 });
      flash(r, s, { size: 0.75, delay: 90 });
    },
  }],

  ['iron_chain', {
    cls: 'fx--chain fx-p--steel',
    link: (r) => { chain(r); },
    target: (r, s) => { add(r, 'fx-clink', { sz: `${Math.round(s.u * 0.55)}px`, d: '160ms' }); },
    source: (r, s) => { add(r, 'fx-clink', { sz: `${Math.round(s.u * 0.55)}px`, d: '160ms' }); },
  }],

  ['ex_nihilo', {
    cls: 'fx--exnihilo fx-p--gold',
    source: (r, s) => {
      // An iris opening on nothing, and two cards coming out of it.
      add(r, 'fx-iris', { sz: `${Math.round(s.u * 0.95)}px` });
      add(r, 'fx-iris fx-iris--b', { sz: `${Math.round(s.u * 0.7)}px`, d: '60ms' });
      ghosts(r, s, 2, { fan: 22, rise: -0.5, delay: 110 });
      motes(r, s, { n: 10, dy: -0.6, size: 0.045, spread: 0.36, delay: 90 });
      flash(r, s, { size: 0.8, delay: 80 });
    },
  }],

  ['nullification', {
    cls: 'fx--null fx-p--ice',
    target: (r, s) => {
      // A shutter slamming closed. Hard edges, one ripple, no debris — this is
      // the card that says *no*, and softness would be the wrong reading.
      seal(r, s, { size: 1.15, sides: 6 });
      add(r, 'fx-deny');
      rings(r, s, 2, { size: 0.75, delay: 90 });
      flash(r, s, { size: 0.7, delay: 70 });
    },
  }],

  /* ---- delayed tricks: the moment they land in front of a seat ---- */

  ['indulgence', {
    cls: 'fx--cage fx-p--indigo',
    target: (r, s) => {
      // A cage coming down and locking. Five bars, staggered, then the seal.
      for (let i = 0; i < 5; i += 1) {
        add(r, 'fx-bar', { x: `${Math.round((i / 4 - 0.5) * 0.86 * s.u)}px`, d: `${i * 45}ms` });
      }
      add(r, 'fx-shut');
      seal(r, s, { size: 0.9, sides: 8, delay: 200 });
    },
  }],

  ['supply_shortage', {
    cls: 'fx--barred fx-p--ash',
    target: (r, s) => {
      add(r, 'fx-slab fx-slab--a');
      add(r, 'fx-slab fx-slab--b', { d: '90ms' });
      motes(r, s, { n: 10, dy: 0.5, size: 0.06, spread: 0.5, cls: 'fx-mote fx-mote--dust', delay: 120 });
      add(r, 'fx-wave', { sz: `${Math.round(s.u * 1.0)}px`, d: '150ms' });
    },
  }],

  ['lightning', {
    cls: 'fx--lightning fx-p--thunder',
    target: (r, s) => {
      // The placement, not the strike: a storm gathering over the seat.
      const puffs: readonly [number, number, number][] = [[-0.3, 0.72, 0], [0.26, 0.66, 70], [0, 0.92, 40]];
      for (const [x, sz, d] of puffs) {
        add(r, 'fx-puff', { x: `${Math.round(x * s.u)}px`, sz: `${Math.round(sz * s.u)}px`, d: `${d}ms` });
      }
      for (let i = 0; i < 2; i += 1) {
        const w = add(r, 'fx-arc fx-arc--cloud', { d: `${180 + i * 130}ms`, a: '90deg' });
        const g = svg(w, 'fx-arc__svg', '-6 -20 112 40', true);
        path(g, boltPath(), 'fx-arc__line');
      }
    },
  }],

  /* ---- table-wide tricks ---- */

  ['savage_assault', {
    cls: 'fx--savage fx-p--ash',
    wide: true,
    table: (r, s) => {
      add(r, 'fx-dust');
      for (let i = 0; i < 9; i += 1) {
        add(r, 'fx-charge', {
          y: `${Math.round(rnd(8, 84))}%`,
          sz: `${Math.round(rnd(0.5, 1.1) * s.u)}px`,
          d: `${Math.round(rnd(0, 240))}ms`,
        });
      }
    },
    target: (r, s) => {
      burst(r, s, { n: 8, along: 0, spread: 40, reach: 0.5, len: 0.2, delay: 120 });
      add(r, 'fx-wave', { sz: `${Math.round(s.u)}px`, d: '140ms' });
    },
  }],

  ['archery_attack', {
    cls: 'fx--archery fx-p--steel',
    wide: true,
    table: (r, s) => {
      // Twenty-two arrows over the whole table. They are one div each and they
      // only translate, which is why a volley this size costs nothing.
      for (let i = 0; i < 22; i += 1) {
        add(r, 'fx-arrow', {
          x: `${Math.round(rnd(-6, 100))}%`,
          l: `${Math.round(rnd(0.3, 0.55) * s.u)}px`,
          d: `${Math.round(rnd(0, 200))}ms`,
        });
      }
    },
    // After the volley is in the air, not before it: the arrow standing in a
    // seat has to arrive second or the effect plays backwards.
    target: (r, s) => {
      add(r, 'fx-pin', { d: '250ms', sz: `${Math.round(s.u * 0.5)}px` });
      flash(r, s, { size: 0.5, delay: 262 });
    },
  }],

  ['god_salvation', {
    cls: 'fx--salvation fx-p--jade',
    wide: true,
    table: (r, s) => {
      add(r, 'fx-swell');
      add(r, 'fx-swell fx-swell--b', { d: '110ms' });
      for (let i = 0; i < 14; i += 1) {
        add(r, 'fx-petal fx-petal--wide', {
          x0: `${Math.round(rnd(4, 96))}%`,
          dx: `${Math.round(rnd(-0.5, 0.5) * s.u)}px`,
          dy: `${Math.round(rnd(-1.6, -0.8) * s.u)}px`,
          sz: `${Math.round(rnd(0.06, 0.12) * s.u)}px`,
          a: `${Math.round(rnd(-180, 180))}deg`,
          a2: `${Math.round(rnd(200, 560))}deg`,
          d: `${Math.round(rnd(0, 340))}ms`,
        });
      }
    },
    target: (r, s) => { rings(r, s, 2, { size: 0.6, delay: 120 }); add(r, 'fx-bloom', { sz: `${Math.round(s.u * 0.9)}px`, d: '130ms' }); },
  }],

  ['amazing_grace', {
    cls: 'fx--grace fx-p--gold',
    wide: true,
    table: (r, s) => {
      // A bounty: light from above, cards fanning out of it, grain falling.
      add(r, 'fx-shaft');
      const fan = add(r, 'fx-fan');
      ghosts(fan, { ...s, u: s.u * 1.5 }, 5, { fan: 46, rise: -0.15, delay: 90 });
      for (let i = 0; i < 20; i += 1) {
        add(r, 'fx-grain', {
          x: `${Math.round(rnd(4, 96))}%`,
          sz: `${Math.round(rnd(0.03, 0.07) * s.u)}px`,
          d: `${Math.round(rnd(0, 380))}ms`,
          sp: (rnd(0.7, 1.35)).toFixed(2),
        });
      }
    },
  }],
]);

/**
 * Damage has no card behind it, so its recipes are keyed by element instead.
 *
 * `source` rather than `target`: `LogEvent{Damage}` names one seat and says
 * nothing about where the blow came from, so there is no direction to throw
 * debris along and nothing to draw a link to. The seat the engine named is the
 * whole of the geometry.
 */
export const HIT_FX: ReadonlyMap<string, CardRecipe> = new Map<string, CardRecipe>([
  ['normal', {
    cls: 'fx--hit fx-p--blood',
    source: (r, s) => {
      const w = add(r, 'fx-crack');
      const g = svg(w, 'fx-crack__svg', '0 0 100 100');
      for (let i = 0; i < 5; i += 1) {
        const a = rnd(0, Math.PI * 2), len = rnd(26, 46);
        path(g, `M50 50 L${(50 + Math.cos(a) * len).toFixed(1)} ${(50 + Math.sin(a) * len).toFixed(1)}`,
          'fx-crack__line', { d: `${Math.round(rnd(0, 60))}ms` });
      }
      flash(r, s, { size: 0.8 });
      burst(r, s, { n: 12, reach: 0.6, len: 0.13 });
      rings(r, s, 1, { size: 0.5, delay: 30 });
    },
  }],
  ['fire', {
    cls: 'fx--hit fx--hitfire fx-p--fire',
    source: (r, s) => {
      add(r, 'fx-column');
      flash(r, s, { size: 0.75 });
      motes(r, s, { n: 13, dy: -0.9, dx: 0.1, size: 0.055, spread: 0.36, delay: 40 });
      add(r, 'fx-heat', { sz: `${Math.round(s.u * 1.05)}px` });
    },
  }],
  ['thunder', {
    cls: 'fx--hit fx--hitthunder fx-p--thunder',
    source: (r, s) => {
      add(r, 'fx-strobe');
      for (let i = 0; i < 3; i += 1) {
        const w = add(r, 'fx-arc', { d: `${i * 70}ms`, a: `${Math.round(rnd(0, 360))}deg` });
        const g = svg(w, 'fx-arc__svg', '-6 -20 112 40', true);
        path(g, boltPath(), 'fx-arc__line');
      }
      burst(r, s, { n: 10, reach: 0.7, len: 0.1, delay: 20 });
      flash(r, s, { size: 0.7 });
    },
  }],
  ['ice', {
    cls: 'fx--hit fx--hitice fx-p--ice',
    source: (r, s) => {
      // Frost spidering out from the point of impact, then holding.
      const w = add(r, 'fx-frost');
      const g = svg(w, 'fx-frost__svg', '0 0 100 100');
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2 + rnd(-0.3, 0.3);
        const x = 50 + Math.cos(a) * 42, y = 50 + Math.sin(a) * 42;
        const mx = 50 + Math.cos(a + 0.5) * 22, my = 50 + Math.sin(a + 0.5) * 22;
        path(g, `M50 50 Q${mx.toFixed(1)} ${my.toFixed(1)}, ${x.toFixed(1)} ${y.toFixed(1)}`,
          'fx-frost__line', { d: `${Math.round(i * 22)}ms` });
      }
      flash(r, s, { size: 0.7 });
      burst(r, s, { n: 9, reach: 0.55, len: 0.1, cls: 'fx-shard fx-shard--ice' });
    },
  }],
]);

/** Equipment being worn, and the two `./audio/system/*` cues. */
export const GEAR_FX: ReadonlyMap<string, CardRecipe> = new Map<string, CardRecipe>([
  ['weapon', {
    cls: 'fx--weapon fx-p--steel',
    source: (r, s) => {
      // A blade sliding into the rack and locking, not a sabre swing across the
      // portrait: this is equipment being worn. The crescent belongs to 杀.
      add(r, 'fx-blade', { a: '-52deg', l: `${Math.round(s.u * 1.15)}px` });
      add(r, 'fx-mount');
      add(r, 'fx-sheen', { d: '150ms' });
      burst(r, s, { along: 128, spread: 30, n: 8, reach: 0.42, len: 0.1, delay: 150 });
      flash(r, s, { size: 0.4, delay: 160 });
    },
  }],
  ['armor', {
    cls: 'fx--armor fx-p--ice',
    source: (r, s) => {
      // Plates converging from outside the portrait and locking into a shell.
      for (let i = 0; i < 6; i += 1) {
        add(r, 'fx-plate', {
          a: `${Math.round(i * 60)}deg`,
          r0: `${Math.round(s.u * 0.95)}px`,
          r1: `${Math.round(s.u * 0.42)}px`,
          d: `${i * 32}ms`,
        });
      }
      seal(r, s, { size: 1.0, sides: 6, delay: 150 });
      add(r, 'fx-sheen', { d: '190ms' });
    },
  }],
  ['horse', {
    cls: 'fx--horse fx-p--ash',
    source: (r, s) => {
      // Something went past. A wake across the portrait, hard speed lines
      // through it, and the dust it kicked up settling behind.
      add(r, 'fx-wake');
      for (let i = 0; i < 13; i += 1) {
        add(r, 'fx-speed', {
          y: `${Math.round(rnd(-0.6, 0.6) * s.u)}px`,
          l: `${Math.round(rnd(0.6, 1.5) * s.u)}px`,
          d: `${Math.round(rnd(0, 150))}ms`,
        });
      }
      motes(r, s, { n: 14, dy: 0.1, dx: -1.1, size: 0.08, spread: 0.45, cls: 'fx-mote fx-mote--dust' });
      add(r, 'fx-sheen', { d: '90ms' });
    },
  }],
  ['chain', {
    cls: 'fx--chained fx-p--steel',
    source: (r, s) => {
      const w = add(r, 'fx-collar', { sz: `${Math.round(s.u * 1.05)}px` });
      const g = svg(w, 'fx-collar__svg', '0 0 100 100');
      path(g, 'M50 6 A44 44 0 1 1 49.9 6', 'fx-collar__ring');
      flash(r, s, { size: 0.6, delay: 120 });
      burst(r, s, { n: 8, reach: 0.5, len: 0.09, delay: 120 });
    },
  }],
  ['recast', {
    cls: 'fx--recast fx-p--gold',
    source: (r, s) => {
      seal(r, s, { size: 0.95, sides: 4 });
      ghosts(r, s, 1, { fan: 0, rise: -0.4, delay: 80 });
      motes(r, s, { n: 8, dy: -0.5, size: 0.04, spread: 0.3 });
    },
  }],
]);

/**
 * What an unrecognised card gets.
 *
 * A pack this build has never seen ships a card name nobody wrote a recipe for,
 * and the honest answer is a real effect rather than nothing: a seal turning
 * over the seat and a ring, which reads as "a trick resolved here" without
 * claiming to be a particular one.
 */
export const GENERIC_FX: CardRecipe = {
  cls: 'fx--generic fx-p--gold',
  source: (r, s) => {
    seal(r, s, { size: 0.9, sides: 5 });
    rings(r, s, 2, { size: 0.55, delay: 40 });
    flash(r, s, { size: 0.6, delay: 40 });
  },
};

/** A short jagged run across the unit box, for the arcs that crawl on a hit. */
function boltPath(): string {
  const pts: string[] = ['M0 0'];
  for (let i = 1; i <= 6; i += 1) {
    pts.push(`L${(i * 100 / 6).toFixed(1)} ${rnd(-14, 14).toFixed(1)}`);
  }
  return pts.join(' ');
}
