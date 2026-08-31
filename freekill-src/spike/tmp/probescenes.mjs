import { buildBundle } from '../build-bundle.mjs';
import { createVm, installHost } from '../engine.js';
const bundle = buildBundle();
async function run(seed, seat) {
  const { lua, FS } = await createVm(bundle);
  installHost({ lua, FS }, { logLevels: new Set([]) });
  lua.doStringSync(`dofile('web/boot.lua'); assert(FKWeb.boot())`);
  lua.doStringSync(`FKWeb.installHook(); assert(FKWeb.newRoom(${seed}, 8, nil, true, ${seat}))`);
  lua.doStringSync(`return FKWeb.run()`);
  const types = String(lua.doStringSync(`
    local t = {}
    for _, sc in ipairs(FKWeb.client.scenes) do t[#t+1] = tostring(sc._type) end
    local u = {}
    for _, n in ipairs(FKWeb.client.ui) do u[n.command] = (u[n.command] or 0) + 1 end
    local ks = {}
    for k, v in pairs(u) do ks[#ks+1] = k .. "=" .. v end
    table.sort(ks)
    return table.concat(t, ",") .. " ||| " .. table.concat(ks, " ")
  `));
  lua.global.close();
  return types;
}
const [a, b] = (await run(20260828, 1)).split('|||');
console.log('seat1 scene types:', [...new Set(a.split(',').filter(Boolean))].join(', '));
console.log('seat1 notifyUI commands:', b.trim().slice(0, 1500));
const all = new Set();
for (const seat of [1,2,3,4,5,6,7,8]) {
  const [t] = (await run(20260828, seat)).split('|||');
  t.split(',').filter(Boolean).forEach(x => all.add(x));
}
console.log('union over 8 seats:', [...all].sort().join(', '));
