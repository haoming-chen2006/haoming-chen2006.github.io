
local ganlu = fk.CreateSkill {
  name = "ganlu",
}

Fk:loadTranslationTable{
  ["ganlu"] = "甘露",
  [":ganlu"] = "出牌阶段限一次，你可以选择装备区内牌数之差不大于X的两名角色（X为你已损失体力值），交换其装备区内的牌。",

  ["#ganlu"] = "甘露：选择装备区内牌数之差不大于%arg的两名角色，交换其装备区内的牌",

  ["$ganlu1"] = "男婚女嫁，须当交换文定之物。",
  ["$ganlu2"] = "此真乃吾之佳婿也。",
}

ganlu:addEffect("active", {
  anim_type = "control",
  prompt = function(self, player)
    return "#ganlu:::"..player:getLostHp()
  end,
  card_num = 0,
  target_num = 2,
  can_use = function(self, player)
    return player:usedSkillTimes(ganlu.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    if #selected == 0 then
      return true
    elseif #selected == 1 then
      return math.abs(#to_select:getCardIds("e") - #selected[1]:getCardIds("e")) <= player:getLostHp() and
        not (#to_select:getCardIds("e") == 0 and #selected[1]:getCardIds("e") == 0)
    end
  end,
  on_use = function(self, room, effect)
    room:swapAllCards(effect.from, effect.tos, ganlu.name, "e")
  end,
})

return ganlu
