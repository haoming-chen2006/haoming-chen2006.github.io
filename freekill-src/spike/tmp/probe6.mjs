import { buildBundle } from '../build-bundle.mjs';
import { createVm, installHost } from '../engine.js';
const bundle = buildBundle();
const { lua, FS } = await createVm(bundle);
installHost({ lua, FS }, { logLevels: new Set([]) });
lua.doStringSync(`dofile('web/boot.lua'); assert(FKWeb.boot())`);
lua.doStringSync(`FKWeb.installHook(); assert(FKWeb.newRoom(20260828, 8))`);
lua.doStringSync(`return FKWeb.run()`);
const probe = (n, code) => {
  const t = Date.now();
  try { const v = lua.doStringSync(code); console.log(n, `${Date.now()-t}ms`, String(v).slice(0,200)); }
  catch (e) { console.log(n, `${Date.now()-t}ms FAILED`, e.message); }
};
probe('one msg', `return #FKWeb.canon.encode(fk._websink.stream[1])`);
probe('msg212', `return #FKWeb.canon.encode(fk._websink.stream[212])`);
probe('first1000', `local t={} for i=1,1000 do t[i]=fk._websink.stream[i] end return #FKWeb.canon.encode(t)`);
probe('first4000', `local t={} for i=1,4000 do t[i]=fk._websink.stream[i] end return #FKWeb.canon.encode(t)`);
probe('whole stream', `return #FKWeb.canon.encode(fk._websink.stream)`);
probe('steps', `return #FKWeb.canon.encode(FKWeb.steps)`);
