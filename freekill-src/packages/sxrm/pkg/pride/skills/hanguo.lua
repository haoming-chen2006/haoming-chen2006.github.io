local hanguo = fk.CreateSkill {
  name = "hanguo",
}

Fk:loadTranslationTable{
  ["hanguo"] = "撼国",
  [":hanguo"] = "每轮开始时，你可以选择一名你上轮未以此法选择过的其他角色，将其所有牌扣置于其武将牌上直到本轮结束，本轮内：" ..
  "当你对其使用的【杀】对其造成伤害后，其死亡；其可以发动无势力限制的“<a href=':hujia'>护驾</a>”且响应的角色获得你一张牌。",

  ["#hanguo-choose"] = "撼国：你可选择一名角色，本轮扣置其所有牌，且令其本轮具有特殊效果",
  ["$hanguo"] = "撼国",
}

hanguo:addEffect(fk.RoundStart, {
  can_trigger = function(self, event, target, player, data)
    return
      player:hasSkill(hanguo.name) and
      table.find(player.room.alive_players, function(p)
        return p ~= player and player:getMark("hanguo_targeted-round") ~= p.id
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room

    local targets = table.filter(room.alive_players, function(p)
      return p ~= player and player:getMark("hanguo_targeted-round") ~= p.id
    end)

    if #targets == 0 then
      return false
    end

    local tos = room:askToChoosePlayers(
      player,
      {
        min_num = 1,
        max_num = 1,
        targets = targets,
        skill_name = hanguo.name,
        prompt = "#hanguo-choose",
      }
    )

    if #tos > 0 then
      room:setPlayerMark(player, "hanguo_targeted", tos[1].id)
      event:setCostData(self, { tos = tos })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]

    if to:isAlive() and not to:isNude() then
      to:addToPile("$hanguo", to:getCardIds("he"), false, hanguo.name, player)
    end

    room:setPlayerMark(player, "hanguo_target-round", to.id)
  end,

  can_refresh = function(self, event, target, player, data)
    return player:getMark("hanguo_targeted") ~= 0
  end,
  on_refresh = function(self, event, target, player, data)
    local room = player.room
    room:setPlayerMark(player, "hanguo_targeted-round", player:getMark("hanguo_targeted"))
    room:setPlayerMark(player, "hanguo_targeted", 0)
  end,
})

hanguo:addEffect(fk.RoundEnd, {
  mute = true,
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return #player:getPile("$hanguo") > 0
  end,
  on_use = function(self, event, target, player, data)
    player.room:obtainCard(player, player:getPile("$hanguo"), false, fk.ReasonPrey, player, hanguo.name)
  end,
})

hanguo:addEffect(fk.Damage, {
  anim_type = "offensive",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    if
      not (
        target == player and
        data.card and
        data.card.trueName == "slash" and
        data.to:isAlive() and
        player:getMark("hanguo_target-round") == data.to.id
      )
    then
      return false
    end

    local use = player.room.logic:getCurrentEvent():findParent(GameEvent.UseCard)
    return use and use.data.from == player and table.contains(use.data.tos, data.to)
  end,
  on_use = function(self, event, target, player, data)
    player.room:killPlayer{ who = data.to }
  end,
})

local spec = {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      table.find(player.room.alive_players, function(p)
        return p:getMark("hanguo_target-round") == player.id
      end) and
      Exppattern:Parse(data.pattern):matchExp("jink") and
      (data.extraData == nil or data.extraData.hujia_ask == nil)
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    for _, p in ipairs(room:getOtherPlayers(player)) do
      if p:isAlive() then
        local params = { ---@type AskToUseCardParams
          skill_name = "jink",
          pattern = "jink",
          prompt = "#hujia-ask:" .. player.id,
          cancelable = true,
          extra_data = { hujia_ask = true }
        }
        local respond = room:askToResponse(p, params)
        if respond then
          respond.skipDrop = true
          room:responseCard(respond)

          for _, source in ipairs(room:getAlivePlayers()) do
            if source:isAlive() and source:getMark("hanguo_target-round") == player.id then
              local toObtain
              if source == p then
                if #source:getCardIds("e") > 0 then
                  toObtain = room:askToChooseCard(
                    p,
                    {
                      target = source,
                      flag = "e",
                      skill_name = "hujia",
                    }
                  )
                end
              elseif not source:isNude() then
                room:doIndicate(p, { source })
                toObtain = room:askToChooseCard(
                  p,
                  {
                    target = source,
                    flag = "he",
                    skill_name = "hujia",
                  }
                )
              end

              if toObtain then
                room:obtainCard(p, toObtain, false, fk.ReasonPrey, p, "hujia")
              end
            end
          end

          local new_card = Fk:cloneCard("jink")
          new_card.skillName = "hujia"
          new_card:addSubcards(room:getSubcardsByRule(respond.card, { Card.Processing }))
          local result = {
            from = player,
            card = new_card,
          }
          if event == fk.AskForCardUse then
            result.tos = {}
          end
          data.result = result
          return true
        end
      end
    end
  end,
}

hanguo:addEffect(fk.AskForCardUse, spec)
hanguo:addEffect(fk.AskForCardResponse, spec)

return hanguo
