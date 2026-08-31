import { buildBundle } from '../build-bundle.mjs';
import { createVm, installHost } from '../engine.js';
const bundle = buildBundle();

async function full(seed, freeze) {
  const realNow = Date.now;
  if (freeze) Date.now = () => 1700000000000;
  const { lua, FS } = await createVm(bundle);
  Date.now = realNow;
  installHost({ lua, FS }, { logLevels: new Set([]) });
  lua.doStringSync(`dofile('web/boot.lua'); assert(FKWeb.boot())`);
  lua.doStringSync(`FKWeb.installHook(); assert(FKWeb.newRoom(${seed}, 8))`);
  const resumes = lua.doStringSync(`return FKWeb.run()`);
  const r = String(lua.doStringSync(`
    return #fk._websink.stream .. "|" .. #FKWeb.steps .. "|" .. FKWeb.steps[#FKWeb.steps].digest
  `));
  return { resumes, r, lua };
}
const A = await full(20260828, true);
const B = await full(20260828, true);
console.log('A', A.resumes, A.r);
console.log('B', B.resumes, B.r);
console.log('EQUAL:', A.r === B.r && A.resumes === B.resumes);

// DAG check on a MoveCards payload
const d = A.lua.doStringSync(`
  local target
  for i = 1, #fk._websink.stream do
    if fk._websink.stream[i].command == "MoveCards" then target = fk._websink.stream[i] break end
  end
  local seen, nodes, shared, maxdepth = {}, 0, 0, 0
  local function walk(v, depth)
    if type(v) ~= "table" then return end
    if depth > maxdepth then maxdepth = depth end
    if seen[v] then shared = shared + 1 return end
    seen[v] = true
    nodes = nodes + 1
    if nodes > 100000 then error("too many", 0) end
    for _, vv in pairs(v) do walk(vv, depth + 1) end
  end
  local ok, err = pcall(walk, target.data, 0)
  return string.format("MoveCards nbytes=%d uniqueNodes=%d sharedHits=%d maxdepth=%d ok=%s err=%s",
    target.nbytes, nodes, shared, maxdepth, tostring(ok), tostring(err))
`);
console.log(String(d));
