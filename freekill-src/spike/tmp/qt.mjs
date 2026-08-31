import { buildBundle } from '../build-bundle.mjs';
import { createVm, installHost } from '../engine.js';
const bundle = buildBundle();
const { lua, FS } = await createVm(bundle);
installHost({ lua, FS }, { logLevels: new Set([]) });
lua.doStringSync(`dofile('web/boot.lua'); assert(FKWeb.boot())`);
const s = lua.doStringSync(`
  local c = FKWeb.canon
  return c.encode({ a = "中文<b>x</b>", b = string.char(1,255,128,65), c = "quote\\" back\\\\ slash", d = 1.5, e = {1,2,3} })`);
console.log(String(s));
console.log('parses:', JSON.stringify(JSON.parse(String(s))));
