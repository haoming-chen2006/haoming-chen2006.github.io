local qieting = fk.CreateSkill {
  name = "qieting",
}

Fk:loadTranslationTable{
  ["qieting"] = "窃听",
  [":qieting"] = "其他角色的回合结束时，若其未于此回合内使用牌指定除其以外的角色为目标，你可以选择一项：1.将其装备区里的一张牌移动至你装备区；"..
  "2.摸一张牌。",

  ["qieting_move"] = "将%dest一张装备移动给你",

  ["$qieting1"] = "此人不露锋芒，断不可留！",
  ["$qieting2"] = "想欺我蔡氏，痴心妄想！"
}

qieting:addEffect(fk.TurnEnd, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(qieting.name) and target ~= player and
      #player.room.logic:getEventsOfScope(GameEvent.UseCard, 1, function (e)
        local use = e.data
        return use.from == target and
          table.find(use.tos, function (p)
            return p ~= target
          end) ~= nil
      end, Player.HistoryTurn) == 0
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    local choices = { "draw1" }
    if target:canMoveCardsInBoardTo(player, "e") then
      table.insert(choices, 1, "qieting_move::"..target.id)
    end
    local choice = room:askToChoice(player, {
      choices = choices,
      skill_name = qieting.name,
      cancelable = true,
    })
    if choice ~= "Cancel" then
      event:setCostData(self, { tos = { target }, choice = choice })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local choice = event:getCostData(self).choice
    if choice == "draw1" then
      player:drawCards(1, qieting.name)
    else
      room:askToMoveCardInBoard(player, {
        target_one = target,
        target_two = player,
        skill_name = qieting.name,
        flag = "e",
        move_from = target,
      })
    end
  end,
})

return qieting
