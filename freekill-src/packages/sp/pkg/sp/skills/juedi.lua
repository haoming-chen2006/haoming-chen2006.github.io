local juedi = fk.CreateSkill {
  name = "juedi",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["juedi"] = "绝地",
  [":juedi"] = "锁定技，准备阶段，你选择一项：1.移去“引兵”牌，然后将手牌摸至体力上限；2.令一名体力值不大于你的其他角色获得“引兵”牌，"..
  "然后回复1点体力并摸等量的牌。",

  ["#juedi-choose"] = "绝地：令一名其他角色获得“引兵”牌、回复体力并摸等量的牌，或点“取消”移去“引兵”牌令自己摸牌",

  ["$juedi1"] = "困兽之斗，以全忠义！",
  ["$juedi2"] = "提起武器，最后一搏！"
}

juedi:addEffect(fk.EventPhaseStart, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(juedi.name) and player.phase == Player.Start and
      #player:getPile("$yinbing") > 0
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room:getOtherPlayers(player, false), function(p)
      return p.hp <= player.hp
    end)
    if #targets == 0 then
      room:moveCardTo(player:getPile("$yinbing"), Card.DiscardPile, nil, fk.ReasonPutIntoDiscardPile, juedi.name, nil, true, player)
      local x = player.maxHp - player:getHandcardNum()
      if x > 0 and not player.dead then
        player:drawCards(x, juedi.name)
      end
      return
    end
    local to = room:askToChoosePlayers(player, {
      min_num = 1,
      max_num = 1,
      targets = targets,
      prompt = "#juedi-choose",
      skill_name = juedi.name,
      cancelable = true,
    })
    if #to > 0 then
      to = to[1]
      local x = #player:getPile("$yinbing")
      room:moveCardTo(player:getPile("$yinbing"), Card.PlayerHand, to, fk.ReasonJustMove, juedi.name, nil, true, player)
      if not to.dead and to:isWounded() then
        room:recover{
          who = to,
          num = 1,
          recoverBy = player,
          skillName = juedi.name,
        }
      end
      if not to.dead then
        to:drawCards(x, juedi.name)
      end
    else
      room:moveCardTo(player:getPile("$yinbing"), Card.DiscardPile, nil, fk.ReasonPutIntoDiscardPile, juedi.name, nil, true, player)
      local x = player.maxHp - player:getHandcardNum()
      if x > 0 and not player.dead then
        player:drawCards(x, juedi.name)
      end
    end
  end,
})

return juedi
