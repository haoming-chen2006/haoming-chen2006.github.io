local zongshi = fk.CreateSkill {
  name = "zongshi",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["zongshi"] = "宗室",
  [":zongshi"] = "锁定技，场上每有一种势力，你的手牌上限便+1。",

  ["$zongshi1"] = "汉室百年，坚如磐石。",
  ["$zongshi2"] = "宗室子弟，尽收民心。",
}

zongshi:addEffect("maxcards", {
  correct_func = function(self, player)
    if player:hasSkill(zongshi.name) then
      local kingdoms = {}
      for _, p in ipairs(Fk:currentRoom().alive_players) do
        table.insertIfNeed(kingdoms, p.kingdom)
      end
      return #kingdoms
    end
  end,
})

return zongshi
