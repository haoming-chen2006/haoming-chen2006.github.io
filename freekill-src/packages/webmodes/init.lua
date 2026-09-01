-- SPDX-License-Identifier: GPL-3.0-or-later
--
-- packages/webmodes -- 网页版自带的游戏模式：1v1、2v2、斗地主。
--
-- WHY THIS IS A PACKAGE AND NOT AN OVERLAY FILE.  `ModManager:loadPackages`
-- enumerates `packages/` off the virtual filesystem and `require`s whatever it
-- finds, so a package is the engine's own front door for new game modes -- no
-- boot-order patching, no hook into `lua/web/host.lua`, and the client VM picks
-- the modes up on exactly the same path the host does.  `/Users/haoming/FreeKill`
-- is a read-only upstream mirror; this directory lives in the site repo and is
-- mounted at `packages/webmodes` by `scripts/build-lua-bundle.mjs`.
--
-- WHAT IS DELIBERATELY NOT HERE.  The 5- and 8-player games are upstream's
-- `aaa_role_mode` at a fixed seat count, not modes of their own: the role table
-- in `lua/lunarltk/server/gamelogic.lua` already deals 1 主公 / 1 忠臣 / 2 反贼 /
-- 1 内奸 at five and 1 主公 / 2 忠臣 / 4 反贼 / 1 内奸 at eight, which is the
-- standard 三国杀 distribution.  Duplicating one ruleset as two engine modes to
-- express "five seats" and "eight seats" would put the same rules in three
-- places; the seat count is a property of the *offer*, and it lives in
-- `src/contract/modes.ts`.
--
-- ROLES ARE REUSED, NOT INVENTED.  Every mode below deals only `lord`,
-- `loyalist` and `rebel`.  That is not a shortcut -- it is what makes
-- `GameMode:friendEnemyJudge` (lord+loyalist are friends, rebel+rebel are
-- friends), `Photo`'s role art and the whole win-condition vocabulary work
-- without a single new asset or special case.  A new role string would render
-- as `unknown.png` on every seat.

local extension = Package:new("webmodes", Package.SpecialPack)

--=========================== 地主技 Landlord skills ===========================
--
-- Ported from upstream FreeKill's `m_feiyang` / `m_bahu`, which this mirror is
-- too old to ship (`packages/standard/pkg/skills/` has 41 files, neither of them).
-- `mode_skill = true` keeps them out of a player's normal skill enumeration --
-- they belong to the mode, not to a general.
--
-- Two deliberate deltas from upstream, both flagged rather than silent:
--   * 飞扬 discards *every* card in the judgement area, not one.  That is the
--     official OL wording ("弃置判定区里的所有牌") and it is what the 斗地主
--     v0.1 already on disk chose; upstream FreeKill discards exactly one.
--   * 共苦 is not here at all.  Upstream expresses the peasant's legacy as a
--     `reward_punish` override rather than a skill, and this build does not
--     want it -- the landlord gets exactly two extra skills.  See
--     `dizhu_reward_punish` below for the one thing that override still does.

-- 飞扬：判定阶段开始时，你可以弃置两张手牌，然后弃置判定区里的所有牌。
local feiyang = fk.CreateSkill {
  name = "dz__feiyang",
  mode_skill = true,
}

feiyang:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    -- The empty-judgement-area guard is upstream's and it earns its place: it
    -- is what stops a bot paying two cards for nothing.
    return target == player
      and player:hasSkill(feiyang.name)
      and player.phase == Player.Judge
      and player:getHandcardNum() >= 2
      and #player:getCardIds("j") > 0
  end,
  on_cost = function(self, event, target, player, data)
    local cards = player.room:askToDiscard(player, {
      min_num = 2,
      max_num = 2,
      include_equip = false,
      skill_name = feiyang.name,
      prompt = "#dz__feiyang-invoke",
      cancelable = true,
      skip = true,
    })
    if #cards == 2 then
      event:setCostData(self, { cards = cards })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:throwCard(event:getCostData(self).cards, feiyang.name, player, player)
    if player.dead then return end
    local judged = player:getCardIds("j")
    if #judged == 0 then return end
    room:throwCard(judged, feiyang.name, player, player)
  end,
})

-- 跋扈：锁定技，准备阶段，你摸一张牌；出牌阶段，你可以多使用一张【杀】。
local bahu = fk.CreateSkill {
  name = "dz__bahu",
  tags = { Skill.Compulsory },
  mode_skill = true,
}

