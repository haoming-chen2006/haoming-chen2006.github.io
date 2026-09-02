
local fuli = fk.CreateSkill {
  name = "fuli",
  tags = { Skill.Limited },
}

Fk:loadTranslationTable{
  ["fuli"] = "伏枥",
  [":fuli"] = "限定技，当你处于濒死状态时，你可以将体力值回复至X点（X为现存势力数），然后将你的武将牌翻面。",

  ["$fuli1"] = "今天是个拼命的好日子，哈哈哈哈！",
  ["$fuli2"] = "有老夫在，蜀汉就不会倒下！",
}

fuli:addEffect(fk.AskForPeaches, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    if target == player and player:hasSkill(fuli.name) and
      player.dying and player:usedSkillTimes(fuli.name, Player.HistoryGame) == 0 then
      local kingdoms = {}
      for _, p in ipairs(player.room.alive_players) do
        table.insertIfNeed(kingdoms, p.kingdom)
      end
      return player.hp < math.min(#kingdoms, player.maxHp)
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local kingdoms = {}
    for _, p in ipairs(room.alive_players) do
      table.insertIfNeed(kingdoms, p.kingdom)
    end
    room:recover{
      who = player,
      num = math.min(#kingdoms, player.maxHp) - player.hp,
      recoverBy = player,
      skillName = fuli.name,
    }
    if not player.dead then
      player:turnOver()
    end
  end,
})

return fuli
