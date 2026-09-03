
local yangbei = fk.CreateSkill({
  name = "yangbei",
})

Fk:loadTranslationTable{
  ["yangbei"] = "佯北",
  [":yangbei"] = "准备阶段和结束阶段，你可以翻面并摸三张牌。当你使用【杀】或普通锦囊牌指定唯一目标后，其可以弃置所有手牌令此技能本回合失效。",

  ["#yangbei-invoke"] = "佯北：你可以翻面并摸三张牌",
  ["#yangbei-discard"] = "佯北：是否弃置所有手牌，令 %src “佯北”本回合失效？",
}

yangbei:addEffect(fk.EventPhaseStart, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(yangbei.name) and
      (player.phase == Player.Start or player.phase == Player.Finish)
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = yangbei.name,
      prompt = "#yangbei-invoke",
    })
  end,
  on_use = function(self, event, target, player, data)
    player:drawCards(3, yangbei.name)
    if not player.dead then
      player:turnOver()
    end
  end,
})

yangbei:addEffect(fk.TargetSpecified, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(yangbei.name) and
      (data.card.trueName == "slash" or data.card:isCommonTrick()) and
      data:isOnlyTarget(data.to) and not data.to:isKongcheng()
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local yes = table.filter(data.to:getCardIds("h"), function (id)
      return not data.to:prohibitDiscard(id)
    end)
    if yes then
      return room:askToSkillInvoke(data.to, {
        skill_name = yangbei.name,
        prompt = "#yangbei-discard:"..player.id,
      })
    else
      room:askToCards(player, {
        min_num = 1,
        max_num = 1,
        include_equip = false,
        skill_name = yangbei.name,
        pattern = "false",
        prompt = "#yangbei-discard:"..player.id,
        cancelable = true,
      })
    end
  end,
  on_use = function (self, event, target, player, data)
    local room = player.room
    data.to:throwAllCards("h", yangbei.name)
    room:invalidateSkill(player, yangbei.name, "-turn")
  end,
})

yangbei:addAI(Fk.Ltk.AI.newInvokeStrategy{
  think = Util.TrueFunc,
})

return yangbei
