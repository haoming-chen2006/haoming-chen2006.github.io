
local zhaofu = fk.CreateSkill {
  name = "zhaofu",
  tags = { Skill.Lord, Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["zhaofu"] = "诏缚",
  [":zhaofu"] = "主公技，锁定技，与你距离为1的角色视为在其他吴势力角色的攻击范围内。",
}

zhaofu:addEffect("atkrange", {
  within_func = function(self, from, to)
    for _, p in ipairs(Fk:currentRoom().alive_players) do
      if p:hasSkill(zhaofu.name) and p:distanceTo(to) == 1 and from.kingdom == "wu" and from ~= p then
        return true
      end
    end
  end,
})

return zhaofu
