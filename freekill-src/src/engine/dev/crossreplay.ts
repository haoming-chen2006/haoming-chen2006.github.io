/**
 * The migration property, stated exactly: a log produced on one host replays
 * into an identical room on a host whose Lua string-hash seed is different -
 * i.e. a different browser. Compared at every decision boundary.
 */
import { InProcessLuaHost, allBotSeats } from '../luaHost.ts';
import { MemoryCommandLog } from '../commandLog.ts';
import { buildBundle } from '../node/buildBundle.ts';
import { RoomSession } from '../roomSession.ts';

const bundle = buildBundle();
const spec = {
  roomId: 'x', seed: Number(process.argv[2] ?? 20260828), seats: allBotSeats(8),
  ownerId: 1, timeout: 15, settings: { gameMode: 'aaa_role_mode' },
};
const epochs = [1700000000000, 1234567890123, 999000111222, 42424242];

const hostA = await InProcessLuaHost.create(bundle, { hashSeedEpoch: epochs[0] });
const log = new MemoryCommandLog();
const a = await RoomSession.start(hostA, spec, { log });
await a.advance();
const records = (await log.read('x')).records;
const digestA = await hostA.stateDigest();
console.log(`origin epoch ${epochs[0]}: ${records.length} decisions, digest ${digestA}`);

for (const epoch of epochs.slice(1)) {
  const hostB = await InProcessLuaHost.create(bundle, { hashSeedEpoch: epoch });
  // Fresh game on this host, for contrast: does the seed alone reproduce it?
  const fresh = await RoomSession.start(hostB, { ...spec, roomId: 'fresh' });
  await fresh.advance();
  const freshSame = fresh.allDecisions.length === records.length;
  hostB.dispose();

  const hostC = await InProcessLuaHost.create(bundle, { hashSeedEpoch: epoch });
  const replayed = await RoomSession.resume(hostC, { header: (await log.read('x')).header, records });
  let first = -1;
  for (let i = 0; i < Math.min(records.length, replayed.allDecisions.length); i++) {
    const x = records[i];
    const y = replayed.allDecisions[i];
    if (x.playerId !== y.playerId || x.command !== y.command || x.digest !== y.digest) {
      first = i;
      break;
    }
  }
  console.log(
    `epoch ${String(epoch).padStart(14)}  fresh-run reproduces origin: ${freshSame}` +
      `  |  replay: ${replayed.allDecisions.length}/${records.length} decisions, ` +
      `first divergence ${first}, digest ${await hostC.stateDigest()} ${(await hostC.stateDigest()) === digestA ? 'MATCH' : 'DIFFER'}`,
  );
  hostC.dispose();
}
hostA.dispose();
