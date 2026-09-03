local tanduo = fk.CreateSkill {
  name = "tanduo",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["tanduo"] = "贪惰",
  [":tanduo"] = "弃牌阶段开始前，若你计入手牌上限的手牌数大于手牌上限，则将此阶段改为摸牌阶段。",
}

tanduo:addEffect(fk.EventPhaseChanging, {
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      data.phase == Player.Discard and
      player:hasSkill(tanduo.name) and
      #table.filter(player:getCardIds("h"), function(id)
        local status_skills = player.room.status_skills[MaxCardsSkill] or Util.DummyTable
        for _, skill in ipairs(status_skills) do
          if skill:excludeFrom(player, Fk:getCardById(id)) then
            return false
          end
        end

        return true
      end) > player:getMaxCards()
  end,
  on_use = function(self, event, target, player, data)
    data.phase = Player.Draw
  end,
})

return tanduo
