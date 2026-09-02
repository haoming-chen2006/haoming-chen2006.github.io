
local jieyue = fk.CreateSkill {
  name = "jieyue",
  derived_piles = "$jieyue",
}

Fk:loadTranslationTable{
  ["jieyue"] = "节钺",
  [":jieyue"] = "结束阶段，你可以弃置一张手牌并选择一名其他角色，若如此做，除非该角色将一张牌置于你的武将牌上，否则你弃置其一张牌。"..
  "若你的武将牌上有牌，则你可以将红色手牌当【闪】、黑色手牌当【无懈可击】使用或打出。准备阶段，你获得你武将牌上的牌。",

  ["$jieyue"] = "节钺",
  ["#jieyue-choose"] = "节钺：弃一张手牌，令一名角色选择将一张牌置为“节钺”牌或你弃置其一张牌",
  ["#jieyue-give"] = "节钺：将一张牌置为 %src 的“节钺”牌，或其弃置你一张牌",

  ["$jieyue1"] = "诸军严整，敌军自乱。",
  ["$jieyue2"] = "安营驻寨，严守城防。",
  ["$jieyue3"] = "不动如泰山。",
  ["$jieyue4"] = "纪法严明，无懈可击。",
}

jieyue:addEffect("viewas", {
  pattern = "jink,nullification",
  mute = true,
  filter_pattern = function (self, player, card_name)
    local vs_pattern = {
      max_num = 1,
      min_num = 1,
      pattern = ".|.|.|^equip",
    }
    if card_name == "jink" then
      vs_pattern.pattern = ".|.|red|^equip"
    elseif card_name == "nullification" then
      vs_pattern.pattern = ".|.|black|^equip"
    end
    return vs_pattern
  end,
  view_as = function(self, player, cards)
    if #cards ~= 1 then return end
    local card
    if Fk:getCardById(cards[1]).color == Card.Red then
      card = Fk:cloneCard("jink")
    elseif Fk:getCardById(cards[1]).color == Card.Black then
      card = Fk:cloneCard("nullification")
    end
    card.skillName = jieyue.name
    card:addSubcard(cards[1])
    return card
  end,
  before_use = function(self, player, use)
    if use.card.name == "jink" then
      player:broadcastSkillInvoke(jieyue.name, 3)
      player.room:notifySkillInvoked(player, jieyue.name, "defensive")
    elseif use.card.name == "nullification" then
      player:broadcastSkillInvoke(jieyue.name, 4)
      player.room:notifySkillInvoked(player, jieyue.name, "defensive")
    end
  end,
  enabled_at_response = function(self, player)
    return #player:getPile("$jieyue") > 0
  end,
})

jieyue:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  mute = true,
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(jieyue.name) then
      if player.phase == Player.Finish then
        return not player:isKongcheng() and
          table.find(player.room:getOtherPlayers(player, false), function (p)
            return not p:isNude()
          end)
      elseif player.phase == Player.Start then
        return #player:getPile("$jieyue") > 0
      end
    end
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if player.phase == Player.Finish then
      local targets = table.filter(room:getOtherPlayers(player, false), function (p)
        return not p:isNude()
      end)
      local tos, cards = room:askToChooseCardsAndPlayers(player, {
        min_card_num = 1,
        max_card_num = 1,
        min_num = 1,
        max_num = 1,
        targets = targets,
        pattern = ".|.|.|hand",
        skill_name = jieyue.name,
        prompt = "#jieyue-choose",
        cancelable = true,
        will_throw = true,
      })
      if #tos > 0 and #cards == 1 then
        event:setCostData(self, {tos = tos, cards = cards})
        return true
      end
    elseif player.phase == Player.Start then
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    player:broadcastSkillInvoke(jieyue.name, math.random(1, 2))
    if player.phase == Player.Finish then
      room:notifySkillInvoked(player, jieyue.name, "control")
      local to = event:getCostData(self).tos[1]
      room:throwCard(event:getCostData(self).cards, jieyue.name, player, player)
      if player.dead or to.dead or to:isNude() then return end
      local card = room:askToCards(to, {
        min_num = 1,
        max_num = 1,
        include_equip = true,
        skill_name = jieyue.name,
        cancelable = true,
        prompt = "#jieyue-give:"..player.id
      })
      if #card > 0 then
        player:addToPile("$jieyue", card, false, jieyue.name)
      else
        local id = room:askToChooseCard(player, {
          target = to,
          flag = "he",
          skill_name = jieyue.name,
        })
        room:throwCard(id, jieyue.name, to, player)
      end
    elseif player.phase == Player.Start then
      room:notifySkillInvoked(player, jieyue.name, "drawcard")
      room:obtainCard(player, player:getPile("$jieyue"), false, fk.ReasonJustMove, player, jieyue.name)
    end
  end,
})

return jieyue
