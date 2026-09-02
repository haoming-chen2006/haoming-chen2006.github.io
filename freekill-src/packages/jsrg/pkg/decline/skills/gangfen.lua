local gangfen = fk.CreateSkill {
  name = "gangfen",
}

Fk:loadTranslationTable{
  ["gangfen"] = "刚忿",
  [":gangfen"] = "当手牌数大于你的角色使用【杀】指定目标时，你可以成为此【杀】的额外目标，并令所有其他角色均可以如此做。\
  然后使用者展示所有手牌，若其中黑色牌小于目标数，则取消所有目标。",

  ["#gangfen-invoke"] = "刚忿：成为此%arg的额外目标，所有角色都可以如此做，若最后使用者手中黑牌少于目标数则取消所有目标<br>（当前目标数为%arg2）",
  ["#GangFenAdd"] = "%from 因“刚忿”成为 %to 使用的 %arg 的目标（当前目标数为%arg2）",
  ["#GangFenCancel"] = "%from 黑色手牌数小于目标数，%arg因“刚忿”被取消",
}

gangfen:addEffect(fk.TargetSpecifying, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(gangfen.name) and data.card.trueName == "slash" and data.firstTarget and
      target:getHandcardNum() > player:getHandcardNum() and
      table.contains(data:getExtraTargets({bypass_distances = true}), player)
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = gangfen.name,
      prompt = "#gangfen-invoke:::"..data.card:toLogString()..":"..#data.use.tos,
    })
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:doIndicate(target, {player})
    data:addTarget(player)
    room:sendLog{
      type = "#GangFenAdd",
      from = player.id,
      to = { target.id },
      arg = data.card:toLogString(),
      arg2 = #data.use.tos,
      toast = true,
    }
    local targets = data:getExtraTargets({bypass_distances = true})
    room:sortByAction(targets)
    for _, p in ipairs(targets) do
      if room:askToSkillInvoke(p, {
        skill_name = gangfen.name,
        prompt = "#gangfen-invoke:::"..data.card:toLogString()..":"..#data.use.tos,
      }) then
        room:doIndicate(target, { p })
        data:addTarget(p)
        room:sendLog{
          type = "#GangFenAdd",
          from = p.id,
          to = { target.id },
          arg = data.card:toLogString(),
          arg2 = #data.use.tos,
          toast = true,
        }
      end
    end

    local cards = target:getCardIds("h")
    if target:isAlive() and #cards > 0 then
      target:showCards(cards)
      room:delay(2000)
    end
    if #table.filter(cards, function(id)
      return Fk:getCardById(id).color == Card.Black
    end) < #data.use.tos
    then
      for i = #data.use.tos, 1, -1 do
        data:cancelTarget(data.use.tos[i])
      end
      room:sendLog{
        type = "#GangFenCancel",
        from = target.id,
        arg = data.card:toLogString(),
        toast = true,
      }
    end
  end,
})

return gangfen
