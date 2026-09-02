local liangzhu = fk.CreateSkill {
  name = "liangzhu",
}

Fk:loadTranslationTable{
  ["liangzhu"] = "良助",
  [":liangzhu"] = "当一名角色于其出牌阶段内回复体力时，你可以选择一项：1.摸一张牌；2.令该角色摸两张牌。",

  ["liangzhu_draw2"] = "%dest摸两张牌",

  ["$liangzhu1"] = "吾愿携弩，征战沙场，助君一战！",
  ["$liangzhu2"] = "两国结盟，你我都是一家人。",
}

liangzhu:addEffect(fk.HpRecover, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(liangzhu.name) and target.phase == Player.Play
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local choices = {"draw1", "Cancel"}
    if not target.dead then
      table.insert(choices, 2, "liangzhu_draw2::"..target.id)
    end
    local choice = room:askToChoice(player, {
      choices = choices,
      skill_name = liangzhu.name,
    })
    if choice ~= "Cancel" then
      event:setCostData(self, {tos = choice ~= "draw1" and {target} or {}, choice = choice})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local choice = event:getCostData(self).choice
    if choice == "draw1" then
      player:drawCards(1, liangzhu.name)
    else
      room:addTableMarkIfNeed(player, "liangzhu_target", target.id)
      target:drawCards(2, liangzhu.name)
    end
  end,
})

return liangzhu
