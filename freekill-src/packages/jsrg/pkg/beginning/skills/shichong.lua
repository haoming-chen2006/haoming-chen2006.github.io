local shichong = fk.CreateSkill {
  name = "shichong",
  tags = { Skill.Switch },
}

Fk:loadTranslationTable{
  ["shichong"] = "恃宠",
  [":shichong"] = "当你使用牌指定其他角色为唯一目标后，阳：你可以获得目标角色一张手牌；阴：目标角色可以交给你一张手牌。",

  ["#shichong-invoke"] = "恃宠：你可以获得 %dest 一张手牌",
  ["#shichong-give"] = "恃宠：你可以交给 %src 一张手牌",
}

shichong:addEffect(fk.TargetSpecified, {
  anim_type = "switch",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(shichong.name) and data:isOnlyTarget(data.to) and
      data.to ~= player and not data.to:isKongcheng()
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if player:getSwitchSkillState(shichong.name, false) == fk.SwitchYang then
      if room:askToSkillInvoke(player, {
        skill_name = shichong.name,
        prompt = "#shichong-invoke::" .. data.to.id,
      }) then
        event:setCostData(self, {tos = {data.to}})
        return true
      end
    else
      local card = room:askToCards(data.to, {
        min_num = 1,
        max_num = 1,
        include_equip = false,
        skill_name = shichong.name,
        cancelable = true,
        prompt = "#shichong-give:"..player.id
      })
      if #card > 0 then
        event:setCostData(self, {cards = card})
        return true
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    if player:getSwitchSkillState(shichong.name, true) == fk.SwitchYang then
      local card = room:askToChooseCard(player, {
        target = data.to,
        flag = "h",
        skill_name = shichong.name,
      })
      room:moveCardTo(card, Card.PlayerHand, player, fk.ReasonPrey, shichong.name, nil, false, player)
    else
      room:moveCardTo(event:getCostData(self).cards, Card.PlayerHand, player, fk.ReasonGive, shichong.name, nil, false, data.to)
    end
  end,
})

return shichong
