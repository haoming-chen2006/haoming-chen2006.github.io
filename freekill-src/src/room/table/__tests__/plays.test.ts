/**
 * The table's memory of what was played.
 *
 * Half of this is the fold's own rules; the other half replays the recorded
 * 8-player game through the real `RoomStore` and measures the thing the change
 * is for — whether a human could have read what was played.
 */
import { describe, expect, it } from 'vitest';
import { FixtureLuaClient } from '../../fixture/FixtureLuaClient';
import { initialDrawPile, notifyFrames, recordedSeat } from '../../harness/fixtureStream';
import { RoomStore } from '../../state/store';
import { CARD_AREA } from '../../ltk/types';
import type { CardState } from '../../state/types';
import { EMPTY_PLAYS, KEPT_PLAYS, rememberPlays, type PlayMemory } from '../plays';

const card = (cid: number, patch: Partial<CardState> = {}): CardState => ({
  cid, known: true, eventId: 1, ...patch,
});

describe('remembering a play', () => {
  it('opens a play when cards reach the table', () => {
    const m = rememberPlays(EMPTY_PLAYS, [card(1)]);
    expect(m.open).toBe(true);
    expect(m.plays).toHaveLength(1);
    expect(m.plays[0].cards.map((c) => c.cid)).toEqual([1]);
  });

  it('folds a footnote that arrives after the move into the same play', () => {
    // `SetCardFootnote` is always a later notify than the `MoveCards` that put
    // the card down, so a play is never complete on the frame it opens.
    const note = { zh_CN: '许褚对华佗', en_US: 'Xu Chu on Hua Tuo' };
    let m = rememberPlays(EMPTY_PLAYS, [card(1)]);
    m = rememberPlays(m, [card(1, { footnote: note })]);
    expect(m.plays).toHaveLength(1);
    expect(m.plays[0].cards[0].footnote).toBe(note);
  });

  it('keeps a card the engine has taken back off the table', () => {
    // 30% of table cards leave by a `MoveCards` with no fade at all. The play
    // is the record of what was played, so it keeps them.
    let m = rememberPlays(EMPTY_PLAYS, [card(1), card(2)]);
    m = rememberPlays(m, [card(2)]);
    expect(m.plays[0].cards.map((c) => c.cid)).toEqual([1, 2]);
  });

  it('joins a card that lands later to the play already open', () => {
    // A 杀 and the 闪 answering it arrive under different event ids but share
    // the table. They are one exchange and read as one entry.
    let m = rememberPlays(EMPTY_PLAYS, [card(1, { eventId: 4 })]);
    m = rememberPlays(m, [card(1, { eventId: 4 }), card(2, { eventId: 7 })]);
    expect(m.plays).toHaveLength(1);
    expect(m.plays[0].cards.map((c) => c.cid)).toEqual([1, 2]);
  });

  it('closes the play when the table goes quiet, and keeps it', () => {
    let m = rememberPlays(EMPTY_PLAYS, [card(1)]);
    m = rememberPlays(m, []);
    expect(m.open).toBe(false);
    expect(m.plays[0].cards.map((c) => c.cid)).toEqual([1]);
  });

  it('does not let an expired card hold a play open', () => {
    // An expired card is still in `state.table` until the renderer prunes it,
    // but the engine has closed its event: it is already history.
    let m = rememberPlays(EMPTY_PLAYS, [card(1)]);
    m = rememberPlays(m, [card(1, { expired: true })]);
    expect(m.open).toBe(false);
  });

  it('is unaffected by when the store prunes', () => {
    // The prune is a wall-clock timer in the renderer. The memory must not
    // depend on it, or a slow frame would change what the table shows.
    const pruned = [rememberPlays(EMPTY_PLAYS, [card(1)]), []] as const;
    const notPruned = [rememberPlays(EMPTY_PLAYS, [card(1)]), [card(1, { expired: true })]] as const;
    const a = rememberPlays(pruned[0], pruned[1]);
    const b = rememberPlays(notPruned[0], notPruned[1]);
    expect(a.plays[0].cards).toEqual(b.plays[0].cards);
    expect(a.open).toBe(b.open);
  });

  it('opens a new play after the quiet and pushes the old one back', () => {
    let m = rememberPlays(EMPTY_PLAYS, [card(1)]);
    m = rememberPlays(m, []);
    m = rememberPlays(m, [card(2)]);
    expect(m.plays.map((p) => p.cards[0].cid)).toEqual([2, 1]);
    expect(m.plays[0].id).not.toBe(m.plays[1].id);
  });

  it('keeps at most KEPT_PLAYS, so the strip cannot grow over the table', () => {
    let m: PlayMemory = EMPTY_PLAYS;
    for (let i = 1; i <= KEPT_PLAYS + 6; i++) {
      m = rememberPlays(m, [card(i)]);
      m = rememberPlays(m, []);
    }
    expect(m.plays).toHaveLength(KEPT_PLAYS);
    // Newest first.
    expect(m.plays[0].cards[0].cid).toBe(KEPT_PLAYS + 6);
  });

  it('is idempotent, which is what makes folding during render safe', () => {
    // StrictMode renders twice and a concurrent render can be thrown away. The
    // fold runs against a ref during render, so folding the same table twice
    // must be the same as folding it once.
    for (const table of [[card(1)], [], [card(1, { expired: true })], [card(1), card(2)]]) {
      let m = rememberPlays(EMPTY_PLAYS, [card(9)]);
      const once = rememberPlays(m, table);
      const twice = rememberPlays(once, table);
      expect(twice).toBe(once);
      m = once;
    }
  });

  it('returns the same object when nothing the eye cares about moved', () => {
    // The store commits five times a second on `refreshStatusSkills`; a new
    // object every time would defeat `memo` on every card in the strip.
    const table = [card(1)];
    const m = rememberPlays(EMPTY_PLAYS, table);
    expect(rememberPlays(m, [card(1)])).toBe(m);
    expect(rememberPlays(m, table)).toBe(m);
  });

  it('keeps card order stable as later cards land', () => {
    let m = rememberPlays(EMPTY_PLAYS, [card(5)]);
    m = rememberPlays(m, [card(5), card(3)]);
    m = rememberPlays(m, [card(3), card(5), card(1)]);
    expect(m.plays[0].cards.map((c) => c.cid)).toEqual([5, 3, 1]);
  });
});

