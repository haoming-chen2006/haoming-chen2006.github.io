import { buildBundle } from '../build-bundle.mjs';
import { createVm, installHost } from '../engine.js';
const bundle = buildBundle();
async function probe(pin) {
  const { lua, FS } = await createVm(bundle);
  installHost({ lua, FS }, { logLevels: new Set([]) });
  lua.doStringSync(`dofile('web/boot.lua'); assert(FKWeb.boot())`);
  if (pin) lua.doStringSync(`FKWeb.pinIterationOrder()`);
  const head = String(lua.doStringSync(`return FKWeb.pairsHead(6)`));
  lua.doStringSync(`FKWeb.installHook(); assert(FKWeb.newRoom(20260828, 8))`);
  const resumes = lua.doStringSync(`return FKWeb.run()`);
  const s = JSON.parse(lua.doStringSync(`return FKWeb.summary()`));
  console.log(`node pin=${pin} pairsHead=${head} resumes=${resumes} msgs=${s.messages} steps=${s.steps} digest=${s.final_state_digest}`);
  lua.global.close();
}
await probe(false);
await probe(true);
await probe(true);
