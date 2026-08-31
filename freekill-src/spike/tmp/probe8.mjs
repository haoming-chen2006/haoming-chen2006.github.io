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
  local re = cbor.encode(m.data)
  local d2 = cbor.decode(re)
  local function count(v)
    local seen, n = {}, 0
    local function w(x) if type(x)~="table" then return end if seen[x] then return end seen[x]=true n=n+1 for _,y in pairs(x) do w(y) end end
    w(v) return n
  end
  -- walk down the [1][1][1]... chain
  local chain = {}
  local cur = m.data[1]
  for i = 1, 25 do
    if type(cur) ~= "table" then chain[#chain+1] = "<" .. type(cur) .. ":" .. tostring(cur) .. ">" break end
    local ks = {}
    for k in pairs(cur) do ks[#ks+1] = tostring(k) end
    table.sort(ks)
    chain[#chain+1] = "{" .. table.concat(ks, ",") .. "}"
    cur = cur[1] or cur[ks[1]]
  end
  return string.format("orig_nbytes=%d reencoded=%d nodes=%d chain=%s",
    m.nbytes, #re, count(m.data), table.concat(chain, " > "))
`);
console.log(String(r).slice(0, 2500));
