local dangren = fk.CreateSkill {
  name = "dangren",
  tags = { Skill.Switch },
}

Fk:loadTranslationTable{
  ["dangren"] = "当仁",
  [":dangren"] = "转换技，阳：当你需要对你使用【桃】时，你可以视为使用之；阴：当你需要对其他角色使用【桃】时，你须视为使用之。",

  ["#dangren"] = "当仁：你可以视为对自己使用【桃】",
}

dangren:addEffect("viewas", {
  anim_type = "support",
  pattern = "peach",
  prompt = "#dangren",
  card_filter = Util.FalseFunc,
  view_as = function(self, player, cards)
    if #cards ~= 0 then return end
    local c = Fk:cloneCard("peach")
    c.skillName = dangren.name
    return c
  end,
  enabled_at_play = function(self, player)
    return player:getSwitchSkillState(dangren.name) == fk.SwitchYang
  end,
  enabled_at_response = function(self, player, response)
    return not response and
      player:getSwitchSkillState(dangren.name) == fk.SwitchYang and
      not table.find(Fk:currentRoom().alive_players, function(p)
        return p ~= player and p.dying
      end)
  end,
})

dangren:addEffect(fk.AskForCardUse, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(dangren.name) and
      player:getSwitchSkillState(dangren.name) == fk.SwitchYin and data.pattern then
      local matcherParsed = Exppattern:Parse(data.pattern)
      local peach = Fk:cloneCard("peach")
      return table.find(matcherParsed.matchers, function(matcher)
          return table.contains(matcher.name or {}, "peach") or table.contains(matcher.trueName or {}, "peach")
        end) and
        matcherParsed:match(peach) and data.extraData and data.extraData.must_targets and
        table.find(data.extraData.must_targets, function(id)
          return id ~= player.id and not (player:prohibitUse(peach) and player:isProhibited(player.room:getPlayerById(id), peach))
        end)
    end
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local peach = Fk:cloneCard("peach")
    local others = table.filter(data.extraData.must_targets, function(id)
      return id ~= player.id and not (player:prohibitUse(peach) and player:isProhibited(player.room:getPlayerById(id), peach))
    end)
    if #others > 0 then
      others = table.map(others, Util.Id2PlayerMapper)
      room:sortByAction(others)
      data.result = {
        from = player,
        to = others[1],
        card = peach,
      }
      return true
    end
  end,
})

return dangren
