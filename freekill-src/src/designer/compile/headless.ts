/**
 * Boot the real engine on a generated general and see whether it works.
 *
 * Nothing else can answer the question. A generated file that loads proves
 * nothing: `General:addSkill` takes a STRING, so a general can carry a skill
 * name the engine never registered and the engine will not warn — that is the
 * whole reason `lua/web/roster.lua` exists. And a skill that registers can
 * still never fire, because `can_trigger` REPLACES the engine's default
 * `triggerable` (skill_skeleton.lua:274) rather than extending it, so one
 * missing clause is a skill printed on the card that does nothing at all.
 *
 * So this runs four checks in order of how badly each failure hides:
 *
 *   1. the general is registered, in `packages/custom`, with the right skills;
 *   2. every skill name resolves to a Skill object in `Fk.skills`;
 *   3. `lua/web/roster.lua` does not hide it from the pool;
 *   4. the first driveable trigger, driven for real in a scripted room, leaves
 *      a use in the player's own skill history.
 *
 * The room is upstream's own test harness (`test/lua/lib/fake_backend.lua`),
 * reached the way `src/engine/__tests__/luaunit.test.ts` reaches it: boot
 * `lua/web/luaunit.lua`, then `FkTest.initRoom()`. That is a real `Room` with
 * real events, not a mock — `room:damage{…}` here is the same call the game
 * makes.
 *
 * WHAT THE MEASUREMENT ASSUMES. Every question the skill asks is answered yes,
 * by the stubs below. So a green result says "when the player accepts, the
 * skill fires and its effect runs"; it does not say the prompt reads well or
 * that a bot would ever choose it.
 */
import { buildBundle, WEB_PACKAGES } from '../../engine/node/buildBundle.ts';
import { createLuaVm } from '../../engine/vm.ts';
import type { HeroSpec } from '../spec.ts';
import { q } from './emit.ts';

export interface HeadlessCheck {
  ok: boolean;
  msg: string;
}

export interface HeadlessResult {
  ok: boolean;
  checks: HeadlessCheck[];
  /** The effect that was driven, or null when no trigger in the hero is driveable. */
  drove: { skill: string; trigger: string; fired: boolean } | null;
  /** Everything the probe printed, for feeding back to a model. */
  log: string[];
}

/**
 * How each supported trigger is made to happen.
 *
 * A whole turn covers the four flow events at once; the rest are one call. Only
 * `fk.GameStart` has no entry — the game has already started by the time the
 * harness has a room, and re-firing it would be a lie about what was tested.
 */
const TURN = ['GameEvent.Turn:create(TurnData:new(me, "game_rule")):exec()'];
const USE = ['room:useVirtualCard("slash", nil, me, comp, "designer_probe", true)'];

const DRIVERS: Record<string, string[]> = {
  'fk.Damaged': ['room:damage { from = comp, to = me, damage = 1, skillName = "designer_probe" }'],
  'fk.DamageInflicted': ['room:damage { from = comp, to = me, damage = 1, skillName = "designer_probe" }'],
  'fk.Damage': ['room:damage { from = me, to = comp, damage = 1, skillName = "designer_probe" }'],
  'fk.EventPhaseStart': TURN,
  'fk.EventPhaseEnd': TURN,
  'fk.TurnStart': TURN,
  'fk.TurnEnd': TURN,
  'fk.HpChanged': ['room:loseHp(me, 1, "designer_probe")'],
  'fk.HpRecover': [
    'room:loseHp(me, 1, "designer_probe")',
    'room:recover { who = me, num = 1, skillName = "designer_probe" }',
  ],
  'fk.EnterDying': ['room:loseHp(me, me.hp, "designer_probe")'],
  'fk.AfterCardsMove': ['room:drawCards(me, 1, "designer_probe")'],
  'fk.CardUsing': USE,
  'fk.CardUseFinished': USE,
  'fk.TargetSpecified': USE,
};

