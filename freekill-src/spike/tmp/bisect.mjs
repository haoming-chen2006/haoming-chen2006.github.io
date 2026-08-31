import { buildBundle } from '../build-bundle.mjs';
import { createVm, installHost } from '../engine.js';
const bundle = buildBundle();
const { lua, FS } = await createVm(bundle);
installHost({ lua, FS }, { logLevels: new Set(['error']) });
lua.doStringSync(`dofile('web/boot.lua'); assert(FKWeb.boot())`);
lua.doStringSync(`FKWeb.installHook(); assert(FKWeb.newRoom(20260828, 8))`);
lua.doStringSync(`return FKWeb.run()`);
const out = lua.doStringSync(`
  local c = FKWeb.canon
  local bad = {}
  local total = 0
  for i, m in ipairs(fk._websink.stream) do
    local ok, s = pcall(c.encode, m, 200000)
    if not ok then bad[#bad+1] = i .. ":" .. m.command .. ":BLOWUP"
    else
      total = total + #s
      if #s > 20000 then bad[#bad+1] = i .. ":" .. m.command .. ":" .. #s end
    end
  end
  return "total=" .. total .. " n=" .. #fk._websink.stream .. " bad=" .. table.concat(bad, ", ")
`);
console.log(String(out).slice(0, 3000));
