local zhenliang = fk.CreateSkill {
  name = "zhenliang",
  tags = { Skill.Switch },
}

Fk:loadTranslationTable{
  ["zhenliang"] = "贞良",
  [":zhenliang"] = "转换技，"..
  "阳：出牌阶段限一次，你可以选择攻击范围内的一名其他角色，弃置X张与“任”颜色相同的牌，对其造成1点伤害（X为你与其体力值之差，至少为1）；" ..
  "阴：你的回合外，当你使用或打出牌结算结束后，若此牌与“任”类别相同，你可以令一名角色摸一张牌。",

  [":zhenliang_yang"] = "转换技，"..
  "<font color=\"#E0DB2F\">阳：出牌阶段限一次，你可以选择攻击范围内的一名其他角色，弃置X张与“任”颜色相同的牌，对其造成1点伤害" ..
  "（X为你与其体力值之差，至少为1）；</font>阴：你的回合外，当你使用或打出牌结算结束后，若此牌与“任”类别相同，你可以令一名角色摸一张牌。",
  [":zhenliang_yin"] = "转换技，"..
  "阳：出牌阶段限一次，你可以选择攻击范围内的一名其他角色，弃置X张与“任”颜色相同的牌，对其造成1点伤害（X为你与其体力值之差，至少为1）；" ..
  "<font color=\"#E0DB2F\">阴：你的回合外，当你使用或打出牌结算结束后，若此牌与“任”类别相同，你可以令一名角色摸一张牌。</font>",

  ["#zhenliang"] = "贞良：选择一名角色，弃体力值之差的“任”颜色的牌，对其造成1点伤害",
  ["#zhenliang-choose"] = "贞良：你可以令一名角色摸一张牌",

  ["$zhenliang1"] = "贞洁贤良，吾之本心。",
  ["$zhenliang2"] = "风霜以别草木之性，危乱而见贞良之节。",
}

zhenliang:addEffect("active", {
  prompt = "#zhenliang",
  anim_type = "switch",
  min_card_num = 1,
  target_num = 1,
  can_use = function(self, player)
    return player:usedEffectTimes(zhenliang.name, Player.HistoryPhase) == 0 and
      player:getSwitchSkillState(zhenliang.name) == fk.SwitchYang and
      #player:getPile("luzhi_duty") > 0
  end,
  card_filter = function(self, player, to_select, selected, selected_targets)
    if #selected_targets == 1 then
      return #selected < math.max(1, math.abs(player.hp - selected_targets[1].hp)) and
        not player:prohibitDiscard(to_select) and
        table.find(player:getPile("luzhi_duty"), function (id)
          return Fk:getCardById(to_select):compareColorWith(Fk:getCardById(id))
        end)
    end
  end,
  target_filter = function(self, player, to_select, selected, selected_cards)
    return #selected == 0 and player:inMyAttackRange(to_select, nil, selected_cards)
  end,
  feasible = function (self, player, selected, selected_cards)
    return #selected == 1 and #selected_cards == math.max(1, math.abs(player.hp - selected[1].hp))
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    room:throwCard(effect.cards, zhenliang.name, player, player)
    if not target.dead then
      room:damage{
        from = player,
        to = target,
        damage = 1,
        skillName = zhenliang.name,
      }
    end
  end,
})

local spec = {
  anim_type = "switch",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zhenliang.name) and
      player:getSwitchSkillState(zhenliang.name) == fk.SwitchYin and player.room:getCurrent() ~= player and
      #player:getPile("luzhi_duty") > 0 and
      table.find(player:getPile("luzhi_duty"), function (id)
        return data.card.type == Fk:getCardById(id).type
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local to = room:askToChoosePlayers(player, {
      min_num = 1,
      max_num = 1,
      targets = room.alive_players,
      skill_name = zhenliang.name,
      prompt = "#zhenliang-choose",
      cancelable = true,
    })
    if #to > 0 then
      event:setCostData(self, {tos = to})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    event:getCostData(self).tos[1]:drawCards(1, zhenliang.name)
  end,
}
zhenliang:addEffect(fk.CardUseFinished, spec)
zhenliang:addEffect(fk.CardRespondFinished, spec)

return zhenliang
