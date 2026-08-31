import { buildBundle } from '../build-bundle.mjs';
import { createVm, installHost } from '../engine.js';
const bundle = buildBundle();
const { lua, FS } = await createVm(bundle);
installHost({ lua, FS }, { logLevels: new Set(['error']) });
lua.doStringSync(`dofile('web/boot.lua'); assert(FKWeb.boot())`);
lua.doStringSync(`FKWeb.installHook(); assert(FKWeb.newRoom(20260828, 8))`);
lua.doStringSync(`return FKWeb.run()`);
const r = lua.doStringSync(`
  local m = fk._websink.stream[239]
  local out = {}
  out[#out+1] = "cmd=" .. m.command .. " nbytes=" .. m.nbytes .. " type=" .. type(m.data)
  local function describe(v, prefix, depth)
    if depth > 3 then return end
    if type(v) ~= "table" then out[#out+1] = prefix .. " = " .. tostring(v) return end
    local n = 0
    local mt = getmetatable(v)
    for k, vv in pairs(v) do
      n = n + 1
      if n <= 8 then describe(vv, prefix .. "." .. tostring(k), depth + 1) end
    end
    out[#out+1] = prefix .. " <table n=" .. n .. " arr=" .. #v .. " mt=" .. tostring(mt ~= nil) .. ">"
  end
  describe(m.data, "data", 0)
  return table.concat(out, "\\n")
`);
console.log(String(r).slice(0, 4000));
