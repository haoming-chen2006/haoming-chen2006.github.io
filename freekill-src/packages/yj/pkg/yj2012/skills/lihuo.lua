local lihuo = fk.CreateSkill {
  name = "lihuo",
}

Fk:loadTranslationTable{
  ["lihuo"] = "疬火",
  [":lihuo"] = "当你使用普通【杀】时，你可以将此【杀】改为火【杀】，然后此【杀】结算结束后，若此【杀】造成过伤害，你失去1点体力；"..
  "你使用火【杀】可以多选择一个目标。",

  ["#lihuo-invoke"] = "疬火：是否将%arg改为火【杀】，若造成伤害，结算后你失去1点体力",
  ["#lihuo-choose"] = "疬火：你可以为此%arg增加一个目标",

  ["$lihuo1"] = "将士们，引火对敌！",
  ["$lihuo2"] = "和我同归于尽吧！"
}

lihuo:addEffect(fk.AfterCardUseDeclared, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(lihuo.name) and data.card.name == "slash"
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = lihuo.name,
      prompt = "#lihuo-invoke:::"..data.card:toLogString()
    })
  end,
  on_use = function(self, event, target, player, data)
    local card = Fk:cloneCard("fire__slash", data.card.suit, data.card.number)
    for k, v in pairs(data.card) do
      if card[k] == nil then
        card[k] = v
      end
    end
    if data.card:isVirtual() then
      card.subcards = data.card.subcards
    else
      card.id = data.card.id
    end
    card.skillNames = data.card.skillNames
    data.card = card
    data.extra_data = data.extra_data or {}
    data.extra_data.lihuo = player
  end,
})

lihuo:addEffect(fk.AfterCardTargetDeclared, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(lihuo.name) and data.card.name == "fire__slash" and
      #data:getExtraTargets() > 0
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local tos = room:askToChoosePlayers(player, {
      targets = data:getExtraTargets(),
      min_num = 1,
      max_num = 1,
      prompt = "#lihuo-choose:::"..data.card:toLogString(),
      skill_name = lihuo.name,
      cancelable = true,
    })
    if #tos > 0 then
      event:setCostData(self, {tos = tos})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    data:addTarget(event:getCostData(self).tos[1])
  end,
})

lihuo:addEffect(fk.CardUseFinished, {
  anim_type = "negative",
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return not player.dead and data.damageDealt and data.extra_data and data.extra_data.lihuo == player
  end,
  on_use = function(self, event, target, player, data)
    player.room:loseHp(player, 1, lihuo.name)
  end,
})

return lihuo
