local bashi = fk.CreateSkill {
  name = "re__bashi",
  tags = { Skill.Lord },
}

Fk:loadTranslationTable{
  ["re__bashi"] = "霸世",
  [":re__bashi"] = "主公技，每回合限四次，当你需要打出【杀】或【闪】时，你可以令其他吴势力角色各选择是否代替你打出。",
}

bashi:addEffect(fk.AskForCardResponse, {
  anim_type = "defensive",
  times = function(self, player)
    return 4 - player:usedSkillTimes(bashi.name, Player.HistoryTurn)
  end,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(bashi.name) and
      Exppattern:Parse(data.pattern):matchExp("slash,jink") and
      player:usedSkillTimes(bashi.name, Player.HistoryTurn) < 4 and
      (data.extraData == nil or data.extraData.bashi_ask == nil) and
      not table.every(player.room.alive_players, function(p)
        return p == player or p.kingdom ~= "wu"
      end)
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = bashi.name,
      prompt = "#bashi-invoke",
    })
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local choices = {}
    for _, name in ipairs({"slash", "jink"}) do
      local card = Fk:cloneCard(name)
      if Exppattern:Parse(data.pattern):match(card) then
        table.insert(choices, name)
      end
    end
    local name = room:askToChoice(player, {
      choices = choices,
      skill_name = bashi.name,
      prompt = "#bashi-choice",
    })
    for _, p in ipairs(room:getOtherPlayers(player)) do
      if p.kingdom == "wu" and p:isAlive() then
        local params = { ---@type AskToUseCardParams
          skill_name = name,
          pattern = name,
          prompt = "#bashi-ask:" .. player.id,
          cancelable = true,
          extra_data = {bashi_ask = true}
        }
        local respond = room:askToResponse(p, params)
        if respond then
          respond.skipDrop = true
          room:responseCard(respond)

          local new_card = Fk:cloneCard(name)
          new_card.skillName = bashi.name
          new_card:addSubcards(room:getSubcardsByRule(respond.card, { Card.Processing }))
          data.result = {
            from = player,
            card = new_card,
          }
          return true
        end
      end
    end
  end,
})

return bashi
