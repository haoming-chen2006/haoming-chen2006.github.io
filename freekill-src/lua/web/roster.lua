-- roster.lua -- 开局武将池的完整性检查。必须在 lua/freekill.lua 之后跑（那时包才加载完）。
--
-- WHY THIS EXISTS. 手杀包有 294 名武将，其中 45 名在这份代码里打不完整。三种缺法：
--
--   缺技能（40 名）「界限突破」「界一将成名」两个子包直接引用别的拓展包
--                （nos / ol / mou / os / *_ex）里的技能名，而那些包不在本仓库的
--                packages/ 下。General:addSkill 收到的是字符串不是 Skill 对象，
--                所以引擎连个警告都不给 —— 名字记进 other_skills，取的时候查不到，
--                静默跳过。
--   缺牌（3 名）  技能硬依赖一张本仓库没有的牌，每次触发都在 cloneCard 上抛异常。
--   缺方法（2 名）技能调用的 Room 方法这版引擎还没有，见 lua/web/roomcompat.lua。
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
local REQUIRED_CARDS = {
  mobile__tianshu = { "js__peace_spell" },
  tianzuo = { "raid_and_frontal_attack" },
  lingce = { "raid_and_frontal_attack" },
  dinghan = { "raid_and_frontal_attack" },
  miaolue = { "underhanding" },
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
local REQUIRED_ROOM_METHODS = {
  zhiyi = { "getUniversalCards" },
  mobile__zengou = { "getUniversalCards" },
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
