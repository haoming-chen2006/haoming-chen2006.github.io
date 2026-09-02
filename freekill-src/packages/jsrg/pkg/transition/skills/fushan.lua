local fushan = fk.CreateSkill {
  name = "fushan",
}

Fk:loadTranslationTable {
  ["fushan"] = "负山",
  [":fushan"] = "出牌阶段开始时，所有其他角色依次可以交给你一张牌并令你本阶段使用【杀】的次数上限+1；此阶段结束时，若你使用【杀】的次数" ..
      "未达上限且本阶段以此法交给你牌的角色均存活，你失去2点体力，否则你将手牌摸至体力上限。",

  ["#fushan-give"] = "负山：是否交给 %src 一张牌令其本阶段使用【杀】次数上限+1？",
}

fushan:addEffect(fk.EventPhaseStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(fushan.name) and player.phase == Player.Play and
        table.find(player.room:getOtherPlayers(player, false), function(p)
          return not p:isNude()
        end)
  end,
  on_cost = function(self, event, target, player, data)
    event:setCostData(self, { tos = player.room:getOtherPlayers(player) })
    return true
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local mark = {}
    for _, p in ipairs(room:getOtherPlayers(player)) do
      if player.dead then return end
      if not p.dead and not p:isNude() then
        local cards = room:askToCards(p, {
          min_num = 1,
          max_num = 1,
          include_equip = true,
          skill_name = fushan.name,
          cancelable = true,
          prompt = "#fushan-give:" .. player.id,
        })
        if #cards > 0 then
          room:addPlayerMark(player, MarkEnum.SlashResidue .. "-phase", 1)
          room:moveCardTo(cards, Card.PlayerHand, player, fk.ReasonGive, fushan.name, nil, false, p)
          table.insert(mark, p.id)
        end
      end
    end
    if #mark > 0 and not player.dead then
      room:setPlayerMark(player, "fushan-phase", mark)
    end
  end,
})

fushan:addEffect(fk.EventPhaseEnd, {
  mute = true,
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    if target == player and player.phase == Player.Play and player:hasSkill(fushan.name) then
      local card = Fk:cloneCard("slash")
      local skill = card.skill
      local n = skill:getMaxUseTime(player, Player.HistoryPhase, card, nil)
      if not n or player:usedCardTimes("slash", Player.HistoryPhase) < n and player:getMark("fushan-phase") ~= 0
          and table.every(player:getMark("fushan-phase"), function(id)
            return not player.room:getPlayerById(id).dead
          end) then
        return true
      else
        return player:getHandcardNum() < player.maxHp
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    player:broadcastSkillInvoke(fushan.name)
    local card = Fk:cloneCard("slash")
    local skill = card.skill
    local n = skill:getMaxUseTime(player, Player.HistoryPhase, card, nil)
    if not n or player:usedCardTimes("slash", Player.HistoryPhase) < n and player:getMark("fushan-phase") ~= 0
        and table.every(player:getMark("fushan-phase"), function(id)
          return not room:getPlayerById(id).dead
        end) then
      room:notifySkillInvoked(player, fushan.name, "negative")
      room:loseHp(player, 2, fushan.name)
    else
      room:notifySkillInvoked(player, fushan.name, "drawcard")
      player:drawCards(player.maxHp - player:getHandcardNum(), fushan.name)
    end
  end,
})

return fushan
