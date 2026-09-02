local kongsheng = fk.CreateSkill {
  name = "kongsheng",
  expand_pile = "zhoufei_harp",
}

Fk:loadTranslationTable{
  ["kongsheng"] = "箜声",
  [":kongsheng"] = "准备阶段，你可以将任意张牌置于武将牌上。结束阶段，你使用武将牌上的装备牌，并获得武将牌上的其他牌。",

  ["#kongsheng-invoke"] = "箜声：你可以将任意张牌作为“箜”置于武将牌上",
  ["zhoufei_harp"] = "箜",
  ["#kongsheng-use"] = "箜声：请使用“箜”中的装备牌",

  ["$kongsheng1"] = "窈窕淑女，箜篌有知。",
  ["$kongsheng2"] = "箜篌声声，琴瑟和鸣。",
}

kongsheng:addEffect(fk.EventPhaseStart, {
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(kongsheng.name) then
      if player.phase == Player.Start then
        return not player:isNude()
      elseif player.phase == Player.Finish then
        return #player:getPile("zhoufei_harp") > 0
      end
    end
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if player.phase == Player.Start then
      local cards = room:askToCards(player, {
        min_num = 1,
        max_num = 999,
        include_equip = true,
        skill_name = kongsheng.name,
        prompt = "#kongsheng-invoke",
        cancelable = true,
      })
      if #cards > 0 then
        event:setCostData(self, {cards = cards})
        return true
      end
    elseif player.phase == Player.Finish then
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    if player.phase == Player.Start then
      player:addToPile("zhoufei_harp", event:getCostData(self).cards, true, kongsheng.name)
    elseif player.phase == Player.Finish then
      local room = player.room
      while not player.dead do
        local ids = table.filter(player:getPile("zhoufei_harp"), function(id)
          local card = Fk:getCardById(id)
          return card.type == Card.TypeEquip and player:canUse(card)
        end)
        if #ids == 0 then break end
        room:askToUseRealCard(player, {
          pattern = tostring(Exppattern{ id = ids }),
          skill_name = kongsheng.name,
          prompt = "#kongsheng-use",
          cancelable = false,
          extra_data = {
            expand_pile = "zhoufei_harp",
          },
        })
      end
      if not player.dead then
        room:obtainCard(player, player:getPile("zhoufei_harp"), true, fk.ReasonJustMove)
      end
    end
  end,
})

return kongsheng
