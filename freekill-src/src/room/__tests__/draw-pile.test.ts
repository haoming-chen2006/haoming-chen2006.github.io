/**
 * The reshuffle — the one event that moves cards without a `MoveCards` to
 * justify it, and the one the room used to be blind to.
 *
 * When the draw pile runs out the server refills it from the discard pile and
 * broadcasts `ShuffleDrawPile` with the new pile (`lua/lunarltk/server/room.lua:3136`).
 * `Client:handleShuffleDrawPile` applies that inside the client VM — every card
 * back to `Card.DrawPile` (`card_manager.lua:180`) — and then notifies the UI of
 * nothing at all, because the Qt client keeps no card-location table of its own:
 * `MiscStatus.qml` shows a pile *count*, which `RefreshStatusSkills` re-sends as
 * `UpdateDrawPile` every 200 ms, and every photo asks the VM.
 *
 * `RoomStore` does keep that table, so the silence left it holding ~145 cards on
 * `DiscardPile` for the rest of the game while `UpdateDrawPile` pulled the pile
 * count back to the truth — 牌堆 137 | 弃牌堆 141, i.e. 278 cards in a 160-card
 * deck, and a discard count that could never fall again.
 *
 * Both halves of the repair are asserted here: `lua/web/client.lua` forwarding
 * the VM's new pile as a `SyncDrawPile` notify, and the store applying it.
 */
import { describe, expect, it } from 'vitest';
import type { Envelope } from '../../contract/protocol.ts';
import { MainThreadLuaClient } from '../../engine/luaClient.ts';
import { InProcessLuaHost } from '../../engine/luaHost.ts';
import { RoomSession } from '../../engine/roomSession.ts';
import { bundle, roomSpec } from '../../engine/__tests__/support.ts';
import { CARD_AREA } from '../ltk/types.ts';
import { RoomStore } from '../state/store.ts';

const ME = 1;
const LONG = 300_000;

/**
 * The audit's card-conservation sum, computed the same way
 * (`scripts/audit/probe.mjs`): the engine's own pile number, plus every card
 * this seat has been told the location of, minus the ones whose location *is*
 * the draw pile — those are already inside the engine's number, and adding them
 * is precisely the double count this measures.
 */
function universe(store: RoomStore): number {
  const s = store.state;
  let known = 0;
  let inDraw = 0;
  for (const area of Object.values(s.cardArea)) {
    known += 1;
    if (area === CARD_AREA.DrawPile) inDraw += 1;
  }
  return s.drawPileCount + (known - inDraw);
}

const move = (
  fromArea: number, toArea: number, ids: number[],
  ends: { from?: number; to?: number } = {},
) => ({ merged: [{ fromArea, toArea, ids, ...ends }], event_id: 1 });

describe('the store, told that the deck was reshuffled', () => {
  /**
   * A pile of ten drained into one hand and discarded, then refilled. The
   * numbers are small enough to write down, and the shape is the real one: the
   * pile count is re-asserted by `UpdateDrawPile` whether or not anything told
   * the store where the cards went, which is exactly why a missed reshuffle
   * shows up as a deck that grew rather than as a deck that shrank.
   */
  it('moves the reshuffled cards out of the discard pile', () => {
    const store = new RoomStore(ME);
    store.applyNotify('StartGame', null);
    store.applyNotify('UpdateDrawPile', 10);

    const dealt = [1, 2, 3, 4, 5, 6, 7, 8];
    store.applyNotify('MoveCards', move(CARD_AREA.DrawPile, CARD_AREA.PlayerHand, dealt, { to: 2 }));
    store.applyNotify('MoveCards', move(CARD_AREA.PlayerHand, CARD_AREA.DiscardPile, dealt, { from: 2 }));
    // A discard is drawn on the table until the engine retires it, and
    // `countDiscarded` excludes what is still on the table so it cannot count a
    // card twice. Retiring it is what makes it a discard the room counts.
    store.applyNotify('DestroyTableCardByEvent', 1);
    store.pruneTable();
    store.commit();

    expect(store.state.drawPileCount).toBe(2);
    expect(store.state.discardCount).toBe(8);
    expect(universe(store)).toBe(10);

    // The server refills: the two survivors plus the eight discards, shuffled.
    store.applyNotify('SyncDrawPile', [9, 3, 1, 10, 7, 5, 2, 8, 4, 6]);
    store.applyNotify('UpdateDrawPile', 10);
    store.commit();

    expect(store.state.drawPileCount).toBe(10);
    // The whole point: the discard pile is empty again and stays countable.
    expect(store.state.discardCount).toBe(0);
    expect(universe(store)).toBe(10);
    for (const cid of dealt) {
      expect(store.state.cardArea[cid], `card ${cid}`).toBe(CARD_AREA.DrawPile);
    }
  });

  it('lets the cards be dealt again out of the refilled pile', () => {
    const store = new RoomStore(ME);
    store.applyNotify('StartGame', null);
    store.applyNotify('SyncDrawPile', [1, 2, 3, 4]);
    store.applyNotify('MoveCards', move(CARD_AREA.DrawPile, CARD_AREA.PlayerHand, [1, 2], { to: 2 }));
    store.commit();

    expect(store.state.drawPileCount).toBe(2);
    expect(store.state.hands[2]).toEqual([1, 2]);
    expect(universe(store)).toBe(4);
  });
});