/**
 * The measurement the change exists for, run over the whole recorded game.
 *
 * `replayed()` folds the memory exactly the way `TableStage` does — per commit,
 * against `state.table` — so what is asserted here is what the table draws.
 */
function replayed() {
  const store = new RoomStore(recordedSeat);
  const client = new FixtureLuaClient({ frames: notifyFrames, initialDrawPile });
  client.onNotifyUI((c, d) => store.applyNotify(c as string, d));

  let memory: PlayMemory = EMPTY_PLAYS;
  let frames = 0;
  let legibleBefore = 0;   // what the old table showed: a non-expired card, or nothing
  let legibleAfter = 0;    // what it shows now: that, or the play it is holding
  let blankAfterFirst = 0;
  let started = false;
  let withCaption = 0;
  let plays = 0;
  let widest = 0;
  const deckTotals = new Set<number>();

  while (client.step()) {
    // Exactly what the renderer does, in the order it does it: the store prunes
    // the cards the engine has finished with, and the memory folds over what is
    // left. Interleaving them is the point — the fold must not disturb the
    // ledger the prune maintains.
    store.pruneTable();
    store.commit();
    const table = store.state.table;
    const before = memory;
    memory = rememberPlays(memory, table);
    frames += 1;

    if (store.state.started) deckTotals.add(deckTotal(store));

    const acting = table.some((c) => !c.expired);
    const held = memory.plays[0];
    if (acting) legibleBefore += 1;
    if (acting || held) legibleAfter += 1;
    if (started && !acting && !held) blankAfterFirst += 1;
    if (held) started = true;
    // A play that has just closed is complete: every footnote it will ever get
    // has arrived. That is the moment to ask whether it can be captioned.
    if (before.open && !memory.open && memory.plays[0]) {
      plays += 1;
      if (memory.plays[0].cards.some((c) => c.footnote)) withCaption += 1;
    }
    if (held) widest = Math.max(widest, held.cards.length);
  }
  return {
    store, memory, frames, legibleBefore, legibleAfter, blankAfterFirst,
    widest, plays, withCaption, deckTotals,
  };
}

