/**
 * What the table remembers.
 *
 * WHY THIS EXISTS. A card used to be legible only for as long as the engine
 * happened to leave it in the processing area, and that turns out to be barely
 * any time at all. Replaying the recorded 8-player game through the store's own
 * table rules (`fixtures/ui-notify-stream.json`, 2,286 notify frames) gives:
 *
 *   * 134 cards land on the table across the game, in 96 distinct plays; the
 *     median play is a single card.
 *   * 69% of them are deleted mid-fade by the next `DestroyTableCardByEvent`,
 *     which retires the previous generation before marking a new one
 *     (`store.ts:508-510`). Another 30% are pulled off by a `MoveCards` and get
 *     no fade at all. The 1.2 s vanish timer in the renderer runs to completion
 *     for exactly one card in a whole game.
 *   * The processing area holds nothing legible for 54% of the game's frames.
 *
 * So the complaint — "it just skips, you don't know what card is played" — is
 * not a timing tweak away. The dwell is not short, it is *unowned*: it is
 * whatever falls out of the engine's event nesting.
 *
 * WHAT THIS DOES INSTEAD. The view keeps its own short memory of plays, and the
 * table shows the last one until there is a new one to show. That ties the
 * dwell to the game's own rhythm rather than to a timeout, and it is bounded by
 * construction: one play is held, never eight seats' worth of stale cards.
 *
 * A *play* is everything that sat in the processing area between two moments of
 * emptiness. That grouping is deliberate: a 杀 and the 闪 answering it arrive
 * under different event ids but share the table, so they read as one exchange
 * rather than two orphaned cards.
 *
 * Nothing here touches the store. `RoomStore` keeps retiring and pruning table
 * cards on exactly the schedule it always has — card conservation and the
 * derived discard count are untouched — and this is a copy kept for the eye.
 */
import type { CardState } from '../state/types';

export interface Play {
  /** Monotonic, and stable for as long as the play is remembered: a React key. */
  readonly id: number;
  /**
   * The cards, in the order they reached the table. A card keeps its last-known
   * face and footnote even after the engine has taken it away again, which is
   * the whole point — 30% of them leave without so much as a fade.
   */
  readonly cards: readonly CardState[];
}

export interface PlayMemory {
  /** Most recent first. `plays[0]` is what the table is showing or holding. */
  readonly plays: readonly Play[];
  /** True while `plays[0]` still has cards in the processing area. */
  readonly open: boolean;
  /** Last id handed out. */
  readonly seq: number;
}

export const EMPTY_PLAYS: PlayMemory = { plays: [], open: false, seq: 0 };

/**
 * How many plays are kept. One is held on the table itself; the rest are the
 * recent strip beside it.
 *
 * Four is measured, not chosen: the median play is one card and the widest
 * moment of the recorded game put three on the table at once, so four plays is
 * about six card widths — it fits the band between the seat columns at eight
 * seats without wrapping, and it covers the "I looked away and three things
 * happened" case that 274 unfamiliar generals actually produce.
 */
export const KEPT_PLAYS = 4;

/**
 * Fold one committed table into the memory.
 *
 * Pure, and returns `prev` unchanged when nothing the eye cares about moved —
 * the store commits five times a second on `refreshStatusSkills` whether or not
 * the game did anything, and a new object every time would defeat `memo` on
 * every card in the strip.
 */
export function rememberPlays(
  prev: PlayMemory,
  table: readonly CardState[],
  kept: number = KEPT_PLAYS,
): PlayMemory {
  // An expired card is one the engine has finished with. It is still in
  // `state.table` until the renderer prunes it, but it is no longer what is
  // happening, so it does not hold the play open.
  const live = table.filter((c) => !c.expired);

  if (live.length === 0) {
    // The processing area went quiet. The play is closed and becomes the held
    // one; the cards stay exactly as they were last seen.
    return prev.open ? { ...prev, open: false } : prev;
  }

  if (!prev.open) {
    const seq = prev.seq + 1;
    return {
      seq,
      open: true,
      plays: [{ id: seq, cards: live.map(freeze) }, ...prev.plays].slice(0, Math.max(1, kept)),
    };
  }

  // Still the same play. Re-read it: `SetCardFootnote` arrives in a later
  // notify than the `MoveCards` that put the card down, so the sentence saying
  // who used what on whom is only ever attached after the fact.
  const head = prev.plays[0];
  const cards = merge(head.cards, live);
  if (cards === head.cards) return prev;
  return { ...prev, plays: [{ ...head, cards }, ...prev.plays.slice(1)] };
}

/**
 * The cards already recorded, refreshed from the table, plus any that are new.
 *
 * Order is the order cards first reached the table and never changes, so a card
 * does not jump sideways when a later one lands next to it. A card the engine
 * has since removed keeps its last-known data rather than disappearing.
 */
function merge(kept: readonly CardState[], live: readonly CardState[]): readonly CardState[] {
  const byId = new Map<number, CardState>();
  for (const c of live) byId.set(c.cid, c);

  let changed = false;
  const out: CardState[] = [];
  for (const old of kept) {
    const now = byId.get(old.cid);
    byId.delete(old.cid);
    // Gone from the table but not from the play: keep what was last seen.
    if (!now) { out.push(old); continue; }
    const next = freeze(now);
    if (same(old, next)) { out.push(old); continue; }
    changed = true;
    out.push(next);
  }
  for (const c of byId.values()) { out.push(freeze(c)); changed = true; }
  return changed ? out : kept;
}

/**
 * A copy that will not be mutated out from under the strip.
 *
 * `RoomStore` rebuilds table entries on every move, so the objects in
 * `state.table` are already fresh — but `patchCard` mutates through
 * `state.cards`, and a remembered play outlives the table entry it came from.
 * Only the fields the strip draws are kept.
 */
function freeze(c: CardState): CardState {
  return {
    cid: c.cid,
    known: c.known,
    footnote: c.footnote,
    virtName: c.virtName,
    eventId: c.eventId,
  };
}

function same(a: CardState, b: CardState): boolean {
  return a.cid === b.cid
    && a.known === b.known
    // `Localized` objects are rebuilt only by `SetCardFootnote`, so identity is
    // the right test: it changes exactly when the engine says something new.
    && a.footnote === b.footnote
    && a.virtName === b.virtName;
}
