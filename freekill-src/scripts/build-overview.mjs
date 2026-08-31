// Overview data extraction.
//
// The generals / cards / modes pages are reference material: they never change
// between page loads and they must not wait on a 1.5 MB Lua bundle plus a VM
// boot before showing anything. So the build boots the real client VM once, in
// node, reads the same engine tables `lua/client/client_util.lua` reads, and
// freezes the answers.
//
// This is the real Lua data, not a hand-maintained copy. At runtime the overview
// page prefers a live `LuaClient` when one is booted and falls back to this file
// otherwise; either way, no card or general fact is authored in TypeScript.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLuaVm } from '../src/engine/vm.ts';
import { buildBundle } from './build-lua-bundle.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(here, '..');

const EXTRACT = `
local json = {}
local function esc(s)
  return (s:gsub('[%c"\\\\]', function(c)
    local map = { ['"'] = '\\\\"', ['\\\\'] = '\\\\\\\\', ['\\n'] = '\\\\n', ['\\r'] = '\\\\r', ['\\t'] = '\\\\t' }
    return map[c] or string.format('\\\\u%04X', c:byte())
  end))
end
function json.enc(v)
  local t = type(v)
  if t == 'nil' then return 'null'
  elseif t == 'boolean' then return tostring(v)
  elseif t == 'number' then return (v % 1 == 0) and string.format('%d', v) or tostring(v)
  elseif t == 'string' then return '"' .. esc(v) .. '"'
  elseif t == 'table' then
    if v[1] ~= nil or next(v) == nil then
      local out = {}
      for i = 1, #v do out[i] = json.enc(v[i]) end
      return '[' .. table.concat(out, ',') .. ']'
    end
    local keys = {}
    for k in pairs(v) do keys[#keys + 1] = tostring(k) end
    table.sort(keys)
    local out = {}
    for _, k in ipairs(keys) do out[#out + 1] = '"' .. esc(k) .. '":' .. json.enc(v[k] ~= nil and v[k] or v[tonumber(k)]) end
    return '{' .. table.concat(out, ',') .. '}'
  end
  return 'null'
end

local function decode(s)  -- client_util returns json strings; re-parse via load
  return s
end

local out = { generals = {}, cards = {}, modes = {}, packs = { general = {}, card = {} }, translations = {} }

-- The overview renders engine keys, not baked strings: the page has to be able
-- to re-render in another language without another build. So every key it looks
-- up is recorded here with its Chinese value, and the English side comes from
-- src/i18n/engine at runtime (upstream's own en_US covers barely half the keys).
-- The title / subtitle / description fields below stay for compatibility.
local function put(k)
  if type(k) ~= 'string' or k == '' then return end
  local v = Fk:translate(k)
  if v ~= k then out.translations[k] = v end
end

-- Generals, by package, with the detail payload the overview page shows.
local gpacks = json.enc  -- silence luacheck
for _, pack in ipairs(Fk.package_names) do
  local p = Fk.packages[pack]
  -- packages/test ships fixture generals; it must load (ModManager requires it)
  -- but it is not v1 content and never appears in the overview.
  if p and p.type == Package.GeneralPack and not pack:match('^test') then
    out.packs.general[#out.packs.general + 1] = pack
    for _, g in ipairs(p.generals) do
      if not g.hidden and not g.total_hidden then
        local skills = {}
        for _, s in ipairs(g.skills) do skills[#skills + 1] = s.name end
        for _, sname in ipairs(g.other_skills or {}) do skills[#skills + 1] = sname end
        out.generals[#out.generals + 1] = {
          name = g.name,
          pack = pack,
          kingdom = g.kingdom,
          hp = g.hp,
          maxHp = g.maxHp,
          shield = g.shield,
          gender = g.gender,
          title = Fk:translate(g.name),
          subtitle = Fk:translate('#' .. g.name),
          illustrator = Fk:translate('illustrator:' .. g.name),
          skills = skills,
        }
        put(g.name); put('#' .. g.name); put('illustrator:' .. g.name); put('~' .. g.name)
      end
    end
  end
end

-- Skill text, keyed by skill name, for every skill any listed general has.
local seen = {}
for _, g in ipairs(out.generals) do
  for _, sname in ipairs(g.skills) do
    if not seen[sname] then
      seen[sname] = true
      put(sname); put(':' .. sname); put('#' .. sname)
    end
  end
end

-- Cards: one entry per distinct printed card, not per copy.
local byname = {}
for _, c in ipairs(Fk.cards) do
  local cid = c.id
  if c.package then
  local key = c.name
  local e = byname[key]
  if not e then
    e = {
      name = c.name,
      pack = c.package and c.package.name or '?',
      type = c.type,
      subType = c.sub_type,
      title = Fk:translate(c.name),
      description = Fk:translate(':' .. c.name),
      copies = 0,
      ids = {},
      suits = {},
    }
    byname[key] = e
    out.cards[#out.cards + 1] = e
  end
  put(c.name); put(':' .. c.name)
  e.copies = e.copies + 1
  e.ids[#e.ids + 1] = cid
  e.suits[#e.suits + 1] = { suit = c:getSuitString(), number = c.number }
  end
end

for _, pack in ipairs(Fk.package_names) do
  local p = Fk.packages[pack]
  if p and p.type == Package.CardPack then out.packs.card[#out.packs.card + 1] = pack end
end

-- Game modes.
for name, mode in pairs(Fk.game_modes) do
  out.modes[#out.modes + 1] = {
    name = name,
    title = Fk:translate(name),
    description = Fk:translate(':' .. name),
    minPlayer = mode.minPlayer,
    maxPlayer = mode.maxPlayer,
  }
  put(name); put(':' .. name)
end

-- Kingdoms and the card-type words the filters offer.
for _, k in ipairs({ 'wei', 'shu', 'wu', 'qun', 'jin', 'god', 'unknown',
                     'basic', 'trick', 'equip', 'weapon', 'armor', 'treasure' }) do put(k) end
table.sort(out.modes, function(a, b) return a.name < b.name end)
table.sort(out.generals, function(a, b) return a.name < b.name end)
table.sort(out.cards, function(a, b) return a.name < b.name end)

return json.enc(out)
`;

export async function buildOverview({ quiet = false } = {}) {
  const vm = await createLuaVm(await buildBundle(), { logLevels: new Set(['error']) });
  vm.lua.doStringSync(`dofile('lua/web/client.lua')`);
  if (vm.lua.doStringSync(`return FKClient.boot()`) !== true) throw new Error('FKClient.boot() failed');
  const json = vm.lua.doStringSync(EXTRACT);
  const data = JSON.parse(json);
  mkdirSync(join(WEB_ROOT, 'public'), { recursive: true });
  writeFileSync(join(WEB_ROOT, 'public', 'overview.json'), json);
  if (!quiet) {
    console.log(`overview: ${data.generals.length} generals, ${data.cards.length} cards, ` +
      `${data.modes.length} modes, ${(json.length / 1024).toFixed(0)} KB`);
  }
  vm.close();
  return data;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await buildOverview();
}
