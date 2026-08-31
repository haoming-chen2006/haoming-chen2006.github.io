-- determinism.lua -- 让「同一个种子」在不同 JS 运行时里跑出同一局
--
-- 背景（这是实测出来的，不是推测）：
-- Lua 5.4 在 lua_newstate 里用 luai_makeseed 生成字符串哈希种子，配方是
-- time(NULL) 加上三个指针（lua_State 的堆地址、一个栈地址、lua_newstate 的函数地址）。
-- emscripten 下 time() 读的是 Date.now()，钉住它就够钉住那一项；
-- 但 lua_State 的堆地址取决于这个 wasm 实例此前的分配历史，
-- 换一个 JS 宿主（实测 node 与 vite-node）地址就变，哈希种子就变，
-- 于是所有字符串键表的 pairs 顺序都变。
--
-- 只要有一处「先按 pairs 顺序建表、再 shuffle」，整局就跟着变：
-- 洗牌用的随机数序列是被 seed 钉住的，但被洗的那个数组本身不是。
-- 换句话说，光钉 math.randomseed 不够，浏览器之间的重放会分歧 ——
-- 而重放正是换主（host migration）的全部机制。
--
-- 修法是把顺序还原成「只由数据决定」：遍历前先排序。
-- 这不改任何规则，只是把一个本来就不该被观察到的实现细节钉死。
--
-- ============================================================================
-- 还剩一处没钉，是有意留着的：
--
--   lua/lunarltk/server/ai/smart_ai.lua:285，SmartAI:handlePlayCard 里的
--   `for sname in pairs(tmp)`。tmp 以技能名（字符串）为键，
--   建出来的 active_strategy_list 顺序随哈希种子变；
--   后面 fk.sorted_pairs 按 use_priority 排序，同优先级就按输入顺序决胜负，
--   于是 AI 在两个浏览器里会打出不同的牌。
--   实测：同一种子、两个哈希种子，第 119 个决策上 AI 一个出 119 号牌、
--   一个出 115 号牌；在那之前 118 个边界的状态摘要完全一致。
--
-- 没有跟进修，是因为这需要把那个 65 行的上游函数整个抄进 overlay，
-- 而它买到的性质产品并不需要：
--   * 规则结算本身是顺序无关的 —— 决策一致时状态摘要就一致，实测如此。
--   * 换主走的是重放日志，重放路径根本不问 AI（见 host.lua 的决策 hook），
--     所以 AI 的顺序敏感伤不到它。逐边界的跨哈希种子重放测试是绿的。
--   * 「同一种子在两台机器上各跑一局」这件事产品从来不做。
--
-- 真要修，正确的地方是上游（CLAUDE.md：lua/ 下的改动属于 freekill-core），
-- 一行的事：把 `for sname in pairs(tmp)` 换成先收键、table.sort、再 ipairs。
-- ============================================================================

local M = {}

--- Room:makeGeneralPile 原本 `for name in pairs(Fk.generals)`，
--- 建出来的 ret 顺序随哈希种子变，table.shuffle 之后自然也就不同了。
--- 顺带一提，同 trueName 的武将去重时留下哪一个，原本也取决于这个顺序。
---@param Room table
local function pinGeneralPile(Room)
  function Room:makeGeneralPile()
    local trueNames = {}
    local ret = {}
    if self.game_started then
      for _, player in ipairs(self.players) do
        trueNames[Fk.generals[player.general].trueName] = true
      end
    end

    local names = {}
    for name in pairs(Fk.generals) do names[#names + 1] = name end
    table.sort(names)

    for _, name in ipairs(names) do
      local general = Fk.generals[name]
      if Fk:canUseGeneral(name) and not trueNames[general.trueName] then
        table.insert(ret, name)
        trueNames[general.trueName] = true
      end
    end
    table.shuffle(ret)
    self.general_pile = ret
    return true
  end
end

--- 服务端 AI 从 ui_emu 的场景里取「现在能点什么」，取法是 pairs 一张
--- 以卡牌 id / 角色 id / 技能名为键的表。技能名那张是字符串键，
--- 于是可选技能的先后顺序随哈希种子变；smart_ai 的 sorted_pairs 按
--- use_priority 排序，同优先级就按输入顺序决胜负 —— 于是 AI 的出牌决策变了。
---
--- 排一下序，AI 就在所有宿主上做同一个决定。这不改任何规则，
--- 只是把一个本来就不该被观察到的实现细节钉死。
---@param AI table
local function pinAiEnumeration(AI)
  function AI:getEnabledCards(pattern)
    if not self:isInDashboard() then return Util.DummyTable end
    local ret = {}
    for cid, item in pairs(self.handler.scene:getAllItems("CardItem")) do
      if item.enabled and not item.selected then
        if (not pattern) or Exppattern:Parse(pattern):match(Fk:getCardById(cid)) then
          table.insert(ret, cid)
        end
      end
    end
    table.sort(ret)
    return ret
  end

  function AI:getEnabledTargets()
    if not self:isInDashboard() then return Util.DummyTable end
    local room = self.room
    local ids = {}
    for pid, item in pairs(self.handler.scene:getAllItems("Photo")) do
      if item.enabled and not item.selected then table.insert(ids, pid) end
    end
    table.sort(ids)
    local ret = {}
    for _, pid in ipairs(ids) do table.insert(ret, room:getPlayerById(pid)) end
    return ret
  end

  function AI:getEnabledSkills()
    if not self:isInDashboard() then return Util.DummyTable end
    local ret = {}
    for name, item in pairs(self.handler.scene:getAllItems("SkillButton")) do
      if item.enabled and not item.selected then table.insert(ret, name) end
    end
    table.sort(ret)
    return ret
  end
end

--- 打上补丁。必须在 lua/server/scheduler.lua 之后调用（Room 那时才存在）。
function M.install()
  if M._installed then return false end
  M._installed = true
  pinGeneralPile(Room)
  pinAiEnumeration(AI)
  return true
end

return M
