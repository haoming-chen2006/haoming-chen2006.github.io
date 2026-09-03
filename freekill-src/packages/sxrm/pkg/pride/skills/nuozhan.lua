local nuozhan = fk.CreateSkill {
  name = "nuozhan",
}

Fk:loadTranslationTable{
  ["nuozhan"] = "搦战",
  [":nuozhan"] = "准备阶段开始时，你可以摸一张牌令一名其他角色声明一种伤害类牌，然后你选择你或其视为对对方使用此牌且伤害+1，" ..
  "若未对目标造成伤害，则使用者失去1点体力，然后你可对相同角色重复此流程。",

  ["#nuozhan-choose"] = "搦战：你可令一名其他角色声明伤害类牌，然后视为你或其对对方使用此牌",
  ["#nuozhan-choice"] = "搦战：请选择一种牌名，%src 将令其或你视为对对方使用此牌",
  ["nuozhan_to_target"] = "视为你对%dest使用%arg",
  ["nuozhan_to_you"] = "视为%dest对你使用%arg",
  ["#nuozhan-repeat"] = "搦战：你可以摸一张牌并令 %dest 声明一种伤害类牌",
}

nuozhan:addEffect(fk.EventPhaseStart, {
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      player.phase == Player.Start and
      player:hasSkill(nuozhan.name) and
      table.find(player.room.alive_players, function(p) return p ~= player end)
  end,
  on_cost = function(self, event, target, player, data)
    local tos = player.room:askToChoosePlayers(
      player,
      {
        min_num = 1,
        max_num = 1,
        targets = player.room:getOtherPlayers(player, false),
        skill_name = nuozhan.name,
        prompt = "#nuozhan-choose",
      }
    )

    if #tos > 0 then
      event:setCostData(self, { tos = tos })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = nuozhan.name
    local room = player.room
    local to = event:getCostData(self).tos[1]

    local choices = table.filter(Fk:getAllCardNames("bt"), function(name)
      return Fk:cloneCard(name).is_damage_card
    end)
    while true do
      player:drawCards(1, skillName)

      if not (player:isAlive() and to:isAlive()) then
        break
      end

      local cardName = room:askToChoice(
        to,
        {
          choices = choices,
          prompt = "#nuozhan-choice:" .. player.id,
          skill_name = skillName,
        }
      )

      local choice = room:askToChoice(
        player,
        {
          choices = {
            "nuozhan_to_target::" .. to.id .. ":" .. cardName,
            "nuozhan_to_you::" .. to.id.. ":" .. cardName
          },
          skill_name = skillName,
        }
      )

      local user = choice:startsWith("nuozhan_to_target") and player or to
      local toPlayer = choice:startsWith("nuozhan_to_target")  and to or player
      local card = Fk:cloneCard(cardName)
      if not user:canUseTo(card, toPlayer, { bypass_times = true, bypass_distances = true }) then
        break
      end

      local use = {
        from = user,
        tos = { toPlayer },
        card = card,
        additionalDamage = 1,
      }
      room:useCard(use)

      if not player:isAlive() then
        break
      end

      if use.damageDealt and use.damageDealt[toPlayer] then
        break
      end

      room:loseHp(user, 1)

      if
        not (
          player:isAlive() and
          room:askToSkillInvoke(player, { skill_name = skillName, prompt = "#nuozhan-repeat::" .. to.id })
        )
      then
        break
      end
    end
  end,
})

return nuozhan
