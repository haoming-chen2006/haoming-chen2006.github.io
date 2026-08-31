import { buildBundle } from '../build-bundle.mjs';
import { createVm, installHost } from '../engine.js';
const bundle = buildBundle();

async function run(seed) {
  const { lua, FS } = await createVm(bundle);
  installHost({ lua, FS }, { logLevels: new Set([]) });
  lua.doStringSync(`dofile('web/boot.lua'); assert(FKWeb.boot())`);
  lua.doStringSync(`FKWeb.installHook(); assert(FKWeb.newRoom(${seed}, 8))`);
  const resumes = lua.doStringSync(`return FKWeb.run()`);
  const probe = lua.doStringSync(`
    local c = FKWeb.canon
    local s = fk._websink.stream
    local sig = {}
    for i = 1, math.min(#s, 40) do sig[i] = s[i].command end
    local firstBlow, blowCmd = -1, ""
    for i = 1, #s do
      local ok = pcall(c.encode, s[i], 50000)
      if not ok then firstBlow, blowCmd = i, s[i].command break end
    end
    return table.concat(sig, ",") .. "|" .. #s .. "|" .. firstBlow .. "|" .. blowCmd
      .. "|" .. #FKWeb.steps .. "|" .. FKWeb.steps[#FKWeb.steps].digest
  `);
  const [sig, n, blowI, blowCmd, nsteps, lastDigest] = String(probe).split('|');
  return { resumes, sig, n, blowI, blowCmd, nsteps, lastDigest, lua };
}

const a = await run(20260828);
const b = await run(20260828);
console.log('resumes', a.resumes, b.resumes);
console.log('messages', a.n, b.n, 'steps', a.nsteps, b.nsteps);
console.log('sig equal:', a.sig === b.sig);
console.log('last digest', a.lastDigest, b.lastDigest, a.lastDigest === b.lastDigest);
console.log('first blowup idx', a.blowI, a.blowCmd);

// describe the blowup message
const desc = a.lua.doStringSync(`
  local m = fk._websink.stream[${a.blowI}]
  local out = {}
  local seen = {}
  local count = 0
  local function walk(v, depth)
    count = count + 1
    if count > 200000 then error("walk overflow at depth " .. depth, 0) end
    if type(v) ~= "table" then return end
    if depth > 12 then out[#out+1] = "deep@" .. depth return end
    for k, vv in pairs(v) do walk(vv, depth + 1) end
  end
  local ok, err = pcall(walk, m.data, 0)
  out[#out+1] = "cmd=" .. m.command .. " nbytes=" .. m.nbytes .. " nodes=" .. count .. " ok=" .. tostring(ok) .. " err=" .. tostring(err)
  local keys = {}
  if type(m.data) == "table" then for k in pairs(m.data) do keys[#keys+1] = tostring(k) end end
  out[#out+1] = "keys=" .. table.concat(keys, ",")
  return table.concat(out, " ;; ")
`);
console.log(String(desc).slice(0, 2000));
