local binglue = fk.CreateSkill {
  name = "binglue",
  tags = {Skill.Compulsory},
}

Fk:loadTranslationTable{
  ["binglue"] = "兵略",
  [":binglue"] = "锁定技，当你首次对一名角色发动〖飞军〗结算后，你摸两张牌。",

  ["$binglue1"] = "奇略兵速，敌未能料之。",
  ["$binglue2"] = "兵略者，明战胜攻取之数，形机之势，诈谲之变。",
}

binglue:addEffect(fk.AfterCardsMove, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(binglue.name) then
      local e = player.room.logic:getCurrentEvent():findParent(GameEvent.SkillEffect)
      if e and e.data.who == player and e.data.skill.name == "feijun" then
        local mark = player:getTableMark(binglue.name)
        for _, move in ipairs(data) do
          if move.from ~= player and not table.contains(mark, move.from.id) then
            event:setCostData(self, {extra_data = move.from.id})
            return true
          end
        end
      end
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:addTableMark(player, binglue.name, event:getCostData(self).extra_data)
    player:drawCards(2, binglue.name)
  end,
})

return binglue
