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
import { writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createLuaVm } from '../src/engine/vm.ts';
import { buildBundle } from './build-lua-bundle.mjs';
/**
 * Every English key `src/i18n/engine` covers, read off the directory.
 *
 * Not `../src/i18n/engine/index.ts`: this script runs under plain node, whose
 * type-stripping resolves `import type` but not the extensionless runtime
 * imports index.ts uses. Listing the tables by hand instead is what went wrong
 * once already — the list said upstream/override/authored, the modes lane added
 * `modes.ts`, and this filter silently stopped recognising a whole table.
 *
 * So it globs. Only MEMBERSHIP is asked of this set — "does src/i18n/engine
 * already cover this key" — so merge order is irrelevant and a new table needs
 * no edit here. `scripts/build.test.ts` asserts the result really is disjoint
 * from the real `EN_US`, which is the check that catches a table this misses.
 */
async function engineEnglishKeys() {
  const dir = join(WEB_ROOT, 'src', 'i18n', 'engine');
  const keys = new Set();
  for (const name of readdirSync(dir).sort()) {
    if (!name.endsWith('.ts') || name === 'index.ts') continue;
    const mod = await import(pathToFileURL(join(dir, name)).href);
    for (const [expName, table] of Object.entries(mod)) {
      if (!expName.endsWith('_EN_US') || typeof table !== 'object' || !table) continue;
      for (const k of Object.keys(table)) keys.add(k);
    }
  }
  return keys;
}

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

local out = { generals = {}, cards = {}, modes = {}, packs = { general = {}, card = {} },
              translations = {}, translationsEn = {} }

-- 只留真的是英文的那些。packages/mobile/i18n/en_US.lua 往 en_US 表里塞了 452 个
-- key，其中只有 22 个是英文 —— 剩下的值原样是中文。照单全收会让「英文」页面
-- 看起来在翻，其实没翻，比直接显示中文更糟。
local function isEnglish(s)
  if type(s) ~= "string" or s == "" then return false end
  for _, c in utf8.codes(s) do
    if (c >= 0x3400 and c <= 0x4DBF) or (c >= 0x4E00 and c <= 0x9FFF)
      or (c >= 0xF900 and c <= 0xFAFF) or (c >= 0x3040 and c <= 0x30FF) then
      return false
    end
  end
  return true
end

-- The overview renders engine keys, not baked strings: the page has to be able
-- to re-render in another language without another build. So every key it looks
-- up is recorded here with its Chinese value, and the English side comes from
-- src/i18n/engine at runtime (upstream's own en_US covers barely half the keys).
-- The title / subtitle / description fields below stay for compatibility.
local function put(k)
  if type(k) ~= 'string' or k == '' then return end
  local v = Fk:translate(k)
  if v ~= k then out.translations[k] = v end
  -- 上游自己写下的英文，按 key 记一份。src/i18n/engine 覆盖标准包，手杀包只有
  -- 22 个 key 有真英文（武将名居多）；能捡一个是一个，捡不到就还是中文。
  local en = Fk:translate(k, 'en_US')
  if en ~= k and en ~= v and isEnglish(en) then out.translationsEn[k] = en end
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
          -- Portraits live under the *extension* directory, not the package
          -- one: mobile's ten sub-packages all draw from packages/mobile/image.
          extension = p.extensionName or pack,
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
  const data = JSON.parse(vm.lua.doStringSync(EXTRACT));

  // Drop the upstream English we already have a better copy of. `src/i18n/engine`
  // is the first tier the page consults, so a key it covers is dead weight in the
  // payload — and it is nearly all of them: 260 of 278 keys, 25 KB, on the
  // critical path, to say "Cao Cao" twice. What survives is the 18 keys only
  // upstream has, which is 481 bytes.
  const covered = await engineEnglishKeys();
  const before = Object.keys(data.translationsEn).length;
  for (const k of Object.keys(data.translationsEn)) {
    if (covered.has(k)) delete data.translationsEn[k];
  }
  const json = JSON.stringify(data);

  mkdirSync(join(WEB_ROOT, 'public'), { recursive: true });
  writeFileSync(join(WEB_ROOT, 'public', 'overview.json'), json);
  if (!quiet) {
    console.log(`overview: ${data.generals.length} generals, ${data.cards.length} cards, ` +
      `${data.modes.length} modes, ${(json.length / 1024).toFixed(0)} KB`);
    console.log(`  upstream en_US kept: ${Object.keys(data.translationsEn).length} of ${before} ` +
      `(the rest are already in src/i18n/engine)`);
  }
  vm.close();
  return data;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await buildOverview();
}
