
local funan = fk.CreateSkill {
  name = "funan",
  dynamic_desc = function (self, player)
    if player:getMark("funan_update") > 0 then
      return "funan_update"
    end
  end
}

Fk:loadTranslationTable{
  ["funan"] = "复难",
  [":funan"] = "其他角色使用或打出牌响应你使用的牌时，你可以令其获得你使用的牌（其本回合不能使用或打出这张牌），然后你获得其使用或打出的牌。",

  [":funan_update"] = "其他角色使用或打出牌响应你使用的牌时，你可以获得其使用或打出的牌。",

  ["#funan-invoke"] = "复难：你可以令 %dest 获得你使用的%arg，你获得其使用的%arg2",
  ["#funan2-invoke"] = "复难：你可以获得 %dest 使用的%arg",
  ["@@funan-inhand-turn"] = "复难",

  ["$funan1"] = "礼尚往来，乃君子风范。",
  ["$funan2"] = "以子之矛，攻子之盾。",
}

local spec = {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(funan.name) and target ~= player and
      data.responseToEvent and data.responseToEvent.from == player and
      data.responseToEvent.card then
      if player:getMark("funan_update") == 0 then
        return player.room:getCardArea(data.responseToEvent.card) == Card.Processing
      else
        return player.room:getCardArea(data.card) == Card.Processing
      end
    end
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if player:getMark("funan_update") == 0 then
      if room:askToSkillInvoke(player, {
        skill_name = funan.name,
        prompt = "#funan-invoke::"..target.id..":"..data.responseToEvent.card:toLogString()..":"..data.card:toLogString(),
      }) then
        event:setCostData(self, {tos = {target}})
        return true
      end
    else
      return room:askToSkillInvoke(player, {
        skill_name = funan.name,
        prompt = "#funan2-invoke::"..target.id..":"..data.responseToEvent.card:toLogString(),
      })
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    if player:getMark("funan_update") == 0 then
      local card = data.responseToEvent.card
      room:obtainCard(target, card, false, fk.ReasonJustMove, target, funan.name, "@@funan-inhand-turn")
    end
    if room:getCardArea(data.card) == Card.Processing and not player.dead then
      room:obtainCard(player, data.card, false, fk.ReasonJustMove, player, funan.name)
    end
  end,
}

funan:addEffect(fk.CardUsing, spec)
funan:addEffect(fk.CardResponding, spec)

funan:addEffect("prohibit", {
  prohibit_use = function(self, player, card)
    local cards = card:isVirtual() and card.subcards or { card.id }
    return table.find(cards, function(id)
      return Fk:getCardById(id):getMark("@@funan-inhand-turn") > 0
    end)
  end,
  prohibit_response = function(self, player, card)
    local cards = card:isVirtual() and card.subcards or { card.id }
    return table.find(cards, function(id)
      return Fk:getCardById(id):getMark("@@funan-inhand-turn") > 0
    end)
  end,
})

funan:addLoseEffect(function (self, player)
  player.room:setPlayerMark(player, "funan_update", 0)
end)

return funan
