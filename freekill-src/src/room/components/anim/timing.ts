/**
 * How long an effect lasts, in terms of how fast the table is being played.
 *
 * The engine paces itself. `room:delay()` yields the room coroutine and the
 * shell honours the pause it asks for, so a bot's turn arrives as a series of
 * beats rather than all at once. An effect's job is to fill one of those beats
 * and be gone before the next, which makes the pace the only sensible source
 * for its duration — a fixed 450 ms would be right at one setting and wrong at
 * every other.
 *
 * `resolvePaceMs()` is the shell's resolution of `window.__fkPace`, `?pace=`,
 * `localStorage['fk.pace']` and its own default, in that order. Reading the
 * function rather than copying the constant means a player who slows their own
 * table down slows the animation with it.
 *
 * `0` means pacing is off and the table runs flat out — what the audit harness
 * uses to play whole games in minutes. Effects switch off with it. Playing them
 * anyway would not be "fast", it would be hundreds of overlapping sprites
 * competing with the thing being measured.
 */
import { resolvePaceMs } from '../../../shell/liveTable';

/**
 * The longest a card effect should run, however slow the table is set.
 *
 * The Qt client plays these for 1.2 s (24 frames at its fixed 50 ms), which is
 * longer than a beat here and reads as sluggish besides. 450 ms is the same
 * motion at the same 20-ish fps, fitted to the common 500 ms beat with air left
 * at the end so the next beat does not cut it off mid-flight.
 */
const CARD_MS = 450;

/** A skill banner is a label as much as a picture and wants to be read, but it
 *  also fires far more often than a card effect, so it stays out of the way. */
const SKILL_MS = 350;

/** Short, incidental motion: a hit shake, a heal pulse, an equipment flash. */
const ACCENT_MS = 260;

export type EffectKind = 'card' | 'skill' | 'accent';

const CEILING: Readonly<Record<EffectKind, number>> = {
  card: CARD_MS, skill: SKILL_MS, accent: ACCENT_MS,
};

/**
 * A beat's share of the pace, capped at the length the effect was drawn for.
 *
 * The proportion matters more than the cap. The pace is the length of the
 * *common* beat, not of every beat: the engine passes 400 ms at a judge reveal
 * and 150 ms at a death through unclamped. Scaling with the pace keeps an
 * effect roughly inside whatever window it lands in, and the cap stops a slow
 * table from stretching a 12-frame sprite into a slideshow.
 */
export function effectMs(kind: EffectKind): number {
  const pace = paceMs();
  if (pace <= 0) return 0;
  const share = kind === 'card' ? 0.9 : kind === 'skill' ? 0.7 : 0.5;
  return Math.round(Math.min(CEILING[kind], pace * share));
}

/** True when the table is running unpaced and effects should not play at all. */
export function animationsOff(): boolean {
  return paceMs() <= 0;
}

/**
 * The pace, read once per frame at most.
 *
 * `resolvePaceMs()` touches `localStorage` and parses the URL. That is nothing
 * on its own and a great deal when an effect asks for it, because effects
 * arrive in bursts — 1,256 `Animate` messages over three games.
 */
let cached = { at: 0, value: -1 };

function paceMs(): number {
  const now = Date.now();
  if (cached.value >= 0 && now - cached.at < 1000) return cached.value;
  let value: number;
  try {
    value = resolvePaceMs();
  } catch {
    // No `window`, or a shell that is not there — the fixture harness and the
    // unit tests. A table nobody is watching does not need a tempo.
    value = 0;
  }
  cached = { at: now, value };
  return value;
}
