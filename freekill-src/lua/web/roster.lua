-- roster.lua -- 开局武将池的完整性检查。必须在 lua/freekill.lua 之后跑（那时包才加载完）。
--
-- WHY THIS EXISTS. 引擎里装着 733 名武将，其中 36 名在这份代码里打不完整。三种缺法：
--
--   缺技能（20 名）手杀包直接引用别的拓展包（ol / os / ty / *_ex）里的技能名，
--                而那些包不在本仓库的 packages/ 下；另有 7 名栽在技能文件本身
--                load 失败上（addAuxActiveSkill / Fk.OptionBox 这版核心还没有），
--                技能没建起来，效果和缺包一样。General:addSkill 收到的是字符串
--                不是 Skill 对象，所以引擎连个警告都不给 —— 名字记进 other_skills，
--                取的时候查不到，静默跳过。
--   缺牌（12 名）技能硬依赖一张本仓库没有的牌，每次触发都在 cloneCard 上抛异常。
--                一共缺 7 张，其中 3 张由 qsgs-fans/gamemode 的 derived_cards
--                提供，而那个包的 2v2.lua 在这版核心上过不了 fk.CreateGameMode
--                的断言，整包带不进来。
--   缺方法（4 名）技能调用的 Room 方法这版引擎还没有，见 lua/web/roomcompat.lua。
--
-- 数字会随镜像进来的包变，别照着改代码 —— 下面两张表和 missingSkills 都是运行时
-- 查的，包补齐了武将自己就回来。src/engine/__tests__/roster.test.ts 盯的是不变量
-- 而不是数字：池子里不能有任何一名武将，其技能调用了引擎没有的 Room 方法。
--
-- 三种缺法的后果是同一个，而且是最难被发现的那一种：玩家选到「界蔡文姬」，武将牌上
-- 印着〖悲歌〗〖断肠〗，实际只有〖悲歌〗生效。这是规则错，不是显示错 —— 本项目的
-- 底线是「同一份 bundle 必然算出同一套合法性」，一个技能悄悄不存在直接违背它。
-- 少一个武将，玩家看得见；少一个技能，玩家看不见。所以宁可少。
--
-- 做法是把这些武将标成 hidden。hidden 是引擎自己的概念（general.lua:29
-- 「不在选将框里出现，可以点将，可以在武将一览里查询到」），engine.lua:325 的随机
-- 武将池会跳过它们。下面两张表的键都是「缺的东西」而不是武将名，而且是在运行时查的，
-- 所以补齐拓展包 / 引擎升级之后，武将自己就回到池子里了，不用来改这个文件。
--
-- 名单不是猜的：40 名来自加载后对 Fk.skills 的直接比对，5 名来自 220 局全机器人
-- 对局的错误普查（scripts 之外，见任务记录）。
--
-- 这不改上游任何一个字节：packages/ 与 lua/ 都是只读镜像，改动只发生在这里。

local Roster = {}

