import { buildBundle } from '../build-bundle.mjs';
import { createVm, installHost } from '../engine.js';
const bundle = buildBundle();
const { lua, FS } = await createVm(bundle);
installHost({ lua, FS }, { logLevels: new Set([]) });
lua.doStringSync(`dofile('web/boot.lua'); assert(FKWeb.boot())`);
lua.doStringSync(`FKWeb.installHook(); assert(FKWeb.newRoom(20260828, 8, nil, true))`);
lua.doStringSync(`return FKWeb.run()`);
try {
  const lit = lua.doStringSync(`return FKWeb.dumpLogLua()`);
  console.log('log literal bytes:', String(lit).length);
  console.log(String(lit).slice(0, 600));
} catch (e) { console.log('FAILED:', e.message); }
