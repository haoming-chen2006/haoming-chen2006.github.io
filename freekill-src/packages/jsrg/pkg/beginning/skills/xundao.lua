local xundao = fk.CreateSkill {
  name = "xundao",
}

Fk:loadTranslationTable{
  ["xundao"] = "寻道",
  [":xundao"] = "当你的判定牌生效前，你可以令至多两名角色各弃置一张牌，你选择其中一张代替判定牌。",

  ["#xundao-choose"] = "寻道：你可以令至多两名角色各弃置一张牌，然后选择其中一张修改你的“%arg”判定",
  ["#xundao-discard"] = "寻道：请弃置一张牌，%src 可以用之修改判定",
  ["#xundao-retrial"] = "寻道：选择用来修改判定的牌",
}

xundao:addEffect(fk.AskForRetrial, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(xundao.name) and
      table.find(player.room.alive_players, function(p)
        return not p:isNude()
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room.alive_players, function(p)
      return not p:isNude()
    end)
    if table.contains(targets, player) and
      not table.find(player:getCardIds("he"), function (id)
        return not player:prohibitDiscard(id)
      end) then
      table.removeOne(targets, player)
    end
    if #targets == 0 then
      room:askToCards(player, {
        min_num = 1,
        max_num = 1,
        include_equip = false,
        skill_name = xundao.name,
        pattern = "false",
        prompt = "#xundao-choose:::"..data.reason,
        cancelable = true,
      })
    else
      local to = room:askToChoosePlayers(player, {
        min_num = 1,
        max_num = 2,
        targets = targets,
        skill_name = xundao.name,
        prompt = "#xundao-choose:::"..data.reason,
        cancelable = true,
      })
      if #to > 0 then
        event:setCostData(self, {tos = to})
        return true
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:sortByAction(event:getCostData(self).tos)
    local ids = {}
    for _, p in ipairs(event:getCostData(self).tos) do
      if not p.dead and not p:isNude() then
        local card = room:askToDiscard(p, {
          min_num = 1,
          max_num = 1,
          include_equip = true,
          skill_name = xundao.name,
          cancelable = false,
          prompt = "#xundao-discard:"..player.id,
        })
        if #card > 0 then
          table.insertIfNeed(ids, card[1])
        end
      end
    end
    if player.dead then return end
    ids = table.filter(ids, function (id)
      return table.contains(room.discard_pile, id)
    end)
    if #ids == 0 then return end
    local cards = room:askToCards(player, {
      min_num = 1,
      max_num = 1,
      include_equip = false,
      skill_name = xundao.name,
      pattern = tostring(Exppattern{ id = ids }),
      prompt = "#xundao-retrial",
      cancelable = false,
      expand_pile = ids,
    })
    room:changeJudge{
      card = Fk:getCardById(cards[1]),
      player = player,
      data = data,
      skillName = xundao.name,
    }
  end,
})

return xundao