--- 武将自己身上引用了、但引擎里根本不存在的技能名。
---
--- 只看 other_skills（0.5.5 之后武将自己的技能全走这里，见 general.lua:113），
--- 不看 related_other_skills。后者是「与本武将相关、但属于别的武将」的技能，
--- 例如关索的〖当先〗〖制蛮〗——那是珠联璧合的展示项，缺了只是少一行说明，
--- 不影响这名武将自己怎么打。九名武将只栽在这上面，不该为此下架。
---@param general General
---@return string[]
local function missingSkills(general)
  local missing = {}
  for _, name in ipairs(general.other_skills or Util.DummyTable) do
    if type(name) == "string" and not Fk.skills[name] then
      missing[#missing + 1] = name
    end
  end
  return missing
end

--- 技能 -> 它硬依赖的牌名。牌不在引擎里，这个技能就不可能正常工作。
---
--- 这张表是从 220 局全机器人对局的错误普查里得来的，不是猜的。两张牌都只被
--- 手杀包引用、却由本仓库没有的拓展包提供，于是每次技能触发都在
--- engine.lua:cloneCard 上抛「Attempt to clone a card that not added to engine」：
---
---   js__peace_spell         太平要术 —— mobile__tianshu（天书，南华老仙）
---   raid_and_frontal_attack 奇正相生 —— tianzuo（天祚，神荀彧）锁定技，开局就跑
---
--- 键写的是牌名而不是武将名，所以这不是一张写死的黑名单：哪天把那两个包补进
--- packages/，下面的 all_card_types 查得到，武将自己就回到池子里了。
---
--- 后六条来自六个镜像包进来之后的一次全量扫描：把 packages/ 下每一处
--- prepareDeriveCards / cloneCard / useVirtualCard 里写死的牌名抓出来，逐个问
--- 引擎 Fk.all_card_types 有没有。这六个技能引用的三张牌都由
--- qsgs-fans/gamemode 的 derived_cards 提供，而那个包在这版核心上整包加载失败
--- （2v2.lua 过不了 fk.CreateGameMode 的断言），所以一张也拿不到。
---
--- 其中〖授书〗是把一整局拖死的那个，代价比"少一个技能"大得多：它挂在
--- fk.RoundStart 上（shoushu.lua:13），每一轮开始都要
--- prepareDeriveCards{"js__peace_spell"}，而且在 can_trigger 里就调
--- （shoushu.lua:18）。取不到牌就在那句抛出去，引擎把技能里的错误吃掉，于是
--- 这一轮的回合流程根本没跑起来 —— 轮数自己往前涨，没人摸牌、没人出牌、没人
--- 死，一局跑到 999 轮还不结束。审计里就是这么撞上的：seed 321925，999 轮，
--- 全场只有 16 次 MoveCards。
---
--- 复现：把武将池钉成「南华老仙 + 7 名标准将」，8 个 AI 打一局，得到 7 个
--- decision；同样的钉法换成任何一名别的武将都是 278-596 个。
---
--- 最后一条〖灭害〗是第七个镜像包 sxrm 蚀心入魔进来时，roster.test.ts 自己抓到
--- 的 —— 不是人扫出来的，这正是把不变量写成测试而不是写成名单的用处。它要的
--- 刺【杀】和〖旋风〗〖倾席〗要的是同一张，所以键写在牌上，那张牌哪天进来，三名
--- 武将一起回池子。它挂在 viewas 上而不是回合事件上，坏起来只是「技能点不动」，
--- 不像〖授书〗能把整局拖死；但规则错就是规则错，一样下架。
local REQUIRED_CARDS = {
  mobile__tianshu = { "js__peace_spell" },
  tianzuo = { "raid_and_frontal_attack" },
  lingce = { "raid_and_frontal_attack" },
  dinghan = { "raid_and_frontal_attack" },
  miaolue = { "underhanding" },

  shoushu = { "js__peace_spell" },        -- 授书，js__nanhualaoxian 南华老仙
  mou__huangtian = { "js__peace_spell" }, -- 谋黄天，mou__zhangjiao 谋张角
  danxinl = { "sincere_treat" },          -- 丹心，js__liuyong 刘永
  re__danxinl = { "sincere_treat" },      -- 界丹心，js_re__liuyong 界刘永
  xuanfengj = { "stab__slash" },          -- 旋风，js__jiangwei 姜维
  qingxix = { "stab__slash" },            -- 倾席，js__xuyou 许攸
  miehai = { "stab__slash" },             -- 灭害，sx__huatuo 华佗（蚀心入魔）
  dingce = { "foresight" },               -- 定策，js__guojia 郭嘉（先见之明）
  ninghan = { "ice__slash" },             -- 凝寒，js__zhangchunhua 张春华（冰杀）
}

--- 技能 -> 它需要、但这版引擎还没有的 Room 方法。
---
--- 同样来自那 220 局的错误普查。room:getUniversalCards(guhuo_type, true_name)
--- 要返回「基础牌堆里基本牌/锦囊牌的无花色点数复印卡」，是神杀智慧类技能判定
--- 「你能宣称哪些牌名」的依据（契约见 utility.lua:505-512）。
---
--- lua/web/roomcompat.lua 补了 tableRandomPick / shuffleTable / prepareDeriveCards，
--- 但这个没补，是刻意的：它决定的是合法性，而不是随机数或者缓存。要是我们印的
--- 那套牌名和上游差一张，这两名武将就在按一套错的规则打牌 —— 而这种错，玩家
--- 是看不出来的。宁可先不上，也不上一个「看着能用、其实规则不对」的武将。
---
--- 后两条来自 standard_ex / sp 这六个镜像包进来时的普查：把这六个包里所有
--- `room:<方法>(` 的调用点抓出来，逐个问引擎「这个方法在不在 room_klass 上」。
--- 114 个方法里有两个不在，而且都在技能的主路径上、不是什么冷门分支：
---
---   ex__rende  界仁德 —— 一个出牌阶段内给出第二张牌之后，room:getUniversalCards("b")
---              取「能宣称的基本牌名」再让你视为使用（rende.lua:37）。取不到就
---              在这句抛出去，引擎把技能里的错误吃掉，于是界刘备的仁德从第二张
---              牌起悄悄不再给那次使用 —— 牌面上还印着，实际没有。
---   fenxin     焚心 —— room:changeRole 交换两人身份，那就是这个技能的全部
---              （fenxin.lua:32-33）。方法不存在，灵雎发动了等于什么都没做。
---
--- 装载期是抓不到这两个的：Lua 的方法查找发生在调用那一刻，技能文件本身
--- load 得好好的。所以它们不会像 addAuxActiveSkill 那样在启动日志里报错，
--- 只会在某一局里悄悄少算一次 —— 正是这张表存在的理由。
local REQUIRED_ROOM_METHODS = {
  zhiyi = { "getUniversalCards" },
  mobile__zengou = { "getUniversalCards" },
  ex__rende = { "getUniversalCards" },
  fenxin = { "changeRole" },
}

--- 这版引擎的 Room 类上有没有这个方法。
---@param name string
---@return boolean
local function roomHasMethod(name)
  for _, game in pairs(Fk.boardgames or Util.DummyTable) do
    local klass = game.room_klass
    if type(klass) == "table" and klass[name] ~= nil then return true end
  end
  return false
end

--- 武将身上有技能依赖了引擎里不存在的牌。
---@param general General
---@return string[] @ 缺的牌名
local function missingCards(general)
  local missing = {}
  for _, skill in ipairs(general.other_skills or Util.DummyTable) do
    for _, card in ipairs(REQUIRED_CARDS[skill] or Util.DummyTable) do
      if not (Fk.all_card_types or Util.DummyTable)[card] then
        missing[#missing + 1] = card
      end
    end
  end
  return missing
end

--- 武将身上有技能依赖了引擎里不存在的 Room 方法。
---@param general General
---@return string[] @ 缺的方法名
local function missingMethods(general)
  local missing = {}
  for _, skill in ipairs(general.other_skills or Util.DummyTable) do
    for _, m in ipairs(REQUIRED_ROOM_METHODS[skill] or Util.DummyTable) do
      if not roomHasMethod(m) then missing[#missing + 1] = m end
    end
  end
  return missing
end

--- 把打不完整的武将移出开局武将池。
---@return { name: string, skills: string[], cards: string[], methods: string[] }[] @ 按名字排序
function Roster.hideIncomplete()
  local hidden = {}
  for name, general in pairs(Fk.generals or Util.DummyTable) do
    if not general.hidden and not general.total_hidden then
      local skills, cards = missingSkills(general), missingCards(general)
      local methods = missingMethods(general)
      if #skills > 0 or #cards > 0 or #methods > 0 then
        general.hidden = true
        hidden[#hidden + 1] = { name = name, skills = skills, cards = cards, methods = methods }
      end
    end
  end
  table.sort(hidden, function(a, b) return a.name < b.name end)
  return hidden
end

return Roster
