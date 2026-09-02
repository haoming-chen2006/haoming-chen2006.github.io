local jizhao = fk.CreateSkill {
  name = "re__jizhaoq",
}

Fk:loadTranslationTable{
  ["re__jizhaoq"] = "急召",
  [":re__jizhaoq"] = "准备阶段和结束阶段，你可以声明一种类别，令一名角色选择一项：1.使用一张此类别的手牌（无距离限制）；"..
  "2.令你可以移动其场上一张牌。",

  ["#re__jizhaoq-choose"] = "急召：选择类别并指定一名角色，其选择使用一张此类别手牌（无距离限制）或你移动其场上一张牌",
  ["#re__jizhaoq-use"] = "急召：使用一张%arg手牌（无距离限制），或点“取消” %src 可以移动你场上一张牌",
  ["#re__jizhaoq-move"] = "急召：你可以选择一名角色，将 %dest 场上一张牌移至目标角色区域",
}

jizhao:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(jizhao.name) and
      (player.phase == Player.Start or player.phase == Player.Finish)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local success, dat = room:askToUseActiveSkill(player, {
      skill_name = "re__jizhaoq_active",
      prompt = "#re__jizhaoq-choose",
    })
    if success and dat then
      event:setCostData(self, {tos = dat.targets, choice = dat.interaction})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = event:getCostData(self).tos[1]
    local type = event:getCostData(self).choice
    local use = nil
    if not to:isKongcheng() then
      local cards = table.filter(to:getCardIds("h"), function(id)
        return Fk:getCardById(id):getTypeString() == type
      end)
      use = room:askToUseRealCard(to, {
        pattern = cards,
        skill_name = jizhao.name,
        prompt = "#re__jizhaoq-use:"..player.id.."::"..type,
        extra_data = {
          bypass_distances = true,
          bypass_times = true,
          extraUse = true,
        },
        cancelable = true,
        skip = true,
      })
    end
    if use then
      room:useCard(use)
    else
      local targets = table.filter(room.alive_players, function(p)
        return to:canMoveCardsInBoardTo(p, nil)
      end)
      if #targets == 0 then return end
      local t = room:askToChoosePlayers(player, {
        targets = targets,
        min_num = 1,
        max_num = 1,
        prompt = "#re__jizhaoq-move::"..to.id,
        skill_name = jizhao.name,
        cancelable = true,
      })
      if #t > 0 then
        room:askToMoveCardInBoard(player, {
          target_one = to,
          target_two = t[1],
          skill_name = jizhao.name,
          move_from = to,
        })
      end
    end
  end,
})

return jizhao
