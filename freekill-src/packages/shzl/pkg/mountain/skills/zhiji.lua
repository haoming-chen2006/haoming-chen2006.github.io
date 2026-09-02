local zhiji = fk.CreateSkill {
  name = "zhiji",
  tags = {Skill.Wake},
  related_skills = { "guanxing" },
}

Fk:loadTranslationTable{
  ["zhiji"] = "志继",
  [":zhiji"] = "觉醒技，准备阶段，若你没有手牌，你回复1点体力或摸两张牌，减1点体力上限，然后获得〖观星〗。",

  ["$zhiji1"] = "先帝之志，丞相之托，不可忘也！",
  ["$zhiji2"] = "丞相厚恩，维万死不能相报。",
}

zhiji:addEffect(fk.EventPhaseStart, {
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zhiji.name) and
      player:usedSkillTimes(zhiji.name, Player.HistoryGame) == 0 and
      player.phase == Player.Start
  end,
  can_wake = function(self, event, target, player, data)
    return player:isKongcheng()
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local choices = {"draw2"}
    if player:isWounded() then
      table.insert(choices, "recover")
    end
    local choice = room:askToChoice(player, {
      choices = choices,
      skill_name = zhiji.name,
    })
    if choice == "draw2" then
      player:drawCards(2, zhiji.name)
    else
      room:recover({
        who = player,
        num = 1,
        recoverBy = player,
        skillName = zhiji.name
      })
    end
    if player.dead then return end
    room:changeMaxHp(player, -1)
    if player.dead then return end
    room:handleAddLoseSkills(player, "guanxing", nil, true, false)
  end,
})

return zhiji
