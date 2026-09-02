local zongshi = fk.CreateSkill {
  name = "zongshij",
}

Fk:loadTranslationTable{
  ["zongshij"] = "纵适",
  [":zongshij"] = "每当你拼点赢，你可以获得对方此次拼点的牌；每当你拼点没赢，你可以收回你此次拼点的牌。",

  ["#zongshij1-get"] = "纵适：你可以获得对方的拼点牌%arg",
  ["#zongshij2-get"] = "纵适：你可以收回你的拼点牌%arg",

  ["$zongshij1"] = "买卖不成，情义还在。",
  ["$zongshij2"] = "此等小事，何须挂耳？",
}

zongshi:addEffect(fk.PindianResultConfirmed, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(zongshi.name) then
      local card = nil
      if data.winner and data.winner == player then
        if data.from == player then
          card = data.toCard
        else
          card = data.fromCard
        end
      else
        if data.from == player then
          card = data.fromCard
        elseif data.to == player then
          card = data.toCard
        end
      end
      if card and player.room:getCardArea(card) == Card.Processing then
        event:setCostData(self, { extra_data = card })
        return true
      end
    end
  end,
  on_cost = function(self, event, target, player, data)
    local prompt
    if data.winner and data.winner == player then
      prompt = "#zongshij1-get:::"
    else
      prompt = "#zongshij2-get:::"
    end
    return player.room:askToSkillInvoke(player, {
      skill_name = zongshi.name,
      prompt = prompt..event:getCostData(self).extra_data:toLogString(),
    })
  end,
  on_use = function(self, event, target, player, data)
    player.room:obtainCard(player, event:getCostData(self).extra_data, true, fk.ReasonJustMove, player, zongshi.name)
  end,
})

return zongshi
