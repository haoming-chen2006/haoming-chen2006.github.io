/**
 * Prints a fingerprint of one seeded game. Run it under two different JS
 * runtimes (or two browsers) and diff the output: if the numbers differ, the
 * engine is not portable-deterministic and replay-based host migration is
 * broken between those two runtimes.
 *
 *   node --experimental-strip-types ... no; use:
 *   npx vite-node src/engine/dev/digest.ts -- [seed]
 */
import { InProcessLuaHost, allBotSeats } from '../luaHost.ts';
import { buildBundle } from '../node/buildBundle.ts';
import { RoomSession } from '../roomSession.ts';


const seed = Number(process.argv[2] ?? 20260828);
const epoch = process.argv[3] ? Number(process.argv[3]) : undefined;
const host = await InProcessLuaHost.create(buildBundle(), epoch ? { hashSeedEpoch: epoch } : {});
const runner = await RoomSession.start(host, { roomId: 'dev', seed, seats: allBotSeats(8), ownerId: 1, timeout: 15, settings: {} });
await runner.advance();
const steps = runner.allDecisions;
const stats = await host.stats();
console.log(
  JSON.stringify({
    seed,
    epoch: epoch ?? 'default',
    steps: steps.length,
    messages: stats.messages,
    bytes: stats.bytes,
    clockUs: stats.clockUs,
    step1: steps[0]?.digest,
    step10: steps[9]?.digest,
    stepLast: steps[steps.length - 1]?.digest,
  }),
);
host.dispose();