/**
 * Answer every ask affirmatively.
 *
 * Written against `lua/lunarltk/server/room.lua` so each stub returns what the
 * real one returns and has the same side effect: `askToDiscard` throws the
 * cards unless `skip` (room.lua:790), `askToCards` throws nothing (room.lua:855).
 * Getting that backwards would make the harness disagree with the game about
 * where the cards ended up, which is the one thing it exists to check.
 */
const AUTO_ACCEPT = `
Room.askToSkillInvoke = function(self, player, params) return true end

Room.askToDiscard = function(self, player, params)
  local min = params.min_num or 1
  local pool = player:getCardIds(params.include_equip and "he" or "h")
  local ids = table.slice(pool, 1, min + 1)
  if #ids < min then return {} end
  if not params.skip then self:throwCard(ids, params.skill_name, player, player) end
  return ids
end

Room.askToCards = function(self, player, params)
  local min = params.min_num or 1
  local ids = table.slice(player:getCardIds(params.include_equip and "he" or "h"), 1, min + 1)
  if #ids < min then return {} end
  return ids
end

Room.askToChoosePlayers = function(self, player, params)
  local min = params.min_num or 1
  local picked = table.slice(params.targets or {}, 1, min + 1)
  if #picked < min then return {} end
  return picked
end

Room.askToChoice = function(self, player, params)
  return (params.choices or {})[1]
end
`;

/** Which of the hero's effects the harness can actually make happen. */
const firstDriveable = (spec: HeroSpec): { skill: string; trigger: string } | null => {
  for (const skill of spec.skills) {
    for (const effect of skill.effects) {
      if (DRIVERS[effect.trigger.block]) return { skill: skill.id, trigger: effect.trigger.block };
    }
  }
  return null;
};

const probe = (spec: HeroSpec, drove: { skill: string; trigger: string } | null): string => {
  const skills = `{ ${spec.skills.map((s) => q(s.id)).join(', ')} }`;
  return `
local out = { checks = {}, log = {}, fired = false }
local function note(ok, msg)
  out.checks[#out.checks + 1] = { ok = ok and true or false, msg = msg }
end
local function say(msg) out.log[#out.log + 1] = tostring(msg) end

local id = ${q(spec.id)}
local g = Fk.generals[id]
note(g ~= nil, "general " .. id .. " is registered")
if g then
  note(g.package ~= nil and g.package.name == "custom",
    "it belongs to packages/custom (got " .. tostring(g.package and g.package.name) .. ")")
  note(g.hp == ${spec.hp} and g.maxHp == ${spec.maxHp ?? spec.hp},
    "hp " .. tostring(g.hp) .. "/" .. tostring(g.maxHp))
  for _, name in ipairs(${skills}) do
    note(table.contains(g.other_skills or Util.DummyTable, name),
      "the general carries " .. name)
    note(Fk.skills[name] ~= nil, "skill " .. name .. " resolves to a Skill")
  end
end

-- roster.lua is what the deployed build runs at boot (lua/web/host.lua:45). A
-- general it hides is one a player can never be dealt.
local hidden = dofile("lua/web/roster.lua").hideIncomplete()
local mine = nil
for _, h in ipairs(hidden) do
  if h.name == id then mine = h end
end
note(mine == nil, mine == nil and "roster keeps it in the pool"
  or ("roster hid it: missing skills " .. table.concat(mine.skills, ",")
      .. " cards " .. table.concat(mine.cards, ",")
      .. " methods " .. table.concat(mine.methods, ",")))

${drove ? `
${AUTO_ACCEPT}

FkTest.initRoom()
local room = FkTest.room
local me, comp = room.players[1], room.players[2]

local ok, err = pcall(function()
  FkTest.runInRoom(function()
    room:drawCards(me, 5, "designer_probe")
    room:handleAddLoseSkills(me, ${q(drove.skill)}, nil, false, false)
  end)
  FkTest.runInRoom(function()
    ${DRIVERS[drove.trigger].join('\n    ')}
  end)
end)
if not ok then say("driving " .. ${q(drove.trigger)} .. " raised: " .. tostring(err)) end

-- events/skill.lua:110 — Room:useSkill writes the skeleton's name into the
-- player's own history, so this is the engine's word on whether it fired.
local times = me:usedSkillTimes(${q(drove.skill)}, Player.HistoryGame)
out.fired = times > 0
note(out.fired, ${q(`${drove.skill} fired on ${drove.trigger}`)} .. " (" .. tostring(times) .. " times)")
` : `
say("no trigger in this hero can be driven headlessly; loading was checked, firing was not")
`}

return json.encode(out)
`;
};

