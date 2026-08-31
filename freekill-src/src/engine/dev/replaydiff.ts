/** Finds the first boundary where a replay stops matching its original. */
import { InProcessLuaHost, allBotSeats } from '../luaHost.ts';
import { buildBundle } from '../node/buildBundle.ts';
import { RoomSession } from '../roomSession.ts';
import { MemoryCommandLog } from '../commandLog.ts';

const seed = Number(process.argv[2] ?? 20260828);
const bundle = buildBundle();
const spec = {
  roomId: 'r', seed, seats: allBotSeats(8), ownerId: 1, timeout: 15,
  settings: { gameMode: 'aaa_role_mode' },
};

const hostA = await InProcessLuaHost.create(bundle, {});
const log = new MemoryCommandLog();
const a = await RoomSession.start(hostA, spec, { log });
await a.advance();
const records = (await log.read('r')).records;
console.log(`original: ${records.length} decisions`);

// Replay without the strict guard so we can see how far it got.
const hostB = await InProcessLuaHost.create(bundle, {});
hostB.lua.global.set('__fk_replaylog', JSON.stringify(records));
hostB.lua.doStringSync(`FKHost.setReplayLog(__fk_replaylog)`);
await hostB.createRoom(spec);
await hostB.advance({ stopWhenLogExhausted: true });
const replayed = hostB.decisionsFrom(1);
console.log(`replay:   ${replayed.length} decisions`);
console.log(`status:   ${JSON.stringify(await hostB.replayStatus())}`);

let firstDigest = -1;
let firstShape = -1;
for (let i = 0; i < Math.min(records.length, replayed.length); i++) {
  const x = records[i];
  const y = replayed[i];
  if (firstShape < 0 && (x.playerId !== y.playerId || x.command !== y.command)) firstShape = i;
  if (firstDigest < 0 && x.digest !== y.digest) firstDigest = i;
  if (firstDigest >= 0 && firstShape >= 0) break;
}
console.log(`first digest mismatch at index ${firstDigest}`);
console.log(`first shape  mismatch at index ${firstShape}`);
const at = firstDigest >= 0 ? firstDigest : firstShape;
for (let i = Math.max(0, at - 3); i <= Math.min(records.length - 1, at + 1); i++) {
  console.log(`  ${i} orig   ${JSON.stringify(records[i]).slice(0, 400)}`);
  console.log(`  ${i} replay ${JSON.stringify(replayed[i] ?? null).slice(0, 400)}`);
}
hostA.dispose();
hostB.dispose();
