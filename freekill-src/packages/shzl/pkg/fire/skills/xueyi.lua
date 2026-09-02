local xueyi = fk.CreateSkill {
  name = "xueyi",
  tags = { Skill.Lord, Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["xueyi"] = "血裔",
  [":xueyi"] = "主公技，锁定技，你的手牌上限+2X（X为场上其他群势力角色数）。",
}

xueyi:addEffect("maxcards", {
  correct_func = function(self, player)
    if player:hasSkill(xueyi.name) then
      local n = 0
      for _, p in ipairs(Fk:currentRoom().alive_players) do
        if p ~= player and p.kingdom == "qun" then
          n = n + 1
        end
      end
      return n * 2
    end
  end,
})

return xueyi
