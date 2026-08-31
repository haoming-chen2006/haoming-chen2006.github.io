import { describe, expect, it } from 'vitest';
import type { Envelope } from '../../contract/protocol.ts';
import { MainThreadLuaClient } from '../luaClient.ts';
import { InProcessLuaHost, allBotSeats } from '../luaHost.ts';
import { RoomSession } from '../roomSession.ts';
import { PlayerState } from '../types.ts';
import { bundle, SEED } from './support.ts';

const LONG = 300_000;

function botTable(seed = SEED) {
  return {
    roomId: 'rejoin-1',
    seed,
    seats: allBotSeats(8),
    ownerId: 1,
    timeout: 15,
    settings: { gameMode: 'aaa_role_mode' },
  };
}

/** Runs the room forward a bounded number of flushes, then stops. */
async function advanceSome(session: RoomSession, resumes: number) {
  const res = await session.advance({ maxResumes: resumes });
  return res;
}

describe('joining a room that is already in progress', () => {
  /**
   * Reconnect: a player reloads the tab mid-game.
   *
   * The host restarts nothing. A fresh client VM is brought up to date from the
   * same two pieces a first-time joiner gets - the room preamble, then one
   * `Observe` snapshot tailored to that seat by the engine's own
   * `room:serialize(player)` - and from there it consumes the live stream like
   * any other client.
   */
  it('rebuilds a reloaded player s view from a resync, without restarting the host', async () => {
    const host = await InProcessLuaHost.create(bundle(), {});
    const first = await MainThreadLuaClient.create(bundle(), { playerId: 1, screenName: 'player1' });
    let live: MainThreadLuaClient = first;
    const deliver = (e: Envelope) => {
      if (e.to === null || e.to === 1) live.deliverEnvelope(e);
    };
    const session = await RoomSession.start(host, botTable(), { onEnvelope: deliver });

    try {
      await advanceSome(session, 120);
      const handBefore = first.call<number[]>('GetPlayerHandcards', 1);
      const before = await host.stateDigest();
      expect(first.errors()).toEqual([]);

      // The tab goes away.
      first.dispose();
      const reloaded = await MainThreadLuaClient.create(bundle(), {
        playerId: 1,
        screenName: 'player1',
      });
      live = reloaded;
      try {
        const resync = await session.resyncMessages(1);
        reloaded.deliverAll(
          resync.map((m) => ({
            seq: 0,
            kind: 'notify' as const,
            command: m.command,
            bytes: 0,
            payload: m.payload,
          })),
        );

        expect(reloaded.errors()).toEqual([]);
        // Same hand, same room, and the host never noticed.
        expect(reloaded.call<number[]>('GetPlayerHandcards', 1)).toEqual(handBefore);
        expect(await host.stateDigest()).toBe(before);

        // And it keeps playing: the live stream still applies cleanly.
        const res = await advanceSome(session, 120);
        expect(res.err).toBeUndefined();
        expect(reloaded.errors()).toEqual([]);
      } finally {
        reloaded.dispose();
      }
    } finally {
      host.dispose();
    }
  }, LONG);

  /**
   * Observers. `ServerRoomBase:addObserver` hands the newcomer a snapshot taken
   * from seat 1's point of view and then keeps mirroring that seat's traffic to
   * them - which is the engine's existing design, and it means an observer sees
   * exactly what one player sees, not what the host sees.
   */
  it('lets an observer join mid-game and see only what its observee sees', async () => {
    const host = await InProcessLuaHost.create(bundle(), {});
    const watcher = await MainThreadLuaClient.create(bundle(), {
      playerId: 99,
      screenName: 'watcher',
      observing: true,
    });
    const forWatcher: Envelope[] = [];
    const session = await RoomSession.start(host, botTable(), {
      onEnvelope: (e) => {
        if (e.to === null || e.to === 99) forWatcher.push(e);
      },
      keepRaw: true,
    });

    try {
      await advanceSome(session, 120);
      const beforeJoin = forWatcher.length;

      await host.addObserver(99, 99, 'watcher');
      await advanceSome(session, 120);

      const mine = forWatcher.slice(beforeJoin);
      expect(mine.length).toBeGreaterThan(0);
      for (const e of mine) watcher.deliverEnvelope(e);
      expect(watcher.errors()).toEqual([]);

      // The observer received the room snapshot the engine tailors, and then
      // live traffic. It never received a seat's private request.
      const commands = mine.flatMap((e) => e.messages.map((m) => m.command));
      expect(commands).toContain('Observe');
      const raw = session.rawByConn.get(99) ?? [];
      expect(raw.length).toBeGreaterThan(0);
      expect(raw.every((m) => m.connId === 99)).toBe(true);
    } finally {
      host.dispose();
      watcher.dispose();
    }
  }, LONG);

  /**
   * A seat that goes offline must not stall the room: the engine falls back to
   * the AI for anyone who is not `Online`, which is exactly what a reconnecting
   * player needs to come back to.
   */
  it('keeps playing when a seated player drops', async () => {
    const host = await InProcessLuaHost.create(bundle(), {});
    const seats = allBotSeats(8).map((s) =>
      s.playerId === 1 ? { ...s, state: PlayerState.Online as 1 } : s,
    );
    const session = await RoomSession.start(host, { ...botTable(), seats });
    try {
      const res = await session.advance({ maxResumes: 200 });
      expect(res.over).toBe(false);
      expect(res.waitingOn).toContain(1);

      // The player's laptop sleeps. Trust keeps the room moving.
      await session.setPlayerState(1, PlayerState.Trust);
      const after = await session.advance();
      expect(after.err).toBeUndefined();
      expect(after.over).toBe(true);
      expect(session.allDecisions.length).toBeGreaterThan(100);
    } finally {
      host.dispose();
    }
  }, LONG);
});
