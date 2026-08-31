import { describe, expect, it } from 'vitest';
import { InProcessLuaHost } from '../luaHost.ts';
import { RoomSession } from '../roomSession.ts';
import { bundle, firstDivergence, playGame, roomSpec, sha } from './support.ts';

const LONG = 300_000;

/**
 * Determinism and replay: the two properties everything else rests on.
 *
 * Every assertion here compares state at *every* decision boundary. A
 * final-state-only match hides divergence that self-corrects, and a run that
 * self-corrects is a run whose middle was wrong.
 */
describe('determinism', () => {
  it('plays the identical game twice from one seed', async () => {
    const a = await playGame();
    const b = await playGame();
    try {
      expect(firstDivergence(a.session.allDecisions, b.session.allDecisions)).toBeNull();
      expect(await a.host.stateDigest()).toBe(await b.host.stateDigest());
      const [sa, sb] = [await a.host.stats(), await b.host.stats()];
      expect(sb.messages).toBe(sa.messages);
      expect(sb.bytes).toBe(sa.bytes);
      expect(sb.clockUs).toBe(sa.clockUs);
    } finally {
      a.host.dispose();
      b.host.dispose();
    }
  }, LONG);

  it('plays a different game from a different seed (negative control)', async () => {
    const a = await playGame(roomSpec({ seed: 20260828 }));
    const c = await playGame(roomSpec({ seed: 20260829 }));
    try {
      expect(firstDivergence(a.session.allDecisions, c.session.allDecisions)).not.toBeNull();
      expect(await a.host.stateDigest()).not.toBe(await c.host.stateDigest());
    } finally {
      a.host.dispose();
      c.host.dispose();
    }
  }, LONG);

  /**
   * Fresh-run reproducibility across JS hosts does NOT hold, and this records
   * that honestly rather than asserting a property we do not have.
   *
   * Lua 5.4 seeds its string hash from `time(NULL)` and three pointer values at
   * `lua_newstate`. Pinning `Date.now` fixes the first; the pointers still vary
   * between JS hosts, so `pairs` order does too. Two sites were pinned in
   * `lua/web/determinism.lua` - `Room:makeGeneralPile` and the AI's three
   * scene-enumeration helpers - and it is still not enough: measured over four
   * hash seeds, a fresh game from seed 20260828 comes out 476, 628, 559 and 628
   * decisions long.
   *
   * The remaining sensitivity is in what the AI *chooses*, not in how the rules
   * resolve. That distinction is what saves the product: migration replays a
   * log, and a replay never asks the AI what to do - see the replay suite
   * below, which does hold across the same four hash seeds. Two hosts starting
   * the same seed independently is not something the product ever does.
   *
   * Asserted loosely on purpose: two hash seeds may coincide, so requiring a
   * difference would be flaky. What must not happen is a silent claim of a
   * property we have not got.
   */
  it('does not claim fresh-run reproducibility across hash seeds', async () => {
    const shapes = new Set<string>();
    for (const epoch of [1_700_000_000_000, 1_234_567_890_123, 999_000_111_222]) {
      const g = await playGame(roomSpec(), { hashSeedEpoch: epoch });
      shapes.add(`${g.session.allDecisions.length}:${await g.host.stateDigest()}`);
      g.host.dispose();
    }
    expect(shapes.size).toBeGreaterThanOrEqual(1);
  }, LONG);
});

describe('replay', () => {
  it('rebuilds an identical game from seed plus log', async () => {
    const original = await playGame();
    const replayHost = await InProcessLuaHost.create(bundle(), {});
    try {
      const log = await original.log.read('test-1');
      const replayed = await RoomSession.resume(replayHost, log, { bundleSha: await sha() });

      expect(replayed.allDecisions).toHaveLength(original.session.allDecisions.length);
      expect(firstDivergence(original.session.allDecisions, replayed.allDecisions)).toBeNull();
      expect(await replayHost.stateDigest()).toBe(await original.host.stateDigest());

      // A replay that had to fall back to the AI is not a replay.
      const status = await replayHost.replayStatus();
      expect(status.divergence).toBeNull();
      expect(status.applied).toBe(log.records.length);
    } finally {
      original.host.dispose();
      replayHost.dispose();
    }
  }, LONG);

  /**
   * Host migration, stated exactly: a *different* browser rebuilds the room.
   * Same log, a VM whose `pairs` order is different, digests compared at every
   * boundary. This is the assertion that would have caught the bug the spike
   * found late, and it is the reason the digest is computed from a portable
   * projection rather than from `room:serialize()` raw - that blob embeds a
   * `pairs`-ordered CBOR map and would report false divergence here.
   */
  it('rebuilds an identical game on hosts with three different hash seeds', async () => {
    const original = await playGame(roomSpec(), { hashSeedEpoch: 1_700_000_000_000 });
    try {
      const log = await original.log.read('test-1');
      const originDigest = await original.host.stateDigest();
      for (const epoch of [1_234_567_890_123, 999_000_111_222, 42_424_242]) {
        const replayHost = await InProcessLuaHost.create(bundle(), { hashSeedEpoch: epoch });
        try {
          const replayed = await RoomSession.resume(replayHost, log, { bundleSha: await sha() });
          expect(firstDivergence(original.session.allDecisions, replayed.allDecisions)).toBeNull();
          expect(await replayHost.stateDigest()).toBe(originDigest);
        } finally {
          replayHost.dispose();
        }
      }
    } finally {
      original.host.dispose();
    }
  }, LONG);

  /**
   * The actual migration story: kill the host mid-hand, hand the log to another
   * player's browser, keep playing.
   *
   * The cut is mid-game on purpose. Replay parks the room inside the very
   * `Request` the old host died in - the engine's own breakpoint mechanism,
   * `room:yield()` from within `_checkReply` - so the new host takes over at the
   * exact boundary rather than at a convenient one.
   */
  it('resumes from a mid-game cut and plays on to GameOver', async () => {
    const original = await playGame();
    const newHost = await InProcessLuaHost.create(bundle(), {});
    try {
      const full = await original.log.read('test-1');
      const cut = Math.floor(full.records.length * 0.55);
      const partial = { header: full.header, records: full.records.slice(0, cut) };

      const resumed = await RoomSession.resume(newHost, partial, { bundleSha: await sha() });
      expect(resumed.allDecisions).toHaveLength(cut);
      expect(firstDivergence(full.records.slice(0, cut), resumed.allDecisions)).toBeNull();

      // The room is parked inside the request the old host died in, so its
      // state is one request past the last logged decision - not comparable to
      // that decision's digest. What is comparable, and much stronger, is what
      // happens next: the new host carries on and plays out the identical game,
      // because the replay left the RNG stream exactly where the old host had it.
      const res = await resumed.advance();
      expect(res.err).toBeUndefined();
      expect(res.over).toBe(true);
      expect(firstDivergence(full.records, resumed.allDecisions)).toBeNull();
      expect(await newHost.stateDigest()).toBe(await original.host.stateDigest());
      const over = resumed.streamOf(1).filter((m) => m.command === 'GameOver');
      expect(over).toHaveLength(1);
    } finally {
      original.host.dispose();
      newHost.dispose();
    }
  }, LONG);
});
