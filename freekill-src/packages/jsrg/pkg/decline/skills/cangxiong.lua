local cangxiong = fk.CreateSkill {
  name = "cangxiong",
}

Fk:loadTranslationTable{
  ["cangxiong"] = "藏凶",
  [":cangxiong"] = "当你的一张牌被弃置或被其他角色获得后，你可以用此牌<a href='premeditate_href'>“蓄谋”</a>，然后若此时是你的出牌阶段，"..
  "你摸一张牌。",

  ["#cangxiong1-invoke"] = "藏凶：%arg 被弃置，是否将之蓄谋？",
  ["#cangxiong2-invoke"] = "藏凶：%arg 被 %dest 获得，是否将之蓄谋？",
}

local U = require "packages.utility.utility"

cangxiong:addEffect(fk.AfterCardsMove, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(cangxiong.name) and not table.contains(player.sealedSlots, Player.JudgeSlot) then
      for _, move in ipairs(data) do
        if move.from == player then
          for _, info in ipairs(move.moveInfo) do
            if info.fromArea == Card.PlayerHand or info.fromArea == Card.PlayerEquip then
              if move.moveReason == fk.ReasonDiscard and table.contains(player.room.discard_pile, info.cardId) then
                return true
              elseif move.to and move.to ~= player and move.moveReason == fk.ReasonPrey and
                move.toArea == Card.PlayerHand and not move.to.dead and table.contains(move.to:getCardIds("h"), info.cardId) then
                return true
              end
            end
          end
        end
      end
    end
  end,
  on_trigger = function (self, event, target, player, data)
    local ids = {}
    local dat = {}
    for _, move in ipairs(data) do
      if move.from == player then
        for _, info in ipairs(move.moveInfo) do
          if info.fromArea == Card.PlayerHand or info.fromArea == Card.PlayerEquip then
            if move.moveReason == fk.ReasonDiscard and table.contains(player.room.discard_pile, info.cardId) then
              if table.insertIfNeed(ids, info.cardId) then
                table.insert(dat, {info.cardId, "discard"})
              end
            elseif move.to and move.to ~= player and move.moveReason == fk.ReasonPrey and
              move.toArea == Card.PlayerHand and not move.to.dead and table.contains(move.to:getCardIds("h"), info.cardId) then
              if table.insertIfNeed(ids, info.cardId) then
                table.insert(dat, {info.cardId, "prey", move.to})
              end
            end
          end
        end
      end
    end
    for _, info in ipairs(dat) do
      if not player:hasSkill(cangxiong.name) or table.contains(player.sealedSlots, Player.JudgeSlot) then break end
      if info[2] == "discard" then
        if table.contains(player.room.discard_pile, info[1]) then
          event:setCostData(self, {cards = {info[1]}, choice = "discard"})
          self:doCost(event, target, player, data)
        end
      elseif info[2] == "prey" then
        if table.contains(info[3]:getCardIds("h"), info[1]) then
          event:setCostData(self, {cards = {info[1]}, choice = "prey", tos = {info[3]}})
          self:doCost(event, target, player, data)
        end
      end
    end
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    local dat = event:getCostData(self)
    local choice = dat.choice
    if choice == "discard" then
      return room:askToSkillInvoke(player, {
        skill_name = cangxiong.name,
        prompt = "#cangxiong1-invoke:::"..Fk:getCardById(dat.cards[1]):toLogString(),
      })
    else
      return room:askToSkillInvoke(player, {
        skill_name = cangxiong.name,
        prompt = "#cangxiong2-invoke::"..dat.tos[1].id..":"..Fk:getCardById(dat.cards[1]):toLogString(),
      })
    end
  end,
  on_use = function(self, event, target, player, data)
    U.premeditate(player, event:getCostData(self).cards, cangxiong.name)
    if not player.dead and player.phase == Player.Play then
      player:drawCards(1, cangxiong.name)
    end
  end,
})

return cangxiong
