local fuyin = fk.CreateSkill {
  name = "fuyin",
  tags = {Skill.Compulsory},
}

Fk:loadTranslationTable{
  ["fuyin"] = "父荫",
  [":fuyin"] = "锁定技，你每回合第一次成为【杀】或【决斗】的目标后，若你的手牌数不大于使用者，此牌对你无效。",

  ["$fuyin1"] = "得父荫庇，平步青云。",
  ["$fuyin2"] = "吾自幼心怀父诫，方不愧父亲荫庇。",
}

fuyin:addEffect(fk.TargetConfirmed, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(fuyin.name) and table.contains({"slash", "duel"}, data.card.trueName) then
      local room = player.room
      if data.from.dead or data.from:getHandcardNum() < player:getHandcardNum() then return end
      local mark = player:getMark("fuyin_record-turn")
      local use_event = room.logic:getCurrentEvent():findParent(GameEvent.UseCard, true)
      if use_event == nil then return false end
      if mark == 0 then
        room.logic:getEventsOfScope(GameEvent.UseCard, 1, function (e)
          local use = e.data
          if table.contains({"slash", "duel"}, use.card.trueName) and table.contains(use.tos, player) then
            mark = e.id
            room:setPlayerMark(player, "fuyin_record-turn", mark)
            return true
          end
        end, Player.HistoryTurn)
      end
      return mark == use_event.id
    end
  end,
  on_use = function(self, event, target, player, data)
    data.nullified = true
  end,
})

return fuyin
