/**
 * How long a spectacle lasts, in terms of how fast the table is being played.
 *
 * The sibling `anim/timing.ts` answers the same question for the sprite lane
 * and caps everything at 450/350/260 ms, which is right for a 12-frame PNG
 * strip and wrong for authored motion. A sprite is a fixed number of drawn
 * frames and stretching it is a slideshow; a keyframe has no frames, so the
 * only thing that should bound it is the beat it has to fit inside.
 *
 * The beat is `resolvePaceMs()` — the shell's resolution of `window.__fkPace`,
 * `?pace=`, `localStorage['fk.pace']` and its default, 800 ms. Every budget
 * below is a *share* of that beat with a ceiling, and every share is under 1,
 * so an effect is finished before the engine's next message lands however slow
 * or fast the table is set. That is the rule this file exists to keep: nothing
 * here may outlive its beat.
 *
 * The one exception is licensed by the engine itself. `notifySkillInvoked`
 * calls `self:delay(2000)` immediately after sending `InvokeUltSkill`
 * (`lua/lunarltk/server/room.lua:609`) — the server stops the game for two
 * seconds so the client can play its full-screen animation. `ULT` spends 1.9 s
 * of that reserved window and hands the table back with room to spare.
 *
 * `pace = 0` means the table is running unpaced — the audit harness playing a
 * whole game in minutes. Every budget resolves to 0 and nothing is drawn at
 * all. Degrading to instant is the point; queueing would turn a two-minute
 * measurement run into hundreds of overlapping effects competing with the
 * thing being measured.
 */
import { resolvePaceMs } from '../../../../shell/liveTable';

export type Beat =
  /** A skill banner: the centrepiece, and the thing a player reads. */
  | 'skill'
  /** The engine's reserved two-second window for a limited skill. */
  | 'ult'
  /** Damage landing — a hit has to punch and be gone. */
  | 'strike'
  /** A player falling. The largest single moment in a game. */
  | 'slay'
  /** A judgement resolving. The engine holds 900 ms after the verdict. */
  | 'verdict'
  /** Short, incidental motion: a draw, an equip, a turn opening. */
  | 'accent';

interface Budget {
  /** Fraction of one beat. Under 1 for everything the next beat must not cut. */
  readonly share: number;
  /** The longest it should ever run, however slow the table is set. */
  readonly ceiling: number;
}

const BUDGET: Readonly<Record<Beat, Budget>> = {
  // 0.78 of the common 800 ms beat is 624 ms. The Qt client holds its own skill
  // banner for 1.64 s (`SkillInvokeAnimation.qml`: 200 in, 1200 held, 200 out),
  // which is twice a beat here and reads as sluggish on a table that moves.
  // 620 ms is long enough to read a two-character skill name and short enough
  // that the next beat never lands on top of it.
  skill: { share: 0.78, ceiling: 620 },
  // The engine has stopped the room for 2000 ms. Use 1900 of it.
  ult: { share: 2.4, ceiling: 1900 },
  strike: { share: 0.58, ceiling: 460 },
  // A death is the one place the "fit inside one beat" rule is broken on
  // purpose. The engine does NOT pause here — it passes 150 ms through — but a
  // death is also the rarest and largest thing that happens in a game: a
  // handful per game against 1,256 `Animate` messages, and the moment the
  // players are all looking at. It overlaps whatever comes next, which the
  // architecture has always allowed (effects overlap, they never queue), and
  // every part of it is `pointer-events: none`, so a long effect cannot cost
  // anyone a click. 1.75 s is roughly the length of the Qt client's own
  // full-screen animations.
  slay: { share: 2.2, ceiling: 1750 },
  verdict: { share: 0.85, ceiling: 700 },
  accent: { share: 0.42, ceiling: 320 },
};

/**
 * The internal shape of a slay, as fractions of its own duration.
 *
 * Published because a sound lane is landing on the same events and a kill wants
 * its sound on the cut, not on the wind-up. At the default 800 ms pace a slay
 * runs 1750 ms, so: flash at 0 ms, the cut lands at 105 ms, the shatter at
 * 245 ms, the seal stamps at 490 ms, and it is over at 1750 ms.
 */
export const SLAY_PHASE = {
  /** White-out from the victim's seat. The frame the game stops on. */
  flash: 0,
  /** The blade crosses the table. This is the beat a hit sound lands on. */
  cut: 0.06,
  /** The portrait breaks and the shockwave leaves. */
  shatter: 0.14,
  /** The role seal slams in and holds. */
  seal: 0.28,
} as const;

/**
 * How long one beat's effect runs at a given pace. Pure, so it can be checked
 * without a browser — `beatMs` is this against whatever the table is set to.
 */
export function budgetMs(beat: Beat, pace: number): number {
  if (!Number.isFinite(pace) || pace <= 0) return 0;
  const b = BUDGET[beat];
  return Math.round(Math.min(b.ceiling, pace * b.share));
}

export function beatMs(beat: Beat): number {
  return budgetMs(beat, paceMs());
}

/**
 * The pace, read at most once a second.
 *
 * `resolvePaceMs()` touches `localStorage` and parses the URL, which is nothing
 * once and a great deal in a burst — `Animate` was measured 1,256 times across
 * three games, and they do not arrive evenly.
 */
let cached = { at: 0, value: -1 };

function paceMs(): number {
  const now = Date.now();
  if (cached.value >= 0 && now - cached.at < 1000) return cached.value;
  let value: number;
  try {
    // `resolvePaceMs` swallows its own failures and answers with the default
    // pace, so this catch is for the case it cannot cover: the module not being
    // resolvable at all. A table nobody is watching does not need a tempo.
    value = resolvePaceMs();
  } catch {
    value = 0;
  }
  cached = { at: now, value };
  return value;
}
