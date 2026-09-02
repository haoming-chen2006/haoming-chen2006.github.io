local xiuluo = fk.CreateSkill {
  name = "xiuluo",
}

Fk:loadTranslationTable {
  ["xiuluo"] = "修罗",
  [":xiuluo"] = "准备阶段，你可以弃置与你判定区内一张牌花色相同的一张手牌，弃置你判定区内的此牌且你可以重复此流程。",

  ["#xiuluo-invoke"] = "修罗：你可以弃一张花色相同的手牌，弃置你判定区里的一张延时锦囊",

  ["$xiuluo1"] = "准备受死吧！",
  ["$xiuluo2"] = "鼠辈，螳臂当车！",
}

xiuluo:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(xiuluo.name) and player.phase == Player.Start and
      #player:getCardIds("j") > 0 and not player:isKongcheng()
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local pattern = ".|.|" .. table.concat(table.map(player:getCardIds("j"), function(id)
      return Fk:getCardById(id, true):getSuitString()
    end), ",")
    local card = room:askToDiscard(player, {
      min_num = 1,
      max_num = 1,
      pattern = pattern,
      skill_name = xiuluo.name,
      prompt = "#xiuluo-invoke",
      skip = true,
    })
    if #card > 0 then
      event:setCostData(self, {cards = card})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local suit = Fk:getCardById(event:getCostData(self).cards[1], true).suit
    room:throwCard(event:getCostData(self).cards, xiuluo.name, player, player)
    if player.dead or #player:getCardIds("j") == 0 then return end
    local cards = table.filter(player:getCardIds("j"), function(id)
      return Fk:getCardById(id, true).suit == suit
    end)
    if #cards == 0 then return false end
    local cid = room:askToChooseCard(player, {
      target = player,
      flag = { card_data = { { "$Judge", cards } } },
      skill_name = xiuluo.name
    })
    room:throwCard(cid, xiuluo.name, player, player)
    while #player:getCardIds("j") > 0 and not player:isKongcheng() and not player.dead do
      local pattern = ".|.|" .. table.concat(table.map(player:getCardIds("j"), function(id)
        return Fk:getCardById(id, true):getSuitString()
      end), ",")
      local card = room:askToDiscard(player, {
        min_num = 1,
        max_num = 1,
        pattern = pattern,
        skill_name = xiuluo.name,
        prompt = "#xiuluo-invoke",
        skip = true,
      })
      if #card == 0 then break end
      suit = Fk:getCardById(card[1], true).suit
      cards = table.filter(player:getCardIds("j"), function(id)
        return Fk:getCardById(id, true).suit == suit
      end)
      if #cards > 0 then
        cid = room:askToChooseCard(player, {
          target = player,
          flag = { card_data = { { "$Judge", cards } } },
          skill_name = xiuluo.name
        })
        room:throwCard(cid, xiuluo.name, player, player)
      end
    end
  end
})

return xiuluo
