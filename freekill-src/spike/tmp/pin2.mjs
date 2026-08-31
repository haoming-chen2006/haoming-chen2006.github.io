import { buildBundle } from '../build-bundle.mjs';
import { createVm, installHost } from '../engine.js';
const bundle = buildBundle();
async function probe(pin) {
  const { lua, FS } = await createVm(bundle, { traceAllocations: true });
  installHost({ lua, FS }, { logLevels: new Set([]) });
  lua.doStringSync(`dofile('web/boot.lua'); assert(FKWeb.boot())`);
  if (pin) lua.doStringSync(`FKWeb.pinIterationOrder()`);
  const head = String(lua.doStringSync(`return FKWeb.pairsHead(6)`));
  lua.doStringSync(`FKWeb.installHook(); assert(FKWeb.newRoom(20260828, 8))`);
  const resumes = lua.doStringSync(`return FKWeb.run()`);
  const s = JSON.parse(lua.doStringSync(`return FKWeb.summary()`));
  const lh = String(lua.doStringSync(`return FKWeb.canon.hash(FKWeb.dumpLogLua())`));
  const lb = lua.doStringSync(`return #FKWeb.dumpLogLua()`);
  console.log(`node pin=${pin} head=${head} resumes=${resumes} msgs=${s.messages} steps=${s.steps} stateDigest=${s.final_state_digest} logHash=${lh} logBytes=${lb}`);
  lua.global.close();
}
await probe(true);
