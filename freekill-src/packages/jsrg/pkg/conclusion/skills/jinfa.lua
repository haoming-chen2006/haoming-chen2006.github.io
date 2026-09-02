local jinfa = fk.CreateSkill {
  name = "js__jinfa",
}

Fk:loadTranslationTable{
  ["js__jinfa"] = "矜伐",
  [":js__jinfa"] = "出牌阶段限一次，你可以展示一张手牌，然后与体力上限不大于你的所有角色议事，若结果与你展示牌的颜色："..
  "相同，你可以令至多两名参与议事的角色将手牌摸至体力上限；不同，你获得两张【影】。若没有其他角色与你意见相同，你可以变更势力。",

  ["#js__jinfa"] = "矜伐：展示一张手牌并进行议事，若结果和展示牌相同则摸牌，不同则获得【影】",
  ["#js__jinfa-choose"] = "矜伐：你可以令其中至多两名角色将手牌摸至体力上限",
  ["#js__jinfa-change"] = "矜伐：你可以变更势力",
}

local U = require "packages.utility.utility"

jinfa:addEffect("active", {
  anim_type = "drawcard",
  prompt = "#js__jinfa",
  card_num = 1,
  target_num = 0,
  can_use = function(self, player)
    return player:usedSkillTimes(jinfa.name, Player.HistoryPhase) == 0 and not player:isKongcheng()
  end,
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and table.contains(player:getCardIds("h"), to_select)
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    player:showCards(effect.cards)
    room:delay(1500)
    if player.dead then return end
    local targets = table.filter(room.alive_players, function(p)
      return not p:isKongcheng() and p.maxHp <= player.maxHp
    end)
    if #targets == 0 then return end
    room:doIndicate(player, targets)
    U.Discussion(player, targets, jinfa.name, { js__jinfa_color = Fk:getCardById(effect.cards[1]):getColorString() })
  end,
})

jinfa:addEffect(U.DiscussionResultConfirmed, {
  mute = true,
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and data.reason == jinfa.name and data.extra_data.js__jinfa_color
  end,
  on_use = function (self, event, target, player, data)
    local room = player.room
    if data.color == data.extra_data.js__jinfa_color then
      local targets = {}
      for p, _ in pairs(data.results) do
        if not p.dead and p:getHandcardNum() < p.maxHp then
          table.insert(targets, p)
        end
      end
      if #targets > 0 then
        local tos = room:askToChoosePlayers(player, {
          targets = targets,
          min_num = 1,
          max_num = 2,
          prompt = "#js__jinfa-ask",
          skill_name = jinfa.name,
          cancelable = true,
        })
        if #tos > 0 then
          room:sortByAction(tos)
          for _, p in ipairs(tos) do
            if not p.dead and p:getHandcardNum() < p.maxHp then
              p:drawCards(p.maxHp - p:getHandcardNum(), jinfa.name)
            end
          end
        end
      end
    else
      room:moveCards({
        ids = U.getShade(room, 2),
        to = player,
        toArea = Card.PlayerHand,
        moveReason = fk.ReasonJustMove,
        proposer = player,
        skillName = jinfa.name,
        moveVisible = true,
      })
    end
    if player.dead then return end

    local yes = false
    for p, result in pairs(data.results) do
      if p ~= player and result.opinion == data.results[player].opinion then
        yes = true
        break
      end
    end
    if not yes then
      local kingdoms = Fk:getKingdomMap("god")
      table.insert(kingdoms, "Cancel")
      local choices = table.simpleClone(kingdoms)
      table.removeOne(choices, player.kingdom)
      local choice = room:askToChoice(player, {
        choices = choices,
        skill_name = jinfa.name,
        prompt = "#js__jinfa-change",
        all_choices = kingdoms,
      })
      if choice ~= "Cancel" then
        room:changeKingdom(player, choice, true)
      end
    end
  end,
})

return jinfa
