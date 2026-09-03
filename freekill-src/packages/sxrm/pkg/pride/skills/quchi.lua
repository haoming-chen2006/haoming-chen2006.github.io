local quchi = fk.CreateSkill {
  name = "quchi",
}

Fk:loadTranslationTable{
  ["quchi"] = "驱斥",
  [":quchi"] = "出牌阶段限一次，你可以对一名角色造成1点火焰伤害，若其有连接牌，则重置其连接牌令此伤害+1。",

  ["#quchi-active"] = "驱斥：你可对一名角色造成1点伤害，若其有连接牌，重置其连接牌此伤害+1",
}

local U = require "packages.utility.utility"

quchi:addEffect("active", {
  prompt = "#quchi-active",
  card_num = 0,
  target_num = 1,
  can_use = function (self, player)
    return player:usedSkillTimes(quchi.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function (self, player, to_select, selected)
    return #selected == 0
  end,
  on_use = function(self, room, effect)
    local to = effect.tos[1]

    local hasConnectedCard = false
    table.forEach(to:getCardIds("h"), function(id)
      if U.isConnectedCard(id) then
        hasConnectedCard = true
        U.connectCards(room, id)
      end
    end)

    local damage = 1
    if hasConnectedCard then
      damage = 2
    end

    room:damage{
      from = effect.from,
      to = to,
      damage = damage,
      damageType = fk.FireDamage,
      skillName = quchi.name,
    }
  end,
})

return quchi
