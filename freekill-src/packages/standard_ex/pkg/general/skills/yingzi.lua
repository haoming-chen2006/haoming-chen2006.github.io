
local yingzi = fk.CreateSkill{
  name = "ex__yingzi",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["ex__yingzi"] = "英姿",
  [":ex__yingzi"] = "锁定技，摸牌阶段，你多摸一张牌；你的手牌上限等同于你的体力上限。",

  ["$ex__yingzi1"] = "哈哈哈哈哈哈哈哈！",
  ["$ex__yingzi2"] = "伯符，且看我这一手！",
}

yingzi:addEffect(fk.DrawNCards, {
  anim_type = "drawcard",
  on_use = function(self, event, target, player, data)
    data.n = data.n + 1
  end,
})

yingzi:addEffect("maxcards", {
  fixed_func = function(self, player)
    if player:hasSkill(self.name) then
      return player.maxHp
    end
  end
})

return yingzi