/**
 * The same thing against the real engine rather than a hand-written stream.
 *
 * The reference game (seed 20260828) runs long enough to exhaust the pile: seat
 * 1's stream carries one `ShuffleDrawPile` and 28 `SyncDrawPile`. That makes
 * this the end-to-end check for both halves — if `lua/web/client.lua` stops
 * forwarding the pile, no notify arrives and the sum drifts; if the store stops
 * applying it, the notify arrives and the sum drifts anyway.
 */
describe('a real game that exhausts the draw pile', () => {
  it('keeps every card in exactly one place, all game', async () => {
    const host = await InProcessLuaHost.create(bundle(), {});
    const client = await MainThreadLuaClient.create(bundle(), { playerId: ME, screenName: 'p1' });
    const store = new RoomStore(ME);

    let syncs = 0;
    let deck: number | null = null;
    const wrong: string[] = [];
    let checks = 0;

    client.onNotifyUI((command, data) => {
      store.applyNotify(String(command), data);
      if (String(command) === 'SyncDrawPile') syncs += 1;
      if (!store.state.started) return;
      const n = universe(store);
      if (deck === null) {
        // The deck size is whatever this room dealt rather than a constant, for
        // the same reason the audit refuses to hard-code 160: it depends on
        // which packs the room enabled.
        if (store.state.drawPileCount > 0 && n > 0) deck = n;
        return;
      }
      // Counted once the baseline exists and never gated on the pile being
      // non-empty: an exhausted pile is a legitimate state (it is the state
      // that provokes the reshuffle), and gating on it would let the very
      // notify under test silence the check that covers it.
      checks += 1;
      if (n !== deck) wrong.push(`${n} (expected ${deck}) after ${String(command)}`);
    });

    const session = await RoomSession.start(host, roomSpec(), {
      onEnvelope: (e: Envelope) => { if (e.to === null || e.to === ME) client.deliverEnvelope(e); },
    });
    try {
      const res = await session.advance();
      expect(res.err ?? null).toBeNull();
      expect(res.over).toBe(true);

      // A check that never ran must not read as a pass: this game has to have
      // actually reshuffled for the rest of the assertions to mean anything.
      expect(syncs, 'the VM forwarded the reshuffle to the room').toBeGreaterThan(0);
      expect(checks).toBeGreaterThan(1000);
      // 161, not the 160 this was written against: `roomSpec()` enables every
      // pack, and mirroring 标准·界限突破 in put its 木牛流马
      // (`role__wooden_ox`, one copy, `standard_ex_cards`) into the deck. It is
      // the only non-derived card any of the six rosters adds. Asserted as a
      // constant rather than read from the room because the point of the number
      // here is to notice a card appearing or vanishing.
      expect(deck).toBe(161);
      expect(wrong.slice(0, 5)).toEqual([]);
      expect(client.errors()).toEqual([]);
    } finally {
      host.dispose();
      client.dispose();
    }
  }, LONG);
});
