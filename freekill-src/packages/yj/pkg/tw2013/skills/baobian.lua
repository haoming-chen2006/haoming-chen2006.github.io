local baobian = fk.CreateSkill {
  name = "tw__baobian"
}

Fk:loadTranslationTable{
  ["tw__baobian"] = "豹变",
  [":tw__baobian"] = "當你使用【殺】或【決鬥】造成傷害時，若你的勢力與其：相同，你可以防止此傷害，令其將手牌摸至體力上限；"..
  "不同，你可以將其手牌棄至體力值。",

  ["#tw__baobian1-invoke"] = "豹变：你可以防止对 %dest 造成的伤害，令其摸牌至体力上限",
  ["#tw__baobian2-invoke"] = "豹变：你可以将 %dest 手牌弃至体力值",
}

baobian:addEffect(fk.DetermineDamageCaused, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(baobian.name) and
      data.card and table.contains({"slash", "duel"}, data.card.trueName) and
      not data.to.dead then
      if data.to.kingdom == player.kingdom then
        return true
      else
        return data.to:getHandcardNum() > data.to.hp
      end
    end
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local prompt = ""
    if data.to.kingdom == player.kingdom then
      prompt = "#tw__baobian1-invoke::"..data.to.id
    else
      prompt = "#tw__baobian2-invoke::"..data.to.id
    end
    if room:askToSkillInvoke(player, {
      skill_name = baobian.name,
      prompt = prompt,
    }) then
      event:setCostData(self, {tos = {data.to}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    if data.to.kingdom == player.kingdom then
      data:preventDamage()
      local n = data.to.maxHp - data.to:getHandcardNum()
      if n > 0 then
        data.to:drawCards(n, baobian.name)
      end
    else
      local n = data.to:getHandcardNum() - data.to.hp
      if data.to == player then
        room:askToDiscard(player, {
          min_num = n,
          max_num = n,
          include_equip = false,
          skill_name = baobian.name,
          cancelable = false,
        })
      else
        local cards = room:askToChooseCards(player, {
          min = n,
          max = n,
          target = data.to,
          flag = "h",
          skill_name = baobian.name,
        })
        room:throwCard(cards, baobian.name, data.to, player)
      end
    end
  end,
})

return baobian