bahu:addEffect(fk.EventPhaseStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(bahu.name) and player.phase == Player.Start
  end,
  on_use = function(self, event, target, player, data)
    player:drawCards(1, bahu.name)
  end,
})

-- `residue_func` raises the limit by one, which is the rule.  `bypass_times`
-- would remove the limit entirely and then hand it back by counting uses --
-- same effect on a good day, wrong the moment anything else also grants a Slash.
bahu:addEffect("targetmod", {
  residue_func = function(self, player, skill, scope, card)
    if player:hasSkill(bahu.name) and card and card.trueName == "slash"
      and scope == Player.HistoryPhase then
      return 1
    end
  end,
})

extension:loadSkillSkels { feiyang, bahu }

--=========================== 共用逻辑 Shared logic ===========================

--- 公开某人的身份。三个模式全都是明置身份的：没有暗身份，就没有推理，
--- 也就没有"我该不该信他"这一层。
---@param room Room
---@param p ServerPlayer
local function reveal(room, p)
  room:setPlayerProperty(p, "role_shown", true)
  room:broadcastProperty(p, "role")
end

--- 两阵营通用的胜负判断：只剩一边站着就结束。
---
--- 不能直接用基类的 `GameMode:getWinner`。它是为身份局写的，只在主公或反贼倒下
--- 时才结账；忠臣死了永远返回 ""。1v1 和 2v2 里黄方根本没有主公，于是黄方全灭
--- 也不会有人宣布游戏结束 —— 桌上只剩红方在自己打自己。
---@param victim ServerPlayer
---@return string
local function twoFactionWinner(self, victim)
  -- 濒死待救（rest > 0）的人还没真死，此时结账会提前终局。
  if not victim.surrendered and victim.rest > 0 then return "" end

  local yellow, green = false, false
  for _, p in ipairs(victim.room.players) do
    if not p.surrendered and not (p.dead and p.rest == 0) then
      if p.role == "lord" or p.role == "loyalist" then
        yellow = true
      elseif p.role == "rebel" or p.role == "rebel_chief" then
        green = true
      end
    end
  end

  if yellow and green then return "" end
  if yellow then return "lord+loyalist" end
  if green then return "rebel+rebel_chief" end

  -- 两边同时清空。实际到不了这里（死亡是一个一个结算的，每死一个都会调一次
  -- 这个函数），但真到了也必须给个非空串，否则 game_rule 判定为"还没分出胜负"
  -- 而桌上已经没有活人，游戏就永远不结束了。
  --
  -- 不用 "draw"：那是个已有的翻译键，中文是"摸"（摸牌的摸），结算框会照着渲染。
  -- 列出所有身份 = 谁都没输，意思对，而且每个词都能正确翻译。
  return "lord+loyalist+rebel+rebel_chief"
end

