local lijun = fk.CreateSkill {
  name = "lijun",
  tags = {Skill.Lord},
}

Fk:loadTranslationTable{
  ["lijun"] = "立军",
  [":lijun"] = "主公技，其他吴势力角色于其出牌阶段使用【杀】结算结束后，其可以将此【杀】交给你，然后你可以令其摸一张牌。",

  ["#lijun-invoke"] = "立军：你可以将此【杀】交给 %src，然后其可令你摸一张牌",
  ["#lijun-draw"] = "立军：你可以令 %src 摸一张牌",

  ["$lijun1"] = "立于朝堂，定于军心。",
  ["$lijun2"] = "君立于朝堂，军侧于四方！",
}

lijun:addEffect(fk.CardUseFinished, {
  can_trigger = function(self, event, target, player, data)
    return target ~= player and player:hasSkill(lijun.name) and
      target.kingdom == "wu" and data.card.trueName == "slash" and target.phase == Player.Play and
      player.room:getCardArea(data.card) == Card.Processing
  end,
  on_cost = function (self, event, target, player, data)
    return player.room:askToSkillInvoke(target, {
      skill_name = lijun.name,
      prompt = "#lijun-invoke:"..player.id,
    })
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:obtainCard(player, data.card, true, fk.ReasonJustMove, player, lijun.name)
    if not player.dead and not target.dead and
      room:askToSkillInvoke(player,{
      skill_name = lijun.name,
      prompt = "#lijun-draw:"..target.id,
    }) then
      target:drawCards(1, lijun.name)
    end
  end,
})

return lijun
