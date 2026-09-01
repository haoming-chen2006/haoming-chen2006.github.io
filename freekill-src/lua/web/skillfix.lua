-- skillfix.lua -- 只读镜像里的包内容 bug，在这儿就地补。
--
-- packages/ 和 lua/ 是上游镜像，一个字节都不改，所以修在这里。每一条都写清楚
-- 「引擎的哪句话」和「包违反了它的哪一条」，上游改好之后这里自然成为空操作。

local M = {}

-- ---------------------------------------------------------------- 驱乘 / from 为 nil
--
-- Player:isProhibitedTarget 问的是「这名角色能不能成为这张牌的目标」，不问是谁
-- 用的，所以它把 from 传成 nil（lua/lunarltk/core/player.lua:1338）；
-- fk_ex.lua:174 的签名写的也是 `from: Player?`，就是说每个 is_prohibited 都得
-- 接得住 nil。
--
-- packages/mobile 的〖驱乘〗没接住，第一句就是 from:hasSkill(...)
-- （mobile_rare/skills/qusheng.lua:67）。只要车里吉在场，任何一次「移动场上的
-- 延时锦囊」的合法性判断都会从 canMoveCardInBoardTo 里抛出去，把发动技能的那
-- 名角色的这次移动整个打断 —— 220 局全自动对局里撞到过 2 次。
--
-- 语义上 nil 的 from 只有一个诚实答案：这条规则讲的是「谁用的」，没有使用者就
-- 判定不出禁止，也就不禁止。补的就是上游本该写的那一句 `if not from then return end`。
--
-- 键写的是技能骨架名而不是派生技能名（派生名里的序号 #qusheng_3_prohibit 会随
-- 上游增删效果而变），而且是运行时按骨架查的，所以上游哪天自己加了这句守卫，
-- 下面这层包装原样返回，什么都不变。
--
-- 名单不是猜的：对整份武将池里每个 ProhibitSkill 都用 nil 的 from 调过一遍，
-- 这一版只有这一个会抛。同一份扫描写进了
-- src/engine/__tests__/skillfix.test.ts，再冒出第二个会直接把测试打红，
-- 而不是在某一局里悄悄少发动一个技能。
local NIL_FROM_UNSAFE = {
  qusheng = true,
}

---@param skill table @ 一个 ProhibitSkill 实例
local function guardNilFrom(skill)
  if type(skill) ~= "table" or type(skill.isProhibited) ~= "function" then return end
  if rawget(skill, "__web_nil_from") then return end
  rawset(skill, "__web_nil_from", true)

  local isProhibited = skill.isProhibited
  skill.isProhibited = function(self, from, to, card)
    if from == nil then return false end
    return isProhibited(self, from, to, card)
  end
end

--- 给名单上的 prohibit 技能补上 from 为 nil 的守卫。
---
--- 两个 VM 都要装：Player:isProhibitedTarget 定义在 core/player.lua，
--- 服务端算合法性、客户端画可选目标，走的是同一份代码。
function M.install()
  for _, skill in pairs(Fk.skills or Util.DummyTable) do
    if type(skill) == "table" and type(skill.isProhibited) == "function"
      and type(skill.getSkeleton) == "function" then
      local ok, skel = pcall(skill.getSkeleton, skill)
      if ok and type(skel) == "table" and NIL_FROM_UNSAFE[skel.name] then
        guardNilFrom(skill)
      end
    end
  end
end

return M
