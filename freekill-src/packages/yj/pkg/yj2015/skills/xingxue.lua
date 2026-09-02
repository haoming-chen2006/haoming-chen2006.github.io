local xingxue = fk.CreateSkill {
  name = "xingxue",
  dynamic_desc = function (self, player)
    if player:getMark("yanzhu") > 0 then
      return "xingxue_update"
    end
  end,
}

Fk:loadTranslationTable{
  ["xingxue"] = "兴学",
  [":xingxue"] = "结束阶段，你可以令至多X名角色依次摸一张牌并将一张牌置于牌堆顶（X为你的体力值）。",

  [":xingxue_update"] = "结束阶段，你可以令至多X名角色依次摸一张牌并将一张牌置于牌堆顶（X为你的体力上限）。",

  ["#xingxue-choose"] = "兴学：你可以令至多%arg名角色依次摸一张牌并将一张牌置于牌堆顶",
  ["#xingxue-card"] = "兴学：选择一张牌置于牌堆顶",

  ["$xingxue1"] = "汝等都是国之栋梁。",
  ["$xingxue2"] = "文修武备，才是兴国之道。",
}

xingxue:addEffect(fk.EventPhaseStart, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(xingxue.name) and player.phase == Player.Finish and
      (player:getMark("yanzhu") > 0 or player.hp > 0)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local n = player:getMark("yanzhu") == 0 and player.hp or player.maxHp
    local tos = room:askToChoosePlayers(player, {
      skill_name = xingxue.name,
      min_num = 1,
      max_num = n,
      targets = room.alive_players,
      prompt = "#xingxue-choose:::"..n,
      cancelable = true,
    })
    if #tos > 0 then
      room:sortByAction(tos)
      event:setCostData(self, {tos = tos})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local targets = table.simpleClone(event:getCostData(self).tos)
    for _, to in ipairs(targets) do
      if not to.dead then
        to:drawCards(1, xingxue.name)
        if not (to.dead or to:isNude()) then
          local card = room:askToCards(to, {
            min_num = 1,
            max_num = 1,
            include_equip = true,
            prompt = "#xingxue-card",
            skill_name = xingxue.name,
            cancelable = false,
          })
          room:moveCards({
            ids = card,
            from = to,
            toArea = Card.DrawPile,
            moveReason = fk.ReasonJustMove,
            skillName = xingxue.name,
          })
        end
      end
    end
  end,
})

return xingxue
