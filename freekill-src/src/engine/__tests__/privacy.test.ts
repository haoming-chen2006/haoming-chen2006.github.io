import { describe, expect, it } from 'vitest';
import { InProcessLuaHost, allBotSeats } from '../luaHost.ts';
import { RoomSession } from '../roomSession.ts';
import type { WirePayloadMessage } from '../types.ts';
import { SEED, bundle } from './support.ts';

const LONG = 300_000;

interface MoveData {
  to?: number;
  toArea?: number;
  moveVisible?: boolean;
  moveInfo?: { cardId: number }[];
}

/** `Card.PlayerHand`, from `lua/lunarltk/core/card.lua`. */
const PLAYER_HAND = 1;

describe('what one seat can see', () => {
  /**
   * Routing is honest about what it promotes: a message reaches the public
   * channel only when its bytes were identical for every member, so the public
   * stream cannot carry anything the engine tailored. That is asserted by
   * reconstruction in `game.test.ts`; this checks the other half - that a
   * private envelope is addressed to exactly one seat and no other seat can
   * reconstruct it.
   */
  it('addresses every private envelope to exactly one seat', async () => {
    const host = await InProcessLuaHost.create(bundle(), {});
    try {
      const session = await RoomSession.start(host, {
        roomId: 'priv-1',
        seed: SEED,
        seats: allBotSeats(8),
        ownerId: 1,
        timeout: 15,
        settings: { gameMode: 'aaa_role_mode' },
      });
      await session.advance();

      const privateSeqs = new Map<number, Set<number>>();
      for (const e of session.allEnvelopes) {
        if (e.to === null) continue;
        const set = privateSeqs.get(e.to) ?? new Set<number>();
        for (const m of e.messages) set.add(m.seq);
        privateSeqs.set(e.to, set);
      }
      const seats = [...privateSeqs.keys()];
      for (let i = 0; i < seats.length; i++) {
        for (let j = i + 1; j < seats.length; j++) {
          const a = privateSeqs.get(seats[i])!;
          const b = privateSeqs.get(seats[j])!;
          for (const seq of a) expect(b.has(seq)).toBe(false);
        }
      }
    } finally {
      host.dispose();
    }
  }, LONG);

  /**
   * A known gap against `spec.md`, measured rather than assumed.
   *
   * The spec asks that no player's browser ever receive another player's hidden
   * cards. The engine as written does not provide that, and no amount of
   * routing can add it: `MoveEventWrappers:notifyMoveCards`
   * (`lua/lunarltk/server/events/movecard.lua:381`) builds one payload and
   * sends the identical bytes to every player, real `cardId`s included, and
   * `ServerPlayerBase:doNotify` does not filter. Visibility is enforced on the
   * client, by `Player:cardVisible` at render time - which is fine when the
   * client is native code talking to a trusted server, and is not fine when the
   * client is a browser tab holding the whole stream.
   *
   * This test pins the size of the gap so it cannot drift unnoticed. When
   * someone lands server-side redaction, this expectation flips to `toBe(0)`
   * and the spec's criterion is met; until then, the honest statement is that
   * the host tab sees everything *and so does every other tab*.
   */
  it('measures the MoveCards visibility leak the engine has today', async () => {
    const host = await InProcessLuaHost.create(bundle(), { decodeData: true });
    try {
      const session = await RoomSession.start(host, {
        roomId: 'priv-2',
        seed: SEED,
        seats: allBotSeats(8),
        ownerId: 1,
        timeout: 15,
        settings: { gameMode: 'aaa_role_mode' },
      });
      await session.advance();

      const seat = 1;
      const leaked = new Set<number>();
      for (const m of session.streamOf(seat) as WirePayloadMessage[]) {
        if (m.command !== 'MoveCards') continue;
        const [moves] = (m.data ?? [[]]) as [MoveData[]];
        for (const mv of moves) {
          if (mv.toArea !== PLAYER_HAND) continue;
          if (mv.to === undefined || mv.to === seat) continue;
          if (mv.moveVisible) continue;
          for (const info of mv.moveInfo ?? []) if (info.cardId > 0) leaked.add(info.cardId);
        }
      }

      // Roughly a hundred distinct cards over one game - effectively the deal.
      expect(leaked.size).toBeGreaterThan(0);
      expect(leaked.size).toBeLessThan(200);
    } finally {
      host.dispose();
    }
  }, LONG);
});
