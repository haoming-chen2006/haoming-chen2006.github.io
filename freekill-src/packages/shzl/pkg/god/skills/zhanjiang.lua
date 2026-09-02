local zhanjiang = fk.CreateSkill {
  name = "zhanjiang",
}

Fk:loadTranslationTable{
  ["zhanjiang"] = "斩将",
  [":zhanjiang"] = "准备阶段，若场上有【青釭剑】，你可以获得之。",

  ["#zhanjiang-invoke"] = "龙魂：你可以夺走场上的【青釭剑】！",
}

zhanjiang:addEffect(fk.EventPhaseStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zhanjiang.name) and player.phase == Player.Start and
      table.find(player.room.alive_players, function (p)
        return table.find(p:getCardIds("ej"), function (id)
          return Fk:getCardById(id).name == "qinggang_sword"
        end) ~= nil
      end)
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = zhanjiang.name,
      prompt = "#zhanjiang-invoke",
    })
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local moves = {}
    for _, p in ipairs(room:getAlivePlayers()) do
      local cards = table.filter(p:getCardIds("ej"), function (id)
        return Fk:getCardById(id).name == "qinggang_sword"
      end)
      if #cards > 0 then
        table.insert(moves, {
          ids = cards,
          from = p,
          to = player,
          toArea = Card.PlayerHand,
          moveReason = fk.ReasonPrey,
          moveVisible = true,
          skillName = zhanjiang.name,
        })
      end
    end
    room:moveCards(table.unpack(moves))
  end,
})

zhanjiang:addAI(Fk.Ltk.AI.newInvokeStrategy{
  think = function(self, ai)
    local player = ai.player
    local ids = {}
    for _, p in ipairs(Fk:currentRoom().alive_players) do
      local cards = table.filter(p:getCardIds("ej"), function (id)
        return Fk:getCardById(id).name == "qinggang_sword"
      end)
      if #cards > 0 then
        table.insertTable(ids, cards)
      end
    end
    return ai:getBenefitOfEvents(function(logic)
      logic:obtainCard(player, ids, false, fk.ReasonPrey, player, zhanjiang.name)
    end) > 0
  end,
})

return zhanjiang
