local mouZhenliang = fk.CreateSkill({
  name = "mou__zhenliang",
  tags = { Skill.Switch }
})

Fk:loadTranslationTable{
  ["mou__zhenliang"] = "贞良",
  [":mou__zhenliang"] = "转换技，阳：出牌阶段限一次，你可以选择一名你攻击范围内的其他角色并弃置X张与“任”颜色相同的牌（X为你与其体力值之差且至少为1），" ..
  "然后对其造成1点伤害；<br>阴：你的回合外，当一名角色使用或打出牌结算结束后，若此牌与“任”类别相同，你可以令一名角色摸两张牌。",

  ["#mou__zhenliang-damage"] = "贞良：弃置与“任”颜色相同的牌，对攻击范围内一名角色造成伤害",
  ["#mou__zhenliang-choose"] = "贞良：你可以令一名角色摸两张牌",
  ["#mou__zhenliang_trigger"] = "贞良",

  ["$mou__zhenliang1"] = "汉室艰祸繁兴，老夫岂忍宸极失御！",
  ["$mou__zhenliang2"] = "犹思中兴之美，尚怀来苏之望！",
}

mouZhenliang:addEffect("active", {
  anim_type = "switch",
  prompt = "#mou__zhenliang-damage",
  can_use = function(self, player)
    return player:usedSkillTimes(mouZhenliang.name, Player.HistoryPhase) < 1 and player:getSwitchSkillState(mouZhenliang.name) == fk.SwitchYang
  end,
  card_filter = function(self, player, to_select, selected)
    local cid = player:getPile("mou__duty")[1]
    if not cid then return end
    return Fk:getCardById(cid).color == Fk:getCardById(to_select).color and not player:prohibitDiscard(Fk:getCardById(to_select))
  end,
  target_num = 1,
  target_filter = function(self, player, to_select, selected, cards)
    return #selected == 0 and player:inMyAttackRange(to_select, nil, cards) and #cards == math.max(1, math.abs(player.hp - to_select.hp))
  end,
  on_use = function(self, room, effect)
    ---@type string
    local skillName = mouZhenliang.name
    local player = effect.from
    local to = effect.tos[1]
    room:throwCard(effect.cards, skillName, player, player)
    room:damage{
      from = player,
      to = to,
      damage = 1,
      skillName = skillName,
    }
  end,
})

local mouZhenliangYinCanTrigger = function(self, event, target, player, data)
  return
    player:hasSkill(mouZhenliang.name) and
    player:getSwitchSkillState(mouZhenliang.name) == fk.SwitchYin and
    player.phase == Player.NotActive and
    #player:getPile("mou__duty") > 0 and
    data.card.type == Fk:getCardById(player:getPile("mou__duty")[1]).type
end

local mouZhenliangYinOnCost = function(self, event, target, player, data)
  local room = player.room
  local tos = room:askToChoosePlayers(
    player,
    {
      targets = room:getAlivePlayers(false),
      min_num = 1,
      max_num = 1,
      prompt = "#mou__zhenliang-choose",
      skill_name = mouZhenliang.name,
    }
  )
  if #tos > 0 then
    event:setCostData(self, tos[1])
    return true
  end
end

local mouZhenliangYinOnUse = function(self, event, target, player, data)
  local to = event:getCostData(self)
  to:drawCards(2, mouZhenliang.name)
end

mouZhenliang:addEffect(fk.CardUseFinished, {
  anim_type = "switch",
  can_trigger = mouZhenliangYinCanTrigger,
  on_cost = mouZhenliangYinOnCost,
  on_use = mouZhenliangYinOnUse,
})

mouZhenliang:addEffect(fk.CardRespondFinished, {
  anim_type = "switch",
  can_trigger = mouZhenliangYinCanTrigger,
  on_cost = mouZhenliangYinOnCost,
  on_use = mouZhenliangYinOnUse,
})

return mouZhenliang
