
local pojun = fk.CreateSkill {
  name = "re__pojun",
}

Fk:loadTranslationTable{
  ["re__pojun"] = "破军",
  [":re__pojun"] = "当你于出牌阶段内使用【杀】指定一个目标后，你可以将其至多X张牌扣置于该角色的武将牌旁（X为其体力值）。若如此做，"..
  "当前回合结束后，该角色获得其武将牌旁的所有牌。",

  ["#re__pojun-invoke"] = "破军：是否扣置 %dest 的至多%arg张牌直到回合结束",
  ["$re__pojun"] = "破军",

  ["$re__pojun1"] = "大军在此！汝等休想前进一步！",
  ["$re__pojun2"] = "敬请，养精蓄锐！",
}

pojun:addEffect(fk.TargetSpecified, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(pojun.name) and data.card.trueName == "slash" and
      player.phase == Player.Play and not data.to.dead and data.to.hp > 0 and not data.to:isNude()
  end,
  on_cost = function(self, event, target, player, data)
    if player.room:askToSkillInvoke(player, {
      skill_name = pojun.name,
      prompt = "#re__pojun-invoke::"..data.to.id..":"..data.to.hp,
    }) then
      event:setCostData(self, {tos = {data.to}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local cards = room:askToChooseCards(player, {
      skill_name = pojun.name,
      target = data.to,
      flag = "he",
      min = 1,
      max = data.to.hp,
    })
    data.to:addToPile("$re__pojun", cards, false, pojun.name, player)
  end,
})

pojun:addEffect(fk.TurnEnd, {
  is_delay_effect = true,
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return not player.dead and #player:getPile("$re__pojun") > 0
  end,
  on_use = function(self, event, target, player, data)
    player.room:moveCardTo(player:getPile("$re__pojun"), Player.Hand, player, fk.ReasonPrey, pojun.name)
  end,
})

return pojun
