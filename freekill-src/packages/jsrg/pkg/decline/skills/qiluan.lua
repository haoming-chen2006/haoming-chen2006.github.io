local qiluan = fk.CreateSkill {
  name = "js__qiluan",
}

Fk:loadTranslationTable{
  ["js__qiluan"] = "起乱",
  [":js__qiluan"] = "每回合限两次，当你需要使用【杀】或【闪】时，你可以弃置至少一张牌并令至多等量名其他角色选择是否替你使用之。"..
  "当有角色响应时，你摸等同于弃置的牌数。",

  ["#js__qiluan"] = "起乱：声明视为使用【杀】的目标，然后弃任意牌令等量角色选择是否替你出【杀】，若有响应则摸等量牌",
  ["#js__qiluan-use"] = "起乱：弃置任意张牌并选择等量角色，令其选择是否替你出【%arg】，若有响应则摸等量牌",
  ["#js__qiluan-ask"] = "起乱：你可以替 %src 打出一张【%arg】",
}

qiluan:addEffect("viewas", {
  anim_type = "offensive",
  pattern = "slash",
  prompt = "#js__qiluan",
  times = function(self, player)
    return 2 - player:usedSkillTimes(qiluan.name, Player.HistoryTurn)
  end,
  card_filter = Util.FalseFunc,
  view_as = function(self, player, cards)
    if #cards ~= 0 then return end
    local c = Fk:cloneCard("slash")
    c.skillName = qiluan.name
    return c
  end,
  before_use = function(self, player, use)
    local room = player.room
    room:playCardEmotionAndSound(player, use.card)
    if #use.tos > 0 and not use.noIndicate then
      room:doIndicate(player, use.tos)
    end

    local success, dat = room:askToUseActiveSkill(player, {
      skill_name = "js__qiluan_active",
      prompt = "#js__qiluan-use:::slash",
      cancelable = false,
    })
    if not (success and dat) then return " " end
    room:throwCard(dat.cards, qiluan.name, player, player)
    room:sortByAction(dat.targets)
    for _, p in ipairs(dat.targets) do
      local respond = room:askToResponse(p, {
        skill_name = qiluan.name,
        pattern = "slash",
        prompt = "#js__qiluan-ask:"..player.id.."::slash",
        cancelable = true,
      })
      if respond then
        respond.skipDrop = true
        room:responseCard(respond)
        use.card = respond.card
        if not player.dead then
          player:drawCards(#dat.cards, qiluan.name)
        end
        return
      end
    end
    return qiluan.name
  end,
  enabled_at_play = function(self, player)
    return player:usedSkillTimes(qiluan.name, Player.HistoryTurn) < 2 and
      table.find(player:getCardIds("he"), function(id)
        return not player:prohibitDiscard(Fk:getCardById(id))
      end) and
      #Fk:currentRoom().alive_players > 1
  end,
  enabled_at_response = function(self, player, response)
    return not response and
      player:usedSkillTimes(qiluan.name, Player.HistoryTurn) < 2 and
      table.find(player:getCardIds("he"), function(id)
        return not player:prohibitDiscard(Fk:getCardById(id))
      end) and
      #Fk:currentRoom().alive_players > 1
  end,
})

qiluan:addEffect(fk.AskForCardUse, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(qiluan.name) and
      player:usedSkillTimes(qiluan.name, Player.HistoryTurn) < 2 and
      Exppattern:Parse(data.pattern):matchExp("jink") and
      (data.extraData == nil or (data.extraData.js__qiluan_ask == nil and data.extraData.not_passive ~=true))
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local success, dat = room:askToUseActiveSkill(player, {
      skill_name = "js__qiluan_active",
      prompt = "#js__qiluan-use:::jink",
      cancelable = true,
    })
    if success and dat then
      room:sortByAction(dat.targets)
      event:setCostData(self, {tos = dat.targets, cards = dat.cards})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:throwCard(event:getCostData(self).cards, qiluan.name, player, player)
    for _, p in ipairs(event:getCostData(self).tos) do
      if not p.dead then
        local params = { ---@type AskToUseCardParams
          skill_name = "jink",
          pattern = "jink",
          prompt = "#js__qiluan-ask:"..player.id.."::jink",
          cancelable = true,
          extra_data = {js__qiluan_ask = true}
        }
        local respond = room:askToResponse(p, params)
        if respond then
          respond.skipDrop = true
          room:responseCard(respond)

          if not player.dead then
            player:drawCards(#event:getCostData(self).cards, qiluan.name)
          end

          local new_card = Fk:cloneCard("jink")
          new_card.skillName = qiluan.name
          new_card:addSubcards(room:getSubcardsByRule(respond.card, { Card.Processing }))
          data.result = {
            from = player,
            card = new_card,
            tos = {},
          }
          return true
        end
      end
    end
  end,
})

return qiluan
