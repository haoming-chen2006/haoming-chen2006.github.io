/**
 * Cross-hash-seed determinism detector.
 *
 * Two VMs, one seed, deliberately different Lua string-hash seeds. If the two
 * command logs differ, some `pairs` iteration is feeding an ordering decision -
 * which means two different browsers replay the same log into different games,
 * and host migration is broken. This finds the first decision boundary where
 * they part company, and prints what the engine was doing there.
 *
 *   npx vite-node src/engine/dev/bisect.ts -- [seed] [epochA] [epochB]
 */
import { InProcessLuaHost, allBotSeats } from '../luaHost.ts';
import { buildBundle } from '../node/buildBundle.ts';
import { RoomSession } from '../roomSession.ts';


const seed = Number(process.argv[2] ?? 20260828);
const epochA = Number(process.argv[3] ?? 1700000000000);
const epochB = Number(process.argv[4] ?? 1234567890123);
const bundle = buildBundle();


async function run(epoch: number) {
  const host = await InProcessLuaHost.create(bundle, { hashSeedEpoch: epoch });
  const runner = await RoomSession.start(host, { roomId: 'dev', seed, seats: allBotSeats(8), ownerId: 1, timeout: 15, settings: {} }, { keepRaw: true });
  await runner.advance();
  const out = {
    steps: [...runner.allDecisions],
    stream: [...runner.rawByConn.values()].flat().sort((x, y) => x.seq - y.seq).map((m) => `${m.connId}:${m.command}:${m.payload}`),
  };
  host.dispose();
  return out;
}

const a = await run(epochA);
const b = await run(epochB);
console.log(`steps  A=${a.steps.length}  B=${b.steps.length}`);
console.log(`stream A=${a.stream.length}  B=${b.stream.length}`);

let firstStep = -1;
for (let i = 0; i < Math.min(a.steps.length, b.steps.length); i++) {
  if (
    a.steps[i].playerId !== b.steps[i].playerId ||
    a.steps[i].command !== b.steps[i].command ||
    a.steps[i].digest !== b.steps[i].digest
  ) {
    firstStep = i;
    break;
  }
}
console.log(`first differing decision: index ${firstStep}`);
if (firstStep >= 0) {
  for (let i = Math.max(0, firstStep - 2); i <= firstStep + 1; i++) {
    console.log(`  ${i} A ${JSON.stringify(a.steps[i])}`);
    console.log(`  ${i} B ${JSON.stringify(b.steps[i])}`);
  }
}

let firstMsg = -1;
for (let i = 0; i < Math.min(a.stream.length, b.stream.length); i++) {
  if (a.stream[i] !== b.stream[i]) {
    firstMsg = i;
    break;
  }
}
console.log(`first differing wire message: index ${firstMsg}`);
if (firstMsg >= 0) {
  for (let i = Math.max(0, firstMsg - 3); i <= firstMsg + 2; i++) {
    console.log(`  ${i} A ${a.stream[i]?.slice(0, 160)}`);
    console.log(`  ${i} B ${b.stream[i]?.slice(0, 160)}`);
  }
}
