local zhuiming = fk.CreateSkill {
  name = "zhuiming",
}

Fk:loadTranslationTable{
  ["zhuiming"] = "追命",
  [":zhuiming"] = "当你使用【杀】指定唯一目标后，你可以声明一种颜色并令目标弃置任意张牌，然后你展示目标一张牌，若此牌颜色与你声明的颜色相同，"..
  "则此【杀】不计入次数限制、不可被响应且伤害+1。",

  ["#zhuiming-invoke"] = "追命：你可以对 %dest 发动“追命”，声明一种颜色",
  ["#zhuiming-discard"] = "追命：%src 声明%arg，你可以弃置任意张牌",
}

zhuiming:addEffect(fk.TargetSpecified, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zhuiming.name) and
      data.card.trueName == "slash" and data:isOnlyTarget(data.to) and
      not data.to:isNude()
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local choice = room:askToChoice(player, {
      choices = {"red", "black", "Cancel"},
      skill_name = zhuiming.name,
      prompt = "#zhuiming-invoke::"..data.to.id,
    })
    if choice ~= "Cancel" then
      event:setCostData(self, {tos = {data.to}, choice = choice})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local choice = event:getCostData(self).choice
    room:sendLog{
      type = "#Choice",
      from = player.id,
      arg = choice,
      toast = true,
    }
    room:askToDiscard(data.to, {
      min_num = 1,
      max_num = 999,
      include_equip = true,
      skill_name = zhuiming.name,
      cancelable = true,
      prompt = "#zhuiming-discard:"..player.id.."::"..choice,
    })
    if player.dead or data.to.dead or data.to:isNude() then return end
    local id = room:askToChooseCard(player, {
      target = data.to,
      flag = "he",
      skill_name = zhuiming.name
    })
    data.to:showCards({id})
    if Fk:getCardById(id):getColorString() == choice then
      if not data.use.extraUse then
        player:addCardUseHistory("slash", -1)
        data.use.extraUse = true
      end
      data.disresponsive = true
      data.additionalDamage = (data.additionalDamage or 0) + 1
    end
  end,
})

return zhuiming
