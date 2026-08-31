import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import { describe, expect, it } from 'vitest';
import { InProcessLuaHost, allBotSeats } from '../luaHost.ts';
import { RoomSession } from '../roomSession.ts';
import { nodeEndpoint } from '../../worker/protocol.ts';
import { WorkerLuaHost } from '../../worker/workerHost.ts';
import type { DecisionRecord } from '../../contract/engine.ts';
import type { Envelope } from '../../contract/protocol.ts';
import { bundle, playGame, roomSpec, sha } from './support.ts';

const here = dirname(fileURLToPath(import.meta.url));
const WORKER_ENTRY = join(here, '..', '..', 'worker', 'nodeHostWorker.ts');
const LONG = 300_000;

/**
 * The host VM belongs off the main thread; the client VM does not.
 *
 * These tests use a `node:worker_threads` worker rather than a fake port on the
 * same thread, because the property worth proving is that the engine really
 * runs elsewhere - a same-thread mock would prove only that the message shapes
 * line up. The Web Worker entry (`hostWorker.ts`) is the same body with a
 * different endpoint adapter.
 */
describe('the host in a worker', () => {
  it('plays a full game off-thread and leaves the main thread responsive', async () => {
    const worker = new Worker(WORKER_ENTRY, {
      execArgv: ['--experimental-strip-types', '--no-warnings'],
    });
    // Sample the main thread's event loop while the engine works. If the host
    // VM were running here, these gaps would be seconds, not milliseconds.
    const gaps: number[] = [];
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      gaps.push(now - last);
      last = now;
    };
    const timer = setInterval(tick, 4);

    try {
      const host = await WorkerLuaHost.connect(nodeEndpoint(worker), { bundle: bundle() });
      const envelopes: unknown[] = [];
      host.onOutput((e) => envelopes.push(e));

      await host.createRoom({
        roomId: 'w-1',
        seed: 20260828,
        seats: allBotSeats(8),
        ownerId: 1,
        timeout: 15,
        settings: { gameMode: 'aaa_role_mode' },
      });
      last = performance.now();
      gaps.length = 0;
      const res = await host.advance();
      clearInterval(timer);

      expect(res.err).toBeUndefined();
      expect(res.over).toBe(true);
      expect(envelopes.length).toBeGreaterThan(100);

      const stats = await host.stats();
      expect(stats.decisions).toBeGreaterThan(100);

      // The event loop kept turning throughout: the worker never blocked it.
      const worst = Math.max(...gaps);
      expect(gaps.length).toBeGreaterThan(100);
      expect(worst).toBeLessThan(250);

      host.dispose();
    } finally {
      clearInterval(timer);
      await worker.terminate();
    }
  }, LONG);

  /**
   * Note what is *not* asserted here: that the worker plays the same game as
   * the main thread from the same seed. It does not, and that is expected.
   *
   * A worker thread is a separate JS host, so its Lua string-hash seed differs,
   * so `pairs` order differs, so the AI makes different choices - the same
   * cross-host effect the determinism suite documents. It does not matter,
   * because a room has exactly one authority and migration replays a log rather
   * than re-deriving a game from the seed. The next test is the one that has to
   * hold, and does.
   *
   * What this checks is the transport: everything the engine produced inside
   * the worker reaches the main thread, in order, exactly once.
   */
  it('delivers every decision and envelope across the port', async () => {
    const worker = new Worker(WORKER_ENTRY, {
      execArgv: ['--experimental-strip-types', '--no-warnings'],
    });
    try {
      const host = await WorkerLuaHost.connect(nodeEndpoint(worker), { bundle: bundle() });
      const pushed: DecisionRecord[] = [];
      const envelopes: Envelope[] = [];
      host.onDecision((d) => pushed.push(d));
      host.onOutput((e) => envelopes.push(e));

      await host.createRoom({ ...roomSpec(), roomId: 'test-1' });
      const res = await host.advance();
      expect(res.over).toBe(true);

      const authoritative = await host.decisionsFrom(1);
      expect(pushed.map((d) => `${d.seq}:${d.playerId}:${d.command}:${d.digest}`)).toEqual(
        authoritative.map((d) => `${d.seq}:${d.playerId}:${d.command}:${d.digest}`),
      );
      pushed.forEach((d, i) => expect(d.seq).toBe(i + 1));
      expect(envelopes.length).toBeGreaterThan(100);
      expect(envelopes.every((e) => e.roomId === 'test-1')).toBe(true);
      const gameOver = envelopes.flatMap((e) => e.messages).filter((m) => m.command === 'GameOver');
      expect(gameOver.length).toBeGreaterThan(0);
      host.dispose();
    } finally {
      await worker.terminate();
    }
  }, LONG);

  it('replays a log through the port', async () => {
    const original = await playGame();
    const worker = new Worker(WORKER_ENTRY, {
      execArgv: ['--experimental-strip-types', '--no-warnings'],
    });
    try {
      const log = await original.log.read('test-1');
      const host = await WorkerLuaHost.connect(nodeEndpoint(worker), { bundle: bundle() });
      await host.replay(roomSpec(), log.records);
      expect(await host.stateDigest()).toBe(await original.host.stateDigest());
      const status = await host.replayStatus();
      expect(status.divergence).toBeNull();
      expect(status.applied).toBe(log.records.length);
      host.dispose();
    } finally {
      original.host.dispose();
      await worker.terminate();
    }
  }, LONG);
});

/** A tiny guard that `RoomSession` behaves identically over either host. */
describe('session over the in-process host', () => {
  it('exposes the log the worker path would persist', async () => {
    const host = await InProcessLuaHost.create(bundle(), {});
    try {
      const session = await RoomSession.start(host, roomSpec(), { bundleSha: await sha() });
      const res = await session.advance();
      expect(res.over).toBe(true);
      expect(session.allDecisions.length).toBeGreaterThan(100);
    } finally {
      host.dispose();
    }
  }, LONG);
});
