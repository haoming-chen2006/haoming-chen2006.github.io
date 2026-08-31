/**
 * Headless driver for the real engine modules. Run with:
 *
 *   npx vite-node src/engine/dev/play.ts -- [seed]
 *
 * This is the development loop for this lane: it boots the same
 * `InProcessLuaHost` the worker wraps and the tests drive, plays a standard
 * 8-player role game to `GameOver`, and prints the numbers that matter.
 */
import { performance } from 'node:perf_hooks';
import { bundleSha256_16, bundleSourceBytes } from '../bundle.ts';
import { MemoryCommandLog } from '../commandLog.ts';
import { InProcessLuaHost, allBotSeats } from '../luaHost.ts';
import { buildBundle } from '../node/buildBundle.ts';
import { RoomSession } from '../roomSession.ts';
import { countMessages } from '../routing.ts';

const seed = Number(process.argv[2] ?? 20260828);

const t0 = performance.now();
const bundle = buildBundle();
const sha = await bundleSha256_16(bundle);
const tBundle = performance.now();

const host = await InProcessLuaHost.create(bundle, { traceAllocations: true });
const tBoot = performance.now();

const log = new MemoryCommandLog();
const spec = {
  roomId: 'dev-1',
  seed,
  seats: allBotSeats(8),
  ownerId: 1,
  timeout: 15,
  settings: { gameMode: 'aaa_role_mode' },
};
const session = await RoomSession.start(host, spec, { log, bundleSha: sha });
const tRoom = performance.now();

const res = await session.advance();
const tGame = performance.now();

const stats = await host.stats();
console.log(`bundle    ${Object.keys(bundle).length} files, ${bundleSourceBytes(bundle)} B, sha ${sha}`);
console.log(`build ${(tBundle - t0).toFixed(0)}ms  mount+boot ${(tBoot - tBundle).toFixed(0)}ms`);
console.log(`room  ${(tRoom - tBoot).toFixed(0)}ms  game ${(tGame - tRoom).toFixed(0)}ms  resumes ${res.resumes}`);
console.log(`over=${res.over} err=${res.err ?? 'none'} waitingOn=${JSON.stringify(res.waitingOn)}`);
console.log(`messages  ${stats.messages} raw / ${countMessages(session.allEnvelopes)} routed, ${stats.bytes} cbor bytes`);
console.log(`envelopes ${session.allEnvelopes.length} in ${stats.batches} flushes`);
console.log(`decisions ${stats.decisions}  virtual clock ${(stats.clockUs / 1e6).toFixed(1)}s`);
console.log(`lua heap  ${(stats.luaHeapKiB / 1024).toFixed(1)} MiB`);
console.log(`log       ${log.get('dev-1')!.records.length} records`);
console.log(`digest    ${await host.stateDigest()}`);
console.log(`seat 1    ${session.streamOf(1).length} messages received`);

const gameOver = session.streamOf(1).filter((m) => m.command === 'GameOver');
console.log(`GameOver  ${gameOver.length} at seq ${gameOver[0]?.seq}`);
host.dispose();
