/** Diffs the full state projection of two runs at one decision boundary. */
import { InProcessLuaHost, allBotSeats } from '../luaHost.ts';
import { buildBundle } from '../node/buildBundle.ts';
import { RoomSession } from '../roomSession.ts';
import { MemoryCommandLog } from '../commandLog.ts';

const seed = Number(process.argv[2] ?? 20260828);
const at = Number(process.argv[3] ?? 29);
const bundle = buildBundle();
const spec = {
  roomId: 'r', seed, seats: allBotSeats(8), ownerId: 1, timeout: 15,
  settings: { gameMode: 'aaa_role_mode' },
};

const hostA = await InProcessLuaHost.create(bundle, {});
const log = new MemoryCommandLog();
hostA.lua.doStringSync(`FKHost.captureDecision(${at})`);
const a = await RoomSession.start(hostA, spec, { log });
await a.advance();
const records = (await log.read('r')).records;
const stateA = JSON.parse(String(hostA.lua.doStringSync(`return FKHost.capturedState()`)));

const hostB = await InProcessLuaHost.create(bundle, {});
hostB.lua.global.set('__fk_replaylog', JSON.stringify(records));
hostB.lua.doStringSync(`FKHost.setReplayLog(__fk_replaylog)`);
hostB.lua.doStringSync(`FKHost.captureDecision(${at})`);
await hostB.createRoom(spec);
await hostB.advance({ stopWhenLogExhausted: true });
const stateB = JSON.parse(String(hostB.lua.doStringSync(`return FKHost.capturedState()`)));

function diff(x: unknown, y: unknown, path: string, out: string[]) {
  if (JSON.stringify(x) === JSON.stringify(y)) return;
  if (typeof x !== 'object' || typeof y !== 'object' || x === null || y === null) {
    out.push(`${path}: ${JSON.stringify(x)} -> ${JSON.stringify(y)}`);
    return;
  }
  const keys = new Set([...Object.keys(x), ...Object.keys(y)]);
  for (const k of keys) {
    diff((x as never)[k], (y as never)[k], `${path}.${k}`, out);
    if (out.length > 40) return;
  }
}
const out: string[] = [];
diff(stateA, stateB, '', out);
console.log(`decision ${at}: ${out.length} differing leaves`);
for (const line of out.slice(0, 40)) console.log('  ' + line.slice(0, 300));
hostA.dispose();
hostB.dispose();
