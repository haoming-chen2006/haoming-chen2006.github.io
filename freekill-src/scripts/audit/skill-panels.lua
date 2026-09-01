-- Read-only dump for scripts/audit/skill-panels.mjs. Runs inside a booted
-- client VM (`FKClient.boot()` has already run), returns one JSON string.
--
-- The unit of a "skill" on a general card is a SKELETON (`Fk.skill_skels`),
-- not a `Fk.skills` entry: `m_shi__tuntian` is one printed skill whose skeleton
-- carries three effect objects (`m_shi__tuntian` active,
-- `#m_shi__tuntian_2_trig`, `#m_shi__tuntian_3_trig`). Only the skeleton lines
-- up with what a player reads off the card, so that is what this keys on.

local function esc(s)
  return (s:gsub('[%c"\\]', function(c)
    local map = { ['"'] = '\\"', ['\\'] = '\\\\', ['\n'] = '\\n', ['\r'] = '\\r', ['\t'] = '\\t' }
    return map[c] or string.format('\\u%04X', c:byte())
  end))
end

local function enc(v)
  local t = type(v)
  if t == 'nil' then return 'null'
  elseif t == 'boolean' then return tostring(v)
  elseif t == 'number' then return (v % 1 == 0) and string.format('%d', v) or tostring(v)
  elseif t == 'string' then return '"' .. esc(v) .. '"'
  elseif t == 'table' then
    if v[1] ~= nil or next(v) == nil then
      local out = {}
      for i = 1, #v do out[i] = enc(v[i]) end
      return '[' .. table.concat(out, ',') .. ']'
    end
    local keys = {}
    for k in pairs(v) do keys[#keys + 1] = tostring(k) end
    table.sort(keys)
    local out = {}
    for _, k in ipairs(keys) do out[#out + 1] = '"' .. esc(k) .. '":' .. enc(v[k]) end
    return '{' .. table.concat(out, ',') .. '}'
  end
  return 'null'
end

local out = { generals = {}, skills = {}, qmlMarks = {}, marks = {} }

for _, pack in ipairs(Fk.package_names) do
  local p = Fk.packages[pack]
  if p and p.type == Package.GeneralPack and not pack:match('^test') then
    for _, g in ipairs(p.generals) do
      local skills = {}
      for _, s in ipairs(g.all_skills or Util.DummyTable) do
        skills[#skills + 1] = { name = s[1], related = s[2] and true or false }
      end
      out.generals[#out.generals + 1] = {
        name = g.name,
        title = Fk:translate(g.name),
        pack = pack,
        extension = p.extensionName or pack,
        kingdom = g.kingdom,
        hp = g.hp,
        maxHp = g.maxHp,
        hidden = (g.hidden or g.total_hidden) and true or false,
        skills = skills,
      }
    end
  end
end

--- Which skeletons any listed general actually carries.
local wanted = {}
for _, g in ipairs(out.generals) do
  for _, s in ipairs(g.skills) do wanted[s.name] = true end
end

for name in pairs(wanted) do
  local skel = (Fk.skill_skels or Util.DummyTable)[name]
  local main = Fk.skills[name]
  if skel or main then
    local rec = {
      title = Fk:translate(name),
      desc = Fk:translate(':' .. name),
      tags = skel and skel.tags or {},
      visible = skel and skel.visible ~= false or (main and main.visible ~= false),
      effects = {},
    }
    local effs = skel and skel.effects or (main and { main } or {})
    for _, e in ipairs(effs) do
      local iact = nil
      if rawget(e, 'interaction') ~= nil then
        local ok, t = pcall(function() return e.interaction.type end)
        iact = (ok and type(t) == 'string') and t or 'declared'
      end
      local compulsory = false
      local okc, r = pcall(function() return e:hasTag(Skill.Compulsory) end)
      if okc then compulsory = r and true or false end
      rec.effects[#rec.effects + 1] = {
        name = e.name,
        class = e.class and e.class.name or '?',
        -- `spec.on_cost` lands on the instance; the default lives on the class.
        -- A TriggerSkill with neither an override nor Compulsory/delay raises
        -- AskForSkillInvoke on every trigger without writing a single ask.
        costOverridden = rawget(e, 'cost') ~= nil,
        triggerOverridden = rawget(e, 'trigger') ~= nil,
        compulsory = compulsory,
        delay = e.is_delay_effect and true or false,
        interaction = iact,
        derived_piles = e.derived_piles,
      }
    end
    out.skills[name] = rec
  end
end

for name in pairs(Fk.qml_marks or Util.DummyTable) do out.qmlMarks[#out.qmlMarks + 1] = name end
table.sort(out.qmlMarks)
table.sort(out.generals, function(a, b) return a.name < b.name end)
return enc(out)
