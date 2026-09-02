local chongzhen = fk.CreateSkill {
  name = "chongzhen",
}

Fk:loadTranslationTable{
  ["chongzhen"] = "冲阵",
  [":chongzhen"] = "每当你发动〖龙胆〗使用或打出一张手牌时，你可以立即获得对方的一张手牌。",

  ["#chongzhen-invoke"] = "冲阵：你可以获得 %dest 的一张手牌",

  ["$chongzhen1"] = "陷阵杀敌，一马当先！",
  ["$chongzhen2"] = "贼将休走，可敢与我一战？"
}

local spec = {
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    if room:askToSkillInvoke(player, {
      skill_name = chongzhen.name,
      prompt = "#chongzhen-invoke::"..to.id,
    }) then
      event:setCostData(self, {tos = {to}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    local card = room:askToChooseCard(player, {
      target = to,
      flag = "h",
      skill_name = chongzhen.name,
    })
    room:obtainCard(player, card, false, fk.ReasonPrey, player, chongzhen.name)
  end,
}

chongzhen:addEffect(fk.CardUsing, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(chongzhen.name) and
      table.find(data.card.skillNames, function(name)
        return string.find(name, "longdan") ~= nil
      end) then
      local to
      if #data.tos > 0 then
        to = data.tos[1]
      elseif data.card.name == "jink" then
        if data.responseToEvent then
          to = data.responseToEvent.from  -- jink
        end
      end
      if to and not to.dead and not to:isKongcheng() then
        event:setCostData(self, {tos = {to}})
        return true
      end
    end
  end,
  on_cost = spec.on_cost,
  on_use = spec.on_use,
})

chongzhen:addEffect(fk.CardResponding, {
  anim_type = "offensive",
  can_trigger = function (self, event, target, player, data)
    if target == player and player:hasSkill(chongzhen.name) and
      table.find(data.card.skillNames, function(name)
        return string.find(name, "longdan") ~= nil
      end) then
      local to
      if data.responseToEvent then
        if data.responseToEvent.from == player then
          to = data.responseToEvent.to  -- duel used by zhaoyun
        else
          to = data.responseToEvent.from  -- savage_assault, archery_attack, passive duel

          -- TODO: Lenovo shu zhaoyun may chongzhen liubei when responding to jijiang
        end
        if to and not to.dead and not to:isKongcheng() then
          event:setCostData(self, {tos = {to}})
          return true
        end
      end
    end
  end,
  on_cost = spec.on_cost,
  on_use = spec.on_use,
})

return chongzhen
