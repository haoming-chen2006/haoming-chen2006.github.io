import { buildBundle } from '../build-bundle.mjs';
import { createVm, installHost } from '../engine.js';
const bundle = buildBundle();

async function pairsOrder(freeze) {
  const realNow = Date.now;
  if (freeze) Date.now = () => 1700000000000;
  const { lua, FS } = await createVm(bundle);
  Date.now = realNow;
  installHost({ lua, FS }, { logLevels: new Set([]) });
  lua.doStringSync(`dofile('web/boot.lua'); assert(FKWeb.boot())`);
  const o = lua.doStringSync(`
    local t = {}
    local n = 0
    for k in pairs(Fk.generals) do n = n + 1 if n <= 12 then t[#t+1] = k end end
    local u = {}
    local m = 0
    for k in pairs(Fk.skills) do m = m + 1 if m <= 8 then u[#u+1] = k end end
    return table.concat(t, ",") .. " || " .. table.concat(u, ",") .. " || n=" .. n
  `);
  lua.global.close();
  return String(o);
}
console.log('--- no freeze');
console.log('A:', await pairsOrder(false));
console.log('B:', await pairsOrder(false));
console.log('--- frozen Date.now during createVm');
const f1 = await pairsOrder(true);
const f2 = await pairsOrder(true);
console.log('A:', f1);
console.log('B:', f2);
console.log('frozen equal:', f1 === f2);
