local shenwei = fk.CreateSkill {
  name = "hulao__shenwei",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable {
  ["hulao__shenwei"] = "神威",
  [":hulao__shenwei"] = "锁定技，摸牌阶段，你额外摸X张牌；你的手牌上限+X（X为其他存活角色数且至多为3）。",

  ["$hulao__shenwei1"] = "荧烛之火，也敢与日月争辉！",
  ["$hulao__shenwei2"] = "我不会输给任何人！",
}

shenwei:addEffect(fk.DrawNCards, {
  on_use = function(self, event, target, player, data)
    data.n = data.n + math.min(3, #player.room:getOtherPlayers(player, false))
  end,
})

shenwei:addEffect("maxcards", {
  correct_func = function(self, player)
    if player:hasSkill(shenwei.name) then
      return math.min(3, #table.filter(Fk:currentRoom().alive_players, function(p)
        return p ~= player
      end))
    end
  end,
})

return shenwei
