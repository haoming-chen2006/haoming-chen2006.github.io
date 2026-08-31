import { buildBundle } from '../build-bundle.mjs';
import { createVm, installHost } from '../engine.js';
const bundle = buildBundle();
const { lua, FS } = await createVm(bundle);
installHost({ lua, FS }, { logLevels: new Set([]) });
lua.doStringSync(`dofile('web/boot.lua'); assert(FKWeb.boot())`);
lua.doStringSync(`FKWeb.installHook(); assert(FKWeb.newRoom(20260828, 8))`);
lua.doStringSync(`return FKWeb.run()`);
const r = lua.doStringSync(`
  local m = fk._websink.stream[212]
  local seen, nodes, shared, maxd = {}, 0, 0, 0
  local function walk(v, d)
    if type(v) ~= "table" then return end
    if d > maxd then maxd = d end
    if seen[v] then shared = shared + 1 return end
    seen[v] = true; nodes = nodes + 1
    if nodes > 300000 then error("many") end
    for _, vv in pairs(v) do walk(vv, d+1) end
  end
  pcall(walk, m.data, 0)
  local ks = {}
  if type(m.data) == "table" then for k in pairs(m.data) do ks[#ks+1] = tostring(k) end end
  local sample = ""
  if type(m.data) == "table" and type(m.data[1]) == "table" then
    local s2 = {}
    for k in pairs(m.data[1]) do s2[#s2+1] = tostring(k) end
    sample = table.concat(s2, ",")
  end
  return string.format("cmd=%s nbytes=%d type=%s nodes=%d shared=%d maxd=%d keys=[%s] first=[%s]",
    m.command, m.nbytes, type(m.data), nodes, shared, maxd, table.concat(ks, ","), sample)
`);
console.log(String(r));
const r2 = lua.doStringSync(`
  local m = fk._websink.stream[212]
  local c = FKWeb.canon
  local out = {}
  for k, v in pairs(m.data) do out[#out+1] = tostring(k) .. "=>" .. #c.encode(v) end
  return table.concat(out, " ")
`);
console.log(String(r2).slice(0, 800));
