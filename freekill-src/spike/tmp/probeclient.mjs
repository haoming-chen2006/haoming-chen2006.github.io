import { buildBundle } from '../build-bundle.mjs';
import { createVm, installHost } from '../engine.js';
const bundle = buildBundle();
const { lua, FS } = await createVm(bundle);
installHost({ lua, FS }, { logLevels: new Set([]) });
lua.doStringSync(`dofile('web/boot.lua'); assert(FKWeb.boot())`);
lua.doStringSync(`FKWeb.installHook(); assert(FKWeb.newRoom(20260828, 8, nil, true, 1))`);
lua.doStringSync(`return FKWeb.run()`);
const s = JSON.parse(lua.doStringSync(`return FKWeb.summary()`));
console.log({ messages: s.messages, steps: s.steps, ui_notifies: s.ui_notifies, ui_scenes: s.ui_scenes, ui_errors: s.ui_errors, flush: s.flush_batches, bytes: s.total_cbor_bytes });
console.log(String(lua.doStringSync(`
  local e = FKWeb.client.errors or {}
  local t = {}
  for i = 1, math.min(#e, 6) do t[i] = e[i] end
  return table.concat(t, " ;; ")
`)).slice(0, 1500));
