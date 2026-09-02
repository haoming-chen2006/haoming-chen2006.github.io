Fk:loadTranslationTable{
  ["ex__fankui"] = "反馈",
  [":ex__fankui"] = "当你受到1点伤害后，你可以获得来源的一张牌。",

  ["#ex__fankui-invoke"] = "反馈：是否获得 %dest 一张牌",

  ["$ex__fankui1"] = "哼，自作孽不可活！",
  ["$ex__fankui2"] = "哼，正中下怀！",
}

local fankui = fk.CreateSkill{
  name = "ex__fankui",
}

fankui:addEffect(fk.Damaged, {
  anim_type = "masochism",
  trigger_times = function(self, event, target, player, data)
    return data.damage
  end,
  can_trigger = function(self, event, target, player, data)
    if not (target == player and player:hasSkill(fankui.name)) then return end
    if data.from and not data.from.dead then
      if data.from == player then
        return #player:getCardIds("e") > 0
      else
        return not data.from:isNude()
      end
    end
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = fankui.name,
      prompt = "#ex__fankui-invoke::"..data.from.id,
    }) then
      event:setCostData(self, {tos = {data.from}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local card = room:askToChooseCard(player, {
      target = data.from,
      flag = data.from == player and "e" or "he",
      skill_name = fankui.name,
    })
    room:obtainCard(player, card, false, fk.ReasonPrey, player, fankui.name)
  end
})

return fankui
