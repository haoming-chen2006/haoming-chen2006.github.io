/**
 * The 200 ms status poll, and why it no longer re-renders the table.
 *
 * `RoomView` runs `RefreshStatusSkills` five times a second for the whole game,
 * because it is the only thing that refreshes a hand card's face after a filter
 * skill, the visible marks, and role visibility (`client_util.lua:1225`). What
 * it emits is six commands and nothing else, and almost every tick emits the
 * values that were already there.
 *
 * That used to cost a full-table render each time. `patchPlayer` spread the
 * patch in blind, so `state.players[id]` was a new object on every tick, so
 * `state.players` was, so `memo` on `Photo` — which exists precisely to stop
 * this — missed on all eight seats. On the host seat of two audited games the
 * worst freeze was 3.5 s, and React's own reconciliation was the largest line
 * in its CPU profile. With this it is 145 ms.
 *
 * So the property under test is not a number, it is a shape: **a message that
 * repeats what the store already knows must not publish.** The other half — a
 * message that says something new must always publish — is what the rest of
 * this file is for, because that is the half whose failure would be a bug
 * nobody sees until the table is stale.
 */
import { describe, expect, it } from 'vitest';
import { CARD_AREA } from '../ltk/types.ts';
import { RoomStore } from '../state/store.ts';

/** Whatever `RefreshStatusSkills` sends for one living seat, in its own order. */
function poll(store: RoomStore, id: number, hp: number, maxCards: number, mark?: [string, unknown]): void {
  store.applyNotify('MaxCard', { id, pcardMax: maxCards, php: hp });
  if (mark) store.applyNotify('SetPlayerMark', [id, mark[0], mark[1]]);
  store.applyNotify('PropertyUpdate', [id, 'role_shown', false]);
  store.applyNotify('UpdateDrawPile', 80);
  store.applyNotify('UpdateHandcard', null);
  store.applyNotify('UpdateSkill', null);
}

/** How many times the store published across `run`. */
function publishes(store: RoomStore, run: () => void): number {
  let n = 0;
  const off = store.subscribe(() => { n += 1; });
  run();
  off();
  return n;
}

function seated(): RoomStore {
  const store = new RoomStore(1);
  store.applyNotify('AddPlayer', [2, 'p2', 'avatar']);
  poll(store, 1, 4, 4, ['@lost', 2]);
  poll(store, 2, 4, 4, ['@lost', 2]);
  store.commit();
  return store;
}

describe('the 200 ms status poll', () => {
  /**
   * It publishes every tick, deliberately.
   *
   * `commit` briefly skipped a publish when no stored field had moved, and that
   * desynced the table — two tabs disagreeing on a hand count for ten seconds
   * of the audit. `RefreshStatusSkills` emits `UpdateHandcard` and `UpdateSkill`
   * on every tick, they say the client VM's answer changed, and the renderer
   * reads that answer from the VM — so there is no field here by which a real
   * change can be told from a repeat. A store that withholds the render is a
   * store that lies.
   *
   * The cost is paid in `patchPlayer` instead, which is what the next test
   * pins: the publish happens, and it is cheap because nothing moved.
   */
  it('publishes on every tick, because the VM is also a source of truth', () => {
    const store = seated();
    const n = publishes(store, () => {
      for (let tick = 0; tick < 20; tick += 1) {
        poll(store, 1, 4, 4, ['@lost', 2]);
        poll(store, 2, 4, 4, ['@lost', 2]);
        store.commit();
      }
    });
    expect(n).toBe(20);
  });

  it('keeps every seat object identical across a silent tick', () => {
    // This is the property `memo` on `Photo` is written against, and the one
    // that was quietly false: a rebuilt player object is a re-rendered seat.
    const store = seated();
    const before = store.state.players;
    const one = store.state.players[1];
    poll(store, 1, 4, 4, ['@lost', 2]);
    poll(store, 2, 4, 4, ['@lost', 2]);
    store.commit();
    expect(store.state.players).toBe(before);
    expect(store.state.players[1]).toBe(one);
  });

  it('publishes the moment any one of the six values actually moves', () => {
    const store = seated();
    // hp, through MaxCard — the poll's own carrier for it.
    expect(publishes(store, () => { poll(store, 1, 3, 4, ['@lost', 2]); store.commit(); })).toBe(1);
    // the hand limit
    expect(publishes(store, () => { poll(store, 1, 3, 5, ['@lost', 2]); store.commit(); })).toBe(1);
    // a mark's value
    expect(publishes(store, () => { poll(store, 1, 3, 5, ['@lost', 3]); store.commit(); })).toBe(1);
    // a mark appearing, and a mark going away
    expect(publishes(store, () => { poll(store, 1, 3, 5, ['@drank', 1]); store.commit(); })).toBe(1);
    expect(publishes(store, () => { store.applyNotify('SetPlayerMark', [1, '@drank', 0]); store.commit(); })).toBe(1);
    // role visibility
    expect(publishes(store, () => {
      store.applyNotify('PropertyUpdate', [1, 'role_shown', true]);
      store.commit();
    })).toBe(1);
    // the pile count
    expect(publishes(store, () => { store.applyNotify('UpdateDrawPile', 79); store.commit(); })).toBe(1);
  });

  it('publishes for anything that is not the poll, always', () => {
    // The safe direction, and the one the whole change rests on: only the six
    // commands the poll sends are ever weighed. Everything else describes
    // something that happened, and something that happened is a render.
    const store = seated();
    for (const [command, data] of [
      ['GameLog', 'x'],
      ['MoveFocus', [[1], 'PlayCard', 15000]],
      ['UpdateRoundNum', 3],
      // `UpdateCard` stores nothing at all — the card's face is re-read from
      // the client VM by the renderer — so the render IS the whole of its
      // effect, and suppressing it would leave a filtered card wrong on screen.
      ['UpdateCard', 5],
    ] as const) {
      expect(publishes(store, () => { store.applyNotify(command, data); store.commit(); }), command).toBe(1);
    }
  });

  it('publishes a phase change even though it arrives on PropertyUpdate', () => {
    // `PropertyUpdate` is weighed rather than trusted because `role_shown` rides
    // on it five times a second — but `phase` rides on it too, and it moves the
    // gold ring round the table.
    const store = seated();
    expect(publishes(store, () => { store.applyNotify('PropertyUpdate', [2, 'phase', 2]); store.commit(); })).toBe(1);
    expect(store.state.currentId).toBe(2);
    expect(publishes(store, () => { store.applyNotify('PropertyUpdate', [2, 'phase', 8]); store.commit(); })).toBe(1);
    expect(store.state.currentId).toBe(null);
  });

  it('still publishes for a reset and for a table prune', () => {
    // Neither goes through `applyNotify`, so neither is covered by the rule
    // above and both had to say so themselves.
    const store = seated();
    expect(publishes(store, () => { store.reset(1); })).toBe(1);
    store.applyNotify('MoveCards', {
      merged: [{ fromArea: CARD_AREA.PlayerHand, toArea: CARD_AREA.Processing, from: 1, ids: [7] }],
      event_id: 1,
      7: true,
    });
    store.applyNotify('DestroyTableCard', [7]);
    store.commit();
    expect(publishes(store, () => { expect(store.pruneTable()).toBe(true); })).toBe(1);
  });
});
