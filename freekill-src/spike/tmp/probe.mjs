import { buildBundle } from '../build-bundle.mjs';
import { createVm, installHost } from '../engine.js';
const bundle = buildBundle();
const { lua, FS } = await createVm(bundle);
installHost({ lua, FS }, { logLevels: new Set(['error']) });
lua.doStringSync(`dofile('web/boot.lua'); assert(FKWeb.boot())`);
lua.doStringSync(`FKWeb.installHook(); assert(FKWeb.newRoom(20260828, 8))`);
lua.doStringSync(`return FKWeb.run()`);
console.log('game done');
const r = lua.doStringSync(`
  local c = FKWeb.canon
  local worst, worstI, worstCmd = 0, 0, ""
  local total = 0
  local blew = {}
  for i = 1, #fk._websink.stream do
    local m = fk._websink.stream[i]
    local ok, s = pcall(c.encode, m, 50000)
    if not ok then blew[#blew+1] = i .. ":" .. tostring(m.command)
    else
      total = total + #s
      if #s > worst then worst, worstI, worstCmd = #s, i, m.command end
    end
    if #blew > 5 then break end
  end
  return string.format("total=%d worst=%d at %d (%s) blew=%s", total, worst, worstI, worstCmd, table.concat(blew, ","))
`);
console.log(String(r));
