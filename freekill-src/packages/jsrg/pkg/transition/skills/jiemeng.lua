local jiemeng = fk.CreateSkill {
  name = "jiemeng",
  tags = { Skill.Lord, Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["jiemeng"] = "皆盟",
  [":jiemeng"] = "主公技，锁定技，所有群势力角色计算与其他角色的距离-X（X为群势力角色数）。",
}

jiemeng:addEffect("distance", {
  correct_func = function(self, from, to)
    if from.kingdom == "qun" then
      local n1 = #table.filter(Fk:currentRoom().alive_players, function(p)
        return p:hasSkill(jiemeng.name)
      end)
      if n1 > 0 then
        local n2 = #table.filter(Fk:currentRoom().alive_players, function(p)
          return p.kingdom == "qun"
        end)
        return -n1 * n2
      end
    end
  end,
})

return jiemeng
