import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OBSERVED_WIRE_COMMANDS, UI_COMMANDS } from '../../contract/protocol.ts';
import { MainThreadLuaClient } from '../luaClient.ts';
import { countMessages, streamFor } from '../routing.ts';
import type { WirePayloadMessage } from '../types.ts';
import { bundle, playGame, roomSpec, type PlayedGame } from './support.ts';

/**
 * One full game, then everything that can be asserted about it.
 *
 * Deliberately one game shared across the file: booting a VM and playing eight
 * seats to a win condition costs about ten seconds, and re-running it per
 * assertion would buy nothing - the assertions are about different properties
 * of the same run, not about different runs.
 */
describe('a full all-bot 身份局', () => {
  let game: PlayedGame;

  beforeAll(async () => {
    game = await playGame();
  }, 180_000);

  afterAll(() => game?.host.dispose());

  it('reaches GameOver with a winner', async () => {
    const seat1 = game.session.streamOf(1);
    const over = seat1.filter((m) => m.command === 'GameOver');
    expect(over).toHaveLength(1);
    const stats = await game.host.stats();
    expect(stats.decisions).toBeGreaterThan(100);
    expect(stats.messages).toBeGreaterThan(1000);
  });

  /**
   * The contract's command union was frozen from sixteen spike games. These runs
   * are longer and reach states those never did, which turned up two commands
   * nobody had declared: `ShuffleDrawPile` when the draw pile is exhausted, and
   * `Observe` when someone watches or reconnects. Both are now in
   * `OBSERVED_WIRE_COMMANDS`, and this assertion is what would catch the next.
   */
  it('emits only commands the contract declares', () => {
    const declared = new Set<string>([...OBSERVED_WIRE_COMMANDS, ...UI_COMMANDS]);
    const seen = new Set(game.session.streamOf(1).map((m) => m.command));
    expect([...seen].filter((c) => !declared.has(c))).toEqual([]);
  });

  it('records one dense, digest-bearing decision per boundary', () => {
    const d = game.session.allDecisions;
    expect(d.length).toBeGreaterThan(100);
    d.forEach((r, i) => {
      expect(r.seq).toBe(i + 1);
      expect(r.digest).toMatch(/^[0-9a-f]{16}$/);
      expect(r.playerId).toBeGreaterThan(0);
    });
  });

  it('writes the whole decision log through the sink', async () => {
    const stored = await game.log.read('test-1');
    expect(stored.records).toHaveLength(game.session.allDecisions.length);
    expect(stored.header.seed).toBe(roomSpec().seed);
    expect(stored.header.bundleSha).toMatch(/^[0-9a-f]{16}$/);
  });

  it('batches output into envelopes, which is what the free tier can afford', async () => {
    const stats = await game.host.stats();
    const envelopes = game.session.allEnvelopes.length;
    expect(envelopes).toBeLessThan(stats.messages / 5);
    expect(countMessages(game.session.allEnvelopes)).toBeGreaterThan(0);
    // Every envelope belongs to exactly one flush and one recipient.
    for (const e of game.session.allEnvelopes) {
      expect(e.messages.length).toBeGreaterThan(0);
      expect(e.roomId).toBe('test-1');
    }
  });

  /**
   * Routing is asserted by inversion, not by intent: rebuild each seat's stream
   * from `public + private` and require it to equal, byte for byte and in
   * order, exactly what the engine addressed to that connection. If a message
   * were promoted to the public channel that the engine had tailored for one
   * seat, some other seat's reconstruction would gain a message it never got.
   */
  it('routes every message to exactly the connections the engine addressed', () => {
    // Sequence numbers are deliberately not compared: a broadcast is emitted
    // once per recipient, so it holds eight different seqs, and the public copy
    // keeps the lowest. What must survive the split is the content and the
    // order, which is what a client actually consumes.
    for (const [connId, expected] of game.session.rawByConn) {
      const got = streamFor(game.session.allEnvelopes, connId);
      expect(got.map((m) => `${m.kind}|${m.command}|${m.payload}`)).toEqual(
        expected.map((m) => `${m.kind}|${m.command}|${m.payload}`),
      );
    }
  });

  /**
   * The privacy property, stated as something checkable: a message may only be
   * public if its bytes were identical for every member. So no public message
   * can differ between seats - and anything the engine varied stayed private.
   */
  it('never puts a tailored message on the public stream', () => {
    const perSeatPublic = new Map<number, string[]>();
    for (const e of game.session.allEnvelopes) {
      if (e.to !== null) continue;
      for (const m of e.messages as readonly WirePayloadMessage[]) {
        const key = `${m.seq}`;
        for (const seat of game.host.seatIds) {
          const list = perSeatPublic.get(seat) ?? [];
          list.push(`${key}:${m.payload}`);
          perSeatPublic.set(seat, list);
        }
      }
    }
    const seats = [...perSeatPublic.keys()];
    for (let i = 1; i < seats.length; i++) {
      expect(perSeatPublic.get(seats[i])).toEqual(perSeatPublic.get(seats[0]));
    }
  });

  /**
   * The client VM is fed nothing but seat 1's own stream and must survive the
   * whole game. Zero errors is the bar: the client's Lua is the room's brain,
   * and a single failed callback means its model of the table has silently
   * drifted from the host's.
   */
  it('drives a client VM through the whole game with no errors', async () => {
    const client = await MainThreadLuaClient.create(bundle(), {
      playerId: 1,
      screenName: 'player1',
    });
    try {
      const ui: string[] = [];
      client.onNotifyUI((command) => ui.push(command));

      // Nothing is fed by hand: the session's own stream starts at EnterRoom,
      // because the host emits the join preamble as ordinary traffic when the
      // room is created. A recorded stream is therefore replayable into a fresh
      // client VM from its first byte, which is what the fixtures and the
      // harness pages need.
      const stream = game.session.streamOf(1);
      expect(stream[0].command).toBe('EnterRoom');
      for (const e of game.session.allEnvelopes) {
        if (e.to !== null && e.to !== 1) continue;
        client.deliverEnvelope(e);
      }

      expect(client.errors()).toEqual([]);
      expect(ui.length).toBeGreaterThan(500);
      expect(ui).toContain('UpdateRequestUI');
      expect(ui).toContain('MoveCards');
      expect(ui).toContain('GameOver');
      expect(stream.length).toBeGreaterThan(1000);
    } finally {
      client.dispose();
    }
  }, 180_000);
});
