// Headless driver: same engine.js the browser page uses.
import { buildBundle } from './build-bundle.mjs';
import { createVm, installHost } from './engine.js';

const t0 = performance.now();
const bundle = buildBundle();
const { lua, FS, luaWasm } = await createVm(bundle, { traceAllocations: true });
const host = installHost({ lua, FS }, { logLevels: new Set(['error', 'warn']) });
const tMount = performance.now();

lua.doStringSync(`dofile('web/boot.lua')`);
lua.doStringSync(`assert(FKWeb.boot())`);
const tBoot = performance.now();
console.log(`mount ${(tMount - t0).toFixed(0)}ms  engine load ${(tBoot - tMount).toFixed(0)}ms`);
console.log(`lua heap after load: ${(lua.global.getMemoryUsed() / 1048576).toFixed(1)} MiB`);

const seed = Number(process.argv[2] ?? 20260828);
lua.doStringSync(`FKWeb.installHook(); assert(FKWeb.newRoom(${seed}, 8))`);
const tRoom = performance.now();
const resumes = lua.doStringSync(`return FKWeb.run()`);
const tGame = performance.now();

console.log(`room create ${(tRoom - tBoot).toFixed(0)}ms  game ${(tGame - tRoom).toFixed(0)}ms  resumes=${resumes}`);
console.log(`lua heap after game: ${(lua.global.getMemoryUsed() / 1048576).toFixed(1)} MiB`);
console.log(`host ticks: ${host.ticks} messages, ${host.tickBytes} cbor bytes`);

const summary = JSON.parse(lua.doStringSync(`return FKWeb.summary()`));
console.log(JSON.stringify({ ...summary, step_digests: `<${summary.step_digests.length}>` }, null, 2).slice(0, 4000));
