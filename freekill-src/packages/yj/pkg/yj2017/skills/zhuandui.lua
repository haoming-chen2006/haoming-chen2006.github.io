local zhuandui = fk.CreateSkill {
  name = "zhuandui"
}

Fk:loadTranslationTable{
  ["zhuandui"] = "专对",
  [":zhuandui"] = "当你使用【杀】指定目标后，你可以与目标拼点：若你赢，其不能响应此【杀】。当你成为【杀】的目标后，你可以与使用者拼点："..
  "若你赢，此【杀】对你无效。",

  ["zhuandui1-invoke"] = "专对：你可以与 %dest 点，若赢，其不能响应此%arg",
  ["zhuandui2-invoke"] = "专对：你可以与 %dest 拼点，若赢，此%arg对你无效",

  ["$zhuandui1"] = "黄口小儿，也敢来班门弄斧？",
  ["$zhuandui2"] = "你已无话可说了吧！",
}

zhuandui:addEffect(fk.TargetSpecified, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zhuandui.name) and data.card.trueName == "slash" and
      not data.to.dead and player:canPindian(data.to)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = zhuandui.name,
      prompt = "zhuandui1-invoke::"..data.to.id..":"..data.card:toLogString(),
    }) then
      event:setCostData(self, {tos = {data.to}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local pindian = player:pindian({data.to}, zhuandui.name)
    if pindian.results[data.to].winner == player then
      data.use.disresponsiveList = data.use.disresponsiveList or {}
      table.insertIfNeed(data.use.disresponsiveList, data.to)
    end
  end,
})

zhuandui:addEffect(fk.TargetConfirmed, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zhuandui.name) and data.card.trueName == "slash" and
      not data.from.dead and player:canPindian(data.from)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = zhuandui.name,
      prompt = "zhuandui2-invoke::"..data.from.id..":"..data.card:toLogString(),
    }) then
      event:setCostData(self, {tos = {data.from}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local pindian = player:pindian({data.from}, zhuandui.name)
    if pindian.results[data.from].winner == player then
      data.use.nullifiedTargets = data.use.nullifiedTargets or {}
      table.insertIfNeed(data.use.nullifiedTargets, player)
    end
  end,
})

return zhuandui
