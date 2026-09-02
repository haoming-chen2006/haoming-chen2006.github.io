local mouXueyi = fk.CreateSkill({
  name = "mou__xueyi",
  tags = { Skill.Lord, Skill.Compulsory },
})

Fk:loadTranslationTable{
  ["mou__xueyi"] = "血裔",
  [":mou__xueyi"] = "主公技，锁定技，你的手牌上限+2X（X为其他群势力角色数）；"..
  "当你使用牌指定其他群势力角色为目标后，你摸一张牌（每回合你以此法至多获得两张牌）。",

  ["$mou__xueyi1"] = "四世三公之贵，岂是尔等寒门可及？",
  ["$mou__xueyi2"] = "吾袁门名冠天下，何须奉天子为傀？",
}

mouXueyi:addEffect(fk.TargetSpecified, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    return
      player:hasSkill(mouXueyi.name) and
      target == player and
      player:usedEffectTimes(self.name) < 2 and
      data.to ~= player and
      data.to.kingdom == "qun"
  end,
  on_use = function(self, event, target, player, data)
    player:drawCards(1, self.name)
  end,
})

mouXueyi:addEffect("maxcards", {
  correct_func = function(self, player)
    if player:hasSkill(mouXueyi.name) then
      local hmax = 0
      for _, p in ipairs(Fk:currentRoom().alive_players) do
        if p ~= player and p.kingdom == "qun" then
          hmax = hmax + 1
        end
      end
      return hmax * 2
    else
      return 0
    end
  end,
})

return mouXueyi