--- 无身份模式（1v1 / 2v2）的逻辑：按座次交替发身份，全部明置。
---
--- 为什么不走 `role_table` + `table.shuffle`：2v2 要的是队友坐对面。洗牌会洗出
--- {忠, 忠, 反, 反} 这种相邻分队，桌面读起来就不再是"我对面是我队友"。
--- `GameLogic:run` 已经先 `table.shuffle(room.players)` 过了，随机性在那一步
--- 就够了，这里只负责把固定花色发下去。
---@param roles string[] @ 按最终座次排列的身份
local function alternatingLogic(roles)
  return function()
    local logic = GameLogic:subclass("webmodes_alternating_logic")

    function logic:assignRoles()
      local room = self.room
      for i, p in ipairs(room.players) do
        p.role = roles[i]
        reveal(room, p)
      end
    end

    --- 全员同时选将。
    ---
    --- 基类的 `chooseGenerals` 走不了：它在主公那一段之后无条件地
    --- `room:getOtherPlayers(lord, true)`（gamelogic.lua:112），而这两个模式
    --- 里 `getLord()` 返回 nil —— 于是 `getAlivePlayers` 拿 nil 当 current
    --- 去索引，整局在选将之前就崩了。基类只是没设想过"没有主公"这件事。
    function logic:chooseGenerals()
      local room = self.room
      local generalNum = room:getSettings('generalNum')
      local n = room:getSettings('enableDeputy') and 2 or 1
      local players = room.players

      -- 必须有人是"当前角色"，而且只有这里能定。
      --
      -- `TriggerEvent:exec` 从 `room.current` 出发绕座位环发事件
      -- （trigger_event.lua:95）。整个开局流程里唯一一次 `setCurrent` 藏在基类
      -- `chooseGenerals` 的主公分支里 —— 没有主公，就没人设过它，于是开局第一个
      -- `fk.GamePrepared` 拿 nil 去 `.next`，一局在发牌之前就判了平局。
      room:setCurrent(players[1])

      local generals = table.random(room.general_pile, #players * generalNum)
      local req = Request:new(players, "AskForGeneral")
      req.timeout = room:getSettings('generalTimeout')
      for i, p in ipairs(players) do
        local arg = table.slice(generals, (i - 1) * generalNum + 1, i * generalNum + 1)
        req:setData(p, { arg, n })
        req:setDefaultReply(p, table.random(arg, n))
      end

      for _, p in ipairs(players) do
        local result = req:getResult(p)
        room:prepareGeneral(p, result[1], result[2])
      end

      room:askToChooseKingdom(players)
    end

    return logic
  end
end

--=========================== 1v1 单挑 ===========================

local duel = fk.CreateGameMode {
  name = "webmodes_duel",
  minPlayer = 2,
  maxPlayer = 2,
  main_mode = "webmodes_duel",
  logic = alternatingLogic { "loyalist", "rebel" },
  winner_getter = twoFactionWinner,
}
-- 单挑不计入胜率：两个人的样本里，武将强度和运气分不开。
duel.countInFunc = function(self, room) return false end

--=========================== 2v2 对决 ===========================

local team = fk.CreateGameMode {
  name = "webmodes_team",
  minPlayer = 4,
  maxPlayer = 4,
  main_mode = "webmodes_team",
  logic = alternatingLogic { "loyalist", "rebel", "loyalist", "rebel" },
  winner_getter = twoFactionWinner,
}
team.countInFunc = function(self, room) return false end

--=========================== 斗地主 ===========================
--
-- 结构照抄上游 FreeKill 的 `m_1v2_mode`（TamQuocSat-LangKhach/gamemode）：
-- 身份 {lord, rebel, rebel}、身份全明、地主选将框 +2、体力和体力上限 +1、
-- 两个地主技。胜负和敌友判断一个字都不用写 —— 基类为身份局写的那套，在
-- "一个主公 + 两个反贼"上恰好就是对的。

local dizhu_logic = function()
  local logic = GameLogic:subclass("webmodes_dizhu_logic")

  function logic:initialize(room)
    GameLogic.initialize(self, room)
    -- 只有三人局会用到，但 `assignRoles` 是按 `#room.players` 取的，
    -- 所以整张表都得在。minPlayer == maxPlayer == 3 保证取不到别的格子。
    self.role_table[3] = { "lord", "rebel", "rebel" }
  end

  function logic:assignRoles()
    GameLogic.assignRoles(self)
    for _, p in ipairs(self.room.players) do
      reveal(self.room, p)
    end
  end

  --- 与基类的差别只有一处：地主的选将框多两个。
  --- 其余每一行都是 `lua/lunarltk/server/gamelogic.lua:chooseGenerals` 的原样，
  --- 抄下来是因为上游没有把"发几张给主公"抽成参数。
  function logic:chooseGenerals()
    local room = self.room
    local generalNum = room:getSettings('generalNum')
    local n = room:getSettings('enableDeputy') and 2 or 1
    local lord = room:getLord()

    if lord ~= nil then
      room:setCurrent(lord)
      local generals = room:getNGenerals(generalNum + 2)
      local lord_generals = room:askToChooseGeneral(lord, { generals = generals, n = n })
      local lord_general, deputy
      if type(lord_generals) == "table" then
        deputy = lord_generals[2]
        lord_general = lord_generals[1]
      else
        lord_general = lord_generals
        lord_generals = { lord_general }
      end

      generals = table.filter(generals, function(g) return not table.contains(lord_generals, g) end)
      room:returnToGeneralPile(generals)

      room:prepareGeneral(lord, lord_general, deputy, true)
      room:askToChooseKingdom { lord }
    end

    local nonlord = room:getOtherPlayers(lord, true)
    local generals = table.random(room.general_pile, #nonlord * generalNum)

    local req = Request:new(nonlord, "AskForGeneral")
    req.timeout = room:getSettings('generalTimeout')
    for i, p in ipairs(nonlord) do
      local arg = table.slice(generals, (i - 1) * generalNum + 1, i * generalNum + 1)
      req:setData(p, { arg, n })
      req:setDefaultReply(p, table.random(arg, n))
    end

    for _, p in ipairs(nonlord) do
      local result = req:getResult(p)
      room:prepareGeneral(p, result[1], result[2])
    end

    room:askToChooseKingdom(nonlord)
  end

  function logic:attachSkillToPlayers()
    GameLogic.attachSkillToPlayers(self)
    local room = self.room
    local lord = room:getLord()
    if lord then
      room:handleAddLoseSkills(lord, "dz__feiyang|dz__bahu", nil, false)
    end
  end

  return logic
end

local dizhu = fk.CreateGameMode {
  name = "webmodes_dizhu",
  minPlayer = 3,
  maxPlayer = 3,
  main_mode = "webmodes_dizhu",
  logic = dizhu_logic,

  -- 地主 +1 体力上限和体力。基类只在五人以上给主公加，三人局拿不到。
  get_adjusted = function(self, player)
    if player.role == "lord" then
      return { hp = player.hp + 1, maxHp = player.maxHp + 1 }
    end
    return {}
  end,

  -- 杀死农民没有摸三张牌的奖励。
  --
  -- 这不是漏写，是这个模式唯一需要改的一条奖惩：基类里"杀反贼摸三张"是给
  -- 八人局定的，八人局的反贼有四个，摸三张只是把节奏往前推一格。三人局里
  -- 农民只有两个，杀掉一个再摸三张，等于一次交换就把牌差和人数差同时拿走。
  -- 上游 `m_1v2_mode` 同样把它整个换掉了。
  reward_punish = function(self, victim, killer) end,

  is_counted = function(self, room) return true end,
}

extension:addGameMode(duel)
extension:addGameMode(team)
extension:addGameMode(dizhu)

--=========================== 翻译 Translations ===========================
--
-- 英文在 `src/i18n/engine/modes.ts`：引擎按载入时的语言把技能徽标
-- （`#<skill>_<n>_<trig>`）烤进翻译表，之后再切 `Config.language` 也改不回来，
-- 所以这个项目的英文一律在 JS 侧按 key 覆盖。详见 `src/i18n/engine/index.ts`。

local duel_desc = [==[
  # 单挑

  两人对局，没有身份，也没有隐藏信息。谁先把对面打死谁赢。

  没有主公技，没有主公额外的体力，双方从同一个将池里选将。
]==]

local team_desc = [==[
  # 2v2 对决

  四人分成两队，一队两人。**队友坐在你的对面**：1、3 号位一队，2、4 号位一队。

  没有主公，没有内奸，没有暗身份 —— 开局所有人的阵营都是明的。

  一队的两个人全部阵亡，另一队获胜。
]==]

local dizhu_desc = [==[
  # 斗地主

  三人对局。一人是**地主**，两人是**农民**。地主坐一号位，先手。

  地主的优势有三样：

  - 选将框 **+2**（农民 3 个，地主 5 个）
  - 体力上限和体力 **+1**
  - 两个地主专属技能：

  **飞扬**：判定阶段开始时，你可以弃置两张手牌，然后弃置判定区里的所有牌。

  **跋扈**：锁定技，准备阶段，你摸一张牌；出牌阶段，你可以多使用一张【杀】。

  身份全部明置，开局就知道谁是地主。

  地主阵亡，农民获胜；两名农民都阵亡，地主获胜。

  *杀死农民的人没有摸三张牌的奖励。*
]==]

Fk:loadTranslationTable {
  ["webmodes"] = "网页版模式",

  ["webmodes_duel"] = "单挑",
  [":webmodes_duel"] = duel_desc,
  ["webmodes_team"] = "2v2 对决",
  [":webmodes_team"] = team_desc,
  ["webmodes_dizhu"] = "斗地主",
  [":webmodes_dizhu"] = dizhu_desc,

  ["dz__feiyang"] = "飞扬",
  [":dz__feiyang"] = "判定阶段开始时，你可以弃置两张手牌，然后弃置判定区里的所有牌。",
  ["#dz__feiyang-invoke"] = "飞扬：你可以弃置两张手牌，然后弃置判定区里的所有牌",
  ["dz__bahu"] = "跋扈",
  [":dz__bahu"] = "锁定技，准备阶段，你摸一张牌；出牌阶段，你可以多使用一张【杀】。",
}

return extension
