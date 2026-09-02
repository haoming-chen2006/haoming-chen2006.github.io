local jianzheng = fk.CreateSkill {
  name = "jianzhengq",
}

Fk:loadTranslationTable{
  ["jianzhengq"] = "谏征",
  [":jianzhengq"] = "当其他角色使用【杀】指定目标时，若你在其攻击范围内且你不是目标，你可以将一张手牌置于牌堆顶，取消所有目标，"..
  "然后若此【杀】不为黑色，你成为目标。",

  ["#jianzhengq-invoke"] = "谏征：%dest 使用%arg，你可以将一张手牌置于牌堆顶取消所有目标",

  ["$jianzhengq1"] = "且慢，此仗打不得！",
  ["$jianzhengq2"] = "天时不当，必难取胜！",
}

jianzheng:addEffect(fk.TargetSpecifying, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(jianzheng.name) and data.card.trueName == "slash" and data.firstTarget and
      target:inMyAttackRange(player) and not table.contains(data.use.tos, player) and not player:isKongcheng()
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local card = room:askToCards(player, {
      skill_name = jianzheng.name,
      min_num = 1,
      max_num = 1,
      include_equip = false,
      prompt = "#jianzhengq-invoke::"..target.id..":"..data.card:toLogString(),
      cancelable = true,
    })
    if #card > 0 then
      event:setCostData(self, {tos = {target}, cards = card})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:moveCards({
      ids = event:getCostData(self).cards,
      from = player,
      fromArea = Card.PlayerHand,
      toArea = Card.DrawPile,
      moveReason = fk.ReasonPut,
      skillName = jianzheng.name,
    })
    data:cancelAllTarget()
    if not player.dead and data.card.color ~= Card.Black and not data.from:isProhibited(player, data.card) then
      data:addTarget(player, nil, true)
    end
  end,
})

return jianzheng
