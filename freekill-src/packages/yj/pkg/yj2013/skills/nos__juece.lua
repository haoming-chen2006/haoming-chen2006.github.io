local juece = fk.CreateSkill {
  name = "nos__juece",
}

Fk:loadTranslationTable{
  ["nos__juece"] = "绝策",
  [":nos__juece"] = "你的回合内，当一名角色失去最后的手牌后，你可以对其造成1点伤害。",

  ["#nos__juece-invoke"] = "绝策：你可以对 %dest 造成1点伤害",

  ["$nos__juece1"] = "我，最喜欢落井下石。",
  ["$nos__juece2"] = "一无所有？那就拿命来填！",
}

juece:addEffect(fk.AfterCardsMove, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(juece.name) and player.room.current == player then
      for _, move in ipairs(data) do
        if move.from and move.from:isKongcheng() and not move.from.dead then
          for _, info in ipairs(move.moveInfo) do
            if info.fromArea == Card.PlayerHand then
              return true
            end
          end
        end
      end
    end
  end,
  on_trigger = function(self, event, target, player, data)
    local targets = {}
    for _, move in ipairs(data) do
      if move.from and move.from:isKongcheng() and not move.from.dead then
        for _, info in ipairs(move.moveInfo) do
          if info.fromArea == Card.PlayerHand then
            table.insertIfNeed(targets, move.from)
          end
        end
      end
    end
    player.room:sortByAction(targets)
    for _, p in ipairs(targets) do
      if not player:hasSkill(juece.name) then return end
      if not p.dead then
        event:setCostData(self, {tos = {p}})
        self:doCost(event, target, player, targets)
      end
    end
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    if room:askToSkillInvoke(player, {
      skill_name = juece.name,
      prompt = "#nos__juece-invoke::"..to.id,
    }) then
      event:setCostData(self, {tos = {to}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    player.room:damage{
      from = player,
      to = event:getCostData(self).tos[1],
      damage = 1,
      skill_name = juece.name,
    }
  end,
})

return juece
