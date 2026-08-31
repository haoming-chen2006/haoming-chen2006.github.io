import { buildBundle } from '../build-bundle.mjs';
import { createVm, installHost } from '../engine.js';
const bundle = buildBundle();
async function probe(trace, label) {
  const { lua, FS } = await createVm(bundle, { traceAllocations: trace });
  installHost({ lua, FS }, { logLevels: new Set([]) });
  lua.doStringSync(`dofile('web/boot.lua'); assert(FKWeb.boot())`);
  const order = String(lua.doStringSync(`
    local t = {} local n = 0
    for k in pairs(Fk.generals) do n = n + 1 if n <= 6 then t[#t+1] = k end end
    return table.concat(t, ",")`));
  lua.doStringSync(`FKWeb.installHook(); assert(FKWeb.newRoom(20260828, 8))`);
  const resumes = lua.doStringSync(`return FKWeb.run()`);
  const s = JSON.parse(lua.doStringSync(`return FKWeb.summary()`));
  console.log(`${label.padEnd(22)} pairsHead=${order.padEnd(58)} resumes=${resumes} msgs=${s.messages} steps=${s.steps} digest=${s.final_state_digest}`);
  lua.global.close();
}
await probe(false, 'traceAllocations=false');
await probe(false, 'traceAllocations=false');
await probe(true,  'traceAllocations=true');
await probe(true,  'traceAllocations=true');
