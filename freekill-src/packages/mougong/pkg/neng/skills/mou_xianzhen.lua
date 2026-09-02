local mouXianzhen = fk.CreateSkill({
  name = "mou__xianzhen",
})

Fk:loadTranslationTable{
  ["mou__xianzhen"] = "陷阵",
  [":mou__xianzhen"] = "出牌阶段限一次，你可以选择一名其他角色（若为身份模式，则改为一名体力值小于你的其他角色）。" ..
  "本阶段内你对其使用牌无距离限制，且当你使用【杀】指定其为目标后，你可以与其拼点。若你赢，则你对其造成1点伤害（每回合限一次），" ..
  "然后此【杀】无视防具、不计入次数；若其拼点牌为【杀】，则你获得之。",
  ["#mou__xianzhen_pindian"] = "陷阵",
  ["@@mou__xianzhen-phase"] = "被陷阵",
  ["#mou__xianzhen-pindian"] = "陷阵：你可与 %dest 拼点，若你赢则对其造成1点伤害（限一次）且此杀无视防具不计次数",

  ["$mou__xianzhen1"] = "陷阵营中，皆是以一敌百之士！",
  ["$mou__xianzhen2"] = "军令既出，使命必完！",
}

mouXianzhen:addEffect("active", {
  anim_type = "offensive",
  card_num = 0,
  target_num = 1,
  can_use = function(self, player)
    return player:usedSkillTimes(mouXianzhen.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return
      #selected == 0 and
      to_select ~= player and
      not (
        Fk:currentRoom():isGameMode("role_mode") and
        to_select.hp >= player.hp
      )
  end,
  on_use = function(self, room, effect)
    room:setPlayerMark(effect.tos[1], "@@mou__xianzhen-phase", effect.from.id)
  end
})

mouXianzhen:addEffect("targetmod", {
  bypass_distances = function (self, player, skill, card, to)
    return to:getMark("@@mou__xianzhen-phase") == player.id
  end
})

mouXianzhen:addEffect(fk.TargetSpecified, {
  is_delay_effect = true,
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    if not (target == player and data.card.trueName == "slash") then
      return false
    end

    local to = data.to
    return to:getMark("@@mou__xianzhen-phase") == player.id and player:canPindian(to)
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, { skill_name = mouXianzhen.name, prompt = "#mou__xianzhen-pindian::" .. data.to.id })
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouXianzhen.name
    local room = player.room
    local to = data.to
    local pindian = player:pindian({ to }, skillName)

    if pindian.results[to].winner == player then
      if player:getMark("mou__xianzhen_damaged-turn") < 1 then
        room:addPlayerMark(player, "mou__xianzhen_damaged-turn")

        room:damage{
          from = player,
          to = to,
          damage = 1,
          skillName = skillName,
        }
      end

      if not data.use.extraUse then
        data.use.extraUse = true
        player:addCardUseHistory(data.card.trueName, -1)
      end

      local cardEvent = room.logic:getCurrentEvent():findParent(GameEvent.UseCard)
      if not cardEvent then return false end

      for _, p in ipairs(data.use.tos) do
        p:addQinggangTag(data)
      end

      local pindianCard = pindian.results[to].toCard
      if player:isAlive() and pindianCard and pindianCard.trueName == "slash" and room:getCardArea(pindianCard) == Card.DiscardPile then
        room:obtainCard(player, pindianCard, true, fk.ReasonPrey, player)
      end
    end
  end,
})

return mouXianzhen