/**
 * The whole deck, counted the way `__tests__/replay.test.ts` counts it. Copied
 * rather than shared because the point of having it here is to run it with the
 * play memory folding in the same loop.
 */
function deckTotal(store: RoomStore): number {
  const s = store.state;
  const held =
    Object.values(s.hands).flat().length +
    Object.values(s.equips).flat().length +
    Object.values(s.judge).flat().length +
    Object.values(s.piles).flatMap((p) => Object.values(p).flat()).length;
  const onTable = s.table.filter((c) => !c.virtual);
  const tableIds = new Set(onTable.map((c) => c.cid));
  const inFlight = Object.entries(s.cardArea).filter(
    ([cid, area]) =>
      (area === CARD_AREA.Processing || area === CARD_AREA.Void) && !tableIds.has(Number(cid)),
  ).length;
  return held + s.drawPileCount + s.discardCount + onTable.length + inFlight;
}

describe('the recorded game, as the table now draws it', () => {
  it('leaves the processing area legible for barely half the game today', () => {
    // The baseline the change is measured against: with only the store's own
    // table, there is nothing to read for most of the game.
    const { frames, legibleBefore } = replayed();
    expect(legibleBefore / frames).toBeLessThan(0.5);
  });

  it('always has something to show once the game is running', () => {
    // Not one frame between the first play and the end of the game where the
    // middle of the table says nothing. The frames that are still blank are the
    // ones before any card has been played — the deal and general selection —
    // and there is nothing to show then.
    const { blankAfterFirst, legibleAfter, legibleBefore, frames } = replayed();
    expect(blankAfterFirst).toBe(0);
    expect(legibleAfter).toBeGreaterThan(frames * 0.9);
    expect(legibleAfter).toBeGreaterThan(legibleBefore * 1.8);
  });

  it('can caption nearly every play with who used it on whom', () => {
    // The held card is only worth holding if it says something. `SetCardFootnote`
    // is the engine's own sentence and it arrives for the great majority of
    // plays; the rest are draws and discards, which the card itself explains.
    const { plays, withCaption } = replayed();
    expect(plays).toBeGreaterThan(40);
    expect(withCaption / plays).toBeGreaterThan(0.6);
  });

  it('never holds more than a handful of cards, at eight seats', () => {
    // The reason this is not "keep the card up longer": at eight seats a table
    // that accumulates is a table you cannot read either.
    const { widest } = replayed();
    expect(widest).toBeGreaterThan(0);
    expect(widest).toBeLessThanOrEqual(9);
  });

  it('remembers a bounded number of plays for the whole game', () => {
    const { memory } = replayed();
    expect(memory.plays.length).toBeLessThanOrEqual(KEPT_PLAYS);
  });

  it('leaves the store s card accounting exactly as it found it', () => {
    // The memory is a copy kept for the eye, folded in the same loop as the
    // prune. If it ever mutated a table entry — a card kept by reference and
    // then patched — the deck would stop adding up. 160 cards, each in exactly
    // one place, at every commit of the whole game, with the fold running.
    const { store, deckTotals } = replayed();
    expect([...deckTotals]).toEqual([160]);
    expect(store.state.gameOver).toBe('rebel+rebel_chief+civilian');
  });
});
