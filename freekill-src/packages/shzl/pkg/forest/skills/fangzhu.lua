local fangzhu = fk.CreateSkill {
  name = "fangzhu",
}

Fk:loadTranslationTable{
  ["fangzhu"] = "放逐",
  [":fangzhu"] = "当你受到伤害后，你可以令一名其他角色翻面，然后其摸X张牌（X为你已损失的体力值）。",

  ["#fangzhu-choose"] = "放逐：你可以令一名其他角色翻面，然后其摸%arg张牌",

  ["$fangzhu1"] = "死罪可免，活罪难赦！",
  ["$fangzhu2"] = "给我翻过来！",
}

fangzhu:addEffect(fk.Damaged, {
  anim_type = "masochism",
  can_trigger = function (self, event, target, player, data)
    return target == player and player:hasSkill(fangzhu.name) and #player.room:getOtherPlayers(player, false) > 0
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local to = room:askToChoosePlayers(player, {
      min_num = 1,
      max_num = 1,
      targets = room:getOtherPlayers(player, false),
      skill_name = fangzhu.name,
      prompt = "#fangzhu-choose:::" .. player:getLostHp(),
      cancelable = true,
    })
    if #to > 0 then
      event:setCostData(self, {tos = to})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local to = event:getCostData(self).tos[1]
    to:turnOver()
    if not to.dead and player:getLostHp() > 0 then
      to:drawCards(player:getLostHp(), fangzhu.name)
    end
  end,
})

fangzhu:addAI(Fk.Ltk.AI.newChoosePlayersStrategy{
  choose_players = function(self, ai)
    return ai:askToChoosePlayers({
      targets = ai:getEnabledTargets(),
      min_num = 0,
      max_num = 1,
      skill_name = fangzhu.name,
      benefit_func = function (logic, p)
        logic:setPlayerProperty(p, "faceup", not p.faceup)
        logic:drawCards(p, ai.player:getLostHp(), fangzhu.name)
      end,
    })
  end,
})

return fangzhu