export interface HeadlessOptions {
  /**
   * Bundle entries to overlay, e.g. `packages/custom/generals/x.lua`. Passing
   * the compiler's output here tests it without writing anything to disk, which
   * is what the compiler's own suite does; the create endpoint writes first and
   * passes nothing, so that what it tests is what it wrote.
   */
  files?: Record<string, string>;
}

export const testHero = async (
  spec: HeroSpec, { files = {} }: HeadlessOptions = {},
): Promise<HeadlessResult> => {
  const bundle = {
    // `includeTests` brings in `test/lua/**`, which is where the scripted room
    // lives. It is not in the shipped bundle and must not be.
    ...buildBundle({ includeTests: true, sitePackages: [...WEB_PACKAGES, 'custom'] }),
    ...files,
  };
  // The engine logs a load failure and carries on — `Pcall` in
  // `ModManager:loadPackages` swallows it — so a syntax error in the generated
  // file would otherwise show up only as "the general is not registered", with
  // the Lua parser's actual sentence lost. Captured here and filtered to this
  // package, because the shipped build already logs two unrelated load errors
  // of its own (`Fk.OptionBox` in standard_ex) and those are not this hero's.
  const luaErrors: string[] = [];
  const vm = await createLuaVm(bundle, {
    logLevels: new Set(),
    onLog: (level, message) => {
      if (level !== 'error') return;
      if (message.includes('packages/custom') || message.includes(spec.id)) luaErrors.push(message);
    },
  });
  try {
    vm.lua.doStringSync(`dofile('lua/web/luaunit.lua')`);
    if (vm.lua.doStringSync(`return FKUnit.boot()`) !== true) {
      return { ok: false, checks: [{ ok: false, msg: 'the engine did not boot' }], drove: null, log: luaErrors };
    }
    // The preamble every `test/lua/cpp_run*.lua` entry runs before it can use
    // the harness (cpp_run_skill.lua:11-16).
    vm.lua.doStringSync(`
      __package.path = __package.path .. ";./test/lua/lib/?.lua"
      fk.os, fk.io = __os, __io
      fk.qInfo = Util.DummyFunc
      lu = require('luaunit')
      require 'fake_backend'
    `);

    const drove = firstDriveable(spec);
    const raw = vm.lua.doStringSync(probe(spec, drove));
    const out = JSON.parse(String(raw)) as {
      checks: HeadlessCheck[]; log: string[]; fired: boolean;
    };
    return {
      ok: out.checks.every((c) => c.ok),
      checks: out.checks,
      drove: drove ? { ...drove, fired: out.fired } : null,
      log: [...luaErrors, ...out.log],
    };
  } catch (e) {
    return {
      ok: false,
      checks: [{ ok: false, msg: `the probe raised: ${(e as Error).message}` }],
      drove: null,
      log: luaErrors,
    };
  } finally {
    vm.close();
  }
};

/** The headless result as the lines a person — or a model — reads. */
export const formatHeadless = (r: HeadlessResult): string[] => [
  ...r.checks.map((c) => `${c.ok ? 'ok  ' : 'FAIL'} ${c.msg}`),
  ...r.log,
];
