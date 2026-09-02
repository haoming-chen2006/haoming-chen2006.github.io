local lianzhu = fk.CreateSkill{
  name = "re__lianzhu",
}

Fk:loadTranslationTable{
  ["re__lianzhu"] = "连诛",
  [":re__lianzhu"] = "结束阶段，你可以视为使用一张【过河拆桥】，然后目标角色选择失去1点体力，或对其下家重复此流程（下家为你则终止）。",

  ["#re__lianzhu-invoke"] = "连诛：视为使用一张【过河拆桥】，目标选择失去体力或对其下家重复流程",
  ["re__lianzhu_use"] = "%src视为对%dest使用【过河拆桥】并重复此流程",
}

lianzhu:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(lianzhu.name) and player.phase == Player.Finish
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    local use = room:askToUseVirtualCard(player, {
      name = "dismantlement",
      skill_name = lianzhu.name,
      prompt = "#re__lianzhu-invoke",
      cancelable = true,
      skip = true,
    })
    if use then
      event:setCostData(self, {extra_data = use})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local use = table.simpleClone(event:getCostData(self).extra_data)
    room:useCard(use)
    while use and #use.tos == 1 and not use.tos[1].dead do
      local to = use.tos[1]
      local next = to:getNextAlive()
      local choices = { "loseHp" }
      if not player.dead and player:canUseTo(Fk:cloneCard("dismantlement"), next) then
        table.insert(choices, "re__lianzhu_use:"..player.id..":"..next.id)
      end
      local choice = room:askToChoice(to, {
        choices = choices,
        skill_name = lianzhu.name,
      })
      if choice == "loseHp" then
        room:loseHp(to, 1, lianzhu.name)
        return
      else
        if next == player then
          return
        end
        use = room:useVirtualCard("dismantlement", nil, player, next, lianzhu.name)
      end
    end
  end,
})

return lianzhu
